/**
 * LayerDNA Compare - Visual DNA chain graph diff animation
 * Compares two images with smooth animations
 */

export function renderLayerDNACompare(image1, image2, diff, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Calculate layer mappings
  const layerMapping = calculateLayerMapping(image1, image2, diff);
  
  const html = `
    <div class="layer-dna-compare-container">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          🧬 LayerDNA Compare
          <span class="text-sm font-normal text-gray-500">(Visual Diff)</span>
        </h3>
        <div class="flex gap-2">
          <button id="export-dna-png-btn" class="btn-secondary text-sm">
            📥 Export PNG
          </button>
          <button id="export-dna-svg-btn" class="btn-secondary text-sm">
            📥 Export SVG
          </button>
        </div>
      </div>

      <!-- Docker Guru AI Personality -->
      <div class="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
        <div class="flex items-start gap-3">
          <div class="text-3xl">🐳</div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-semibold text-purple-900">Docker Guru</span>
              <span class="text-xs px-2 py-1 bg-purple-200 text-purple-800 rounded-full">AI Assistant</span>
            </div>
            <p class="text-sm text-purple-800" id="docker-guru-message">
              Analyzing layer differences... Let me show you what changed!
            </p>
          </div>
        </div>
      </div>

      <!-- DNA Chain Visualization -->
      <div class="bg-white border border-gray-200 rounded-lg p-6 overflow-x-auto">
        <div id="dna-chain-container" class="min-w-[800px]">
          <svg id="dna-chain-svg" width="100%" height="${Math.max(400, layerMapping.length * 60)}" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <!-- Gradient definitions -->
              <linearGradient id="newLayerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
              </linearGradient>
              <linearGradient id="removedLayerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#ef4444;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#dc2626;stop-opacity:1" />
              </linearGradient>
              <linearGradient id="reusedLayerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#9ca3af;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#6b7280;stop-opacity:1" />
              </linearGradient>
              
              <!-- Arrow marker -->
              <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
              </marker>
            </defs>
            
            ${renderDNAChain(layerMapping, image1, image2)}
          </svg>
        </div>
      </div>

      <!-- Legend -->
      <div class="mt-4 flex items-center justify-center gap-6 text-sm">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded bg-gradient-to-r from-green-500 to-green-600"></div>
          <span class="text-gray-700">New Layer</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded bg-gradient-to-r from-red-500 to-red-600"></div>
          <span class="text-gray-700">Removed Layer</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded bg-gradient-to-r from-gray-400 to-gray-500"></div>
          <span class="text-gray-700">Reused Layer</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded border-2 border-gray-300 border-dashed"></div>
          <span class="text-gray-700">Changed Layer</span>
        </div>
      </div>

      <!-- Statistics -->
      <div class="mt-6 grid grid-cols-4 gap-4">
        <div class="bg-green-50 p-4 rounded-lg border border-green-200">
          <div class="text-2xl font-bold text-green-700">${layerMapping.filter(l => l.type === 'new').length}</div>
          <div class="text-sm text-green-600">New Layers</div>
        </div>
        <div class="bg-red-50 p-4 rounded-lg border border-red-200">
          <div class="text-2xl font-bold text-red-700">${layerMapping.filter(l => l.type === 'removed').length}</div>
          <div class="text-sm text-red-600">Removed Layers</div>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div class="text-2xl font-bold text-gray-700">${layerMapping.filter(l => l.type === 'reused').length}</div>
          <div class="text-sm text-gray-600">Reused Layers</div>
        </div>
        <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div class="text-2xl font-bold text-yellow-700">${layerMapping.filter(l => l.type === 'changed').length}</div>
          <div class="text-sm text-yellow-600">Changed Layers</div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Setup event handlers
  setupDNAExportHandlers('dna-chain-svg');
  
  // Generate Docker Guru insights
  generateDockerGuruInsights(image1, image2, diff, layerMapping);
}

function calculateLayerMapping(image1, image2, diff) {
  const mapping = [];
  const maxLayers = Math.max(image1.layers.length, image2.layers.length);
  
  // Calculate average size per layer if sizes are missing
  const calculateLayerSize = (layer, totalSize, totalLayers) => {
    if (layer.size && layer.size > 0) return layer.size;
    
    // Estimate size based on total image size divided by layers
    // This is a rough estimate
    if (totalSize > 0 && totalLayers > 0) {
      return totalSize / totalLayers;
    }
    
    // Try to get size from diff if available
    const diffLayer = diff.differentLayers?.find(d => 
      (d.layer1?.id === layer.id && d.type === 'removed') ||
      (d.layer2?.id === layer.id && d.type === 'added')
    );
    if (diffLayer && Math.abs(diffLayer.sizeDiff) > 0) {
      return Math.abs(diffLayer.sizeDiff);
    }
    
    return 0;
  };

  for (let i = 0; i < maxLayers; i++) {
    const layer1 = image1.layers[i];
    const layer2 = image2.layers[i];

    if (!layer1 && layer2) {
      // New layer in image2
      const size = calculateLayerSize(layer2, image2.size, image2.layers.length);
      const instruction = extractInstruction(layer2.createdBy) || `Layer ${i + 1}`;
      
      mapping.push({
        type: 'new',
        layer1: null,
        layer2: { ...layer2, size },
        index1: -1,
        index2: i,
        instruction,
        size,
      });
    } else if (layer1 && !layer2) {
      // Removed layer
      const size = calculateLayerSize(layer1, image1.size, image1.layers.length);
      const instruction = extractInstruction(layer1.createdBy) || `Layer ${i + 1}`;
      
      mapping.push({
        type: 'removed',
        layer1: { ...layer1, size },
        layer2: null,
        index1: i,
        index2: -1,
        instruction,
        size,
      });
    } else if (layer1 && layer2) {
      const size1 = calculateLayerSize(layer1, image1.size, image1.layers.length);
      const size2 = calculateLayerSize(layer2, image2.size, image2.layers.length);
      const instruction1 = extractInstruction(layer1.createdBy) || `Layer ${i + 1}`;
      const instruction2 = extractInstruction(layer2.createdBy) || `Layer ${i + 1}`;
      
      if (areLayersSame(layer1, layer2)) {
        // Reused layer
        mapping.push({
          type: 'reused',
          layer1: { ...layer1, size: size1 },
          layer2: { ...layer2, size: size2 },
          index1: i,
          index2: i,
          instruction: instruction1,
          size: size1,
        });
      } else {
        // Changed layer
        mapping.push({
          type: 'changed',
          layer1: { ...layer1, size: size1 },
          layer2: { ...layer2, size: size2 },
          index1: i,
          index2: i,
          instruction: instruction2,
          instruction1: instruction1,
          size1: size1,
          size2: size2,
        });
      }
    }
  }

  return mapping;
}

function renderDNAChain(mapping, image1, image2) {
  let svg = '';
  const layerHeight = 50;
  const startX = 50;
  const chainWidth = 400;
  const maxIndex = Math.max(...mapping.map(m => Math.max(m.index1, m.index2)).filter(i => i >= 0));
  
  // Render DNA chain nodes
  mapping.forEach((layer, index) => {
    const y = 50 + index * layerHeight;
    const node = renderDNANode(layer, startX, y, chainWidth, index);
    svg += node;
  });

  // Render connections (DNA chain links)
  for (let i = 0; i < mapping.length - 1; i++) {
    const y1 = 50 + i * layerHeight + 25;
    const y2 = 50 + (i + 1) * layerHeight + 25;
    svg += `
      <line x1="${startX + chainWidth / 2}" y1="${y1}" 
            x2="${startX + chainWidth / 2}" y2="${y2}" 
            stroke="#94a3b8" stroke-width="2" stroke-dasharray="2,2" 
            class="dna-link" data-index="${i}" />
    `;
  }

  return svg;
}

function renderDNANode(layer, x, y, width, index) {
  const centerX = x + width / 2;
  const nodeRadius = 15;
  
  // Determine color based on type
  let fill, stroke, strokeWidth, opacity;
  let gradientId = '';
  
  switch (layer.type) {
    case 'new':
      gradientId = 'newLayerGradient';
      fill = 'url(#newLayerGradient)';
      stroke = '#059669';
      strokeWidth = 2;
      opacity = 1;
      break;
    case 'removed':
      gradientId = 'removedLayerGradient';
      fill = 'url(#removedLayerGradient)';
      stroke = '#dc2626';
      strokeWidth = 2;
      opacity = 0.8;
      break;
    case 'reused':
      gradientId = 'reusedLayerGradient';
      fill = 'url(#reusedLayerGradient)';
      stroke = '#6b7280';
      strokeWidth = 1;
      opacity = 1;
      break;
    case 'changed':
      fill = '#fef3c7';
      stroke = '#f59e0b';
      strokeWidth = 2;
      opacity = 1;
      break;
  }

  // Calculate size - prefer size2 for changed layers, otherwise use size
  const layerSize = layer.type === 'changed' 
    ? (layer.size2 || layer.size1 || layer.size || 0)
    : (layer.size || layer.size2 || 0);
  const sizeMB = (layerSize / (1024 * 1024)).toFixed(2);
  
  // Get instruction with fallback
  let instruction = layer.instruction || layer.instruction1;
  if (!instruction || instruction.trim() === '') {
    instruction = layer.layer1?.createdBy 
      ? extractInstruction(layer.layer1.createdBy)
      : layer.layer2?.createdBy 
        ? extractInstruction(layer.layer2.createdBy)
        : `Layer ${index + 1}`;
  }
  
  const tooltip = `${layer.type.toUpperCase()}: ${instruction.substring(0, 50)}${instruction.length > 50 ? '...' : ''} (${sizeMB} MB)`;

  return `
    <g class="dna-node-group" data-type="${layer.type}" data-index="${index}">
      <!-- Connection line from previous node -->
      ${index > 0 ? `
        <line x1="${centerX}" y1="${y - 25}" 
              x2="${centerX}" y2="${y}" 
              stroke="#94a3b8" stroke-width="2" opacity="0.5" />
      ` : ''}
      
      <!-- Main DNA node (circle) -->
      <circle 
        cx="${centerX}" 
        cy="${y}" 
        r="${nodeRadius}" 
        fill="${fill}" 
        stroke="${stroke}" 
        stroke-width="${strokeWidth}"
        opacity="${opacity}"
        class="dna-node cursor-pointer transition-all duration-300 hover:scale-110"
        data-layer-index="${index}"
        data-type="${layer.type}"
        data-tooltip="${escapeHtml(tooltip)}"
      />
      
      <!-- Layer index label -->
      <text x="${centerX}" y="${y + 5}" 
            font-size="10" font-weight="bold" 
            fill="white" text-anchor="middle" 
            pointer-events="none">
        ${index + 1}
      </text>
      
      <!-- Instruction label (left side) -->
      <text x="${x}" y="${y + 5}" 
            font-size="11" 
            fill="#374151" 
            text-anchor="start"
            class="instruction-label"
            style="pointer-events: none; font-family: monospace;">
        ${escapeHtml(instruction ? instruction.substring(0, 40) : `Layer ${index + 1}`)}${instruction && instruction.length > 40 ? '...' : ''}
      </text>
      
      <!-- Size label (right side) -->
      <text x="${x + width}" y="${y + 5}" 
            font-size="10" 
            fill="#6b7280" 
            text-anchor="end"
            style="pointer-events: none;">
        ${sizeMB} MB
      </text>
      
      <!-- Changed layer indicator (double circle for changed) -->
      ${layer.type === 'changed' ? `
        <circle 
          cx="${centerX}" 
          cy="${y}" 
          r="${nodeRadius + 3}" 
          fill="none" 
          stroke="#f59e0b" 
          stroke-width="2"
          stroke-dasharray="3,3"
          opacity="0.6"
          class="changed-indicator"
        />
      ` : ''}
    </g>
  `;
}

function areLayersSame(layer1, layer2) {
  if (layer1.id === layer2.id && layer1.id !== 'base') return true;
  if (layer1.createdBy === layer2.createdBy && 
      layer1.size === layer2.size &&
      Math.abs(layer1.size) > 0) return true;
  return false;
}

function extractInstruction(createdBy) {
  if (!createdBy || typeof createdBy !== 'string' || createdBy.trim() === '') {
    return '';
  }
  
  // Try to extract from /bin/sh -c #(nop) ...
  const match = createdBy.match(/\/bin\/sh\s+-c\s+#\(nop\)\s+(.*)/);
  if (match && match[1]) return match[1].trim();
  
  // Try to extract from /bin/sh -c ...
  const match2 = createdBy.match(/\/bin\/sh\s+-c\s+(.*)/);
  if (match2 && match2[1]) return match2[1].trim();
  
  // If it looks like a Dockerfile instruction, extract it
  const dockerfileMatch = createdBy.match(/(FROM|RUN|COPY|ADD|WORKDIR|ENV|EXPOSE|CMD|ENTRYPOINT|USER|ARG|LABEL|VOLUME|STOPSIGNAL|HEALTHCHECK|ONBUILD)\s+(.*)/i);
  if (dockerfileMatch && dockerfileMatch[2]) {
    return `${dockerfileMatch[1]} ${dockerfileMatch[2].trim()}`;
  }
  
  // Return cleaned version if it's not empty
  const cleaned = createdBy.trim();
  if (cleaned) return cleaned;
  
  return '';
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

function setupDNAExportHandlers(svgId) {
  const exportPngBtn = document.getElementById('export-dna-png-btn');
  const exportSvgBtn = document.getElementById('export-dna-svg-btn');

  if (exportPngBtn) {
    exportPngBtn.onclick = () => exportDNAPNG(svgId);
  }

  if (exportSvgBtn) {
    exportSvgBtn.onclick = () => exportDNASVG(svgId);
  }

  // Setup hover tooltips
  setupTooltips();
}

function setupTooltips() {
  const nodes = document.querySelectorAll('.dna-node');
  nodes.forEach(node => {
    node.addEventListener('mouseenter', (e) => {
      const tooltip = e.target.getAttribute('data-tooltip');
      if (tooltip) {
        showTooltip(e, tooltip);
      }
    });
    
    node.addEventListener('mouseleave', () => {
      hideTooltip();
    });
  });
}

let tooltipElement = null;

function showTooltip(event, text) {
  hideTooltip();
  
  tooltipElement = document.createElement('div');
  tooltipElement.className = 'fixed bg-gray-900 text-white px-3 py-2 rounded-lg text-sm z-50 pointer-events-none';
  tooltipElement.textContent = text;
  document.body.appendChild(tooltipElement);
  
  const x = event.clientX + 10;
  const y = event.clientY + 10;
  tooltipElement.style.left = `${x}px`;
  tooltipElement.style.top = `${y}px`;
}

function hideTooltip() {
  if (tooltipElement) {
    tooltipElement.remove();
    tooltipElement = null;
  }
}

function exportDNAPNG(svgId) {
  const svg = document.getElementById(svgId);
  if (!svg) return;

  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const img = new Image();
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  img.onload = () => {
    canvas.width = svg.clientWidth || 800;
    canvas.height = svg.clientHeight || 600;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    
    canvas.toBlob((blob) => {
      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = `dockeropt-layerdna-${Date.now()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadUrl);
    });
    
    URL.revokeObjectURL(url);
  };
  
  img.src = url;
}

