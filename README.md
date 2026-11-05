# Image Optimizer

Compress, resize and convert images to **WebP**, **AVIF** or **JPEG** right in your browser. Nothing is uploaded, and it installs as a PWA that works offline.

## Features

- **Drop, browse or paste** images, whole folders included. They're optimized as soon as they're added.
- **Presets** (Balanced, Smallest, High quality), or set format, quality and max dimension yourself.
- **Smart fallback**: if converting would make an image bigger (and it isn't resized), the original is kept. Override per image or with *Always convert*.
- **Before/after slider** to compare quality.
- **Per-image editor**: resize, rotate, flip, brightness/contrast/saturation, PNG export.
- **Download** one image or all of them as a ZIP.
- **Fast and non-blocking**: images are processed in parallel Web Workers.

Accepts PNG, JPEG, WebP, AVIF and GIF (first frame only). Settings and theme are remembered.

## Development

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev       # http://localhost:5173
bun run lint
bun run build     # type-check + production build to dist/
bun run preview   # serve dist/ (the service worker only runs here)
```

## How it works

Each image is decoded with `createImageBitmap`, scaled on an `OffscreenCanvas` and encoded in a pool of up to 4 Web Workers. The browser's built-in encoder is used when it supports the format; otherwise a [jSquash](https://github.com/jamsinclair/jSquash) WebAssembly encoder is loaded on demand (e.g. AVIF in Chrome) and cached for offline use.

**Stack:** React 19, TypeScript, Vite 7, Tailwind CSS 4, shadcn/ui, vite-plugin-pwa, jSquash, JSZip.

Architecture and contributor notes: [AGENTS.md](AGENTS.md).
