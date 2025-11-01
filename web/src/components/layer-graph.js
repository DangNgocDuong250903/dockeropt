/**
 * Interactive Layer Graph Visualization Component
 * Visualizes Docker image layers as an interactive graph
 */

export function renderLayerGraph(graphData, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const graphHtml = `
    <div class="layer-graph-container">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">📊 Layer Visualization</h3>
        <div class="flex gap-2">
          <button id="export-svg-btn" class="btn-secondary text-sm">
            📥 Export SVG
          </button>
          <button id="export-png-btn" class="btn-secondary text-sm">
            📥 Export PNG
          </button>
        </div>
      </div>
      
      <div id="layer-graph-canvas" class="border border-gray-200 rounded-lg bg-white p-4 min-h-[400px] overflow-hidden">
        <div style="overflow-x: auto; overflow-y: visible; width: 100%;">
          ${renderGraphSVG(graphData)}
        </div>
      </div>
      
      <div class="mt-4 text-sm text-gray-600">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Base Layer</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-green-500 rounded"></div>
            <span>Small Layer (&lt;50MB)</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>Medium Layer (50-100MB)</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-red-500 rounded"></div>
            <span>Large Layer (&gt;100MB)</span>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = graphHtml;
  
  // Setup export handlers
  setupExportHandlers(graphData);
}

function renderGraphSVG(graphData) {
  const nodes = graphData.nodes || [];
  const edges = graphData.edges || [];
  
  const maxSize = Math.max(...nodes.map(n => n.size || 0), 1);
  // Reduce width to fit container better
  const width = 700; // Reduced from 800
  const height = Math.max(400, nodes.length * 80);
  const layerHeight = 60;
  const nodeWidth = 450; // Reduced to prevent overflow
  const maxBarWidth = nodeWidth; // Maximum bar width

  let svg = `
    <svg width="${width}" height="${height}" id="layer-graph-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" style="max-width: 100%; height: auto; overflow: visible;">
      <defs>
        <linearGradient id="layerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
        </linearGradient>
      </defs>
  `;

  // Render edges (connections)
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode && targetNode) {
      const y1 = 40 + sourceNode.order * layerHeight;
      const y2 = 40 + targetNode.order * layerHeight;
      const x1 = 100;
      const x2 = 100;
      
      svg += `
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
              stroke="#94a3b8" stroke-width="2" marker-end="url(#arrowhead)" />
      `;
    }
  });

  // Render arrow marker
  svg += `
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="10" 
              refX="9" refY="3" orient="auto">
        <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
      </marker>
    </defs>
  `;

  // Render nodes (layers)
  nodes.forEach(node => {
    const y = 40 + node.order * layerHeight;
    const sizeRatio = maxSize > 0 ? (node.size / maxSize) : 0;
    // Calculate bar width with max constraint to prevent overflow
    const barWidth = Math.min(maxBarWidth, Math.max(20, sizeRatio * nodeWidth));
    
    // Color based on size
    let color = '#3b82f6'; // blue - small
    if (node.size > 100 * 1024 * 1024) {
      color = '#ef4444'; // red - large
    } else if (node.size > 50 * 1024 * 1024) {
      color = '#f59e0b'; // yellow - medium
    } else if (node.order === 0) {
      color = '#10b981'; // green - base
    }

    const sizeMB = (node.size / (1024 * 1024)).toFixed(2);
    
    svg += `
      <g class="layer-node" data-layer-id="${node.id}">
        <!-- Layer bar -->
        <rect x="100" y="${y - 20}" width="${barWidth}" height="40" 
              fill="${color}" rx="4" class="cursor-pointer hover:opacity-80"
              data-tooltip="${node.label}\nSize: ${sizeMB} MB"/>
        
        <!-- Layer label -->
        <text x="10" y="${y + 5}" font-size="12" fill="#374151" font-weight="500">
          L${node.order}
        </text>
        
        <!-- Size label - ensure it doesn't overflow -->
        <text x="${Math.min(650, Math.max(120, 110 + barWidth + 10))}" y="${y + 5}" font-size="11" fill="#6b7280">
          ${sizeMB} MB
        </text>
        
        <!-- Instruction preview -->
        <text x="120" y="${y - 5}" font-size="10" fill="#ffffff" font-weight="500">
          ${truncateText(node.label, Math.floor(barWidth / 8))}
        </text>
      </g>
    `;
  });

  svg += '</svg>';

  return svg;
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function setupExportHandlers(graphData) {
  const exportSvgBtn = document.getElementById('export-svg-btn');
  const exportPngBtn = document.getElementById('export-png-btn');

  if (exportSvgBtn) {
    exportSvgBtn.addEventListener('click', () => exportSVG());
  }

  if (exportPngBtn) {
    exportPngBtn.addEventListener('click', () => exportPNG());
  }
}

function exportSVG() {
  const svg = document.getElementById('layer-graph-svg');
  if (!svg) return;

  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  
  const downloadLink = document.createElement('a');
  downloadLink.href = svgUrl;
  downloadLink.download = `dockeropt-layer-graph-${Date.now()}.svg`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  
  URL.revokeObjectURL(svgUrl);
}

function exportPNG() {
  const svg = document.getElementById('layer-graph-svg');
  if (!svg) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const svgData = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `dockeropt-layer-graph-${Date.now()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    });
  };
  
  img.src = url;
}

/**
 * Render comparison graph for two images
 */
export function renderComparisonGraph(image1Data, image2Data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Ensure sizes are calculated for nodes
  const calculateNodeSizes = (graphData) => {
    const nodes = graphData.nodes || [];
    const totalSize = graphData.totalSize || 0;
    const layerCount = nodes.length || 1;
    const avgSize = totalSize / layerCount;

    return nodes.map((node, index) => {
      // Use actual size if available
      if (node.size && node.size > 0) {
        return node;
      }
      // Otherwise estimate from total size
      return {
        ...node,
        size: avgSize,
      };
    });
  };

  const graph1 = {
    ...image1Data,
    nodes: calculateNodeSizes(image1Data),
  };
  
  const graph2 = {
    ...image2Data,
    nodes: calculateNodeSizes(image2Data),
  };

  // Get image info from graph data or use defaults
  const image1Repo = graph1.nodes?.[0]?.layer?.repo || 'Image 1';
  const image1Tag = graph1.nodes?.[0]?.layer?.tag || 'latest';
  const image2Repo = graph2.nodes?.[0]?.layer?.repo || 'Image 2';
  const image2Tag = graph2.nodes?.[0]?.layer?.tag || 'latest';

  const containerHtml = `
    <div class="comparison-graph-container">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">📊 Layer Comparison</h3>
        <button id="export-comparison-btn" class="btn-secondary text-sm">
          📥 Export Comparison
        </button>
      </div>
      
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <h4 class="text-sm font-semibold text-gray-700 mb-2">
            ${image1Repo}:${image1Tag}
          </h4>
          <div id="graph1-container" class="border border-gray-200 rounded-lg bg-white p-4 overflow-hidden">
            <div style="overflow-x: auto; overflow-y: visible;">
              ${renderGraphSVG(graph1)}
            </div>
          </div>
        </div>
        <div>
          <h4 class="text-sm font-semibold text-gray-700 mb-2">
            ${image2Repo}:${image2Tag}
          </h4>
          <div id="graph2-container" class="border border-gray-200 rounded-lg bg-white p-4 overflow-hidden">
            <div style="overflow-x: auto; overflow-y: visible;">
              ${renderGraphSVG(graph2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = containerHtml;
}

