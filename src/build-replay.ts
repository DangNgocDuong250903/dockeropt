/**
 * Build Replay Visualizer - Timeline chart for build process
 * Like "GitLens for Docker builds"
 */

import { ImageLayer } from './image-inspector';

export interface BuildStep {
  layer: ImageLayer;
  index: number;
  instruction: string;
  startTime: number; // relative time in seconds
  duration: number; // estimated duration in seconds
  cacheHit: boolean;
  cacheReason?: string;
}

export interface BuildTimeline {
  steps: BuildStep[];
  totalTime: number;
  cacheEfficiency: number; // percentage
  slowestSteps: BuildStep[];
  cacheMisses: BuildStep[];
}

export class BuildReplayVisualizer {
  /**
   * Create timeline from layer history
   */
  createTimeline(layers: ImageLayer[], cacheHits?: boolean[]): BuildTimeline {
    const steps: BuildStep[] = [];
    let totalTime = 0;
    const slowestSteps: BuildStep[] = [];
    const cacheMisses: BuildStep[] = [];
    
    layers.forEach((layer, index) => {
      const instruction = this.extractInstruction(layer.createdBy);
      const duration = this.estimateDuration(layer, instruction);
      const cacheHit = cacheHits ? (cacheHits[index] ?? false) : this.isLikelyCacheHit(layer, layers, index);
      
      const step: BuildStep = {
        layer,
        index,
        instruction,
        startTime: totalTime,
        duration,
        cacheHit,
        cacheReason: cacheHit ? this.getCacheReason(layer, layers, index) : undefined,
      };
      
      steps.push(step);
      totalTime += duration;
      
      if (!cacheHit) {
        cacheMisses.push(step);
      }
      
      if (duration > 30) {
        slowestSteps.push(step);
      }
    });
    
    // Sort slowest steps
    slowestSteps.sort((a, b) => b.duration - a.duration);
    
    const cacheEfficiency = this.calculateCacheEfficiency(steps);
    
    return {
      steps,
      totalTime,
      cacheEfficiency,
      slowestSteps: slowestSteps.slice(0, 5), // Top 5 slowest
      cacheMisses,
    };
  }

  /**
   * Estimate duration for each step
   */
  private estimateDuration(layer: ImageLayer, instruction: string): number {
    if (!instruction) return 1;
    
    // Package installation
    if (instruction.includes('apt-get install')) {
      const packageCount = (instruction.match(/\b[a-z0-9-]+\b/g) || []).length - 3;
      return Math.max(5, packageCount * 2);
    }
    
    if (instruction.includes('apk add')) {
      const packageCount = (instruction.match(/\b[a-z0-9-]+\b/g) || []).length - 3;
      return Math.max(3, packageCount * 1);
    }
    
    // npm/yarn install
    if (instruction.includes('npm install') || instruction.includes('yarn install')) {
      return instruction.includes('ci') ? 20 : 45;
    }
    
    // Build commands
    if (instruction.includes('npm run build') || instruction.includes('yarn build')) {
      return 60;
    }
    
    if (instruction.includes('go build')) {
      return 30;
    }
    
    if (instruction.includes('cargo build')) {
      return 120;
    }
    
    // Copy operations
    if (instruction.includes('COPY') || instruction.includes('ADD')) {
      const sizeMB = layer.size / (1024 * 1024);
      return Math.max(1, Math.round(sizeMB / 10));
    }
    
    // Other RUN commands
    if (instruction.includes('RUN')) {
      return 5; // Default for RUN commands
    }
    
    return 1; // Other operations are fast
  }

  /**
   * Determine if layer is likely a cache hit
   */
  private isLikelyCacheHit(layer: ImageLayer, allLayers: ImageLayer[], index: number): boolean {
    const instruction = this.extractInstruction(layer.createdBy);
    
    // High cache hit probability
    if (instruction.includes('FROM')) return true;
    if (instruction.includes('WORKDIR')) return true;
    if (instruction.includes('ENV') && !instruction.includes('=')) return true;
    
    // Package installations are cacheable if previous layers unchanged
    if (instruction.includes('apt-get install') || instruction.includes('apk add')) {
      // Check if previous layers have changed
      for (let i = 0; i < index; i++) {
        const prevLayer = allLayers[i];
        if (prevLayer && (
          prevLayer.createdBy?.includes('COPY . .') ||
          prevLayer.createdBy?.includes('ADD . .')
        )) {
          return false; // Source code changed, likely cache miss
        }
      }
      return true; // No source code changes, likely cache hit
    }
    
    // Dependency installations (if lockfiles copied first)
    if (instruction.includes('npm install') || instruction.includes('yarn install')) {
      // Check if lockfile was copied before
      for (let i = 0; i < index; i++) {
        const prevLayer = allLayers[i];
        if (prevLayer && (
          prevLayer.createdBy?.includes('package-lock.json') ||
          prevLayer.createdBy?.includes('yarn.lock')
        )) {
          return true; // Lockfile copied, likely cache hit
        }
      }
      return false;
    }
    
    // COPY operations with specific files are cacheable
    if (instruction.includes('COPY') && !instruction.includes('. .')) {
      return true;
    }
    
    // COPY . . is high cache miss risk
    if (instruction.includes('COPY . .') || instruction.includes('ADD . .')) {
      return false;
    }
    
    return true;
  }

  private getCacheReason(layer: ImageLayer, allLayers: ImageLayer[], index: number): string {
    const instruction = this.extractInstruction(layer.createdBy);
    
    if (instruction.includes('FROM')) {
      return 'Base image cached';
    }
    
    if (instruction.includes('apt-get install') || instruction.includes('apk add')) {
      return 'Package list unchanged';
    }
    
    if (instruction.includes('npm install') || instruction.includes('yarn install')) {
      // Check if lockfile was copied
      for (let i = 0; i < index; i++) {
        const prevLayer = allLayers[i];
        if (prevLayer && (
          prevLayer.createdBy?.includes('package-lock.json') ||
          prevLayer.createdBy?.includes('yarn.lock')
        )) {
          return 'Lockfile unchanged';
        }
      }
      return 'Dependencies unchanged';
    }
    
    if (instruction.includes('COPY') && !instruction.includes('. .')) {
      return 'Source files unchanged';
    }
    
    return 'Layer unchanged';
  }

  private calculateCacheEfficiency(steps: BuildStep[]): number {
    if (steps.length === 0) return 100;
    
    const cacheHits = steps.filter(s => s.cacheHit).length;
    return Math.round((cacheHits / steps.length) * 100);
  }

  private extractInstruction(createdBy?: string): string {
    if (!createdBy) return '';
    const match = createdBy.match(/\/bin\/sh\s+-c\s+#\(nop\)\s+(.*)/);
    if (match) return match[1];
    const match2 = createdBy.match(/\/bin\/sh\s+-c\s+(.*)/);
    if (match2) return match2[1];
    return createdBy;
  }
}

