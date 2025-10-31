export function renderFooter() {
  return `
    <footer class="bg-gray-900 text-gray-300 mt-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="grid md:grid-cols-4 gap-8 mb-8">
          <!-- About -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <span class="text-3xl">🐳</span>
              <h3 class="text-xl font-bold text-white">DockerOpt</h3>
            </div>
            <p class="text-sm text-gray-400">
              Open-source Dockerfile optimizer that helps you build smaller, faster, and more secure Docker images.
            </p>
          </div>

          <!-- Resources -->
          <div>
            <h4 class="text-white font-semibold mb-4">Resources</h4>
            <ul class="space-y-2 text-sm">
              <li><a href="#" class="hover:text-white transition">Documentation</a></li>
              <li><a href="#" class="hover:text-white transition">Best Practices</a></li>
              <li><a href="#" class="hover:text-white transition">Examples</a></li>
              <li><a href="#" class="hover:text-white transition">API Reference</a></li>
            </ul>
          </div>

          <!-- Tools -->
          <div>
            <h4 class="text-white font-semibold mb-4">Tools</h4>
            <ul class="space-y-2 text-sm">
              <li><a href="#" class="hover:text-white transition">CLI Tool</a></li>
              <li><a href="#" class="hover:text-white transition">GitHub Action</a></li>
              <li><a href="#" class="hover:text-white transition">VS Code Extension</a></li>
              <li><a href="#" class="hover:text-white transition">Web Demo</a></li>
            </ul>
          </div>

          <!-- Community -->
          <div>
            <h4 class="text-white font-semibold mb-4">Community</h4>
            <ul class="space-y-2 text-sm">
              <li>
                <a href="https://github.com/DangNgocDuong250903/dockeropt" target="_blank" rel="noopener" class="hover:text-white transition">
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://www.npmjs.com/package/dockeropt" target="_blank" rel="noopener" class="hover:text-white transition">
                  NPM
                </a>
              </li>
              <li>
                <a href="#" class="hover:text-white transition">
                  Discord
                </a>
              </li>
              <li>
                <a href="#" class="hover:text-white transition">
                  Twitter
                </a>
              </li>
            </ul>
          </div>
        </div>

        <!-- How it Works -->
        <div id="how-it-works" class="border-t border-gray-800 pt-8 mb-8">
          <h3 class="text-2xl font-bold text-white mb-6">How It Works</h3>
          <div class="grid md:grid-cols-3 gap-6 mb-8">
            <div class="bg-gray-800 p-6 rounded-lg">
              <div class="text-3xl mb-3">📝</div>
              <h4 class="text-white font-semibold mb-2">1. Paste Dockerfile</h4>
              <p class="text-sm text-gray-400">
                Paste your Dockerfile or fetch from GitHub. All processing happens locally in your browser.
              </p>
            </div>
            
            <div class="bg-gray-800 p-6 rounded-lg">
              <div class="text-3xl mb-3">🔍</div>
              <h4 class="text-white font-semibold mb-2">2. Get Fixes + Diff</h4>
              <p class="text-sm text-gray-400">
                Analyzes with 11+ rules. Shows before/after comparison with metrics: size, layers, build time.
              </p>
            </div>
            
            <div class="bg-gray-800 p-6 rounded-lg">
              <div class="text-3xl mb-3">✨</div>
              <h4 class="text-white font-semibold mb-2">3. Apply Patch / Install CLI</h4>
              <p class="text-sm text-gray-400">
                Copy optimized Dockerfile, download, or install CLI for CI/CD integration.
              </p>
            </div>
          </div>
          
          <!-- Mini flow diagram -->
          <div class="flex items-center justify-center gap-4 text-sm text-gray-400">
            <span>Paste</span>
            <span>→</span>
            <span>Analyze</span>
            <span>→</span>
            <span>Optimize</span>
            <span>→</span>
            <span>Apply</span>
          </div>
        </div>

        <!-- Installation Section -->
        <div id="install-section" class="border-t border-gray-800 pt-8 mb-8">
          <h3 class="text-2xl font-bold text-white mb-6">Installation</h3>
          
          <!-- OS Tabs -->
          <div class="mb-6">
            <div class="flex flex-wrap gap-2 border-b border-gray-700 pb-2">
              <button data-install-os="macos" class="px-4 py-2 text-sm font-medium rounded-t-lg transition bg-gray-800 text-white border-b-2 border-primary-500">
                macOS
              </button>
              <button data-install-os="linux" class="px-4 py-2 text-sm font-medium rounded-t-lg transition text-gray-400 hover:text-white hover:bg-gray-800">
                Linux
              </button>
              <button data-install-os="windows" class="px-4 py-2 text-sm font-medium rounded-t-lg transition text-gray-400 hover:text-white hover:bg-gray-800">
                Windows
              </button>
            </div>
          </div>

          <!-- Installation content (default: macOS) -->
          <div id="install-content" class="bg-gray-800 p-6 rounded-lg">
            <div class="space-y-4">
              <div>
                <h4 class="text-white font-semibold mb-2 flex items-center gap-2">
                  <span>📦</span>
                  <span>npm (Global Install)</span>
                </h4>
                <pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto"><code>npm install -g dockeropt</code></pre>
                <p class="text-xs text-gray-400 mt-1">After publishing to npm</p>
              </div>
              <div class="text-gray-400 text-sm">or</div>
              <div>
                <h4 class="text-white font-semibold mb-2 flex items-center gap-2">
                  <span>🔨</span>
                  <span>Build from Source</span>
                </h4>
                <pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto"><code>git clone https://github.com/DangNgocDuong250903/dockeropt.git
cd dockeropt
npm install
npm run build
npm link</code></pre>
              </div>
              <div class="text-gray-400 text-sm">or</div>
              <div>
                <h4 class="text-white font-semibold mb-2 flex items-center gap-2">
                  <span>🚀</span>
                  <span>Use with npx (temporary)</span>
                </h4>
                <pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto"><code>npx -y dockeropt lint Dockerfile
npx -y dockeropt fix Dockerfile</code></pre>
              </div>
            </div>
          </div>
          
          <!-- CLI Usage Examples -->
          <div class="mt-6 border-t border-gray-700 pt-6">
            <h4 class="text-white font-semibold mb-4">📖 Usage Examples</h4>
            <div class="space-y-3">
              <div>
                <p class="text-sm text-gray-300 mb-2">Lint Dockerfile for issues:</p>
                <pre class="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto"><code>dockeropt lint Dockerfile</code></pre>
              </div>
              <div>
                <p class="text-sm text-gray-300 mb-2">Optimize and generate fixed Dockerfile:</p>
                <pre class="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto"><code>dockeropt fix Dockerfile -o out</code></pre>
              </div>
              <div>
                <p class="text-sm text-gray-300 mb-2">Run in CI mode (fails on high severity):</p>
                <pre class="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto"><code>dockeropt ci Dockerfile --fail-on high</code></pre>
              </div>
              <div>
                <p class="text-sm text-gray-300 mb-2">Explain Dockerfile structure:</p>
                <pre class="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto"><code>dockeropt explain Dockerfile</code></pre>
              </div>
            </div>
          </div>
        </div>

        <!-- Rule Catalog -->
        <div class="border-t border-gray-800 pt-8 mb-8">
          <h3 class="text-2xl font-bold text-white mb-6">Optimization Rules</h3>
          <div class="space-y-2">
            ${['Cache', 'Multi-stage', 'Pin digest', 'Non-root', 'Clean apt', 'Combine RUN', 'Use .dockerignore', 'Pin versions', 'Minimize layers', 'Security scan'].map((rule, idx) => `
              <details class="bg-gray-800 p-4 rounded-lg">
                <summary class="text-white font-medium cursor-pointer hover:text-primary-300 transition">
                  ${rule}
                </summary>
                <div class="mt-3 text-sm text-gray-400 space-y-2">
                  <p>Optimizes ${rule.toLowerCase()} for better performance and security.</p>
                  <div class="flex items-center gap-2 text-xs">
                    <span class="px-2 py-1 bg-gray-700 rounded">Impact: High</span>
                    <span class="px-2 py-1 bg-gray-700 rounded">Severity: Medium</span>
                  </div>
                </div>
              </details>
            `).join('')}
          </div>
        </div>

        <!-- Changelog -->
        <div class="border-t border-gray-800 pt-8 mb-8">
          <details class="bg-gray-800 p-4 rounded-lg">
            <summary class="text-white font-semibold cursor-pointer hover:text-primary-300 transition">
              📋 What changed in v0.5.0
            </summary>
            <div class="mt-4 text-sm text-gray-400 space-y-2">
              <ul class="list-disc list-inside space-y-1">
                <li>Added AI-powered analysis with Gemini</li>
                <li>Before/After side-by-side comparison</li>
                <li>Language-specific examples (Node, Go, Python, Java)</li>
                <li>GitHub URL fetch support</li>
                <li>Shareable result links</li>
                <li>README badge generator</li>
                <li>Improved security scanning</li>
              </ul>
            </div>
          </details>
        </div>

        <!-- Bottom -->
        <div class="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div class="text-gray-400">
            © ${new Date().getFullYear()} DockerOpt. Open source under MIT License.
          </div>
          <div class="flex items-center gap-6">
            <a href="#" class="text-gray-400 hover:text-white transition">Privacy</a>
            <a href="#" class="text-gray-400 hover:text-white transition">Terms</a>
            <a href="#" class="text-gray-400 hover:text-white transition">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  `;
}

