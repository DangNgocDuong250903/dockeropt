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
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        ${activeTab === 'optimized' ? renderOptimizedTab(result) : ''}
        ${activeTab === 'findings' ? renderFindingsTab(result.findings, result.isAIAnalyzed) : ''}
        ${activeTab === 'diff' ? renderDiffTab(result.diff) : ''}
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

function renderDiffTab(diff) {
  return `
    <div>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Changes</h3>
        <button
          data-copy="diff"
          class="btn-secondary text-sm"
        >
          📋 Copy Diff
        </button>
      </div>
      
      <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-gray-700"><code>${formatDiff(diff)}</code></pre>
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

