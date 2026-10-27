import manifest from '../../manifest.json';
import { parseByteRange } from '../../byte-range';

type Part = { src: string; bytes: number };
type Media = { bytes: number; parts?: Part[] };
const files = manifest as Record<string, Media>;

async function serve(request: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  const media = Object.hasOwn(files, filename) ? files[filename] : undefined;
  if (!media?.parts?.length) return new Response('Video not found', { status: 404 });
  const range = parseByteRange(request.headers.get('range'), media.bytes);
  if (!range) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${media.bytes}` } });
  const headers = new Headers({
    'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes',
    'Content-Length': String(range.end - range.start + 1),
    'Cache-Control': 'public, max-age=31536000, immutable',
    'ETag': `"v2-${filename}-${media.bytes}"`,
  });
  if (range.partial) headers.set('Content-Range', `bytes ${range.start}-${range.end}/${media.bytes}`);
  if (request.method === 'HEAD') return new Response(null, { status: range.partial ? 206 : 200, headers });

  let offset = 0;
  const selected = media.parts.flatMap(part => {
    const partStart = offset;
    offset += part.bytes;
    if (partStart > range.end || offset <= range.start) return [];
    return [{ ...part, start: Math.max(0, range.start - partStart), end: Math.min(part.bytes - 1, range.end - partStart) }];
  });
  const abort = new AbortController();
  request.signal.addEventListener('abort', () => abort.abort(), { once: true });
  // Read static segments through the Worker binding, avoiding a same-zone HTTP
  // round trip. The fallback supports the ordinary Node preview server.
  const assetFetcher = await import('cloudflare:workers').then(({ env }) => env.ASSETS).catch(() => undefined);
  async function* chunks() {
    for (const part of selected) {
      const partRequest = new Request(new URL(part.src, request.url), {
        headers: { Range: `bytes=${part.start}-${part.end}` }, signal: abort.signal,
      });
      const response = assetFetcher ? await assetFetcher.fetch(partRequest) : await fetch(partRequest);
      if (!response.ok || !response.body) throw new Error('Video segment unavailable');
      const reader = response.body.getReader();
      let skipped = response.status === 206 ? 0 : part.start;
      let remaining = part.end - part.start + 1;
      try {
        while (remaining > 0) {
          const { done, value } = await reader.read();
          if (done) throw new Error('Incomplete video segment');
          if (skipped >= value.length) { skipped -= value.length; continue; }
          const chunk = value.subarray(skipped, Math.min(value.length, skipped + remaining));
          skipped = 0;
          remaining -= chunk.length;
          yield chunk;
        }
      } finally { await reader.cancel().catch(() => undefined); }
    }
  }
  const iterator = chunks();
  return new Response(new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const result = await iterator.next();
        if (result.done) controller.close();
        else controller.enqueue(result.value);
      } catch (error) { controller.error(error); abort.abort(); }
    },
    async cancel() { abort.abort(); await iterator.return(undefined); },
  }), { status: range.partial ? 206 : 200, headers });
}

export const GET = serve;
export const HEAD = serve;
