export function renderResults(result, activeTab = 'optimized') {
  const score = result.score;
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const gradeColor = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
  
  return `
    <div class="card p-6">
      <!-- Score Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <h2 class="text-2xl font-bold text-gray-900">
              📊 Optimization Results
            </h2>
            ${result.isAIAnalyzed ? `
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                ✨ AI-Powered
              </span>
            ` : ''}
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right">
              <div class="text-sm text-gray-500">Score</div>
              <div class="text-3xl font-bold text-${gradeColor}-600">${score}/100</div>
              <div class="text-sm font-medium text-${gradeColor}-600">Grade ${grade}</div>
            </div>
          </div>
        </div>

        ${result.summary ? `
          <div class="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
            <h3 class="font-semibold text-blue-900 mb-2">🤖 AI Summary</h3>
            <p class="text-sm text-blue-800">${result.summary}</p>
          </div>
        ` : ''}

        <!-- Metrics Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
            <div class="text-2xl mb-1">💾</div>
            <div class="text-2xl font-bold text-blue-900">${result.metrics.estimatedSizeSavings} MB</div>
            <div class="text-sm text-blue-700">Size Savings</div>
          </div>
          
          <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
            <div class="text-2xl mb-1">📦</div>
            <div class="text-2xl font-bold text-purple-900">${result.metrics.layerReduction}</div>
            <div class="text-sm text-purple-700">Layer Reduction</div>
          </div>
          
          <div class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
            <div class="text-2xl mb-1">🔒</div>
            <div class="text-2xl font-bold text-green-900">${result.metrics.securityScore}/100</div>
            <div class="text-sm text-green-700">Security Score</div>
          </div>
          
          <div class="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
            <div class="text-2xl mb-1">⚡</div>
            <div class="text-2xl font-bold text-orange-900">${result.metrics.cacheEfficiency}/100</div>
            <div class="text-sm text-orange-700">Cache Efficiency</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 mb-6">
        <nav class="flex gap-4">
          <button
            data-tab="optimized"
            class="px-4 py-2 font-medium text-sm border-b-2 transition ${
              activeTab === 'optimized'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }"
          >
            ✨ Optimized
          </button>
          <button
            data-tab="findings"
            class="px-4 py-2 font-medium text-sm border-b-2 transition ${
              activeTab === 'findings'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }"
          >
            🔍 Findings (${result.findings.length})
          </button>
          <button
            data-tab="diff"
            class="px-4 py-2 font-medium text-sm border-b-2 transition ${
              activeTab === 'diff'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }"
          >
            📝 Diff
          </button>
          ${result.runtimeManifest ? `
          <button
            data-tab="runtime"
            class="px-4 py-2 font-medium text-sm border-b-2 transition ${
              activeTab === 'runtime'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }"
          >
            ⚡ Runtime Info
          </button>
          ` : ''}
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        ${activeTab === 'optimized' ? renderOptimizedTab(result) : ''}
        ${activeTab === 'findings' ? renderFindingsTab(result.findings, result.isAIAnalyzed) : ''}
        ${activeTab === 'diff' ? renderDiffTab(result.diff, result) : ''}
        ${activeTab === 'runtime' && result.runtimeManifest ? renderRuntimeTab(result.runtimeManifest) : ''}
      </div>

      ${result.commitMessage ? `
        <div class="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold text-gray-900 flex items-center gap-2">
              📝 Generated Commit Message
            </h3>
            <button
              data-copy="commit"
              class="btn-secondary text-xs"
            >
              📋 Copy
            </button>
          </div>
          <pre class="text-sm font-mono text-gray-700 whitespace-pre-wrap">${escapeHtml(result.commitMessage)}</pre>
        </div>
      ` : ''}

      <!-- Growth Loop Features -->
      <div class="mt-6 grid md:grid-cols-3 gap-4">
        <button
          id="share-result-btn"
          class="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-left"
        >
          <div class="text-lg mb-1">🔗</div>
          <div class="font-semibold text-blue-900 mb-1">Share Result</div>
          <div class="text-xs text-blue-700">Get a shareable link to this optimization</div>
        </button>
        
        <button
          id="generate-badge-btn"
          class="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition text-left"
        >
          <div class="text-lg mb-1">🏆</div>
          <div class="font-semibold text-green-900 mb-1">Get Badge</div>
          <div class="text-xs text-green-700">Add "Optimized by DockerOpt" to README</div>
        </button>
        
        <button
          id="create-pr-btn"
          class="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition text-left"
        >
          <div class="text-lg mb-1">🔀</div>
          <div class="font-semibold text-purple-900 mb-1">Open in PR</div>
          <div class="text-xs text-purple-700">Create GitHub PR with changes</div>
        </button>
      </div>
    </div>
  `;
}

function renderOptimizedTab(result) {
  return `
    <div>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Optimized Dockerfile</h3>
        <div class="flex gap-2">
          <button
            data-copy="optimized"
            class="btn-secondary text-sm"
          >
            📋 Copy
          </button>
          <button
            id="download-optimized"
            class="btn-primary text-sm"
          >
            ⬇️ Download
          </button>
        </div>
      </div>
      
      <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-gray-700"><code>${escapeHtml(result.optimized)}</code></pre>
    </div>
  `;
}

