/**
 * Browser-compatible Build Replay Visualizer
 */

export class BuildReplayVisualizer {
  createTimeline(layers, cacheHits) {
    const steps = [];
    let totalTime = 0;
    const slowestSteps = [];
    const cacheMisses = [];
    
    layers.forEach((layer, index) => {
      const instruction = this.extractInstruction(layer.createdBy);
      const duration = this.estimateDuration(layer, instruction);
      const cacheHit = cacheHits ? (cacheHits[index] ?? false) : this.isLikelyCacheHit(layer, layers, index);
      
      const step = {
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
    
    slowestSteps.sort((a, b) => b.duration - a.duration);
    
    const cacheEfficiency = this.calculateCacheEfficiency(steps);
    
    return {
      steps,
      totalTime,
      cacheEfficiency,
      slowestSteps: slowestSteps.slice(0, 5),
      cacheMisses,
    };
  }

  estimateDuration(layer, instruction) {
    if (!instruction) return 1;
    
    if (instruction.includes('apt-get install')) {
      const packageCount = (instruction.match(/\b[a-z0-9-]+\b/g) || []).length - 3;
      return Math.max(5, packageCount * 2);
    }
    
    if (instruction.includes('apk add')) {
      const packageCount = (instruction.match(/\b[a-z0-9-]+\b/g) || []).length - 3;
      return Math.max(3, packageCount * 1);
    }
    
    if (instruction.includes('npm install') || instruction.includes('yarn install')) {
      return instruction.includes('ci') ? 20 : 45;
    }
    
    if (instruction.includes('npm run build') || instruction.includes('yarn build')) {
      return 60;
    }
    
    if (instruction.includes('go build')) {
      return 30;
    }
    
    if (instruction.includes('cargo build')) {
      return 120;
    }
    
    if (instruction.includes('COPY') || instruction.includes('ADD')) {
      const sizeMB = layer.size / (1024 * 1024);
      return Math.max(1, Math.round(sizeMB / 10));
    }
    
    if (instruction.includes('RUN')) {
      return 5;
    }
    
    return 1;
  }

  isLikelyCacheHit(layer, allLayers, index) {
    const instruction = this.extractInstruction(layer.createdBy);
    
    if (instruction.includes('FROM')) return true;
    if (instruction.includes('WORKDIR')) return true;
    if (instruction.includes('ENV') && !instruction.includes('=')) return true;
    
    if (instruction.includes('apt-get install') || instruction.includes('apk add')) {
      for (let i = 0; i < index; i++) {
        const prevLayer = allLayers[i];
        if (prevLayer && (
          prevLayer.createdBy?.includes('COPY . .') ||
          prevLayer.createdBy?.includes('ADD . .')
        )) {
          return false;
        }
      }
      return true;
    }
    
    if (instruction.includes('npm install') || instruction.includes('yarn install')) {
      for (let i = 0; i < index; i++) {
        const prevLayer = allLayers[i];
        if (prevLayer && (
          prevLayer.createdBy?.includes('package-lock.json') ||
          prevLayer.createdBy?.includes('yarn.lock')
        )) {
          return true;
        }
      }
      return false;
    }
    
    if (instruction.includes('COPY') && !instruction.includes('. .')) {
      return true;
    }
    
    if (instruction.includes('COPY . .') || instruction.includes('ADD . .')) {
      return false;
    }
    
    return true;
  }

  getCacheReason(layer, allLayers, index) {
    const instruction = this.extractInstruction(layer.createdBy);
    
    if (instruction.includes('FROM')) {
      return 'Base image cached';
    }
    
    if (instruction.includes('apt-get install') || instruction.includes('apk add')) {
      return 'Package list unchanged';
    }
    
    if (instruction.includes('npm install') || instruction.includes('yarn install')) {
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

  calculateCacheEfficiency(steps) {
    if (steps.length === 0) return 100;
    const cacheHits = steps.filter(s => s.cacheHit).length;
    return Math.round((cacheHits / steps.length) * 100);
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

