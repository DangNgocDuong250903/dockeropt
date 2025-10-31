export function renderHero() {
  return `
    <section class="bg-gradient-to-br from-primary-50 via-white to-blue-50 py-16 sm:py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div class="mb-6">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
            🚀 Free & Open Source
          </span>
        </div>
        
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
          <span class="gradient-text">Shrink images. Speed up builds. Fix security.</span>
          <br>
          <span class="text-gray-700">— in one click.</span>
        </h1>
        
        <p class="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          Optimize your Dockerfiles instantly with AI-powered analysis and battle-tested rules.
        </p>

        <!-- CTA Buttons -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <button
            id="optimize-demo-btn"
            class="btn-primary px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            🚀 Optimize a Demo
          </button>
          <a
            href="#install-section"
            class="btn-secondary px-8 py-3 text-lg font-semibold"
          >
            📦 Install CLI
          </a>
        </div>

        <!-- Social Proof -->
        <div class="flex items-center justify-center gap-6 text-sm text-gray-600 mb-8">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span class="font-semibold">1.2k</span>
            <span>GitHub stars</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xl">•</span>
            <span><strong>50k</strong> optimizations</span>
          </div>
        </div>

        <!-- Feature Pills -->
        <div class="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
          <div class="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
            <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>Multi-stage builds</span>
          </div>
          <div class="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
            <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>Layer optimization</span>
          </div>
          <div class="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
            <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>Security fixes</span>
          </div>
          <div class="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
            <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>Cache efficiency</span>
          </div>
        </div>
      </div>
    </section>
  `;
}