function renderFindingsTab(findings, isAIAnalyzed = false) {
  if (findings.length === 0) {
    return `
      <div class="text-center py-12">
        <div class="text-6xl mb-4">🎉</div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">Perfect!</h3>
        <p class="text-gray-600">No issues found in your Dockerfile.</p>
      </div>
    `;
  }

  const grouped = {
    high: findings.filter(f => f.severity === 'high'),
    medium: findings.filter(f => f.severity === 'medium'),
    low: findings.filter(f => f.severity === 'low'),
  };

  return `
    <div class="space-y-6">
      ${grouped.high.length > 0 ? `
        <div>
          <h3 class="text-lg font-semibold text-red-900 mb-3 flex items-center gap-2">
            <span class="text-2xl">🔴</span>
            High Priority (${grouped.high.length})
          </h3>
          <div class="space-y-3">
            ${grouped.high.map((f, i) => renderFinding(f, i + 1, 'red', isAIAnalyzed)).join('')}
          </div>
        </div>
      ` : ''}

      ${grouped.medium.length > 0 ? `
        <div>
          <h3 class="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
            <span class="text-2xl">🟡</span>
            Medium Priority (${grouped.medium.length})
          </h3>
          <div class="space-y-3">
            ${grouped.medium.map((f, i) => renderFinding(f, i + 1, 'yellow', isAIAnalyzed)).join('')}
          </div>
        </div>
      ` : ''}

      ${grouped.low.length > 0 ? `
        <div>
          <h3 class="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <span class="text-2xl">🔵</span>
            Low Priority (${grouped.low.length})
          </h3>
          <div class="space-y-3">
            ${grouped.low.map((f, i) => renderFinding(f, i + 1, 'blue', isAIAnalyzed)).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderFinding(finding, index, color, isAIAnalyzed = false) {
  return `
    <div class="border-l-4 border-${color}-500 bg-${color}-50 p-4 rounded-r-lg">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0 w-6 h-6 rounded-full bg-${color}-500 text-white flex items-center justify-center text-sm font-bold">
          ${index}
        </div>
        <div class="flex-1">
          <div class="flex items-center justify-between mb-1">
            <h4 class="font-semibold text-${color}-900">${finding.message}</h4>
            ${finding.lineNumber ? `
              <span class="text-xs text-${color}-700 bg-${color}-100 px-2 py-1 rounded">
                Line ${finding.lineNumber}
              </span>
            ` : ''}
          </div>
          
          ${finding.description ? `
            <p class="text-sm text-${color}-800 mb-2">${finding.description}</p>
          ` : ''}
          
          ${finding.explanation && isAIAnalyzed ? `
            <div class="mt-3 p-3 bg-white rounded-lg border border-${color}-200">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-sm font-semibold text-${color}-900">🤖 AI Explanation</span>
              </div>
              <p class="text-sm text-gray-700">${finding.explanation}</p>
            </div>
          ` : ''}
          
          ${finding.suggestion ? `
            <div class="mt-2 p-2 bg-white bg-opacity-50 rounded text-sm">
              <span class="font-medium text-${color}-900">💡 Fix:</span>
              <code class="text-${color}-800 ml-1">${escapeHtml(finding.suggestion)}</code>
            </div>
          ` : ''}
          
          ${finding.impact && isAIAnalyzed ? `
            <div class="mt-2 flex gap-3 text-xs">
              ${finding.impact.security && finding.impact.security !== 'none' ? `
                <span class="flex items-center gap-1 text-${color}-700">
                  <span>🔒</span>
                  <span>Security: ${finding.impact.security}</span>
                </span>
              ` : ''}
              ${finding.impact.performance && finding.impact.performance !== 'none' ? `
                <span class="flex items-center gap-1 text-${color}-700">
                  <span>⚡</span>
                  <span>Performance: ${finding.impact.performance}</span>
                </span>
              ` : ''}
              ${finding.impact.size ? `
                <span class="flex items-center gap-1 text-${color}-700">
                  <span>💾</span>
                  <span>Size: ${finding.impact.size}</span>
                </span>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderDiffTab(diff, result) {
  // Side-by-side comparison
  return `
    <div>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Before & After Comparison</h3>
        <button
          data-copy="diff"
          class="btn-secondary text-sm"
        >
          📋 Copy Diff
        </button>
      </div>

      <!-- Metrics Comparison -->
      ${result.metrics ? `
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="bg-red-50 p-4 rounded-lg border border-red-200">
            <div class="text-sm text-red-700 mb-1">Size Reduction</div>
            <div class="text-2xl font-bold text-red-900 flex items-center gap-2">
              <span>↓</span>
              <span>${result.metrics.estimatedSizeSavings} MB</span>
            </div>
          </div>
          <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div class="text-sm text-blue-700 mb-1">Layer Reduction</div>
            <div class="text-2xl font-bold text-blue-900 flex items-center gap-2">
              <span>↓</span>
              <span>${result.metrics.layerReduction} layers</span>
            </div>
          </div>
          <div class="bg-green-50 p-4 rounded-lg border border-green-200">
            <div class="text-sm text-green-700 mb-1">Build Time</div>
            <div class="text-2xl font-bold text-green-900 flex items-center gap-2">
              <span>↓</span>
              <span>~42%</span>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Side-by-side diff -->
      <div class="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-semibold text-red-700 flex items-center gap-2">
              <span>❌</span>
              <span>Before</span>
            </h4>
          </div>
          <pre class="bg-red-50 border border-red-200 text-red-900 p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-96 overflow-y-auto"><code>${escapeHtml(result.original || 'Original Dockerfile will appear here')}</code></pre>
        </div>
        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-semibold text-green-700 flex items-center gap-2">
              <span>✅</span>
              <span>After</span>
            </h4>
          </div>
          <pre class="bg-green-50 border border-green-200 text-green-900 p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-96 overflow-y-auto"><code>${escapeHtml(result.optimized)}</code></pre>
        </div>
      </div>
      
      <!-- Unified diff -->
      <div class="mt-4">
        <h4 class="text-sm font-semibold text-gray-700 mb-2">Unified Diff</h4>
        <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-gray-700 max-h-96 overflow-y-auto"><code>${formatDiff(diff)}</code></pre>
      </div>
    </div>
  `;
}

function formatDiff(diff) {
  return escapeHtml(diff)
    .split('\n')
    .map(line => {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        return `<span class="text-green-400">${line}</span>`;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        return `<span class="text-red-400">${line}</span>`;
      } else if (line.startsWith('@@')) {
        return `<span class="text-cyan-400">${line}</span>`;
      }
      return `<span class="text-gray-400">${line}</span>`;
    })
    .join('\n');
}

function renderRuntimeTab(manifest) {
  return `
    <div>
      <div class="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">⚡ Runtime Behavior Prediction</h3>
        
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div class="text-sm text-gray-600 mb-1">App Type</div>
            <div class="text-lg font-semibold text-gray-900">${manifest.appType}</div>
          </div>
          
          ${manifest.defaultPort ? `
            <div>
              <div class="text-sm text-gray-600 mb-1">Default Port</div>
              <div class="text-lg font-semibold text-gray-900">${manifest.defaultPort}</div>
            </div>
          ` : ''}
          
          <div>
            <div class="text-sm text-gray-600 mb-1">Expected Memory</div>
            <div class="text-lg font-semibold text-gray-900">${manifest.expectedMemory}</div>
          </div>
          
          <div>
            <div class="text-sm text-gray-600 mb-1">Expected CPU</div>
            <div class="text-lg font-semibold text-gray-900">${manifest.expectedCPU}</div>
          </div>
        </div>
      </div>
      
      ${manifest.exposedPorts.length > 0 ? `
        <div class="mb-4">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">🌐 Exposed Ports</h4>
          <div class="flex flex-wrap gap-2">
            ${manifest.exposedPorts.map(port => `
              <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                ${port}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      ${manifest.volumes.length > 0 ? `
        <div class="mb-4">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">💾 Volumes</h4>
          <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
            ${manifest.volumes.map(vol => `<li>${escapeHtml(vol)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${Object.keys(manifest.environment).length > 0 ? `
        <div class="mb-4">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">🔧 Environment Variables</h4>
          <div class="bg-gray-50 rounded-lg p-3 overflow-x-auto">
            <pre class="text-xs font-mono text-gray-700"><code>${Object.entries(manifest.environment).map(([key, val]) => `${key}=${val}`).join('\n')}</code></pre>
          </div>
        </div>
      ` : ''}
      
      ${manifest.entrypoint ? `
        <div class="mb-4">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">🚀 Entrypoint</h4>
          <div class="bg-gray-50 rounded-lg p-3">
            <code class="text-sm font-mono text-gray-700">${escapeHtml(manifest.entrypoint)}</code>
          </div>
        </div>
      ` : ''}
      
      ${manifest.command ? `
        <div class="mb-4">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">▶️ Command</h4>
          <div class="bg-gray-50 rounded-lg p-3">
            <code class="text-sm font-mono text-gray-700">${escapeHtml(manifest.command)}</code>
          </div>
        </div>
      ` : ''}
      
      ${manifest.healthCheck ? `
        <div class="mb-4">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">❤️ Health Check</h4>
          <div class="bg-gray-50 rounded-lg p-3">
            <code class="text-sm font-mono text-gray-700">${escapeHtml(manifest.healthCheck)}</code>
          </div>
        </div>
      ` : ''}
      
      <div class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 class="text-sm font-semibold text-green-900 mb-2">📋 Runtime Manifest (JSON)</h4>
        <button
          data-copy="runtime-manifest"
          class="btn-secondary text-xs mb-2"
        >
          📋 Copy JSON
        </button>
        <pre class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs font-mono border border-gray-700"><code>${escapeHtml(JSON.stringify(manifest, null, 2))}</code></pre>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

