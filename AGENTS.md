# AGENTS.md

Client-side image optimizer PWA (React 19, TypeScript, Vite 7, Tailwind CSS 4, shadcn/ui). There is no backend: decoding, resizing and encoding all happen in the browser. See [README.md](README.md) for features.

## Commands

Use **Bun** (`bun.lock`). Don't add npm, yarn or pnpm lockfiles.

```bash
bun install
bun run dev       # Vite dev server
bun run lint      # ESLint
bun run build     # tsc -b + vite build -> dist/
bun run preview   # serve dist/ with the service worker
```

There is no test suite. Before finishing, make sure `bun run lint` and `bun run build` both pass. For UI changes, also check the app in a browser.

## Layout

```text
src/
  App.tsx                      layout, toasts; wires useImageOptimizer to the UI
  hooks/
    use-image-optimizer.ts     all app state: items, settings, queue, stats
    use-file-intake.ts         page-wide drag & drop (incl. folders) and paste
    use-theme.ts               light / dark / system
  lib/
    image-processor.ts         decode -> resize -> encode, keep-original logic (worker)
    codecs.ts                  native encoder probe + jSquash WASM fallback (worker)
    worker-pool.ts             worker pool, job queue, cancellation
    image-editor.ts            advanced editor rendering (main thread)
    files.ts                   accepted types, folder traversal
    download.ts                single file and ZIP download
  workers/optimizer.worker.ts  runs processImage
  components/                  app UI (image-editor.tsx = editor dialog, image-lightbox.tsx = before/after)
  components/ui/               shadcn/ui primitives
```

## How it fits together

- `useImageOptimizer` owns all state. Added files are queued right away through `processInWorker`, which runs `processImage` in up to 4 module workers. Cancelling aborts the job's `AbortSignal`. If the job is already running, its worker is terminated.
- Worker messages are structured-cloned, so `ProcessResult` can only hold plain data and `Blob`s.
- `encodeCanvas` uses `OffscreenCanvas.convertToBlob` when the browser can encode the format natively. Otherwise it lazy-imports `@jsquash/webp` or `@jsquash/avif`. Chromium can't encode AVIF natively, so AVIF goes through WASM there. `avifQuality` remaps the slider for libavif so the same setting looks about the same across formats.
- If an image isn't resized and re-encoding doesn't shrink it, `processImage` returns the original bytes and keeps the conversion in `converted`. `getItemOutput` decides which file is downloaded: the per-image `preferConverted` if set, otherwise the global `alwaysConvert`.
- An item is stale when its `optimizedWith` differs from the current options (`sameOptions`).
- The advanced editor renders on the main thread and only uses native `convertToBlob`. If the browser can't encode AVIF, it falls back to WebP.

## Conventions

- Import through the `@/` alias, which maps to `src/`.
- TypeScript runs in strict mode. App code uses double quotes, semicolons and 2-space indents. There's no Prettier, so match the file you're editing.
- Components use kebab-case file names and named exports (`export function ImageCard`).
- Style with Tailwind classes and `cn()` from `@/lib/utils`. Theme tokens and custom utilities (`brand`, `bg-gradient-brand`, animations) live in `src/index.css`.
- Use `lucide-react` for icons and `sonner` for toasts.
- `lib/image-processor.ts` and `lib/codecs.ts` run in a worker, so keep them DOM-free.
- Revoke every `URL.createObjectURL` when it's no longer needed (see `revokeUrls`).
- Load heavy dependencies (jSquash, JSZip) lazily with `await import()`.
- Keep comments short and explain *why*, not *what*.

## Gotchas

- ESLint includes the `react-hooks` v7 compiler rules. Don't call `setState` synchronously in an effect, and don't read or write `ref.current` during render. Instead, derive values during render, update state from event handlers, or sync refs in `useLayoutEffect`.
- `vite.config.ts` needs `worker.format: 'es'` and `optimizeDeps.exclude` for the jSquash packages. Don't remove either one.
- The service worker doesn't run under `bun run dev`. To test PWA and offline behavior, use `bun run build && bun run preview`. `.wasm` files aren't precached; they're cached the first time they're used.
- When adding a setting, update `ProcessOptions`, `DEFAULT_OPTIONS`, `loadSettings` (it validates the saved `localStorage` data), `sameOptions` and the presets in `settings-panel.tsx`.
- `bunx shadcn add` has previously added unrelated packages and bumped `radix-ui`, so review the `package.json` diff after running it. UI primitives import from the unified `radix-ui` package.
