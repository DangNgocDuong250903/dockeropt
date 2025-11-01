/**
 * Config Wizard Component
 * UI builder for generating docker run commands
 */

import { ImageConfigAnalyzer } from "../image-config-analyzer.js";
import { DockerHubAPI } from "../docker-hub-api.js";
import GeminiAnalyzer from "../gemini-ai.js";

export function renderConfigWizard(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const html = `
    <div class="config-wizard-container">
      <div class="mb-6">
        <h2 class="text-2xl font-semibold text-gray-900 mb-2">
          ⚙️ Image Configuration Analyzer
        </h2>
        <p class="text-gray-600">
          Analyze Docker image configuration and generate run commands automatically
        </p>
      </div>

      <!-- Input Section -->
      <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Docker Image Name
          </label>
          <div class="flex gap-2">
            <input
              type="text"
              id="image-name-input"
              placeholder="mysql:8, node:20, nginx:latest, postgres:15"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <button
              id="analyze-image-config-btn"
              class="btn-primary px-6 py-2"
            >
              🔍 Analyze
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            <span class="text-blue-600">💡 Note:</span> Due to browser security (CORS), we cannot fetch directly from Docker Hub. Please paste Docker inspect JSON below.
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Docker Inspect JSON (Optional)
          </label>
          <textarea
            id="image-inspect-config-input"
            class="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-500"
            placeholder='[{"Id": "sha256:...", "Config": {...}, ...}]'
          ></textarea>
        </div>
      </div>

      <!-- Status Message -->
      <div id="config-status-message" class="hidden mb-6"></div>

      <!-- Analysis Results -->
      <div id="config-analysis-results" class="hidden">
        <!-- Config Summary -->
        <div class="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200 mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Configuration Summary</h3>
          <div id="config-summary"></div>
        </div>

        <!-- Config Table -->
        <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Configuration Details</h3>
          <div id="config-table-container"></div>
        </div>

        <!-- Config Wizard Form -->
        <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">⚙️ Config Wizard</h3>
          <p class="text-sm text-gray-600 mb-4">
            Fill in the values below to generate a docker run command
          </p>
          <div id="config-wizard-form"></div>
        </div>

        <!-- Generated Commands -->
        <div class="bg-white border border-gray-200 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Generated Commands</h3>
          
          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-medium text-gray-700">Docker Run Command</h4>
              <button
                id="copy-run-cmd-btn"
                class="btn-secondary text-xs"
              >
                📋 Copy
              </button>
            </div>
            <pre
              id="run-command-output"
              class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-gray-700"
            ></pre>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-medium text-gray-700">Docker Compose</h4>
              <button
                id="copy-compose-btn"
                class="btn-secondary text-xs"
              >
                📋 Copy
              </button>
            </div>
            <pre
              id="compose-output"
              class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-gray-700"
            ></pre>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

export function renderConfigAnalysis(analysis) {
  console.log("renderConfigAnalysis called with:", analysis);

  const summaryContainer = document.getElementById("config-summary");
  const tableContainer = document.getElementById("config-table-container");
  const wizardFormContainer = document.getElementById("config-wizard-form");
  const resultsContainer = document.getElementById("config-analysis-results");
  const runCmdOutput = document.getElementById("run-command-output");
  const composeOutput = document.getElementById("compose-output");

  console.log("Containers found:", {
    summaryContainer: !!summaryContainer,
    tableContainer: !!tableContainer,
    wizardFormContainer: !!wizardFormContainer,
    resultsContainer: !!resultsContainer,
    runCmdOutput: !!runCmdOutput,
    composeOutput: !!composeOutput,
  });

  if (!resultsContainer) {
    console.error("Results container not found!");
    return;
  }

  // Clear any status messages
  clearConfigWizardStatusMessage();

  // Show results container
  console.log("Showing results container...");
  resultsContainer.classList.remove("hidden");

  // Force scroll to results
  setTimeout(() => {
    resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);

  // Render summary
  if (summaryContainer) {
    summaryContainer.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div class="text-sm text-gray-600 mb-1">Image</div>
          <div class="text-lg font-semibold text-gray-900">${
            analysis.image
          }</div>
        </div>
        <div>
          <div class="text-sm text-gray-600 mb-1">Type</div>
          <div class="text-lg font-semibold text-gray-900 capitalize">${
            analysis.imageType
          }</div>
        </div>
        <div>
          <div class="text-sm text-gray-600 mb-1">Ports</div>
          <div class="text-lg font-semibold text-gray-900">${
            analysis.exposedPorts.length
          }</div>
        </div>
        <div>
          <div class="text-sm text-gray-600 mb-1">Env Vars</div>
          <div class="text-lg font-semibold text-gray-900">${
            analysis.envVars.length
          }</div>
        </div>
      </div>
      ${
        analysis.description
          ? `
        <div class="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
          <p class="text-sm text-blue-900">💡 ${analysis.description}</p>
        </div>
      `
          : ""
      }
    `;
  }

  // Render config table
  if (tableContainer) {
    let tableHtml = `
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Config</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Default</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
    `;

    // Environment variables
    for (const envVar of analysis.envVars) {
      tableHtml += `
        <tr>
          <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${escapeHtml(
            envVar.key
          )}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">ENV</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm">${
            envVar.required ? "✅" : "❌"
          }</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${
            envVar.defaultValue || "–"
          }</td>
          <td class="px-4 py-3 text-sm text-gray-500">${
            envVar.description || "–"
          }</td>
        </tr>
      `;
    }

    // Volumes
    for (const volume of analysis.volumes) {
      tableHtml += `
        <tr>
          <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">${escapeHtml(
            volume.path
          )}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">Volume</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm">${
            volume.required ? "✅" : "❌"
          }</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">–</td>
          <td class="px-4 py-3 text-sm text-gray-500">${
            volume.description || "–"
          }</td>
        </tr>
      `;
    }

    // Ports
    for (const port of analysis.exposedPorts) {
      tableHtml += `
        <tr>
          <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${port.port}/${port.protocol}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">Port</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm">✅</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">–</td>
          <td class="px-4 py-3 text-sm text-gray-500">Exposed port</td>
        </tr>
      `;
    }

    tableHtml += `
          </tbody>
        </table>
      </div>
    `;

    tableContainer.innerHTML = tableHtml;
  }

  // Render wizard form
  if (wizardFormContainer) {
    let formHtml = '<div class="space-y-4">';

    // Environment variables form
    if (analysis.envVars.length > 0) {
      formHtml += `
        <div>
          <h4 class="text-sm font-semibold text-gray-700 mb-3">Environment Variables</h4>
          <div class="space-y-3">
      `;

      for (const envVar of analysis.envVars) {
        formHtml += `
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label class="w-full sm:w-64 text-sm font-medium text-gray-700 break-words">
              ${escapeHtml(envVar.key)}
              ${envVar.required ? '<span class="text-red-500">*</span>' : ""}
            </label>
            <input
              type="${
                envVar.key.includes("PASSWORD") || envVar.key.includes("SECRET")
                  ? "password"
                  : "text"
              }"
              data-env-key="${escapeHtml(envVar.key)}"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 min-w-0"
              placeholder="${
                envVar.defaultValue ||
                (envVar.required ? "Required" : "Optional")
              }"
              value="${envVar.defaultValue || ""}"
            />
            ${
              envVar.description
                ? `
              <span class="text-xs text-gray-500 w-full sm:w-64 break-words">${envVar.description}</span>
            `
                : ""
            }
          </div>
        `;
      }

      formHtml += `
          </div>
        </div>
      `;
    }

    // Ports form
    if (analysis.exposedPorts.length > 0) {
      formHtml += `
        <div>
          <h4 class="text-sm font-semibold text-gray-700 mb-3">Ports</h4>
          <div class="space-y-3">
      `;

      for (const port of analysis.exposedPorts) {
        formHtml += `
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label class="w-full sm:w-48 text-sm font-medium text-gray-700">Port ${port.port}</label>
            <input
              type="number"
              data-port="${port.port}"
              data-protocol="${port.protocol}"
              class="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              placeholder="Host port"
              value="${port.port}"
            />
            <span class="text-xs text-gray-500">→ Container port ${port.port}/${port.protocol}</span>
          </div>
        `;
      }

      formHtml += `
          </div>
        </div>
      `;
    }

    // Volumes form
    if (analysis.volumes.length > 0) {
      formHtml += `
        <div>
          <h4 class="text-sm font-semibold text-gray-700 mb-3">Volumes</h4>
          <div class="space-y-3">
      `;

      for (const volume of analysis.volumes) {
        const volumeName =
          volume.path
            .split("/")
            .pop()
            .replace(/[^a-z0-9]/gi, "_") + "_data";
        formHtml += `
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label class="w-full sm:w-64 text-sm font-medium text-gray-700 font-mono break-words">${escapeHtml(
              volume.path
            )}</label>
            <input
              type="text"
              data-volume-path="${escapeHtml(volume.path)}"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 min-w-0"
              placeholder="Volume name or host path"
              value="${volumeName}"
            />
            ${
              volume.description
                ? `
              <span class="text-xs text-gray-500 w-full sm:w-64 break-words">${volume.description}</span>
            `
                : ""
            }
          </div>
        `;
      }

      formHtml += `
          </div>
        </div>
      `;
    }

    formHtml += "</div>";
    wizardFormContainer.innerHTML = formHtml;

    // Update commands when form changes
    setupWizardFormListeners(analysis);
  }

  // Initial command generation
  updateGeneratedCommands(analysis);
}

