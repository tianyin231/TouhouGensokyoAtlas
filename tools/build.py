"""从当前源码和资源组装单 HTML；不读取任何历史版本或 Git 历史。"""
from pathlib import Path
import argparse
import base64
import hashlib
import html
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
TOKEN = re.compile(r"\{\{([A-Z_]+)\}\}")


def apply_verified_corrections(atlas, modules):
    """Apply sourced evidence patches only when the recorded previous values match."""
    locations = {v['id']: v for v in atlas['locations']}
    # Evidence corrections are explicit, compare-and-set patches: never silently
    # replace earlier research or broaden an ordinary locationUpdates patch.
    for module in modules:
        for correction in module.get('verifiedLocationCorrections', []):
            target = locations.get(correction['id'])
            if target is None:
                raise ValueError('Unknown location in evidence correction: ' + correction['id'])
            expected, replacement = correction['expected'], correction['replace']
            allowed = {'kind', 'existence_evidence', 'verified_fact', 'source_locator', 'build_stage'}
            sources_by_id = {s['id']: s for s in atlas['sources']}
            if set(expected) != set(replacement) or not set(replacement) <= allowed:
                raise ValueError('Invalid evidence correction fields')
            cited = correction.get('source_ids', [])
            if not cited or not all(s in target.get('source_ids', []) and
                                   sources_by_id.get(s, {}).get('source_type') == 'T' for s in cited):
                raise ValueError('Evidence correction requires an attached transcript source')
            if any(target.get(k) != v for k, v in expected.items()):
                raise ValueError('Research changed; review correction: ' + correction['id'])
            target.update(replacement)


