# DockerOpt Web Demo

Beautiful web interface for DockerOpt - Dockerfile Optimizer.

## Features

- 🎨 Modern UI with Tailwind CSS
- ⚡ Fast and responsive with Vite
- 📝 Code editor for Dockerfile editing
- 🔍 Real-time optimization analysis
- 📊 Visual metrics and scoring
- 📥 Download optimized Dockerfiles
- 📋 One-click copy functionality

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

The web app is built with:
- **Vite** - Lightning fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Vanilla JavaScript** - No framework overhead
- **DockerOpt Core** - The optimization engine

## Project Structure

```
web/
├── src/
│   ├── components/      # UI components
│   │   ├── header.js
│   │   ├── hero.js
│   │   ├── editor.js
│   │   ├── results.js
│   │   ├── examples.js
│   │   └── footer.js
│   ├── app.js          # Main application logic
│   ├── editor.js       # Code editor setup
│   ├── main.js         # Entry point
│   └── style.css       # Global styles
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Deployment

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm run build
# Upload dist/ folder to Netlify
```

### GitHub Pages

```bash
npm run build
# Copy dist/ to gh-pages branch
```

## Environment Variables

No environment variables needed for basic usage. All processing happens client-side.

## License

MIT - see LICENSE file

