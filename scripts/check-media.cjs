const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const ts = require('typescript');
const manifest = require('../app/media/manifest.json');
function loadTs(filename, requireModule = require) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: requireModule, Request, Response, Headers, ReadableStream, AbortController, URL, fetch: globalThis.fetch }, { filename });
  return module.exports;
}
async function main() {
  const { parseByteRange } = loadTs('app/media/byte-range.ts');
  assert.equal(parseByteRange('bytes=0-1', 100).end, 1);
  assert.equal(parseByteRange('bytes=-5', 100).start, 95);
  assert.equal(parseByteRange('bytes=90-', 100).end, 99);
  for (const input of ['bytes=100-', 'bytes=9-2', 'bytes=-0', 'bytes=0-1,4-5', 'wrong', 'bytes=-']) assert.equal(parseByteRange(input, 100), null);
  for (const [name, media] of Object.entries(manifest)) {
    assert.ok(fs.existsSync(path.join('public', media.poster)));
    const parts = media.parts || [{ src: media.src, bytes: media.bytes }];
    assert.equal(parts.reduce((sum, part) => sum + fs.statSync(path.join('public', part.src)).size, 0), media.bytes);
    const first = fs.readFileSync(path.join('public', parts[0].src));
    assert.ok(first.indexOf('moov') > 0 && first.indexOf('moov') < first.indexOf('mdat'), name + ': fast start metadata');
    assert.ok(first.includes('avc1'), name + ': H.264 sample entry');
    if (media.parts?.length > 1) {
      const original = fs.readFileSync(path.join('work/media-cache', name));
      const reconstructed = Buffer.concat(parts.map(part => fs.readFileSync(path.join('public', part.src))));
      assert.ok(original.equals(reconstructed), name + ': exact segmented reconstruction');
    }
  }
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    // Exercise fallback against an asset server which ignores byte ranges.
    const bytes = fs.readFileSync(path.join('public', new URL(url instanceof Request ? url.url : url).pathname));
    return new Response(bytes, { status: 200 });
  };
  const route = loadTs('app/media/playback/[filename]/route.ts', (id) => id === 'cloudflare:workers' ? { env: {} } : id.endsWith('manifest.json') ? manifest : id.endsWith('byte-range') ? { parseByteRange } : require(id));
  const [filename, media] = Object.entries(manifest).find(([, entry]) => entry.parts?.length > 1);
  const original = fs.readFileSync(path.join('work/media-cache', filename));
  for (const [start, end] of [[0, 1], [0, 65535], [4194290, 4194340], [media.bytes - 256, media.bytes - 1]]) {
    const response = await route.GET(new Request('https://example.test/media/playback/' + filename, { headers: { Range: `bytes=${start}-${end}` } }), { params: Promise.resolve({ filename }) });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('Content-Range'), `bytes ${start}-${end}/${media.bytes}`);
    assert.ok(Buffer.from(await response.arrayBuffer()).equals(original.subarray(start, end + 1)), 'Range bytes must match original');
  }
  const head = await route.HEAD(new Request('https://example.test/media/playback/' + filename, { method: 'HEAD' }), { params: Promise.resolve({ filename }) });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('Content-Length'), String(media.bytes));
  assert.equal(await head.text(), '');
  const invalid = await route.GET(new Request('https://example.test/media/playback/' + filename, { headers: { Range: 'bytes=9999999999-' } }), { params: Promise.resolve({ filename }) });
  assert.equal(invalid.status, 416);
  const unknown = await route.GET(new Request('https://example.test/media/playback/no.mp4'), { params: Promise.resolve({ filename: 'no.mp4' }) });
  assert.equal(unknown.status, 404);
  const boundRoute = loadTs('app/media/playback/[filename]/route.ts', (id) => id === 'cloudflare:workers' ? { env: { ASSETS: { async fetch(request) {
    const bytes = fs.readFileSync(path.join('public', new URL(request.url).pathname));
    const selected = parseByteRange(request.headers.get('range'), bytes.length);
    return new Response(bytes.subarray(selected.start, selected.end + 1), { status: 206 });
  } } } } : id.endsWith('manifest.json') ? manifest : id.endsWith('byte-range') ? { parseByteRange } : require(id));
  for (const [start, end] of [[0, 1], [4194290, 4194340], [media.bytes - 64, media.bytes - 1]]) {
    const response = await boundRoute.GET(new Request('https://example.test/media/playback/' + filename, { headers: { Range: `bytes=${start}-${end}` } }), { params: Promise.resolve({ filename }) });
    assert.ok(Buffer.from(await response.arrayBuffer()).equals(original.subarray(start, end + 1)), 'Assets binding byte range');
  }
  const simpleName = Object.keys(manifest).find(name => manifest[name].parts.length === 1);
  const simple = await boundRoute.GET(new Request('https://example.test/media/playback/' + simpleName, { headers: { Range: 'bytes=0-1' } }), { params: Promise.resolve({ filename: simpleName }) });
  assert.equal(simple.status, 206);
  assert.equal((await simple.arrayBuffer()).byteLength, 2);
  globalThis.fetch = originalFetch;
  console.log('PASS: ' + Object.keys(manifest).length + ' H.264 fast-start videos, exact reconstruction, initial/cross-segment/end ranges, HEAD, invalid ranges and missing files');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
