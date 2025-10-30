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
                <a href="https://github.com/dockeropt/dockeropt" target="_blank" rel="noopener" class="hover:text-white transition">
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
          <div class="grid md:grid-cols-3 gap-6">
            <div class="bg-gray-800 p-6 rounded-lg">
              <div class="text-3xl mb-3">📝</div>
              <h4 class="text-white font-semibold mb-2">1. Parse</h4>
              <p class="text-sm text-gray-400">
                Analyzes your Dockerfile structure and builds an AST (Abstract Syntax Tree) for deep inspection.
              </p>
            </div>
            
            <div class="bg-gray-800 p-6 rounded-lg">
              <div class="text-3xl mb-3">🔍</div>
              <h4 class="text-white font-semibold mb-2">2. Analyze</h4>
              <p class="text-sm text-gray-400">
                Runs 11+ optimization rules covering multi-stage builds, caching, security, and best practices.
              </p>
            </div>
            
            <div class="bg-gray-800 p-6 rounded-lg">
              <div class="text-3xl mb-3">✨</div>
              <h4 class="text-white font-semibold mb-2">3. Optimize</h4>
              <p class="text-sm text-gray-400">
                Generates an optimized Dockerfile with fixes applied and provides detailed metrics and diff.
              </p>
            </div>
          </div>
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

