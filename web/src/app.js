// Import browser-compatible engine
import { DockerfileOptimizerEngine } from "./dockeropt-core.js";
import GeminiAnalyzer from "./gemini-ai.js";
import { createEditor } from "./editor.js";
import { renderHeader } from "./components/header.js";
import { renderHero } from "./components/hero.js";
import { renderEditor } from "./components/editor.js";
import { renderResults } from "./components/results.js";
import { renderExamples, EXAMPLES } from "./components/examples.js";
import { renderFooter } from "./components/footer.js";
import {
  renderImageInspector,
  renderImageAnalysis,
} from "./components/image-inspector.js";
import {
  renderImageComparator,
  renderComparisonResults,
} from "./components/image-comparator.js";
import { ImageInspector } from "./image-inspector.js";
import { ImageComparator } from "./image-comparator.js";
import {
  renderLayerGraph,
  renderComparisonGraph,
} from "./components/layer-graph.js";
import { renderLayerDNACompare } from "./components/layer-dna-compare.js";
import {
  renderConfigWizard,
  attachConfigWizardHandlers,
} from "./components/config-wizard.js";

export function createApp(container) {
  // Initialize with AI support
  const geminiAnalyzer = new GeminiAnalyzer();
  const engine = new DockerfileOptimizerEngine(true, geminiAnalyzer);

  // Initialize Image Inspector and Comparator
  const imageInspector = new ImageInspector();
  const imageComparator = new ImageComparator();

  let editor = null;
  let state = {
    dockerfile: EXAMPLES.node.bad,
    result: null,
    loading: false,
    activeTab: "optimized", // 'optimized' | 'findings' | 'diff'
    useAI: true, // Enable AI by default
    showExplanation: null, // Track which finding is showing explanation
    activeLang: "node", // Current language tab
    originalDockerfile: "", // Store original for comparison
    activeView: "optimizer", // 'optimizer' | 'inspector' | 'comparator' | 'config'
  };

  function render() {
    const html = `
      ${renderHeader()}
      ${renderHero()}
      
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <!-- Security Note -->
        <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div class="flex items-start gap-3">
            <span class="text-xl">🔒</span>
            <div>
              <h3 class="font-semibold text-green-900 mb-1">100% Local - An toàn & Riêng tư</h3>
              <p class="text-sm text-green-800 mb-2">
                Tất cả phân tích chạy trên trình duyệt/máy của bạn. <strong>Không gửi Dockerfile lên server nào</strong>. 
                Dữ liệu của bạn không bao giờ rời khỏi máy bạn.
              </p>
              <details class="mt-2">
                <summary class="text-xs text-green-700 cursor-pointer hover:text-green-900">
                  📖 Tìm hiểu thêm
                </summary>
                <div class="mt-2 text-xs text-green-700 space-y-1">
                  <p>• Web version: Chạy hoàn toàn trên browser của bạn (JavaScript)</p>
                  <p>• CLI version: Chạy trên máy local, không kết nối internet</p>
                  <p>• Không có backend server, không có database, không logging</p>
                  <p>• Mã nguồn mở - bạn có thể audit code</p>
                </div>
              </details>
            </div>
          </div>
        </div>

        <!-- View Container -->
        ${
          state.activeView === "optimizer"
            ? `
          <!-- Examples -->
          ${renderExamples({})}

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
                      ${state.useAI ? "checked" : ""}
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
                    ${state.loading ? "disabled" : ""}
                  >
                    ${
                      state.loading
                        ? `
                      <span class="flex items-center gap-2">
                        <span class="animate-spin">⏳</span>
                        <span>Analyzing layers...</span>
                      </span>
                    `
                        : "🚀 Optimize"
                    }
                  </button>
                </div>
              </div>
              
              ${renderEditor()}
            </div>
          </div>
          
          <!-- Results Section -->
          ${
            state.result
              ? `
            <div class="mt-8" id="results-section">
              ${renderResults(state.result, state.activeTab)}
            </div>
          `
              : ""
          }
        `
            : ""
        }
        
        ${
          state.activeView === "inspector"
            ? `
          <div id="image-inspector-container"></div>
        `
            : ""
        }
        
        ${
          state.activeView === "comparator"
            ? `
          <div id="image-comparator-container"></div>
        `
            : ""
        }
        
        ${
          state.activeView === "config"
            ? `
          <div id="config-wizard-container"></div>
        `
            : ""
        }
      </div>

      ${renderFooter()}
    `;

    container.innerHTML = html;
    attachEventListeners();

    // Render view-specific content
    if (state.activeView === "inspector") {
      renderImageInspector("image-inspector-container");
      attachInspectorHandlers();
    } else if (state.activeView === "comparator") {
      renderImageComparator("image-comparator-container");
      attachComparatorHandlers();
    } else if (state.activeView === "config") {
      renderConfigWizard("config-wizard-container");
      attachConfigWizardHandlers();
    } else if (state.activeView === "optimizer") {
      // Initialize editor for optimizer view - use requestAnimationFrame for smoother rendering
      requestAnimationFrame(() => {
        const editorContainer = document.getElementById("editor-container");
        if (editorContainer && !editor) {
          editor = createEditor("editor-container", state.dockerfile);
        } else if (
          editorContainer &&
          editor &&
          editor.getValue() !== state.dockerfile
        ) {
          // Only update if content changed to prevent unnecessary re-renders
          editor.setValue(state.dockerfile);
        }
      });
    }

    // Attach growth loop handlers after render - use requestAnimationFrame
    requestAnimationFrame(() => {
      attachGrowthLoopHandlers();
    });
  }

  function attachEventListeners() {
    // Navigation tabs
    const navTabs = document.querySelectorAll("[data-view]");
    navTabs.forEach((tab) => {
      tab.onclick = () => {
        const view = tab.dataset.view;
        // Prevent re-render if already on same view
        if (state.activeView === view) return;

        state.activeView = view;

        // Update tab styles
        navTabs.forEach((t) => {
          t.className =
            "nav-tab text-sm px-3 py-2 rounded-md transition text-gray-600 hover:text-gray-900";
        });
        tab.className =
          "nav-tab text-sm px-3 py-2 rounded-md transition bg-primary-100 text-primary-700 font-semibold";

        // Use requestAnimationFrame for smoother transitions
        requestAnimationFrame(() => {
          render();
        });
      };
    });

    // Set initial active tab
    const activeTab = document.querySelector(
      `[data-view="${state.activeView}"]`
    );
    if (activeTab) {
      activeTab.className =
        "nav-tab text-sm px-3 py-2 rounded-md transition bg-primary-100 text-primary-700 font-semibold";
    }

    // AI toggle
    const aiToggle = document.getElementById("ai-toggle");
    if (aiToggle) {
      aiToggle.onchange = () => {
        state.useAI = aiToggle.checked;
        engine.useAI = aiToggle.checked;
      };
    }

    // Optimize button
    const optimizeBtn = document.getElementById("optimize-btn");
    if (optimizeBtn) {
      optimizeBtn.onclick = handleOptimize;
    }

    // Clear button
    const clearBtn = document.getElementById("clear-btn");
    if (clearBtn) {
      clearBtn.onclick = handleClear;
    }

    // Optimize demo button (from hero)
    const optimizeDemoBtn = document.getElementById("optimize-demo-btn");
    if (optimizeDemoBtn) {
      optimizeDemoBtn.onclick = () => {
        loadExample(EXAMPLES.node.bad);
        setTimeout(() => {
          document.getElementById("optimize-btn")?.click();
        }, 500);
      };
    }

    // Language tabs
    const langTabs = document.querySelectorAll("[data-lang-tab]");
    langTabs.forEach((tab) => {
      tab.onclick = () => {
        const lang = tab.dataset.langTab;
        state.activeLang = lang;

        // Update tab styles
        langTabs.forEach((t) => {
          t.className =
            "px-4 py-2 text-sm font-medium rounded-t-lg transition text-gray-600 hover:text-gray-900 hover:bg-white";
        });
        tab.className =
          "px-4 py-2 text-sm font-medium rounded-t-lg transition bg-white text-primary-600 border-b-2 border-primary-600";

        // Update example buttons
        const exampleBtns = document.querySelectorAll("[data-load-example]");
        exampleBtns.forEach((btn) => {
          btn.dataset.lang = lang;
        });

        // No need to re-render, just update the buttons
      };
    });

    // Example buttons (bad/good)
    document.querySelectorAll("[data-load-example]").forEach((btn) => {
      btn.onclick = () => {
        const type = btn.dataset.loadExample;
        const lang = btn.dataset.lang || state.activeLang;
        const dockerfile = EXAMPLES[lang]?.[type];
        if (dockerfile) {
          loadExample(dockerfile);
        }
      };
    });

    // URL fetch button
    const fetchUrlBtn = document.getElementById("fetch-url-btn");
    if (fetchUrlBtn) {
      fetchUrlBtn.onclick = handleFetchURL;
    }

    // Tab buttons
    const tabButtons = document.querySelectorAll("[data-tab]");
    tabButtons.forEach((btn) => {
      btn.onclick = () => handleTabChange(btn.dataset.tab);
    });

    // Copy buttons
    const copyButtons = document.querySelectorAll("[data-copy]");
    copyButtons.forEach((btn) => {
      btn.onclick = (e) => handleCopy(btn.dataset.copy, e);
    });

    // Download buttons
    const downloadBtn = document.getElementById("download-optimized");
    if (downloadBtn) {
      downloadBtn.onclick = handleDownload;
    }

    // Install OS tabs
    const installOsTabs = document.querySelectorAll("[data-install-os]");
    installOsTabs.forEach((tab) => {
      tab.onclick = () => {
        const os = tab.dataset.installOs;

        // Update tab styles
        installOsTabs.forEach((t) => {
          t.className =
            "px-4 py-2 text-sm font-medium rounded-t-lg transition text-gray-400 hover:text-white hover:bg-gray-800";
        });
        tab.className =
          "px-4 py-2 text-sm font-medium rounded-t-lg transition bg-gray-800 text-white border-b-2 border-primary-500";

        // Update install content
        const installContent = document.getElementById("install-content");
        if (installContent) {
          installContent.innerHTML = getInstallContent(os);
        }
      };
    });
  }

  function getInstallContent(os) {
    const contents = {
      macos: `
        <div class="space-y-4">
          <div>
            <h4 class="text-white font-semibold mb-2 flex items-center gap-2">
              <span>📦</span>
              <span>npm (Global Install)</span>
            </h4>
            <pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto"><code>npm install -g dockeropt</code></pre>
            <p class="text-xs text-gray-400 mt-1">After publishing to npm</p>
          </div>
          <div class="text-gray-400 text-sm">${"or"}</div>
          <div>
            <h4 class="text-white font-semibold mb-2 flex items-center gap-2">
              <span>🔨</span>
              <span>Build from Source</span>
            </h4>
            <pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto"><code>git clone https://github.com/DangNgocDuong250903/dockeropt.git
cd dockeropt
npm install
npm run build
npm link</code></pre>
          </div>
          <div class="text-gray-400 text-sm">or</div>
          <div>
            <h4 class="text-white font-semibold mb-2 flex items-center gap-2">
              <span>🚀</span>
              <span>Use with npx (temporary)</span>
            </h4>
            <pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto"><code>npx -y dockeropt lint Dockerfile
npx -y dockeropt fix Dockerfile</code></pre>
          </div>
        </div>
      `,
      linux: `
        <div class="space-y-4">
          <div>
            <h4 class="text-white font-semibold mb-2 flex items-center gap-2">
              <span>📦</span>
              <span>npm (Global Install)</span>
            </h4>
            <pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto"><code>npm install -g dockeropt</code></pre>
            <p class="text-xs text-gray-400 mt-1">After publishing to npm</p>
          </div>
          <div class="text-gray-400 text-sm">${"or"}</div>
          <div>
            <h4 class="text-white font-semibold mb-2 flex items-center gap-2">
              <span>🔨</span>
              <span>Build from Source</span>
            </h4>
            <pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto"><code>git clone https://github.com/DangNgocDuong250903/dockeropt.git
cd dockeropt
npm install
npm run build
npm link</code></pre>
          </div>
          <div class="text-gray-400 text-sm">or</div>
          <div>
            <h4 class="text-white font-semibold mb-2 flex items-center gap-2">
              <span>🚀</span>
              <span>Use with npx (temporary)</span>
            </h4>
            <pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto"><code>npx -y dockeropt lint Dockerfile
npx -y dockeropt fix Dockerfile</code></pre>
          </div>
        </div>
      `,
      windows: `
        <div class="space-y-4">
          <div>
            <h4 class="text-white font-semibold mb-2 flex items-center gap-2">
              <span>📦</span>
              <span>npm (Global Install)</span>
            </h4>
            <pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto"><code>npm install -g dockeropt</code></pre>
            <p class="text-xs text-gray-400 mt-1">After publishing to npm</p>
          </div>
          <div class="text-gray-400 text-sm">${"or"}</div>
          <div>
            <h4 class="text-white font-semibold mb-2 flex items-center gap-2">
              <span>🔨</span>
              <span>Build from Source</span>
            </h4>
            <pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto"><code>git clone https://github.com/DangNgocDuong250903/dockeropt.git
cd dockeropt
npm install
npm run build
npm link</code></pre>
          </div>
          <div class="text-gray-400 text-sm">or</div>
          <div>
            <h4 class="text-white font-semibold mb-2 flex items-center gap-2">
              <span>🚀</span>
              <span>Use with npx (temporary)</span>
            </h4>
            <pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto"><code>npx -y dockeropt lint Dockerfile
npx -y dockeropt fix Dockerfile</code></pre>
          </div>
        </div>
      `,
    };
    return contents[os] || contents.macos;
  }

  async function handleOptimize() {
    if (state.loading) return;

    const content = editor.getValue();
    if (!content.trim()) {
      showToast("Please enter a Dockerfile first!", "error");
      return;
    }

    state.loading = true;
    state.originalDockerfile = content;
    state.dockerfile = content;

    // Use requestAnimationFrame for smoother render
    requestAnimationFrame(() => {
      render();
      // Show loading state
      showLoadingProgress();
    });

    try {
      const result = await engine.analyze(content);
      result.original = state.originalDockerfile; // Store original for comparison
      state.result = result;
      state.loading = false;

      requestAnimationFrame(() => {
        render();
      });

      // Scroll to results
      setTimeout(() => {
        document.getElementById("results-section")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (error) {
      console.error("Optimization error:", error);
      showToast(`Error: ${error.message}`, "error");
      state.loading = false;
      render();
    }
  }

  async function handleFetchURL() {
    const urlInput = document.getElementById("github-url-input");
    if (!urlInput) return;

    const url = urlInput.value.trim();
    if (!url) {
      showToast("Please enter a GitHub URL", "error");
      return;
    }

    // Convert GitHub blob URL to raw URL
    let rawUrl = url;
    if (url.includes("github.com") && url.includes("/blob/")) {
      rawUrl = url
        .replace("/blob/", "/")
        .replace("github.com", "raw.githubusercontent.com");
    }

    try {
      state.loading = true;
      const response = await fetch(rawUrl);
      if (!response.ok) throw new Error("Failed to fetch Dockerfile");
      const dockerfile = await response.text();

      if (editor) {
        editor.setValue(dockerfile);
      }
      state.dockerfile = dockerfile;
      state.result = null;
      state.loading = false;
      showToast("Dockerfile loaded successfully!", "success");
      render();
    } catch (error) {
      console.error("Fetch error:", error);
      showToast(`Failed to fetch: ${error.message}`, "error");
      state.loading = false;
    }
  }

  function showLoadingProgress() {
    // This will be handled by the loading state in render
  }

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    const colors = {
      success: "bg-green-500",
      error: "bg-red-500",
      info: "bg-blue-500",
    };
    toast.className = `fixed top-4 right-4 ${
      colors[type] || colors.info
    } text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-20px)";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function handleClear() {
    if (editor) {
      editor.setValue("");
    }
    state.result = null;
    render();
  }

  function loadExample(dockerfile) {
    if (editor) {
      editor.setValue(dockerfile);
    }
    state.dockerfile = dockerfile;
    state.originalDockerfile = dockerfile;
    state.result = null;
    render();
  }

  function handleTabChange(tab) {
    state.activeTab = tab;
    render();
  }

  function handleCopy(target, event = null) {
    let text = "";
    if (target === "optimized" && state.result) {
      text = state.result.optimized;
    } else if (target === "diff" && state.result) {
      text = state.result.diff;
    } else if (target === "commit" && state.result?.commitMessage) {
      text = state.result.commitMessage;
    } else if (target === "runtime-manifest" && state.result?.runtimeManifest) {
      text = JSON.stringify(state.result.runtimeManifest, null, 2);
    }

    if (!text) {
      showToast("Nothing to copy", "error");
      return;
    }

    // Try clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          showToast("Copied ✔", "success");
          // Update button if event is available
          if (event) {
            const btn = event.target.closest("button");
            if (btn) {
              const originalText = btn.innerHTML;
              btn.innerHTML = "✓ Copied!";
              setTimeout(() => {
                btn.innerHTML = originalText;
              }, 2000);
            }
          }
        })
        .catch((err) => {
          console.error("Clipboard error:", err);
          // Fallback to textarea method
          fallbackCopy(text, event);
        });
    } else {
      // Fallback for browsers without clipboard API
      fallbackCopy(text, event);
    }
  }

  function fallbackCopy(text, event) {
    // Create temporary textarea
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-999999px";
    textarea.style.top = "-999999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        showToast("Copied ✔", "success");
        if (event) {
          const btn = event.target.closest("button");
          if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = "✓ Copied!";
            setTimeout(() => {
              btn.innerHTML = originalText;
            }, 2000);
          }
        }
      } else {
        showToast("Failed to copy. Please copy manually.", "error");
      }
    } catch (err) {
      console.error("Fallback copy error:", err);
      showToast("Failed to copy. Please copy manually.", "error");
    } finally {
      document.body.removeChild(textarea);
    }
  }

  // Growth loop handlers
  function attachGrowthLoopHandlers() {
    // Share result
    const shareBtn = document.getElementById("share-result-btn");
    if (shareBtn) {
      shareBtn.onclick = () => {
        // In a real app, this would generate a shareable URL
        const shareUrl = `${window.location.origin}${
          window.location.pathname
        }#share-${Date.now()}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
          showToast("Share link copied!", "success");
        });
      };
    }

    // Generate badge
    const badgeBtn = document.getElementById("generate-badge-btn");
    if (badgeBtn) {
      badgeBtn.onclick = () => {
        const grade =
          state.result?.score >= 90
            ? "A+"
            : state.result?.score >= 80
            ? "A"
            : "B";
        const badgeMarkdown = `[![Optimized by DockerOpt](${window.location.origin}/badge.svg?grade=${grade})](https://dockeropt.dev)`;
        navigator.clipboard.writeText(badgeMarkdown).then(() => {
          showToast("Badge markdown copied!", "success");
        });
      };
    }

    // Create PR
    const prBtn = document.getElementById("create-pr-btn");
    if (prBtn) {
      prBtn.onclick = () => {
        showToast("PR feature coming soon!", "info");
        // In a real app, this would open GitHub App or create PR
      };
    }
  }

  function handleDownload() {
    if (!state.result) return;

    const blob = new Blob([state.result.optimized], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Dockerfile.optimized";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function attachInspectorHandlers() {
    const analyzeBtn = document.getElementById("analyze-image-btn");
    if (analyzeBtn) {
      analyzeBtn.onclick = handleAnalyzeImage;
    }
  }

  function attachComparatorHandlers() {
    const compareBtn = document.getElementById("compare-images-btn");
    if (compareBtn) {
      compareBtn.onclick = handleCompareImages;
    }
  }

  async function handleAnalyzeImage() {
    const inspectInput = document.getElementById("inspect-json-input");
    const historyInput = document.getElementById("history-json-input");

    if (!inspectInput?.value.trim()) {
      alert("Please paste Docker inspect JSON");
      return;
    }

    try {
      const imageInfo = imageInspector.parseInspect(inspectInput.value);

      // Merge history if provided
      if (historyInput?.value.trim()) {
        try {
          const history = imageInspector.parseHistory(historyInput.value);
          if (history && history.length > 0) {
            imageInfo.layers = imageInfo.layers.map((layer, index) => ({
              ...layer,
              ...(history[index] || {}),
            }));
          }
        } catch (error) {
          console.warn(
            "Failed to parse history, continuing without it:",
            error
          );
        }
      }

      const analyses = imageInspector.analyzeLayers(imageInfo);
      const efficiencyScore = imageInspector.calculateEfficiencyScore(analyses);
      const graphData = imageInspector.generateLayerGraph(imageInfo);

      renderImageAnalysis(imageInfo, analyses, efficiencyScore, graphData);

      // Make renderLayerGraph available globally
      window.renderLayerGraph = (data, containerId) => {
        renderLayerGraph(data, containerId);
      };
    } catch (error) {
      alert(`Error analyzing image: ${error.message}`);
      console.error(error);
    }
  }

  async function handleCompareImages() {
    const image1Inspect = document.getElementById("image1-inspect-input");
    const image1History = document.getElementById("image1-history-input");
    const image2Inspect = document.getElementById("image2-inspect-input");
    const image2History = document.getElementById("image2-history-input");

    if (!image1Inspect?.value.trim() || !image2Inspect?.value.trim()) {
      alert("Please paste Docker inspect JSON for both images");
      return;
    }

    try {
      const image1 = imageInspector.parseInspect(image1Inspect.value);
      const image2 = imageInspector.parseInspect(image2Inspect.value);

      if (image1History?.value.trim()) {
        try {
          const history1 = imageInspector.parseHistory(image1History.value);
          if (history1 && history1.length > 0) {
            image1.layers = image1.layers.map((layer, index) => ({
              ...layer,
              ...(history1[index] || {}),
            }));
          }
        } catch (error) {
          console.warn(
            "Failed to parse image1 history, continuing without it:",
            error
          );
        }
      }

      if (image2History?.value.trim()) {
        try {
          const history2 = imageInspector.parseHistory(image2History.value);
          if (history2 && history2.length > 0) {
            image2.layers = image2.layers.map((layer, index) => ({
              ...layer,
              ...(history2[index] || {}),
            }));
          }
        } catch (error) {
          console.warn(
            "Failed to parse image2 history, continuing without it:",
            error
          );
        }
      }

      const diff = imageComparator.compare(image1, image2);

      renderComparisonResults(diff);

      // Render comparison graphs
      const graph1 = imageInspector.generateLayerGraph(image1);
      const graph2 = imageInspector.generateLayerGraph(image2);
      renderComparisonGraph(graph1, graph2, "comparison-graph-container");

      // Render LayerDNA Compare
      setTimeout(() => {
        if (typeof renderLayerDNACompare === "function") {
          renderLayerDNACompare(
            image1,
            image2,
            diff,
            "layerdna-compare-container"
          );
        }
      }, 100);
    } catch (error) {
      alert(`Error comparing images: ${error.message}`);
      console.error(error);
    }
  }

  function init() {
    render();

    // Initialize editor after render (only for optimizer view)
    setTimeout(() => {
      if (state.activeView === "optimizer") {
        editor = createEditor("editor-container", state.dockerfile);
      }
    }, 0);
  }

  return {
    init,
    getState: () => state,
  };
}
