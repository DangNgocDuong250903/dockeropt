export function renderAIBadge() {
  return `
    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg">
      <svg class="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
      </svg>
      <span class="font-semibold text-sm">Powered by Gemini AI</span>
    </div>
  `;
}

export function renderLoadingAI() {
  return `
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="relative inline-block mb-4">
          <div class="w-16 h-16 border-4 border-purple-200 rounded-full animate-pulse"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-2xl">🤖</span>
          </div>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">AI is analyzing your Dockerfile...</h3>
        <p class="text-sm text-gray-600">This may take 5-10 seconds</p>
      </div>
    </div>
  `;
}