function setupWizardFormListeners(analysis) {
  // Get all form inputs
  const envInputs = document.querySelectorAll("[data-env-key]");
  const portInputs = document.querySelectorAll("[data-port]");
  const volumeInputs = document.querySelectorAll("[data-volume-path]");

  // Update commands on input change
  const updateCommands = () => {
    // Collect form values
    const formValues = {
      envVars: {},
      ports: {},
      volumes: {},
    };

    envInputs.forEach((input) => {
      const key = input.dataset.envKey;
      if (input.value.trim()) {
        formValues.envVars[key] = input.value.trim();
      }
    });

    portInputs.forEach((input) => {
      const port = input.dataset.port;
      if (input.value.trim()) {
        formValues.ports[port] = input.value.trim();
      }
    });

    volumeInputs.forEach((input) => {
      const path = input.dataset.volumePath;
      if (input.value.trim()) {
        formValues.volumes[path] = input.value.trim();
      }
    });

    // Update analysis with form values
    const updatedAnalysis = { ...analysis };

    updatedAnalysis.envVars = updatedAnalysis.envVars.map((env) => ({
      ...env,
      value: formValues.envVars[env.key] || env.defaultValue || "",
    }));

    updatedAnalysis.exposedPorts = updatedAnalysis.exposedPorts.map((port) => ({
      ...port,
      hostPort: formValues.ports[port.port] || port.port,
    }));

    updatedAnalysis.volumes = updatedAnalysis.volumes.map((vol) => ({
      ...vol,
      hostPath:
        formValues.volumes[vol.path] ||
        vol.path
          .split("/")
          .pop()
          .replace(/[^a-z0-9]/gi, "_") + "_data",
    }));

    updateGeneratedCommands(updatedAnalysis);
  };

  envInputs.forEach((input) => {
    input.addEventListener("input", updateCommands);
  });

  portInputs.forEach((input) => {
    input.addEventListener("input", updateCommands);
  });

  volumeInputs.forEach((input) => {
    input.addEventListener("input", updateCommands);
  });
}

