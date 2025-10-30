// Import browser-compatible engine
import { DockerfileOptimizerEngine } from './dockeropt-core.js';
import GeminiAnalyzer from './gemini-ai.js';
import { createEditor } from './editor.js';
import { renderHeader } from './components/header.js';
import { renderHero } from './components/hero.js';
import { renderEditor } from './components/editor.js';
import { renderResults } from './components/results.js';
import { renderExamples } from './components/examples.js';
import { renderFooter } from './components/footer.js';

const EXAMPLE_BAD_DOCKERFILE = `FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN apt-get update
RUN apt-get install -y curl wget
EXPOSE 3000
CMD ["npm", "start"]`;

const EXAMPLE_GOOD_DOCKERFILE = `FROM node:18-alpine@sha256:a6385524b09b9de27e332b22e90fb7a70e3adf1a41a54edd0c8e6e597f4e9aaf AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
RUN npm run build

FROM node:18-alpine@sha256:a6385524b09b9de27e332b22e90fb7a70e3adf1a41a54edd0c8e6e597f4e9aaf
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
CMD ["node", "dist/index.js"]`;

export function createApp(container) {
  // Initialize with AI support
  const geminiAnalyzer = new GeminiAnalyzer();
  const engine = new DockerfileOptimizerEngine(true, geminiAnalyzer);
  
  let editor = null;
  let state = {
    dockerfile: EXAMPLE_BAD_DOCKERFILE,
    result: null,
    loading: false,
    activeTab: 'optimized', // 'optimized' | 'findings' | 'diff'
    useAI: true, // Enable AI by default
    showExplanation: null, // Track which finding is showing explanation
  };

  function render() {
    const html = `
      ${renderHeader()}
      ${renderHero()}
      
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <!-- Examples -->
        ${renderExamples({
          onLoadBad: () => loadExample(EXAMPLE_BAD_DOCKERFILE),
          onLoadGood: () => loadExample(EXAMPLE_GOOD_DOCKERFILE),
        })}

        <!-- Editor Section -->
        <div class="mt-12">
          <div class="card p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-semibold text-gray-900">
                📝 Your Dockerfile
              </h2>
              <div class="flex gap-2 items-center">
                <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    id="ai-toggle"
                    ${state.useAI ? 'checked' : ''}
                    class="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  >
                  <span class="flex items-center gap-1">
                    <span>✨</span>
                    <span>AI Analysis</span>
                  </span>
                </label>
                <button 
                  id="clear-btn"
                  class="btn-secondary text-sm"
                >
                  Clear
                </button>
                <button 
                  id="optimize-btn"
                  class="btn-primary text-sm"
                  ${state.loading ? 'disabled' : ''}
                >
                  ${state.loading ? '⏳ Analyzing with AI...' : '🚀 Optimize'}
                </button>
              </div>
            </div>
            
            ${renderEditor()}
          </div>
        </div>

        <!-- Results Section -->
        ${state.result ? `
          <div class="mt-8" id="results-section">
            ${renderResults(state.result, state.activeTab)}
          </div>
        ` : ''}
      </div>

      ${renderFooter()}
    `;

    container.innerHTML = html;
    attachEventListeners();
  }

  function attachEventListeners() {
    // AI toggle
    const aiToggle = document.getElementById('ai-toggle');
    if (aiToggle) {
      aiToggle.onchange = () => {
        state.useAI = aiToggle.checked;
        engine.useAI = aiToggle.checked;
      };
    }

    // Optimize button
    const optimizeBtn = document.getElementById('optimize-btn');
    if (optimizeBtn) {
      optimizeBtn.onclick = handleOptimize;
    }

    // Clear button
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.onclick = handleClear;
    }

    // Example buttons
    const loadBadBtn = document.getElementById('load-bad-example');
    if (loadBadBtn) {
      loadBadBtn.onclick = () => loadExample(EXAMPLE_BAD_DOCKERFILE);
    }

    const loadGoodBtn = document.getElementById('load-good-example');
    if (loadGoodBtn) {
      loadGoodBtn.onclick = () => loadExample(EXAMPLE_GOOD_DOCKERFILE);
    }

    // Tab buttons
    const tabButtons = document.querySelectorAll('[data-tab]');
    tabButtons.forEach(btn => {
      btn.onclick = () => handleTabChange(btn.dataset.tab);
    });

    // Copy buttons
    const copyButtons = document.querySelectorAll('[data-copy]');
    copyButtons.forEach(btn => {
      btn.onclick = () => handleCopy(btn.dataset.copy);
    });

    // Download buttons
    const downloadBtn = document.getElementById('download-optimized');
    if (downloadBtn) {
      downloadBtn.onclick = handleDownload;
    }
  }

  async function handleOptimize() {
    if (state.loading) return;

    const content = editor.getValue();
    if (!content.trim()) {
      alert('Please enter a Dockerfile first!');
      return;
    }

    state.loading = true;
    state.dockerfile = content;
    render();

    try {
      const result = await engine.analyze(content);
      state.result = result;
      state.loading = false;
      render();

      // Scroll to results
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    } catch (error) {
      console.error('Optimization error:', error);
      alert(`Error: ${error.message}`);
      state.loading = false;
      render();
    }
  }

  function handleClear() {
    if (editor) {
      editor.setValue('');
    }
    state.result = null;
    render();
  }

  function loadExample(dockerfile) {
    if (editor) {
      editor.setValue(dockerfile);
    }
    state.dockerfile = dockerfile;
    state.result = null;
    render();
  }

  function handleTabChange(tab) {
    state.activeTab = tab;
    render();
  }

  function handleCopy(target) {
    let text = '';
    if (target === 'optimized' && state.result) {
      text = state.result.optimized;
    } else if (target === 'diff' && state.result) {
      text = state.result.diff;
    } else if (target === 'commit' && state.result?.commitMessage) {
      text = state.result.commitMessage;
    }

    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        // Show success message
        const btn = event.target.closest('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '✓ Copied!';
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 2000);
      });
    }
  }

  function handleDownload() {
    if (!state.result) return;

    const blob = new Blob([state.result.optimized], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Dockerfile.optimized';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function init() {
    render();
    
    // Initialize editor after render
    setTimeout(() => {
      editor = createEditor('editor-container', state.dockerfile);
    }, 0);
  }

  return {
    init,
    getState: () => state,
  };
}

