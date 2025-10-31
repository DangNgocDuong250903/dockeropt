/**
 * Layer Analyzer - Analyzes Docker layers and cache behavior
 */

import { DockerfileAST, Instruction } from './types';

export interface Layer {
  instruction: Instruction;
  index: number;
  estimatedSize: number; // MB
  cacheBustRisk: 'low' | 'medium' | 'high';
}

export interface CacheMap {
  layers: Layer[];
  totalLayers: number;
  cacheBustPoints: number[];
}

export class LayerAnalyzer {
  analyze(ast: DockerfileAST): CacheMap {
    const layers: Layer[] = [];
    let layerIndex = 0;

    // Instructions that create layers
    const layerInstructions = ['RUN', 'COPY', 'ADD'];

    for (const inst of ast.instructions) {
      if (layerInstructions.includes(inst.type)) {
        const layer: Layer = {
          instruction: inst,
          index: layerIndex++,
          estimatedSize: this.estimateLayerSize(inst),
          cacheBustRisk: this.assessCacheBustRisk(inst),
        };
        layers.push(layer);
      }
    }

    const cacheBustPoints = this.identifyCacheBustPoints(layers);

    return {
      layers,
      totalLayers: layers.length,
      cacheBustPoints,
    };
  }

  private estimateLayerSize(inst: Instruction): number {
    // Heuristic size estimation
    if (inst.type === 'RUN') {
      // Package installations
      if (inst.value.includes('apt-get install')) {
        const packageCount = inst.value.split(/\s+/).filter(p => 
          !p.includes('apt-get') && !p.includes('-y') && !p.includes('--')
        ).length;
        return packageCount * 5; // ~5MB per package average
      }

      if (inst.value.includes('apk add')) {
        const packageCount = inst.value.split(/\s+/).filter(p => 
          !p.includes('apk') && !p.includes('add') && !p.includes('--')
        ).length;
        return packageCount * 2; // Alpine packages are smaller
      }

      if (inst.value.includes('npm install') || inst.value.includes('yarn install')) {
        return 150; // node_modules can be large
      }

      if (inst.value.includes('pip install')) {
        return 50;
      }

      return 10; // Default for other RUN commands
    }

    if (inst.type === 'COPY' || inst.type === 'ADD') {
      // Check if copying everything
      if (inst.value.includes('. .') || inst.args[0] === '.') {
        return 100; // Assume large source copy
      }

      // Specific files
      if (inst.value.includes('package.json')) {
        return 0.001; // Tiny file
      }

      return 20; // Default for COPY
    }

    return 0;
  }

  private assessCacheBustRisk(inst: Instruction): 'low' | 'medium' | 'high' {
    // COPY . . is high risk
    if ((inst.type === 'COPY' || inst.type === 'ADD') && 
        (inst.value.includes('. .') || inst.args[0] === '.')) {
      return 'high';
    }

    // COPY specific source files is medium risk
    if ((inst.type === 'COPY' || inst.type === 'ADD') && 
        (inst.value.includes('src/') || inst.value.includes('*.js') || inst.value.includes('*.ts'))) {
      return 'medium';
    }

    // RUN commands that don't depend on source
    if (inst.type === 'RUN' && (
      inst.value.includes('apt-get') || 
      inst.value.includes('apk') ||
      inst.value.includes('npm ci')
    )) {
      return 'low';
    }

    // COPY lock files is low risk
    if ((inst.type === 'COPY' || inst.type === 'ADD') && (
      inst.value.includes('package-lock.json') ||
      inst.value.includes('yarn.lock') ||
      inst.value.includes('pnpm-lock.yaml') ||
      inst.value.includes('go.mod') ||
      inst.value.includes('Cargo.lock')
    )) {
      return 'low';
    }

    return 'medium';
  }

  private identifyCacheBustPoints(layers: Layer[]): number[] {
    const points: number[] = [];

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      
      // High risk layers that come before low risk layers are problems
      if (layer.cacheBustRisk === 'high') {
        // Check if there are low-risk layers after this
        const hasLowRiskAfter = layers.slice(i + 1).some(l => l.cacheBustRisk === 'low');
        if (hasLowRiskAfter) {
          points.push(i);
        }
      }
    }

    return points;
  }

  getCacheEfficiency(ast: DockerfileAST): number {
    const cacheMap = this.analyze(ast);
    
    if (cacheMap.totalLayers === 0) return 100;

    // Score based on cache bust points
    const efficiency = 100 - (cacheMap.cacheBustPoints.length * 20);
    return Math.max(0, Math.min(100, efficiency));
  }
}

