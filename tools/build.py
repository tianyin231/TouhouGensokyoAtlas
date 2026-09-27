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

    core = read_bytes('vendor/three/three.core.js')
    if f"const REVISION = '{project['threeRevision']}';".encode() not in core:
        raise ValueError('Three.js 引擎版本与 project.json 的 threeRevision 不一致')

    # 同一个字符串同时用于主线程与 Worker，避免两个模型注册表出现差异。
    world_builder = '\n'.join(source(name) for name in project['worldBuilders'])
    parts = {
        'STYLES': read_text('src/styles.css'),
        'CHARACTER_DATA': data('data/characters.json'),
        'ATLAS_DATA': data('data/atlas.json'),
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
    output_dir.mkdir(parents=True, exist_ok=True)
    filename = f"幻想乡大地图_{tag}_{project['title']}.html"
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
