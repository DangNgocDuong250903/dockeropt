/**
 * Build Timeline Visualizer Component
 * Timeline chart showing build steps like GitLens
 */

export function renderBuildTimeline(timeline, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const html = `
    <div class="build-timeline-container">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">⏱️ Build Timeline</h3>
        <div class="flex items-center gap-4 text-sm text-gray-600">
          <div>
            <span class="font-semibold">Total Time:</span>
            <span class="ml-2">${Math.round(timeline.totalTime)}s</span>
          </div>
          <div>
            <span class="font-semibold">Cache Efficiency:</span>
            <span class="ml-2">${timeline.cacheEfficiency}%</span>
          </div>
        </div>
      </div>
      
      <div class="bg-white border border-gray-200 rounded-lg p-6 overflow-x-auto">
        <div class="min-w-[600px]">
          <!-- Timeline chart -->
          <div class="relative">
            ${timeline.steps.map((step, index) => renderTimelineStep(step, index, timeline.totalTime)).join('')}
          </div>
        </div>
      </div>
      
      ${timeline.slowestSteps.length > 0 ? `
        <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 class="font-semibold text-yellow-900 mb-2">🐌 Slowest Steps</h4>
          <ul class="space-y-2">
            ${timeline.slowestSteps.map(step => `
              <li class="text-sm text-yellow-800">
                <span class="font-medium">Layer ${step.index + 1}:</span>
                ${step.instruction.substring(0, 60)}...
                <span class="text-yellow-600">(${step.duration}s)</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${timeline.cacheMisses.length > 0 ? `
        <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 class="font-semibold text-red-900 mb-2">❌ Cache Misses (${timeline.cacheMisses.length})</h4>
          <ul class="space-y-2">
            ${timeline.cacheMisses.map(step => `
              <li class="text-sm text-red-800">
                Layer ${step.index + 1}: ${step.instruction.substring(0, 60)}...
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;

  container.innerHTML = html;
}

function renderTimelineStep(step, index, totalTime) {
  const percentage = Math.max(1, (step.duration / totalTime) * 100);
  const leftPercentage = Math.max(0, (step.startTime / totalTime) * 100);
  const color = step.cacheHit ? 'bg-green-500' : 'bg-red-500';
  const cacheIcon = step.cacheHit ? '✅' : '❌';
  
  return `
    <div class="mb-4 relative" style="margin-left: ${leftPercentage}%">
      <div class="flex items-center gap-3">
        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
          ${index + 1}
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-medium text-gray-900">Layer ${index + 1}</span>
            <span class="text-xs">${cacheIcon}</span>
            ${step.cacheReason ? `
              <span class="text-xs text-gray-500">(${step.cacheReason})</span>
            ` : ''}
            <span class="text-xs text-gray-500">${step.duration}s</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="${color} h-4 rounded" style="width: ${Math.max(percentage * 10, 100)}px;"></div>
            <span class="text-xs text-gray-600 truncate" style="max-width: 300px;">
              ${escapeHtml(step.instruction)}
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

