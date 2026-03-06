# Image Optimizer PWA

A client-side Progressive Web App for optimizing images. Convert PNG, JPG, WebP, and other formats to WebP, AVIF, or JPEG with configurable quality and resizing.

## Features

- **Drag-and-drop** or click to add images (folders supported)
- **Output formats**: WebP, AVIF, JPEG
- **Quality slider**: 1–100%
- **Max dimension**: Resize images larger than N px (0 = no resize)
- **Bulk processing** with progress indicator
- **ZIP download** for multiple optimized images
- **PWA**: Installable, works offline
- **Dark mode** with system preference support

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui
- Bun

## Development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
bun run preview   # Preview production build
```

## Usage

1. Add images via drag-and-drop or file picker
2. Configure output format, quality, and max dimension
3. Click "Optimize All"
4. Download individual images or the full ZIP
