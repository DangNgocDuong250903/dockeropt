/**
 * Browser-compatible Image Inspector
 * Parses Docker inspect JSON and analyzes layers
 */

export class ImageInspector {
  parseInspect(inspectJson) {
    try {
      const data = JSON.parse(inspectJson);
      const image = Array.isArray(data) ? data[0] : data;

      const layers = this.parseLayers(image);
      
      return {
        id: image.Id?.slice(0, 12) || 'unknown',
        repo: image.RepoTags?.[0]?.split(':')[0] || 'unknown',
        tag: image.RepoTags?.[0]?.split(':')[1] || 'latest',
        digest: image.RepoDigests?.[0],
        created: image.Created || new Date().toISOString(),
        size: image.Size || 0,
        layers,
        config: {
          exposedPorts: image.Config?.ExposedPorts,
          env: image.Config?.Env,
          cmd: image.Config?.Cmd,
          entrypoint: image.Config?.Entrypoint,
          workingDir: image.Config?.WorkingDir,
          user: image.Config?.User,
        },
      };
    } catch (error) {
      throw new Error(`Failed to parse inspect JSON: ${error.message}`);
    }
  }

  parseHistory(historyJson) {
    try {
      const parsed = JSON.parse(historyJson);
      
      // Handle different JSON structures
      let history = null;
      
      if (Array.isArray(parsed)) {
        // Direct array
        history = parsed;
      } else if (parsed && typeof parsed === 'object') {
        // Try to find array in object
        if (Array.isArray(parsed.history)) {
          history = parsed.history;
        } else if (Array.isArray(parsed.History)) {
          history = parsed.History;
        } else if (Array.isArray(parsed.data)) {
          history = parsed.data;
        } else {
          // Try to find any array property
          const keys = Object.keys(parsed);
          for (const key of keys) {
            if (Array.isArray(parsed[key])) {
              history = parsed[key];
              break;
            }
          }
        }
      }
      
      // If still not found, return empty array
      if (!history || !Array.isArray(history)) {
        console.warn('History JSON is not an array. Expected array or object with array property.');
        return [];
      }
      
      return history.map((item, index) => ({
        id: item.Id?.slice(0, 12) || item.id?.slice(0, 12) || `layer-${index}`,
        created: item.Created || item.created || new Date().toISOString(),
        createdBy: item.CreatedBy || item.createdBy || item.CreatedByRaw || '',
        size: item.Size || item.size || 0,
        instruction: this.extractInstruction(item.CreatedBy || item.createdBy || item.CreatedByRaw),
        comment: item.Comment || item.comment || '',
        order: index,
      }));
    } catch (error) {
      throw new Error(`Failed to parse history JSON: ${error.message}`);
    }
  }

  analyzeLayers(image) {
    const analyses = [];

    for (const layer of image.layers) {
      const analysis = {
        layer,
        wastedSpace: 0,
        inefficientOperations: [],
        securityIssues: [],
        cacheBustRisk: 'low',
        optimizationSuggestions: [],
      };

      if (layer.instruction) {
        // Package manager cache
        if (layer.instruction.includes('apt-get install') && 
            !layer.instruction.includes('apt-get clean') &&
            !layer.instruction.includes('rm -rf /var/lib/apt/lists')) {
          analysis.wastedSpace += 50000000;
          analysis.inefficientOperations.push('Package manager cache not cleaned');
          analysis.optimizationSuggestions.push(
            'Add: && apt-get clean && rm -rf /var/lib/apt/lists/*'
          );
        }

        // npm/yarn cache
        if ((layer.instruction.includes('npm install') || 
             layer.instruction.includes('yarn install')) &&
            !layer.instruction.includes('--production') &&
            !layer.instruction.includes('npm ci')) {
          analysis.inefficientOperations.push('Using npm install instead of npm ci');
          analysis.optimizationSuggestions.push('Use npm ci for faster, reliable builds');
        }

        // COPY . .
        if (layer.instruction.includes('COPY . .') || 
            layer.instruction.includes('ADD . .')) {
          analysis.cacheBustRisk = 'high';
          analysis.inefficientOperations.push('Copying all files breaks cache');
          analysis.optimizationSuggestions.push(
            'Copy dependency files first, then source code'
          );
        }

        // Security checks
        if (layer.instruction.includes('USER root') || 
            (!layer.instruction.includes('USER') && layer.order > 0)) {
          analysis.securityIssues.push('Running as root user');
          analysis.optimizationSuggestions.push('Add USER directive with non-root user');
        }

        // Large layer size
        if (layer.size > 100 * 1024 * 1024) {
          analysis.inefficientOperations.push('Large layer size (>100MB)');
          analysis.optimizationSuggestions.push(
            'Consider splitting into multiple smaller layers'
          );
        }
      }

      analyses.push(analysis);
    }

    return analyses;
  }

  calculateEfficiencyScore(analyses) {
    if (analyses.length === 0) return 100;

    let score = 100;
    const totalWastedSpace = analyses.reduce((sum, a) => sum + a.wastedSpace, 0);
    const totalSize = analyses.reduce((sum, a) => sum + a.layer.size, 0);

    if (totalSize > 0) {
      const wastedPercentage = (totalWastedSpace / totalSize) * 100;
      score -= Math.min(30, wastedPercentage);
    }

    const inefficiencyPenalty = analyses.reduce((sum, a) => 
      sum + a.inefficientOperations.length, 0) * 5;
    score -= Math.min(20, inefficiencyPenalty);

    const securityPenalty = analyses.reduce((sum, a) => 
      sum + a.securityIssues.length, 0) * 10;
    score -= Math.min(30, securityPenalty);

    const highRiskLayers = analyses.filter(a => a.cacheBustRisk === 'high').length;
    score -= highRiskLayers * 5;

    return Math.max(0, Math.round(score));
  }

  generateLayerGraph(image) {
    // Calculate layer sizes if missing
    const totalSize = image.size || 0;
    const layerCount = image.layers.length || 1;
    const avgSize = totalSize / layerCount;

    const nodes = image.layers.map((layer, index) => {
      // Use actual size if available
      let layerSize = layer.size;
      if (!layerSize || layerSize === 0) {
        // Estimate from total size
        layerSize = avgSize;
      }

      return {
        id: `layer-${index}`,
        label: this.extractInstruction(layer.createdBy) || `Layer ${index + 1}`,
        size: layerSize,
        order: index,
        layer: {
          ...layer,
          size: layerSize,
          repo: image.repo,
          tag: image.tag,
        },
      };
    });

    const edges = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        source: nodes[i].id,
        target: nodes[i + 1].id,
        type: 'layer',
      });
    }

    return {
      nodes,
      edges,
      totalSize: image.size,
      layerCount: image.layers.length,
    };
  }

  parseLayers(image) {
    const layers = [];
    
    if (image.RootFS?.Layers) {
      image.RootFS.Layers.forEach((layerId, index) => {
        layers.push({
          id: layerId.slice(7, 19),
          created: image.Created || new Date().toISOString(),
          createdBy: '',
          size: 0,
          order: index,
        });
      });
    } else {
      layers.push({
        id: 'base',
        created: image.Created || new Date().toISOString(),
        createdBy: '',
        size: 0,
        order: 0,
      });
    }

    return layers;
  }

  extractInstruction(createdBy) {
    if (!createdBy) return '';
    
    const match = createdBy.match(/\/bin\/sh\s+-c\s+#\(nop\)\s+(.*)/);
    if (match) return match[1];
    
    const match2 = createdBy.match(/\/bin\/sh\s+-c\s+(.*)/);
    if (match2) return match2[1];
    
    return createdBy;
  }
}