function updateGeneratedCommands(analysis) {
  const analyzer = new ImageConfigAnalyzer();
  const runCmdOutput = document.getElementById("run-command-output");
  const composeOutput = document.getElementById("compose-output");

  if (runCmdOutput) {
    const runCmd = analyzer.generateRunCommand(analysis.image, analysis);
    runCmdOutput.textContent = runCmd;
  }

  if (composeOutput) {
    const compose = analyzer.generateDockerCompose(analysis.image, analysis);
    composeOutput.textContent = compose;
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function attachConfigWizardHandlers() {
  const analyzeBtn = document.getElementById("analyze-image-config-btn");
  const copyRunCmdBtn = document.getElementById("copy-run-cmd-btn");
  const copyComposeBtn = document.getElementById("copy-compose-btn");

  if (analyzeBtn) {
    analyzeBtn.onclick = handleAnalyzeImageConfig;
  }

  if (copyRunCmdBtn) {
    copyRunCmdBtn.onclick = () => {
      const runCmdOutput = document.getElementById("run-command-output");
      if (runCmdOutput) {
        copyToClipboard(runCmdOutput.textContent, copyRunCmdBtn);
      }
    };
  }

  if (copyComposeBtn) {
    copyComposeBtn.onclick = () => {
      const composeOutput = document.getElementById("compose-output");
      if (composeOutput) {
        copyToClipboard(composeOutput.textContent, copyComposeBtn);
      }
    };
  }
}

async function handleAnalyzeImageConfig() {
  const imageNameInput = document.getElementById("image-name-input");
  const inspectInput = document.getElementById("image-inspect-config-input");
  const analyzeBtn = document.getElementById("analyze-image-config-btn");

  const imageName = imageNameInput?.value.trim();
  const inspectJson = inspectInput?.value.trim();

  if (!imageName && !inspectJson) {
    showConfigWizardMessage(
      "Please enter an image name or paste Docker inspect JSON",
      "info"
    );
    return;
  }

  // Show loading state
  if (analyzeBtn) {
    const originalText = analyzeBtn.innerHTML;
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML =
      '<span class="flex items-center gap-2"><span class="animate-spin">⏳</span><span>Fetching...</span></span>';

    try {
      let inspectData = null;

      // If inspect JSON is provided, use it directly
      if (inspectJson) {
        inspectData = JSON.parse(inspectJson);
      } else if (imageName) {
        // Try to generate inspect JSON using Gemini AI
        try {
          analyzeBtn.innerHTML =
            '<span class="flex items-center gap-2"><span class="animate-spin">🤖</span><span>AI Generating...</span></span>';

          const geminiAnalyzer = new GeminiAnalyzer();
          inspectData = await geminiAnalyzer.generateInspectJSON(imageName);

          // Validate inspectData structure
          if (
            !inspectData ||
            !Array.isArray(inspectData) ||
            inspectData.length === 0
          ) {
            throw new Error("AI generated invalid JSON structure");
          }

          // Validate required fields
          const firstImage = inspectData[0];
          if (!firstImage.Id || !firstImage.Config) {
            throw new Error(
              "AI generated JSON missing required fields (Id, Config)"
            );
          }

          // Fill the JSON into the textarea so user can see it
          const jsonString = JSON.stringify(inspectData, null, 2);
          if (inspectInput) {
            inspectInput.value = jsonString;

            // Scroll to textarea and highlight it
            inspectInput.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });
            inspectInput.style.border = "2px solid #10b981"; // green border
            setTimeout(() => {
              inspectInput.style.border = "";
            }, 3000);

            // Trigger input event to show it's been filled
            inspectInput.dispatchEvent(new Event("input", { bubbles: true }));
          }

          // Show success message with details (but don't block results)
          const imageId = firstImage.Id.substring(0, 12);
          showConfigWizardStatusMessage(
            `✨ AI generated inspect JSON for ${imageName} (ID: ${imageId}). Analyzing configuration...`,
            "success"
          );

          // Small delay to show success message, then continue to analyze
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Clear status message before showing results
          clearConfigWizardStatusMessage();

          // Continue to analyze with the generated JSON
          // inspectData is already set, so we'll proceed to analysis below
        } catch (aiError) {
          console.error("Gemini AI generation error:", aiError);

          // If AI fails, show instructions
          const errorMsg = aiError.message || "Unknown error";
          const isAPIKeyMissing =
            errorMsg.toLowerCase().includes("api key") ||
            errorMsg.toLowerCase().includes("not configured");

          if (isAPIKeyMissing) {
            showConfigWizardInstructions(
              imageName,
              "AI feature requires Gemini API key. Please set VITE_GEMINI_API_KEY in .env file, or paste Docker inspect JSON manually."
            );
          } else {
            showConfigWizardInstructions(
              imageName,
              `AI generation failed: ${errorMsg}. You can still paste Docker inspect JSON manually.`
            );
          }

          analyzeBtn.disabled = false;
          analyzeBtn.innerHTML = "🔍 Analyze";
          return;
        }
      } else {
        showConfigWizardMessage("Please provide Docker inspect JSON", "info");
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = originalText;
        return;
      }

      // At this point, inspectData should be set (either from JSON input or AI generation)
      if (!inspectData) {
        showConfigWizardMessage(
          "Failed to get inspect data. Please try again.",
          "error"
        );
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = "🔍 Analyze";
        return;
      }

      // Clear any instructions or status messages before analyzing
      clearConfigWizardStatusMessage();

      // Also hide results container to ensure clean state
      const resultsContainer = document.getElementById(
        "config-analysis-results"
      );
      if (resultsContainer) {
        resultsContainer.classList.add("hidden");
      }

      // Update button to show analyzing
      analyzeBtn.innerHTML =
        '<span class="flex items-center gap-2"><span class="animate-spin">⏳</span><span>Analyzing...</span></span>';

      // Analyze the config
      console.log("Starting analysis with inspectData:", inspectData);
      const analyzer = new ImageConfigAnalyzer();
      let analysis;
      try {
        analysis = analyzer.analyzeImageConfig(inspectData);
        console.log("Analysis result:", analysis);
      } catch (analyzeError) {
        console.error("Analysis error:", analyzeError);
        throw new Error(
          `Failed to analyze image config: ${analyzeError.message}`
        );
      }

      // Render the analysis results
      console.log("Rendering analysis results...");
      try {
        renderConfigAnalysis(analysis);
        console.log("Analysis results rendered successfully");
      } catch (renderError) {
        console.error("Render error:", renderError);
        throw new Error(`Failed to render results: ${renderError.message}`);
      }
    } catch (error) {
      showConfigWizardMessage(
        `Error analyzing image: ${error.message}`,
        "error"
      );
      console.error(error);
    } finally {
      // Restore button state
      if (analyzeBtn) {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = "🔍 Analyze";
      }
    }
  }
}

