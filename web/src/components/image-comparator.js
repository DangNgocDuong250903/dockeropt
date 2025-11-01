/**
 * Image Comparator Component - UI for comparing two Docker images
 */

import { renderLayerDNACompare } from './layer-dna-compare.js';

export function renderImageComparator(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const html = `
    <div class="image-comparator-container">
      <div class="card p-6">
        <h2 class="text-2xl font-semibold text-gray-900 mb-4">
          🐳 ImageDiff - Docker Image Comparator
        </h2>
        
        <div class="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p class="text-sm text-purple-800">
            <strong>📖 How to use:</strong> Compare two Docker images by pasting their 
            <code class="bg-purple-100 px-2 py-1 rounded">docker inspect</code> and 
            <code class="bg-purple-100 px-2 py-1 rounded">docker history</code> outputs.
          </p>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          <!-- Image 1 -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-3">Image 1</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Inspect JSON
                </label>
                <textarea
                  id="image1-inspect-input"
                  class="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder='[{"Id": "sha256:...", "RepoTags": ["image:tag"], ...}]'
                ></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  History JSON (Optional)
                </label>
                <textarea
                  id="image1-history-input"
                  class="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder='[{"Id": "sha256:...", "CreatedBy": "...", "Size": 123456}]'
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Image 2 -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-3">Image 2</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Inspect JSON
                </label>
                <textarea
                  id="image2-inspect-input"
                  class="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder='[{"Id": "sha256:...", "RepoTags": ["image:tag"], ...}]'
                ></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  History JSON (Optional)
                </label>
                <textarea
                  id="image2-history-input"
                  class="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder='[{"Id": "sha256:...", "CreatedBy": "...", "Size": 123456}]'
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <button
          id="compare-images-btn"
          class="btn-primary w-full mt-6"
        >
          🔄 Compare Images
        </button>

        <!-- Results Container -->
        <div id="image-comparison-results" class="mt-6 hidden"></div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

export function renderComparisonResults(diff) {
  const resultsContainer = document.getElementById('image-comparison-results');
  if (!resultsContainer) return;

  resultsContainer.className = 'mt-6';
  resultsContainer.classList.remove('hidden');

  const size1MB = (diff.image1.size / (1024 * 1024)).toFixed(2);
  const size2MB = (diff.image2.size / (1024 * 1024)).toFixed(2);
  const sizeDiffMB = (Math.abs(diff.sizeDiff) / (1024 * 1024)).toFixed(2);
  const sizeDiffSign = diff.sizeDiff >= 0 ? '+' : '';

  resultsContainer.innerHTML = `
    <div class="space-y-6">
      <!-- Summary Comparison -->
      <div class="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Comparison Summary</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div class="text-sm text-gray-600 mb-1">Size</div>
            <div class="text-lg font-semibold text-gray-900">
              ${size1MB} MB → ${size2MB} MB
            </div>
            <div class="text-sm ${diff.sizeDiff >= 0 ? 'text-red-600' : 'text-green-600'}">
              ${sizeDiffSign}${sizeDiffMB} MB
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-600 mb-1">Layers</div>
            <div class="text-lg font-semibold text-gray-900">
              ${diff.image1.layers.length} → ${diff.image2.layers.length}
            </div>
            <div class="text-sm ${diff.layerDiff >= 0 ? 'text-red-600' : 'text-green-600'}">
              ${diff.layerDiff >= 0 ? '+' : ''}${diff.layerDiff}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-600 mb-1">Common Layers</div>
            <div class="text-lg font-semibold text-gray-900">${diff.commonLayers.length}</div>
          </div>
          <div>
            <div class="text-sm text-gray-600 mb-1">Efficiency Gain</div>
            <div class="text-lg font-semibold ${diff.efficiencyGain >= 0 ? 'text-green-600' : 'text-red-600'}">
              ${diff.efficiencyGain >= 0 ? '+' : ''}${diff.efficiencyGain}
            </div>
          </div>
        </div>
      </div>

      <!-- Layer Differences -->
      ${diff.differentLayers.length > 0 ? `
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Layer Differences (${diff.differentLayers.length})
          </h3>
          <div class="space-y-4">
            ${diff.differentLayers.map((d, i) => renderLayerDifference(d, i, diff.differentLayers, diff.sizeDiff)).join('')}
          </div>
        </div>
      ` : `
        <div class="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <p class="text-green-800">✅ No differences found between images</p>
        </div>
      `}

      <!-- Comparison Graph -->
      <div id="comparison-graph-container"></div>

      <!-- LayerDNA Visual Diff -->
      <div id="layerdna-compare-container" class="mt-6"></div>
    </div>
  `;
}

function renderLayerDifference(diff, index, allDiffs = [], totalSizeDiff = 0) {
  // Calculate layer size - use actual size if available, otherwise estimate
  const calculateLayerSize = (layer, imageSize, totalLayers) => {
    if (layer && layer.size && layer.size > 0) {
      return layer.size;
    }
    // Estimate from total size if available
    if (imageSize > 0 && totalLayers > 0) {
      return imageSize / totalLayers;
    }
    return 0;
  };

  // For removed layers, try to get size from diff.sizeDiff or estimate
  let layer1Size = 0;
  if (diff.layer1) {
    layer1Size = calculateLayerSize(diff.layer1, diff.image1?.size || 0, diff.image1?.layers?.length || 1);
    // If size is 0 but we have sizeDiff, use it
    if (layer1Size === 0 && diff.sizeDiff !== 0) {
      layer1Size = Math.abs(diff.sizeDiff);
    }
    // If still 0, estimate from total size diff divided by removed layers
    if (layer1Size === 0 && totalSizeDiff < 0) {
      const removedCount = allDiffs.filter(d => d.type === 'removed').length;
      if (removedCount > 0) {
        layer1Size = Math.abs(totalSizeDiff) / removedCount;
      }
    }
  }

  let layer2Size = 0;
  if (diff.layer2) {
    layer2Size = calculateLayerSize(diff.layer2, diff.image2?.size || 0, diff.image2?.layers?.length || 1);
    // If size is 0 but we have sizeDiff, use it
    if (layer2Size === 0 && diff.sizeDiff !== 0) {
      layer2Size = Math.abs(diff.sizeDiff);
    }
  }

  const size1MB = layer1Size > 0 ? (layer1Size / (1024 * 1024)).toFixed(2) : 'N/A';
  const size2MB = layer2Size > 0 ? (layer2Size / (1024 * 1024)).toFixed(2) : 'N/A';
  const sizeDiffMB = diff.sizeDiff !== 0 ? (Math.abs(diff.sizeDiff) / (1024 * 1024)).toFixed(2) : 
                     (layer1Size > 0 || layer2Size > 0 ? (Math.abs(layer1Size - layer2Size) / (1024 * 1024)).toFixed(2) : '0.00');

  const typeColors = {
    added: 'green',
    removed: 'red',
    changed: 'yellow',
  };

  const typeLabels = {
    added: '➕ Added',
    removed: '➖ Removed',
    changed: '🔄 Changed',
  };

  const color = typeColors[diff.type] || 'gray';
  const label = typeLabels[diff.type] || diff.type;

  return `
    <div class="border border-${color}-200 rounded-lg p-4 bg-${color}-50">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
          <span class="text-xl">${label}</span>
          <span class="px-2 py-1 text-xs rounded-full bg-${color}-200 text-${color}-800">
            ${diff.type.toUpperCase()}
          </span>
        </div>
        <div class="text-sm text-gray-600">
          Layer ${diff.layer1Index >= 0 ? diff.layer1Index : 'N/A'} → ${diff.layer2Index >= 0 ? diff.layer2Index : 'N/A'}
        </div>
      </div>

      ${diff.type === 'added' && diff.layer2 ? `
        <div class="mb-2">
          <div class="text-sm font-medium text-gray-700 mb-1">Size:</div>
          <div class="text-lg font-semibold text-green-700">+${size2MB} MB</div>
        </div>
        <div class="mb-2 p-2 bg-white rounded font-mono text-sm text-gray-700">
          ${escapeHtml(diff.layer2.createdBy || diff.instructionDiff)}
        </div>
      ` : ''}

      ${diff.type === 'removed' && diff.layer1 ? `
        <div class="mb-2">
          <div class="text-sm font-medium text-gray-700 mb-1">Size Saved:</div>
          <div class="text-lg font-semibold text-red-700">-${size1MB} MB</div>
        </div>
        <div class="mb-2 p-2 bg-white rounded font-mono text-sm text-gray-700">
          ${escapeHtml(diff.layer1.createdBy || diff.instructionDiff)}
        </div>
      ` : ''}

      ${diff.type === 'changed' ? `
        <div class="grid md:grid-cols-2 gap-4 mb-2">
          <div>
            <div class="text-sm font-medium text-red-700 mb-1">Before</div>
            <div class="text-sm text-gray-600 mb-2">${size1MB} MB</div>
            ${diff.layer1?.createdBy ? `
              <div class="p-2 bg-white rounded font-mono text-xs text-gray-700">
                ${escapeHtml(diff.layer1.createdBy)}
              </div>
            ` : ''}
          </div>
          <div>
            <div class="text-sm font-medium text-green-700 mb-1">After</div>
            <div class="text-sm text-gray-600 mb-2">${size2MB} MB</div>
            ${diff.layer2?.createdBy ? `
              <div class="p-2 bg-white rounded font-mono text-xs text-gray-700">
                ${escapeHtml(diff.layer2.createdBy)}
              </div>
            ` : ''}
          </div>
        </div>
        <div class="p-2 bg-white rounded font-mono text-sm text-gray-700">
          ${escapeHtml(diff.instructionDiff)}
        </div>
      ` : ''}
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

