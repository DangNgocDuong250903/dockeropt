/**
 * Image Inspector - Analyzes Docker image layers (like Dive)
 * Parses docker inspect and docker history output
 */

export interface ImageLayer {
  id: string;
  created: string;
  createdBy: string;
  size: number; // bytes
  instruction?: string;
  comment?: string;
  order: number; // layer order (0 = base, higher = newer)
}

export interface ImageInfo {
  id: string;
  repo: string;
  tag: string;
  digest?: string;
  created: string;
  size: number; // total size in bytes
  layers: ImageLayer[];
  config?: {
    exposedPorts?: Record<string, unknown>;
    env?: string[];
    cmd?: string[];
    entrypoint?: string[];
    workingDir?: string;
    user?: string;
  };
}

export interface LayerAnalysis {
  layer: ImageLayer;
  wastedSpace: number; // bytes that could be removed
  inefficientOperations: string[];
  securityIssues: string[];
  cacheBustRisk: 'low' | 'medium' | 'high';
  optimizationSuggestions: string[];
}

export class ImageInspector {
  /**
   * Parse Docker inspect JSON output
   */
  parseInspect(inspectJson: string): ImageInfo {
    try {
      const data = JSON.parse(inspectJson);
      const image = Array.isArray(data) ? data[0] : data;

      const layers = this.parseLayers(image);
      
      return {
        id: image.Id || image.Id?.slice(0, 12) || 'unknown',
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
      throw new Error(`Failed to parse inspect JSON: ${error}`);
    }
  }

  /**
   * Parse docker history output (simulated from inspect or actual history)
   */
  parseHistory(historyJson: string): ImageLayer[] {
    try {
      const history = JSON.parse(historyJson);
      return history.map((item: any, index: number) => ({
        id: item.Id?.slice(0, 12) || `layer-${index}`,
        created: item.Created || new Date().toISOString(),
        createdBy: item.CreatedBy || '',
        size: item.Size || 0,
        instruction: this.extractInstruction(item.CreatedBy),
        comment: item.Comment || '',
        order: index,
      }));
    } catch (error) {
      throw new Error(`Failed to parse history JSON: ${error}`);
    }
  }

  /**
   * Analyze layers for inefficiencies
   */
  analyzeLayers(image: ImageInfo): LayerAnalysis[] {
    const analyses: LayerAnalysis[] = [];

    for (const layer of image.layers) {
      const analysis: LayerAnalysis = {
        layer,
        wastedSpace: 0,
        inefficientOperations: [],
        securityIssues: [],
        cacheBustRisk: 'low',
        optimizationSuggestions: [],
      };

      // Check for wasted space
      if (layer.instruction) {
        // Package manager cache
        if (layer.instruction.includes('apt-get install') && 
            !layer.instruction.includes('apt-get clean') &&
            !layer.instruction.includes('rm -rf /var/lib/apt/lists')) {
          analysis.wastedSpace += 50000000; // ~50MB typical
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
            (!layer.instruction.includes('USER') && analysis.layer.order > 0)) {
          analysis.securityIssues.push('Running as root user');
          analysis.optimizationSuggestions.push('Add USER directive with non-root user');
        }

        // Large layer size
        if (layer.size > 100 * 1024 * 1024) { // > 100MB
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

  /**
   * Calculate layer efficiency score (0-100)
   */
  calculateEfficiencyScore(analyses: LayerAnalysis[]): number {
    if (analyses.length === 0) return 100;

    let score = 100;
    const totalWastedSpace = analyses.reduce((sum, a) => sum + a.wastedSpace, 0);
    const totalSize = analyses.reduce((sum, a) => sum + a.layer.size, 0);

    // Deduct for wasted space
    if (totalSize > 0) {
      const wastedPercentage = (totalWastedSpace / totalSize) * 100;
      score -= Math.min(30, wastedPercentage);
    }

    // Deduct for inefficient operations
    const inefficiencyPenalty = analyses.reduce((sum, a) => 
      sum + a.inefficientOperations.length, 0) * 5;
    score -= Math.min(20, inefficiencyPenalty);

    // Deduct for security issues
    const securityPenalty = analyses.reduce((sum, a) => 
      sum + a.securityIssues.length, 0) * 10;
    score -= Math.min(30, securityPenalty);

    // Deduct for cache bust risk
    const highRiskLayers = analyses.filter(a => a.cacheBustRisk === 'high').length;
    score -= highRiskLayers * 5;

    return Math.max(0, Math.round(score));
  }

  /**
   * Generate layer visualization data
   */
  generateLayerGraph(image: ImageInfo): LayerGraph {
    const nodes = image.layers.map((layer, index) => ({
      id: `layer-${index}`,
      label: this.extractInstruction(layer.createdBy) || `Layer ${index + 1}`,
      size: layer.size,
      order: index,
      layer,
    }));

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

  private parseLayers(image: any): ImageLayer[] {
    // Try to extract from RootFS.Layers
    const layers: ImageLayer[] = [];
    
    if (image.RootFS?.Layers) {
      image.RootFS.Layers.forEach((layerId: string, index: number) => {
        layers.push({
          id: layerId.slice(7, 19), // Remove 'sha256:' prefix
          created: image.Created || new Date().toISOString(),
          createdBy: '', // Not in inspect, need history
          size: 0, // Need history for actual sizes
          order: index,
        });
      });
    } else {
      // Fallback: create layers from history or empty
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

  private extractInstruction(createdBy?: string): string {
    if (!createdBy) return '';
    
    // Remove /bin/sh -c prefix
    const match = createdBy.match(/\/bin\/sh\s+-c\s+#\(nop\)\s+(.*)/);
    if (match) return match[1];
    
    const match2 = createdBy.match(/\/bin\/sh\s+-c\s+(.*)/);
    if (match2) return match2[1];
    
    return createdBy;
  }
}

export interface LayerGraph {
  nodes: Array<{
    id: string;
    label: string;
    size: number;
    order: number;
    layer: ImageLayer;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
  }>;
  totalSize: number;
  layerCount: number;
}