function showConfigWizardInstructions(imageName, errorMessage = "") {
  // Use status message container instead of results container
  const statusContainer = document.getElementById("config-status-message");
  const resultsContainer = document.getElementById("config-analysis-results");

  // Hide results container if it's showing
  if (resultsContainer) {
    resultsContainer.classList.add("hidden");
  }

  // Use status container if available, otherwise fallback to results container
  const container = statusContainer || resultsContainer;
  if (!container) return;

  const hasError = !!errorMessage;
  const bgColor = hasError ? "yellow" : "blue";
  const borderColor = hasError ? "yellow" : "blue";
  const textColor = hasError ? "yellow" : "blue";

  if (statusContainer) {
    statusContainer.classList.remove("hidden");
  } else if (resultsContainer) {
    resultsContainer.classList.remove("hidden");
  }

  container.innerHTML = `
    <div class="bg-${bgColor}-50 border border-${borderColor}-200 rounded-lg p-6">
      <div class="flex items-start gap-4">
        <div class="text-3xl">${hasError ? "⚠️" : "💡"}</div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-${textColor}-900 mb-2">
            ${
              hasError
                ? "Could Not Fetch from Docker Hub"
                : "How to Get Docker Inspect JSON"
            }
          </h3>
          ${
            hasError
              ? `
            <div class="mb-4 p-3 bg-${bgColor}-100 border border-${borderColor}-300 rounded-lg">
              <p class="text-sm text-${textColor}-900 font-medium">${escapeHtml(
                  errorMessage
                )}</p>
              <p class="text-xs text-${textColor}-800 mt-1">You can still analyze the image by pasting Docker inspect JSON below.</p>
            </div>
          `
              : `
            <p class="text-sm text-${textColor}-800 mb-4">
              ${
                hasError
                  ? "Due to browser security restrictions, we cannot fetch directly from Docker Hub API."
                  : "To analyze the image configuration, you can either fetch from Docker Hub (for public images) or run Docker inspect on your machine and paste the JSON output below."
              }
            </p>
          `
          }
          
          <div class="bg-gray-900 rounded-lg p-4 mb-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-gray-400 font-mono">Terminal Command</span>
              <button
                id="copy-inspect-cmd-btn"
                class="text-xs text-blue-400 hover:text-blue-300"
              >
                📋 Copy
              </button>
            </div>
            <code class="text-green-400 font-mono text-sm block whitespace-pre">
docker inspect ${imageName || "IMAGE_NAME"}
            </code>
          </div>
          
          <div class="space-y-2 text-sm text-blue-800">
            <div class="flex items-start gap-2">
              <span class="text-lg">1️⃣</span>
              <div>
                <strong>Run the command above</strong> in your terminal where Docker is installed
              </div>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-lg">2️⃣</span>
              <div>
                <strong>Copy the JSON output</strong> (it should start with <code class="bg-blue-100 px-1 rounded">[{</code>)
              </div>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-lg">3️⃣</span>
              <div>
                <strong>Paste it</strong> in the "Docker Inspect JSON" field above and click Analyze again
              </div>
            </div>
          </div>
          
          <div class="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
            <p class="text-xs text-blue-900">
              <strong>💡 Tip:</strong> If you don't have the image locally, you can pull it first with <code class="bg-blue-200 px-1 rounded">docker pull ${
                imageName || "IMAGE_NAME"
              }</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Setup copy button
  const copyBtn = document.getElementById("copy-inspect-cmd-btn");
  if (copyBtn) {
    copyBtn.onclick = () => {
      const cmd = `docker inspect ${imageName || "IMAGE_NAME"}`;
      copyToClipboard(cmd, copyBtn);
    };
  }
}

function showConfigWizardMessage(message, type = "info") {
  // This function is for temporary messages that should be shown in status area
  showConfigWizardStatusMessage(message, type);
}

function showConfigWizardStatusMessage(message, type = "info") {
  const statusContainer = document.getElementById("config-status-message");
  if (!statusContainer) {
    // Fallback to results container if status container doesn't exist
    const resultsContainer = document.getElementById("config-analysis-results");
    if (resultsContainer) {
      resultsContainer.classList.remove("hidden");
      resultsContainer.innerHTML = `
        <div class="bg-${
          type === "error" ? "red" : type === "success" ? "green" : "blue"
        }-50 border border-${
        type === "error" ? "red" : type === "success" ? "green" : "blue"
      }-200 rounded-lg p-6">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${
              type === "error" ? "⚠️" : type === "success" ? "✅" : "ℹ️"
            }</span>
            <p class="text-${
              type === "error" ? "red" : type === "success" ? "green" : "blue"
            }-900">${escapeHtml(message)}</p>
          </div>
        </div>
      `;
    }
    return;
  }

  const colors = {
    info: "blue",
    error: "red",
    success: "green",
  };
  const color = colors[type] || "blue";

  statusContainer.classList.remove("hidden");
  statusContainer.innerHTML = `
    <div class="bg-${color}-50 border border-${color}-200 rounded-lg p-6">
      <div class="flex items-center gap-3">
        <span class="text-2xl">${
          type === "error" ? "⚠️" : type === "success" ? "✅" : "ℹ️"
        }</span>
        <p class="text-${color}-900">${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}

function clearConfigWizardStatusMessage() {
  const statusContainer = document.getElementById("config-status-message");
  if (statusContainer) {
    statusContainer.classList.add("hidden");
    statusContainer.innerHTML = "";
  }
}

function copyToClipboard(text, button) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = "✓ Copied!";
        setTimeout(() => {
          button.innerHTML = originalText;
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        alert("Failed to copy to clipboard");
      });
  } else {
    // Fallback
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-999999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      document.execCommand("copy");
      const originalText = button.innerHTML;
      button.innerHTML = "✓ Copied!";
      setTimeout(() => {
        button.innerHTML = originalText;
      }, 2000);
    } catch (err) {
      alert("Failed to copy to clipboard");
    } finally {
      document.body.removeChild(textarea);
    }
  }
}
