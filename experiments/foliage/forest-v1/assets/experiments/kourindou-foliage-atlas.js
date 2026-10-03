/* Original, deterministic broadleaf sprays for an opt-in geometry experiment.
 * Pigment/vein modulation and curved-leaf normals contain no baked illumination.
 * Load before src/experiments/kourindou-foliage-texture.js; not a production asset.
 */
(function (G) {
'use strict';
const TILE = 256, SIZE = TILE * 2, GUTTER = 16, ALPHA_TEST = .45;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const random = seed => () => {
 seed |= 0; seed = seed + 0x6D2B79F5 | 0;
 let x = Math.imul(seed ^ seed >>> 15, 1 | seed);
 x ^= x + Math.imul(x ^ x >>> 7, 61 | x);
 return ((x ^ x >>> 14) >>> 0) / 4294967296;
};
const linear = Array.from({length:256}, (_, i) => {
 const c = i / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
});
const srgb = c => Math.round(255 * (c <= .0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - .055));

function create(options = {}) {
 const color = new Uint8Array(SIZE * SIZE * 4), normal = new Uint8Array(color.length);
 for (let i = 0; i < color.length; i += 4) {
  color.set([250, 252, 246, 0], i); normal.set([128, 128, 255, 255], i);
 }
 function pixel(tile, x, y, coverage, rgb, n) {
  if (x < GUTTER || y < GUTTER || x >= TILE - GUTTER || y >= TILE - GUTTER || coverage <= 0) return;
  const i = ((y + Math.floor(tile / 2) * TILE) * SIZE + x + tile % 2 * TILE) * 4;
  const old = color[i + 3] / 255, alpha = coverage + old * (1 - coverage);
  for (let k = 0; k < 3; k++) {
   color[i + k] = Math.round((rgb[k] * coverage + color[i + k] * old * (1 - coverage)) / alpha);
   normal[i + k] = Math.round((n[k] * coverage + normal[i + k] * old * (1 - coverage)) / alpha);
  }
  color[i + 3] = Math.round(alpha * 255);
 }
 function stem(tile, a, b, width) {
  const dx = b[0] - a[0], dy = b[1] - a[1], length2 = dx * dx + dy * dy;
  const lo = a.map((v, k) => Math.floor(Math.min(v, b[k]) - width - 1));
  const hi = a.map((v, k) => Math.ceil(Math.max(v, b[k]) + width + 1));
  for (let y = lo[1]; y <= hi[1]; y++) for (let x = lo[0]; x <= hi[0]; x++) {
   const t = clamp(((x + .5 - a[0]) * dx + (y + .5 - a[1]) * dy) / length2, 0, 1);
   const d = Math.hypot(x + .5 - a[0] - t * dx, y + .5 - a[1] - t * dy);
   pixel(tile, x, y, clamp(width * .5 + .5 - d, 0, 1), [224, 232, 216], [128, 128, 255]);
  }
 }
 function leaf(tile, x0, y0, length, width, angle, pigment) {
  const f = [Math.cos(angle), Math.sin(angle)], s = [-f[1], f[0]];
  const extent = Math.ceil(length * .5 + width + 1);
  for (let y = Math.floor(y0 - extent); y <= y0 + extent; y++) for (let x = Math.floor(x0 - extent); x <= x0 + extent; x++) {
   const dx = x + .5 - x0, dy = y + .5 - y0;
   const t = (dx * f[0] + dy * f[1]) / (length * .5), q = (dx * s[0] + dy * s[1]) / width;
   if (Math.abs(t) >= 1) continue;
   const edge = (1 - t * t) ** .72;
   const alpha = clamp((edge - Math.abs(q)) * width + .5, 0, 1) * clamp((1 - Math.abs(t)) * length * .5, 0, 1);
   if (alpha <= 0) continue;
   const mainVein = Math.exp(-q * q * 820) * (1 - Math.abs(t));
   const rib = Math.abs(((t * 5.5 + Math.abs(q) * 2.2 + 4) % 1) - .5);
   const secondary = (1 - clamp(rib / .06, 0, 1)) * .28 * (1 - Math.abs(t));
   // The only albedo variation is pigment and veins; no light-facing gradient.
   const tone = 252 - pigment * 9 - mainVein * 12 - secondary * 7;
   const crossSlope = q / Math.max(edge, .2) * .34;
   const longSlope = t * .12;
   const nx = -crossSlope * s[0] - longSlope * f[0], ny = -crossSlope * s[1] - longSlope * f[1];
   const inverse = 1 / Math.hypot(nx, ny, 1);
   pixel(tile, x, y, alpha, [tone - 1, tone + 1, tone - 4],
    [128 + nx * inverse * 127, 128 + ny * inverse * 127, 128 + inverse * 127]);
  }
 }
 for (let tile = 0; tile < 4; tile++) {
  const R = random(610041 + tile * 1723), root = [128 + (R() - .5) * 5, 226];
  for (let branch = 0; branch < 7; branch++) {
   const angle = -2.94 + branch * .43 + (R() - .5) * .07;
   const reach = 86 + R() * 13, tip = [128 + Math.cos(angle) * reach, 149 + Math.sin(angle) * reach];
   stem(tile, root, tip, 1.8);
   for (let j = 1; j <= 6; j++) {
    const t = j / 7, x = root[0] + (tip[0] - root[0]) * t, y = root[1] + (tip[1] - root[1]) * t;
    for (const side of [-1, 1]) {
     const a = angle + side * (.78 + R() * .15), spread = 9 + R() * 3;
     const center = [x + Math.cos(a) * spread, y + Math.sin(a) * spread];
     stem(tile, [x, y], center, 1.1);
     leaf(tile, ...center, 24 + R() * 10, 7 + R() * 2.1, a, R());
    }
   }
   leaf(tile, ...tip, 30 + R() * 6, 8 + R() * 1.3, angle, R());
  }
 }
 const coverageAt = (data, size, tile, threshold = ALPHA_TEST) => {
  const span = size / 2, x0 = tile % 2 * span, y0 = Math.floor(tile / 2) * span;
  let count = 0; for (let y = 0; y < span; y++) for (let x = 0; x < span; x++)
   if (data[((y + y0) * size + x + x0) * 4 + 3] / 255 >= threshold) count++;
  return count / (span * span);
 };
 const baseCoverage = Array.from({length:4}, (_, tile) => coverageAt(color, SIZE, tile));
 const colorMips = [{data:color,width:SIZE,height:SIZE}], normalMips = [{data:normal,width:SIZE,height:SIZE}], coverage = [];
 let size = SIZE, previousColor = color, previousNormal = normal;
 while (size > 1) {
  const nextSize = size / 2, c = new Uint8Array(nextSize * nextSize * 4), n = new Uint8Array(c.length);
  for (let y = 0; y < nextSize; y++) for (let x = 0; x < nextSize; x++) {
   const dst = (y * nextSize + x) * 4, rgb = [0, 0, 0], v = [0, 0, 0]; let alpha = 0;
   for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) {
    const src = ((y * 2 + yy) * size + x * 2 + xx) * 4, a = previousColor[src + 3] / 255;
    alpha += a;
    for (let k = 0; k < 3; k++) { rgb[k] += linear[previousColor[src + k]] * a; v[k] += (previousNormal[src + k] / 127.5 - 1) * a; }
   }
   for (let k = 0; k < 3; k++) c[dst + k] = alpha ? srgb(rgb[k] / alpha) : [250, 252, 246][k];
   c[dst + 3] = Math.round(alpha * 255 / 4);
   const length = Math.hypot(...v); for (let k = 0; k < 3; k++) n[dst + k] = length ? Math.round((v[k] / length * .5 + .5) * 255) : [128, 128, 255][k];
   n[dst + 3] = 255;
  }
  // Kourindou's default keeps coverage through useful atlas mips then fades out.
  // The forest can explicitly retain subpixel crown samples in tiny mips; their
  // coverage is necessarily quantised when a tile has fewer than four pixels.
  if (nextSize >= (options.preserveFarCoverage ? 2 : 32)) for (let tile = 0; tile < 4; tile++) {
   const span = nextSize / 2, x0 = tile % 2 * span, y0 = Math.floor(tile / 2) * span, values = [];
   for (let y = 0; y < span; y++) for (let x = 0; x < span; x++) values.push(c[((y + y0) * nextSize + x + x0) * 4 + 3]);
   values.sort((a, b) => b - a);
   const keep = Math.max(1, Math.round(baseCoverage[tile] * values.length));
   const scale = clamp((ALPHA_TEST * 255 + .5) / Math.max(1, values[keep - 1]), .8, 2.0);
   for (let y = 0; y < span; y++) for (let x = 0; x < span; x++) {
    const i = ((y + y0) * nextSize + x + x0) * 4 + 3; c[i] = Math.min(255, Math.round(c[i] * scale));
   }
  }
  coverage.push({size:nextSize,tiles:nextSize >= 2 ? Array.from({length:4}, (_, tile) => coverageAt(c, nextSize, tile)) : []});
  colorMips.push({data:c,width:nextSize,height:nextSize}); normalMips.push({data:n,width:nextSize,height:nextSize});
  size = nextSize; previousColor = c; previousNormal = n;
 }
 return {size:SIZE,tileSize:TILE,gutter:GUTTER,alphaTest:ALPHA_TEST,color,normal,colorMips,normalMips,baseCoverage,coverage,
  bytes:colorMips.concat(normalMips).reduce((sum, mip) => sum + mip.data.byteLength, 0)};
}
G.KOURINDOU_FOLIAGE_ATLAS = Object.freeze({version:1,create,size:SIZE,tileSize:TILE,gutter:GUTTER,alphaTest:ALPHA_TEST});
})(globalThis.GA || (globalThis.GA = {}));
