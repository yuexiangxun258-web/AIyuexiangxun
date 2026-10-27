// Keep full-resolution originals outside the repository; publish browser-ready copies.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const [sourceDirectory, ffmpeg] = process.argv.slice(2);
if (!sourceDirectory || !ffmpeg) throw new Error('Usage: node scripts/prepare-web-media.cjs <originals> <ffmpeg>');
const page = fs.readFileSync('app/page.tsx', 'utf8');
const names = [...new Set([...page.matchAll(/r2Video\('([^']+)'\)/g)].map(match => match[1]))];
const destination = 'public/media/v2';
fs.mkdirSync(destination, { recursive: true });
fs.mkdirSync('work/media-cache', { recursive: true });
function run(args) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'Video conversion failed');
}
const manifest = {};
for (const name of names) {
  const source = path.join(sourceDirectory, name);
  const output = path.join(destination, name);
  const poster = name.replace(/\.mp4$/, '.jpg');
  if (!fs.existsSync(source)) throw new Error('Missing original: ' + name);
  const cached = path.join('work/media-cache', name);
  if (!fs.existsSync(output) && fs.existsSync(cached)) fs.copyFileSync(cached, output);
  if (!fs.existsSync(output)) {
    run(['-i', source, '-map', '0:v:0', '-map', '0:a:0?', '-vf',
      "scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
      '-c:v', 'h264_nvenc', '-preset', 'p7', '-rc', 'vbr', '-cq', '28', '-b:v', '1000k',
      '-maxrate', '1500k', '-bufsize', '3000k', '-profile:v', 'main', '-pix_fmt', 'yuv420p',
      '-r', '30', '-g', '60', '-c:a', 'aac', '-b:a', '80k', '-movflags', '+faststart', output]);
  }
  if (!fs.existsSync(path.join(destination, poster))) {
    run(['-i', output, '-frames:v', '1', '-vf', 'scale=480:480:force_original_aspect_ratio=decrease', '-q:v', '4', path.join(destination, poster)]);
  }
  const bytes = fs.statSync(output).size;
  const parts = [];
  if (bytes >= 4 * 1024 * 1024) {
    const data = fs.readFileSync(output);
    for (let offset = 0, index = 0; offset < bytes; offset += 4 * 1024 * 1024, index++) {
      const filename = name + '.part-' + String(index).padStart(3, '0') + '.bin';
      const chunk = data.subarray(offset, offset + 4 * 1024 * 1024);
      fs.writeFileSync(path.join(destination, filename), chunk);
      parts.push({ src: '/media/v2/' + filename, bytes: chunk.length });
    }
    fs.renameSync(output, cached);
  }
  manifest[name] = { src: '/media/playback/' + name, poster: '/media/v2/' + poster, bytes, originalBytes: fs.statSync(source).size, parts: parts.length ? parts : [{ src: '/media/v2/' + name, bytes }] };
  console.log(JSON.stringify({ name, ...manifest[name] }));
}
run(['-i', 'public/videos/hero-preview-720p-v1.mp4', '-an', '-vf', 'scale=640:-2',
  '-c:v', 'h264_nvenc', '-preset', 'p7', '-rc', 'vbr', '-cq', '30', '-b:v', '280k',
  '-maxrate', '400k', '-bufsize', '800k', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-g', '60',
  '-movflags', '+faststart', path.join(destination, 'hero-background.mp4')]);
fs.writeFileSync('app/media/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
const totals = Object.values(manifest).reduce((result, item) => ({ original: result.original + item.originalBytes, web: result.web + item.bytes }), { original: 0, web: 0 });
console.log(JSON.stringify({ count: names.length, totals, backgroundBytes: fs.statSync(path.join(destination, 'hero-background.mp4')).size }));
