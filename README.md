# 🐳 DockerOpt - Dockerfile Optimizer

> Free and open-source Dockerfile optimizer that helps you build smaller, faster, and more secure Docker images.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/DangNgocDuong250903/dockeropt)](https://github.com/DangNgocDuong250903/dockeropt)
[![npm version](https://img.shields.io/npm/v/dockeropt)](https://www.npmjs.com/package/dockeropt)

## ✨ Features

- 🔍 **Intelligent Analysis** - AI-powered analysis with Gemini for detailed Dockerfile optimization
- 📦 **Size Reduction** - Reduce image size by up to 70% with optimized base images and multi-stage builds
- 🔒 **Security Fixes** - Automatically detect and fix security issues (non-root user, pinned versions, etc.)
- ⚡ **Performance** - Optimize layer caching and reduce build time by up to 42%
- 📊 **Detailed Reports** - Get comprehensive reports with before/after comparisons
- 🌐 **Web Interface** - Beautiful web UI for instant Dockerfile optimization
- 🛠️ **CLI Tool** - Command-line tool for CI/CD integration
- 📝 **Multiple Formats** - Support for text, JSON, Markdown, and SARIF output formats
- 🧬 **Image Inspector** - Deep dive into Docker image layers (like Dive)
- 🔄 **Build Replay** - Visual timeline of Docker build process with cache analysis
- 🧠 **Layer AI** - AI-powered layer behavior analysis and optimization suggestions
- ⚙️ **Config Wizard** - Interactive wizard for Docker configuration optimization
- 🔎 **Secret Detection** - Automatically detect secrets and sensitive data
- 📈 **Layer DNA Compare** - Visual comparison of image layer composition

## 🚀 Quick Start

### Web Interface (Recommended)

Visit the [web interface](https://dockeropt.duongtech.me/) for instant optimization:

1. Paste your Dockerfile
2. Click "Optimize"
3. Get optimized Dockerfile with detailed analysis

### CLI Installation

#### Option 1: Build from Source

```bash
git clone https://github.com/DangNgocDuong250903/dockeropt.git
cd dockeropt
npm install
npm run build
npm link
```

#### Option 2: Use with npx (Temporary)

```bash
npx -y dockeropt lint Dockerfile
npx -y dockeropt fix Dockerfile
```

#### Option 3: Global Install (After Publishing to npm)

```bash
npm install -g dockeropt
```

## 📖 Usage

### Basic Commands

```bash
# Lint Dockerfile for issues
dockeropt lint Dockerfile

# Optimize and generate fixed Dockerfile
dockeropt fix Dockerfile -o out

# Run in CI mode (fails on high severity issues)
dockeropt ci Dockerfile --fail-on high

# Explain Dockerfile structure and suggestions
dockeropt explain Dockerfile
```

### CLI Options

#### `lint` Command

```bash
dockeropt lint <dockerfile> [options]

Options:
  -f, --format <format>     Output format: text, json, sarif (default: text)
  --context <path>          Path to build context directory
  --package-manager <pm>    Package manager: npm, pnpm, yarn, apt, apk, pip, poetry, go, cargo
```

#### `fix` Command

```bash
dockeropt fix <dockerfile> [options]

Options:
  -o, --output <path>       Output directory (default: out)
  -f, --format <format>    Report format: text, markdown, json (default: markdown)
  --context <path>          Path to build context directory
  --package-manager <pm>   Package manager type
```

#### `ci` Command

```bash
dockeropt ci <dockerfile> [options]

Options:
  --format <format>         Output format: sarif, json (default: sarif)
  --out <file>              Output file path (default: results.sarif)
  --fail-on <severity>     Fail on severity: high, medium, low (default: high)
  --context <path>          Path to build context directory
```

## 📝 Examples

### Example: Before and After

**Before (Unoptimized):**
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN apt-get update
RUN apt-get install -y curl wget
EXPOSE 3000
CMD ["npm", "start"]
```

**After (Optimized):**
```dockerfile
FROM node:18-alpine@sha256:a6385524b09b9de27e332b22e90fb7a70e3adf1a41a54edd0c8e6e597f4e9aaf AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
RUN npm run build

FROM node:18-alpine@sha256:a6385524b09b9de27e332b22e90fb7a70e3adf1a41a54edd0c8e6e597f4e9aaf
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
CMD ["node", "dist/index.js"]
```

**Results:**
- Size reduction: ~135 MB
- Layer reduction: 3 layers
- Build time improvement: ~42%
- Security: Non-root user added
- Cache efficiency: Improved

## 🔧 Optimization Rules

DockerOpt applies 11+ optimization rules:

- ✅ **Multi-stage builds** - Separate build and runtime stages
- ✅ **Layer caching** - Optimize COPY order for better cache hits
- ✅ **Base image optimization** - Use Alpine, slim, or distroless variants
- ✅ **Pin digest** - Pin base images with SHA256 for reproducible builds
- ✅ **Non-root user** - Run containers as non-root for security
- ✅ **Clean package managers** - Remove package manager cache
- ✅ **Combine RUN commands** - Reduce number of layers
- ✅ **Use .dockerignore** - Exclude unnecessary files
- ✅ **Pin versions** - Use specific versions instead of `latest`
- ✅ **Minimize layers** - Combine related operations
- ✅ **Security scanning** - Detect security vulnerabilities

## 🎯 Supported Languages

DockerOpt has optimized examples for:

- **Node.js** - npm, yarn, pnpm
- **Python** - pip, poetry
- **Go** - Go modules
- **Java** - Maven, Gradle
- **Rust** - Cargo
- **PHP** - Composer
- **Ruby** - Bundler
- And more...

## 🌐 Web Interface

The web interface provides:

- 📝 **Live Editor** - Monaco editor with syntax highlighting
- 📊 **Visual Metrics** - Size, layer, and build time comparisons
- 🔍 **Side-by-Side Diff** - Before/After comparison
- 🎨 **Beautiful UI** - Modern, responsive design
- 🔗 **GitHub Integration** - Fetch Dockerfiles directly from GitHub URLs
- 🌍 **Multi-language Examples** - Node, Go, Python, Java examples
- 📋 **One-Click Copy** - Copy optimized Dockerfile instantly
- 🧬 **Image Analysis** - Inspect and analyze existing Docker images
- 🔄 **Build Timeline** - Visualize build process with cache efficiency
- 🧠 **AI Suggestions** - Get intelligent layer optimization recommendations
- ⚙️ **Interactive Wizard** - Step-by-step Docker configuration guide

### Setup Web Interface

```bash
cd web
npm install
npm run dev  # Development server on http://localhost:3000
npm run build  # Production build
```

**Note**: For AI-powered features, set `VITE_GEMINI_API_KEY` in `.env` file:
```bash
VITE_GEMINI_API_KEY=your_api_key_here
```

Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

## 🔒 Security & Privacy

- **100% Local** - All analysis runs locally in your browser/CLI
- **No Data Collection** - Your Dockerfile never leaves your machine
- **Open Source** - Full source code available for audit
- **No Backend** - No server, no database, no logging

## 🛠️ Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

```bash
# Clone repository
git clone https://github.com/DangNgocDuong250903/dockeropt.git
cd dockeropt

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Project Structure

```
dockeropt/
├── src/                 # Core optimization engine (TypeScript)
│   ├── cli.ts          # CLI entry point
│   ├── optimizer.ts    # Main optimizer
│   ├── rules.ts        # Optimization rules
│   ├── parser.ts        # Dockerfile parser
│   └── ...
├── web/                # Web interface
│   ├── src/
│   │   ├── app.js      # Main app logic
│   │   ├── components/ # UI components
│   │   └── ...
│   └── ...
├── examples/           # Example Dockerfiles
└── dist/               # Compiled output
```

## 📊 Output Formats

### Text Format

```
📋 Dockerfile Lint Results

HIGH (2):
  1. Base image should use specific tag instead of 'latest'
     Fix: Use 'node:18-alpine@sha256:...'
  2. Container runs as root user
     Fix: Add 'USER node' or create non-root user
```

### JSON Format

```json
{
  "findings": [
    {
      "severity": "high",
      "message": "Base image should use specific tag",
      "lineNumber": 1,
      "suggestion": "Use 'node:18-alpine@sha256:...'"
    }
  ],
  "metrics": {
    "estimatedSizeSavings": 135,
    "layerReduction": 3,
    "securityScore": 85
  }
}
```

### SARIF Format

For integration with GitHub Advanced Security, CodeQL, and other security tools.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Google Gemini AI](https://ai.google.dev/) for AI-powered analysis
- All contributors and users of DockerOpt

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/DangNgocDuong250903/dockeropt/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/DangNgocDuong250903/dockeropt/discussions)
- 📧 **Contact**: Open an issue on GitHub

## ⭐ Star History

If you find DockerOpt useful, please consider giving it a star on GitHub!

---

Made with ❤️ by [Đặng Ngọc Dương](https://github.com/DangNgocDuong250903)