def build(output_dir):
    inputs = {}

    def read_bytes(name):
        content = (ROOT / name).read_bytes()
        inputs[name] = hashlib.sha256(content).hexdigest()
        return content

    def read_text(name):
        return read_bytes(name).decode('utf-8').replace('\r\n', '\n').replace('\r', '\n')

    project = json.loads(read_text('project.json'))
    version = project['version']
    if not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('project.json 的 version 必须是三段数字，例如 0.17.0')
    major, minor, patch = version.split('.')
    tag = f'v{major}.{minor}' + (f'.{patch}' if patch != '0' else '')
    metadata = {
        'VERSION': version,
        'RELEASE_TAG': tag,
        'PROJECT_TITLE': html.escape(project['title']),
        'THREE_REVISION': project['threeRevision'],
        'EXPORT_PREFIX': 'gensokyo-' + tag.replace('.', ''),
    }

    def substitute(text, values):
        return TOKEN.sub(lambda match: values[match[1]], text)

    def source(name):
        text = substitute(read_text(name), metadata)
        if re.search(r'</script', text, re.I):
            raise ValueError(f'{name} 含有会提前结束 HTML script 的文本，请转义斜杠')
        return text

    def data(name):
        text = source(name)
        json.loads(text)
        return text.rstrip('\n')

    additions = [json.loads(data(name)) for name in ('data/lunar.json', 'data/makai.json', 'data/netherworld.json', 'data/heaven.json', 'data/higan.json', 'data/animal.json', 'data/backdoor.json', 'data/kasen.json', 'data/current-hell.json', 'data/rainbow-mine.json', 'data/highland.json', *project.get('extensionData', []))]
    atlas = json.loads(data('data/atlas.json'))
    characters = json.loads(data('data/characters.json'))
    locations = {v['id']: v for v in atlas['locations']}
    for module in additions:
        for patch in module['locationUpdates']:
            if patch['id'] not in locations:
                raise ValueError('地区补丁引用了未知地点：' + patch['id'])
            target = locations[patch['id']]
            for key, value in patch.items():
                if key in ('aliases', 'source_ids'):
                    target[key] = list(dict.fromkeys(target.get(key, []) + value))
                elif key in ('status', 'project_treatment', 'coordinate_status'):
                    target[key] = value
                elif key != 'id':
                    raise ValueError('地区补丁不允许覆盖字段：' + key)
        for key, base in [('sources', atlas), ('characters', characters)]:
            ids = {v['id'] for v in base[key]}
            for record in module[key]:
                if record['id'] in ids:
                    raise ValueError('地区追加ID重复：' + record['id'])
                ids.add(record['id'])
                base[key].append(record)
    apply_verified_corrections(atlas, additions)

    characters['additionalVisits'] = []
    ids = {c['id'] for c in characters['characters']}
    for module in additions:
        for visit in module.get('characterVisits', []):
            if visit['characterId'] not in ids or visit['locationId'] not in locations:
                raise ValueError('历史活动引用未知人物或地点')
            characters['additionalVisits'].append(visit)
    characters['scopeNote'] = f"当前合计{len(characters['characters'])}条；独立世界追加资料与历史活动分开，原记录保留。"

    core = read_bytes('vendor/three/three.core.js')
    if f"const REVISION = '{project['threeRevision']}';".encode() not in core:
        raise ValueError('Three.js 引擎版本与 project.json 的 threeRevision 不一致')

    # 同一个字符串同时用于主线程与 Worker，避免两个模型注册表出现差异。
    world_builder = '\n'.join(source(name) for name in project['worldBuilders'])
    parts = {
        'STYLES': read_text('src/styles.css'),
        'CHARACTER_DATA': json.dumps(characters, ensure_ascii=False),
        'ATLAS_DATA': json.dumps(atlas, ensure_ascii=False),
        'EXPANSION_DATA': data('data/expansion.json'),
        'OVERVIEW_PACK': base64.b64encode(read_bytes('assets/packs/overview.pack.gz')).decode('ascii'),
        'LEGACY_PACK': base64.b64encode(read_bytes('assets/packs/legacy.pack.gz')).decode('ascii'),
        'THREE_CORE': base64.b64encode(core).decode('ascii'),
        'THREE_MODULE': base64.b64encode(read_bytes('vendor/three/three.module.js')).decode('ascii'),
        'THREE_LICENSE': read_text('vendor/three/LICENSE').rstrip('\n'),
        'WORLD_BUILDER': world_builder,
        'CAMERA': source('src/camera.js'),
        'RENDERER': source('src/renderer.js'),
        'HELL_RENDERER': source('src/old-hell-renderer.js'),
        'CASTLE_RENDERER': source('src/kishinjou-renderer.js'),
        'LUNAR_RENDERER': source('src/lunar-renderer.js'),
        'MAKAI_RENDERER': source('src/makai-renderer.js'),
        'NETHER_RENDERER': source('src/netherworld-renderer.js'),
        'HEAVEN_RENDERER': source('src/heaven-renderer.js'),
        'HIGAN_RENDERER': source('src/higan-renderer.js'),
        'LANDSCAPE_RENDERER': source('src/landscape-renderer.js'),
        'ANIMAL_RENDERER': source('src/animal-renderer.js'),
        'BACKDOOR_RENDERER': source('src/backdoor-renderer.js'),
        'KASEN_RENDERER': source('src/kasen-renderer.js'),
        'CURRENT_HELL_RENDERER': source('src/current-hell-renderer.js'),
        'RAINBOW_MINE_RENDERER': source('src/rainbow-mine-renderer.js'),
        'HIGHLAND_RENDERER': source('src/highland-renderer.js'),
        'HAKUREI_RENDERER': source('src/hakurei-renderer.js'),
        'NIGHT_RENDERER': '\n'.join([source('src/night-renderer.js'), *[source(name) for name in project.get('extensionRenderers', [])]]),
        'CHARACTERS': source('src/characters.js'),
        'STREAMING': source('src/streaming.js'),
        'APP': source('src/app.js'),
    }
    template = read_text('src/index.html')
    for token in parts:
        expected = 2 if token == 'WORLD_BUILDER' else 1
        if template.count('{{' + token + '}}') != expected:
            raise ValueError(f'模板占位符 {token} 应出现 {expected} 次')
    content = substitute(template, {**metadata, **parts}).encode('utf-8')
    # 校验器可据此发现“改过源码但忘记重新构建”的成品。
    read_bytes('tools/build.py')
    read_bytes('tools/check.mjs')
    read_bytes('tools/check-landscape.mjs')
    read_bytes('tools/check-kishinjou.mjs')
    read_bytes('tools/kishinjou-baseline.json')
    read_bytes('tools/check-lunar.mjs')
    read_bytes('tools/lunar-baseline.json')
    read_bytes('tools/check-makai.mjs')
    read_bytes('tools/makai-baseline.json')
    read_bytes('tools/check-netherworld.mjs')
    read_bytes('tools/netherworld-baseline.json')
    read_bytes('tools/audit-landmarks.mjs')
    read_bytes('tools/check-heaven.mjs')
    read_bytes('tools/heaven-baseline.json')
    read_bytes('tools/check-higan.mjs')
    read_bytes('tools/higan-baseline.json')
    read_bytes('tools/check-animal.mjs')
    read_bytes('tools/animal-baseline.json')
    read_bytes('tools/check-backdoor.mjs')
    read_bytes('tools/backdoor-baseline.json')
    read_bytes('tools/check-kasen.mjs')
    read_bytes('tools/kasen-baseline.json')
    read_bytes('tools/check-current-hell.mjs')
    read_bytes('tools/current-hell-baseline.json')
    read_bytes('tools/check-rainbow-mine.mjs')
    read_bytes('tools/rainbow-mine-baseline.json')
    read_bytes('tools/check-highland.mjs')
    read_bytes('tools/highland-baseline.json')
    read_bytes('tools/check-asama.mjs')
    read_bytes('tools/asama-baseline.json')
    read_bytes('tools/check-evidence-corrections.py')
    read_bytes('tools/current-coverage.json')
    read_bytes('tools/check-geyser.mjs')
    read_bytes('tools/geyser-baseline.json')
    read_bytes('tools/check-wind-cave.mjs')
    read_bytes('tools/wind-cave-baseline.json')
    read_bytes('tools/check-cucumber-farm.mjs')
    read_bytes('tools/cucumber-farm-baseline.json')
    read_bytes('tools/check-waterfall-cave.mjs')
    read_bytes('tools/waterfall-cave-baseline.json')
    read_bytes('tools/check-peony.mjs')
    read_bytes('tools/peony-baseline.json')
    read_bytes('tools/check-mayohiga.mjs')
    read_bytes('tools/mayohiga-baseline.json')
    read_bytes('tools/check-hiten.mjs')
    read_bytes('tools/hiten-baseline.json')
    read_bytes('tools/check-hakurei.mjs')
    read_bytes('tools/hakurei-baseline.json')
    output_dir.mkdir(parents=True, exist_ok=True)
    # GitHub 会清洗非 ASCII 附件名，发布名称与校验文件必须一致。
    filename = f'TouhouGensokyoAtlas-{tag}.html'
    output = output_dir / filename
    output.write_bytes(content)
    digest = hashlib.sha256(content).hexdigest()
    info = {'version': version, 'tag': tag, 'artifact': filename, 'sha256': digest, 'inputs': inputs}
    (output_dir / 'release.json').write_bytes((json.dumps(info, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    (output_dir / 'SHA256SUMS.txt').write_bytes(f'{digest}  {filename}\n'.encode('utf-8'))
    print(f'已构建 {output.relative_to(ROOT) if output.is_relative_to(ROOT) else output}（{len(content):,} 字节）')
    print(f'SHA-256: {digest}')
    return output


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'dist')
    args = parser.parse_args()
    build(args.output_dir.resolve())
