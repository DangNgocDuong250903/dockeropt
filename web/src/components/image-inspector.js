/**
 * Image Inspector Component - UI for analyzing Docker images
 */

import { LayerAI } from '../layer-ai.js';
import { BuildReplayVisualizer } from '../build-replay.js';
import { SecretDetector } from '../secret-detector.js';
import { renderBuildTimeline } from './build-timeline.js';

export function renderImageInspector(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const html = `
    <div class="image-inspector-container">
      <div class="card p-6">
        <h2 class="text-2xl font-semibold text-gray-900 mb-4">
          🧩 Docker Image Inspector
        </h2>
        
        <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-sm text-blue-800">
            <strong>📖 How to use:</strong> Run <code class="bg-blue-100 px-2 py-1 rounded">docker inspect &lt;image&gt;</code> 
            and <code class="bg-blue-100 px-2 py-1 rounded">docker history --format json &lt;image&gt;</code>, 
            then paste the JSON output below.
          </p>
        </div>

        <div class="space-y-6">
          <!-- Input Section -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Docker Inspect JSON
            </label>
            <textarea
              id="inspect-json-input"
              class="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm"
              placeholder='[{"Id": "sha256:...", "RepoTags": ["image:tag"], ...}]'
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Docker History JSON (Optional)
            </label>
            <textarea
              id="history-json-input"
              class="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm"
              placeholder='[{"Id": "sha256:...", "CreatedBy": "...", "Size": 123456}]'
            ></textarea>
            <p class="mt-1 text-xs text-gray-500">
              Run: <code>docker history --format json &lt;image&gt; | jq -s '.'</code>
            </p>
          </div>

          <button
            id="analyze-image-btn"
            class="btn-primary w-full"
          >
            🔍 Analyze Image Layers
          </button>
        </div>

        <!-- Results Container -->
        <div id="image-analysis-results" class="mt-6 hidden"></div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

export function renderImageAnalysis(imageInfo, analyses, efficiencyScore, graphData) {
  const resultsContainer = document.getElementById('image-analysis-results');
  if (!resultsContainer) return;

  const sizeMB = (imageInfo.size / (1024 * 1024)).toFixed(2);
  const totalWasted = analyses.reduce((sum, a) => sum + a.wastedSpace, 0);
  const wastedMB = (totalWasted / (1024 * 1024)).toFixed(2);

  // AI Analysis
  const layerAI = new LayerAI();
  const allLayers = imageInfo.layers;
  const aiBehaviors = allLayers.map(layer => layerAI.analyzeLayerBehavior(layer, allLayers));
  const aiSuggestions = allLayers.map((layer, index) => 
    layerAI.generateSuggestions(layer, index, allLayers, aiBehaviors[index])
  ).flat();

  // Build Timeline
  const buildReplay = new BuildReplayVisualizer();
  const timeline = buildReplay.createTimeline(allLayers);

  // Secret Detection
  const secretDetector = new SecretDetector();
  const secretFindings = secretDetector.detectSecrets(allLayers);

  resultsContainer.className = 'mt-6';
  resultsContainer.classList.remove('hidden');

  resultsContainer.innerHTML = `
    <div class="space-y-6">
      <!-- Summary -->
      <div class="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div class="text-sm text-gray-600 mb-1">Image</div>
            <div class="text-lg font-semibold text-gray-900">
              ${imageInfo.repo}:${imageInfo.tag}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-600 mb-1">Total Size</div>
            <div class="text-lg font-semibold text-gray-900">${sizeMB} MB</div>
          </div>
          <div>
            <div class="text-sm text-gray-600 mb-1">Layers</div>
            <div class="text-lg font-semibold text-gray-900">${imageInfo.layers.length}</div>
          </div>
          <div>
            <div class="text-sm text-gray-600 mb-1">Efficiency</div>
            <div class="text-lg font-semibold ${efficiencyScore >= 80 ? 'text-green-600' : efficiencyScore >= 60 ? 'text-yellow-600' : 'text-red-600'}">
              ${efficiencyScore}/100
            </div>
          </div>
        </div>
        
        ${totalWasted > 0 ? `
          <div class="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
            <div class="flex items-center gap-2">
              <span>⚠️</span>
              <span class="text-sm font-medium text-yellow-900">
                Estimated wasted space: <strong>${wastedMB} MB</strong>
              </span>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Build Timeline -->
      <div id="build-timeline-container"></div>

      <!-- Secret Findings -->
      ${secretFindings.length > 0 ? `
        <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 class="text-lg font-semibold text-red-900 mb-3 flex items-center gap-2">
            🔒 Security Findings (${secretFindings.length})
          </h3>
          <div class="space-y-3">
            ${secretFindings.map((finding, i) => renderSecretFinding(finding, i)).join('')}
          </div>
        </div>
      ` : ''}

      <!-- AI Suggestions -->
      ${aiSuggestions.length > 0 ? `
        <div class="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 class="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2">
            🧠 AI Optimization Suggestions (${aiSuggestions.length})
          </h3>
          <div class="space-y-3">
            ${aiSuggestions.map((suggestion, i) => renderAISuggestion(suggestion, i)).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Layer Graph -->
      <div id="layer-graph-container"></div>

      <!-- Layer Analysis Details -->
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Layer-by-Layer Analysis</h3>
        <div class="space-y-4">
          ${analyses.map((analysis, index) => renderLayerAnalysis(analysis, index)).join('')}
        </div>
      </div>
    </div>
  `;

  // Render build timeline
  setTimeout(() => {
    if (timeline) {
      renderBuildTimeline(timeline, 'build-timeline-container');
    }
  }, 0);

  // Render layer graph
  if (graphData && typeof window.renderLayerGraph === 'function') {
    window.renderLayerGraph(graphData, 'layer-graph-container');
  }
}

function renderSecretFinding(finding, index) {
  const severityColors = {
    high: 'red',
    medium: 'yellow',
    low: 'blue',
  };
  const color = severityColors[finding.severity] || 'gray';
  
  return `
    <div class="border-l-4 border-${color}-500 bg-${color}-50 p-3 rounded-r-lg">
      <div class="flex items-start justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-xl">${finding.severity === 'high' ? '🔴' : finding.severity === 'medium' ? '🟡' : '🔵'}</span>
          <h4 class="font-semibold text-${color}-900">${finding.finding}</h4>
        </div>
        <span class="px-2 py-1 text-xs rounded-full bg-${color}-200 text-${color}-800">
          Layer ${finding.layerIndex + 1}
        </span>
      </div>
      <p class="text-sm text-${color}-800 mb-2">${finding.description}</p>
      <div class="mt-2 p-2 bg-white rounded border border-${color}-200">
        <span class="text-xs font-medium text-${color}-900">💡 Suggestion:</span>
        <p class="text-xs text-gray-700 mt-1">${finding.suggestion}</p>
      </div>
    </div>
  `;
}

function renderAISuggestion(suggestion, index) {
  const priorityColors = {
    high: 'red',
    medium: 'yellow',
    low: 'blue',
  };
  const color = priorityColors[suggestion.priority] || 'gray';
  
  return `
    <div class="border-l-4 border-${color}-500 bg-${color}-50 p-4 rounded-r-lg">
      <div class="flex items-start justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-lg">🧠</span>
          <h4 class="font-semibold text-${color}-900">Layer ${suggestion.layerIndex + 1}: ${suggestion.issue}</h4>
        </div>
        <span class="px-2 py-1 text-xs rounded-full bg-${color}-200 text-${color}-800">
          ${suggestion.priority.toUpperCase()}
        </span>
      </div>
      
      ${suggestion.impact.size ? `
        <div class="mb-2">
          <span class="text-xs font-medium text-${color}-700">💾 Size:</span>
          <span class="text-xs text-gray-700 ml-2">${suggestion.impact.size}</span>
        </div>
      ` : ''}
      
      ${suggestion.impact.performance ? `
        <div class="mb-2">
          <span class="text-xs font-medium text-${color}-700">⚡ Performance:</span>
          <span class="text-xs text-gray-700 ml-2">${suggestion.impact.performance}</span>
        </div>
      ` : ''}
      
      ${suggestion.impact.security ? `
        <div class="mb-2">
          <span class="text-xs font-medium text-${color}-700">🔒 Security:</span>
          <span class="text-xs text-gray-700 ml-2">${suggestion.impact.security}</span>
        </div>
      ` : ''}
      
      <div class="mt-3 p-2 bg-white rounded border border-${color}-200">
        <span class="text-xs font-medium text-${color}-900">💡 Suggestion:</span>
        <p class="text-xs text-gray-700 mt-1">${suggestion.suggestion}</p>
      </div>
      
      ${suggestion.reasoning ? `
        <div class="mt-2 p-2 bg-gray-50 rounded">
          <span class="text-xs font-medium text-gray-700">🤔 Reasoning:</span>
          <p class="text-xs text-gray-600 mt-1">${suggestion.reasoning}</p>
        </div>
      ` : ''}
    </div>
  `;
}

function renderLayerAnalysis(analysis, index) {
  const layer = analysis.layer;
  const sizeMB = (layer.size / (1024 * 1024)).toFixed(2);
  const wastedMB = (analysis.wastedSpace / (1024 * 1024)).toFixed(2);
  
  const riskColor = {
    low: 'green',
    medium: 'yellow',
    high: 'red',
  }[analysis.cacheBustRisk] || 'gray';

  return `
    <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
            ${index + 1}
          </div>
          <div>
            <h4 class="font-semibold text-gray-900">Layer ${index + 1}</h4>
            <p class="text-xs text-gray-500">${sizeMB} MB</p>
          </div>
        </div>
        <div class="flex gap-2">
          <span class="px-2 py-1 text-xs rounded-full bg-${riskColor}-100 text-${riskColor}-700">
            Cache Risk: ${analysis.cacheBustRisk.toUpperCase()}
          </span>
        </div>
      </div>

      ${layer.instruction ? `
        <div class="mb-3 p-2 bg-gray-50 rounded font-mono text-sm text-gray-700">
          ${escapeHtml(layer.instruction)}
        </div>
      ` : ''}

      ${analysis.wastedSpace > 0 ? `
        <div class="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <div class="text-sm font-medium text-yellow-900 mb-1">
            ⚠️ Wasted Space: ${wastedMB} MB
          </div>
        </div>
      ` : ''}

      ${analysis.inefficientOperations.length > 0 ? `
        <div class="mb-3">
          <div class="text-sm font-medium text-orange-700 mb-2">Inefficient Operations:</div>
          <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
            ${analysis.inefficientOperations.map(op => `<li>${escapeHtml(op)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${analysis.securityIssues.length > 0 ? `
        <div class="mb-3">
          <div class="text-sm font-medium text-red-700 mb-2">Security Issues:</div>
          <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
            ${analysis.securityIssues.map(issue => `<li>${escapeHtml(issue)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${analysis.optimizationSuggestions.length > 0 ? `
        <div class="mt-3 p-3 bg-green-50 border border-green-200 rounded">
          <div class="text-sm font-medium text-green-900 mb-2">💡 Optimization Suggestions:</div>
          <ul class="list-disc list-inside text-sm text-green-800 space-y-1">
            ${analysis.optimizationSuggestions.map(suggestion => `<li>${escapeHtml(suggestion)}</li>`).join('')}
          </ul>
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

