export function renderExamples({ onLoadBad, onLoadGood }) {
  return `
    <div class="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-6 border border-primary-100">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-2xl">💡</span>
        <div>
          <h3 class="font-semibold text-gray-900">Try Examples</h3>
          <p class="text-sm text-gray-600">Load a sample Dockerfile to see optimization in action</p>
        </div>
      </div>
      
      <div class="grid md:grid-cols-2 gap-4">
        <button
          id="load-bad-example"
          class="text-left p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-primary-400 transition group"
        >
          <div class="flex items-start gap-3">
            <div class="text-2xl">⚠️</div>
            <div>
              <div class="font-medium text-gray-900 group-hover:text-primary-700 mb-1">
                Bad Example
              </div>
              <div class="text-sm text-gray-600">
                Unoptimized Dockerfile with common issues
              </div>
            </div>
          </div>
        </button>

        <button
          id="load-good-example"
          class="text-left p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-green-400 transition group"
        >
          <div class="flex items-start gap-3">
            <div class="text-2xl">✅</div>
            <div>
              <div class="font-medium text-gray-900 group-hover:text-green-700 mb-1">
                Good Example
              </div>
              <div class="text-sm text-gray-600">
                Optimized Dockerfile following best practices
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  `;
}