function exportDNASVG(svgId) {
  const svg = document.getElementById(svgId);
  if (!svg) return;

  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  
  const downloadLink = document.createElement('a');
  downloadLink.href = svgUrl;
  downloadLink.download = `dockeropt-layerdna-${Date.now()}.svg`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  
  URL.revokeObjectURL(svgUrl);
}

function generateDockerGuruInsights(image1, image2, diff, layerMapping) {
  const guruMessage = document.getElementById('docker-guru-message');
  if (!guruMessage) return;

  const newLayers = layerMapping.filter(l => l.type === 'new').length;
  const removedLayers = layerMapping.filter(l => l.type === 'removed').length;
  const reusedLayers = layerMapping.filter(l => l.type === 'reused').length;
  const changedLayers = layerMapping.filter(l => l.type === 'changed').length;
  
  const sizeDiffMB = (Math.abs(diff.sizeDiff) / (1024 * 1024)).toFixed(2);
  const sizeDiffSign = diff.sizeDiff >= 0 ? '+' : '';
  
  let insight = '';
  
  if (newLayers > removedLayers && diff.sizeDiff > 0) {
    insight = `I see you've added ${newLayers} new layers (${sizeDiffSign}${sizeDiffMB} MB). Consider if some could be consolidated to reduce size!`;
  } else if (removedLayers > newLayers && diff.sizeDiff < 0) {
    insight = `Great job! You removed ${removedLayers} layers and saved ${Math.abs(diff.sizeDiff) / (1024 * 1024)} MB. That's optimization! 🎉`;
  } else if (reusedLayers > 0) {
    insight = `Excellent cache efficiency! ${reusedLayers} layers are reused between images. This means faster rebuilds! ⚡`;
  } else if (changedLayers > 0) {
    insight = `${changedLayers} layers have changed. Let's review if these changes were necessary or could be optimized further.`;
  } else {
    insight = `The images are quite similar! Both use similar layer structure. Keep optimizing! 💪`;
  }

  // Animate message appearance
  guruMessage.textContent = insight;
  guruMessage.style.opacity = '0';
  guruMessage.style.transform = 'translateY(-10px)';
  
  setTimeout(() => {
    guruMessage.style.transition = 'all 0.5s ease';
    guruMessage.style.opacity = '1';
    guruMessage.style.transform = 'translateY(0)';
  }, 100);
}

