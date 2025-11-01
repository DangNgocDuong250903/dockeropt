/**
 * Browser-compatible Layer AI
 */

export class LayerAI {
  analyzeLayerBehavior(layer, allLayers) {
    const instruction = this.extractInstruction(layer.createdBy);
    
    const purpose = this.determinePurpose(instruction, layer);
    const dependencies = this.findDependencies(layer, allLayers);
    const estimatedBuildTime = this.estimateBuildTime(layer, instruction);
    const cacheEfficiency = this.calculateCacheEfficiency(layer, allLayers);
    const sizeBreakdown = this.analyzeSizeBreakdown(layer, instruction);
    
    return {
      layer,
      purpose,
      dependencies,
      estimatedBuildTime,
      cacheEfficiency,
      sizeBreakdown,
    };
  }

  generateSuggestions(layer, index, allLayers, behavior) {
    const suggestions = [];
    const instruction = this.extractInstruction(layer.createdBy);
    
    if (instruction.includes('apt-get install')) {
      const suggestion = this.analyzeAptInstall(layer, instruction, behavior);
      if (suggestion) suggestions.push(suggestion);
    }
    
    if (instruction.includes('npm install') || instruction.includes('yarn install')) {
      const suggestion = this.analyzeNpmInstall(layer, instruction, behavior);
      if (suggestion) suggestions.push(suggestion);
    }
    
    if (instruction.includes('COPY') || instruction.includes('ADD')) {
      const suggestion = this.analyzeCopyOperation(layer, instruction, allLayers, index);
      if (suggestion) suggestions.push(suggestion);
    }
    
    const consolidationSuggestion = this.analyzeConsolidation(layer, allLayers, index);
    if (consolidationSuggestion) suggestions.push(consolidationSuggestion);
    
    const cacheSuggestion = this.analyzeCacheBusting(layer, allLayers, index);
    if (cacheSuggestion) suggestions.push(cacheSuggestion);
    
    return suggestions;
  }

  determinePurpose(instruction, layer) {
    if (!instruction) return 'Unknown';
    
    if (instruction.includes('FROM')) return 'Base image';
    if (instruction.includes('apt-get install') || instruction.includes('apk add')) {
      return 'Package installation';
    }
    if (instruction.includes('npm install') || instruction.includes('yarn install')) {
      return 'Dependency installation';
    }
    if (instruction.includes('COPY') || instruction.includes('ADD')) {
      if (instruction.includes('package.json') || instruction.includes('requirements.txt')) {
        return 'Dependency file copy';
      }
      return 'Source code copy';
    }
    if (instruction.includes('RUN') && instruction.includes('build')) {
      return 'Build step';
    }
    if (instruction.includes('WORKDIR')) return 'Working directory setup';
    if (instruction.includes('ENV')) return 'Environment configuration';
    if (instruction.includes('EXPOSE')) return 'Port exposure';
    if (instruction.includes('CMD') || instruction.includes('ENTRYPOINT')) {
      return 'Runtime configuration';
    }
    
    return 'Build step';
  }

  findDependencies(layer, allLayers) {
    const deps = [];
    const instruction = this.extractInstruction(layer.createdBy);
    
    if (instruction.includes('--from=')) {
      const match = instruction.match(/--from=(\S+)/);
      if (match) deps.push(match[1]);
    }
    
    if (instruction.includes('COPY') || instruction.includes('ADD')) {
      for (let i = 0; i < layer.order; i++) {
        const prevLayer = allLayers[i];
        if (prevLayer && (prevLayer.createdBy?.includes('COPY') || prevLayer.createdBy?.includes('ADD'))) {
          deps.push(`Layer ${i}`);
        }
      }
    }
    
    return deps;
  }

  estimateBuildTime(layer, instruction) {
    if (!instruction) return 0;
    
    let baseTime = 0;
    
    if (instruction.includes('apt-get install')) {
      const packageCount = (instruction.match(/\b[a-z0-9-]+\b/g) || []).length - 3;
      baseTime = packageCount * 2;
    }
    
    if (instruction.includes('npm install') || instruction.includes('yarn install')) {
      baseTime = 30;
      if (instruction.includes('ci')) baseTime = 20;
    }
    
    if (instruction.includes('npm run build') || instruction.includes('yarn build')) {
      baseTime = 60;
    }
    
    if (instruction.includes('COPY') || instruction.includes('ADD')) {
      const sizeMB = layer.size / (1024 * 1024);
      baseTime = Math.max(1, sizeMB / 10);
    }
    
    return Math.round(baseTime);
  }

  calculateCacheEfficiency(layer, allLayers) {
    let efficiency = 100;
    const instruction = this.extractInstruction(layer.createdBy);
    
    if (instruction.includes('COPY . .') || instruction.includes('ADD . .')) {
      efficiency -= 30;
    }
    
    if (instruction.includes('RUN') && !instruction.includes('--no-cache')) {
      for (let i = 0; i < layer.order; i++) {
        const prevLayer = allLayers[i];
        if (prevLayer && prevLayer.createdBy?.includes('COPY . .')) {
          efficiency -= 20;
          break;
        }
      }
    }
    
    return Math.max(0, Math.min(100, efficiency));
  }

  analyzeSizeBreakdown(layer, instruction) {
    const breakdown = {};
    const sizeMB = layer.size / (1024 * 1024);
    
    if (instruction.includes('apt-get install')) {
      const packageCount = (instruction.match(/\b[a-z0-9-]+\b/g) || []).length - 3;
      breakdown.packages = packageCount;
      breakdown.cache = sizeMB * 0.3;
    }
    
    if (instruction.includes('npm install') || instruction.includes('yarn install')) {
      breakdown.packages = Math.round(sizeMB / 2);
      breakdown.cache = sizeMB * 0.2;
    }
    
    if (instruction.includes('COPY') || instruction.includes('ADD')) {
      breakdown.files = Math.round(sizeMB * 10);
    }
    
    return breakdown;
  }

  analyzeAptInstall(layer, instruction, behavior) {
    if (!instruction.includes('apt-get install')) return null;
    
    const issues = [];
    const suggestions = [];
    let priority = 'medium';
    
    if (!instruction.includes('--no-install-recommends')) {
      issues.push('Installing recommended packages adds unnecessary size');
      suggestions.push('Add --no-install-recommends to reduce size by ~20-30%');
      priority = 'high';
    }
    
    if (!instruction.includes('apt-get clean') && !instruction.includes('rm -rf /var/lib/apt/lists')) {
      issues.push('APT cache not cleaned');
      suggestions.push('Add: && apt-get clean && rm -rf /var/lib/apt/lists/*');
      priority = 'high';
    }
    
    if (behavior.sizeBreakdown.cache && behavior.sizeBreakdown.cache > 10) {
      issues.push(`Large cache waste: ~${Math.round(behavior.sizeBreakdown.cache)}MB`);
      priority = 'high';
    }
    
    if (issues.length === 0) return null;
    
    const sizeMB = layer.size / (1024 * 1024);
    const wastedSize = behavior.sizeBreakdown.cache || 0;
    
    return {
      layerIndex: layer.order,
      layer,
      issue: issues.join('; '),
      impact: {
        size: wastedSize > 0 ? `~${Math.round(wastedSize)}MB wasted` : `${Math.round(sizeMB)}MB total`,
        performance: 'Slow rebuilds due to cache misses',
      },
      suggestion: suggestions.join(' | '),
      priority,
      reasoning: `Layer ${layer.order} installs packages but doesn't optimize for size or cache efficiency.`,
    };
  }

  analyzeNpmInstall(layer, instruction, behavior) {
    if (!instruction.includes('npm install') && !instruction.includes('yarn install')) return null;
    
    const issues = [];
    const suggestions = [];
    let priority = 'medium';
    
    if (instruction.includes('npm install') && !instruction.includes('npm ci')) {
      issues.push('Using npm install instead of npm ci');
      suggestions.push('Use npm ci for faster, more reliable builds');
      priority = 'high';
    }
    
    if (!instruction.includes('--production') && !instruction.includes('--omit=dev')) {
      issues.push('Installing dev dependencies in production image');
      suggestions.push('Add --production or --omit=dev flag');
      priority = 'medium';
    }
    
    if (issues.length === 0) return null;
    
    const sizeMB = layer.size / (1024 * 1024);
    
    return {
      layerIndex: layer.order,
      layer,
      issue: issues.join('; '),
      impact: {
        size: `${Math.round(sizeMB)}MB`,
        performance: 'Slower builds and larger image size',
      },
      suggestion: suggestions.join(' | '),
      priority,
      reasoning: `Layer ${layer.order} installs Node.js dependencies but could be optimized for production.`,
    };
  }

  analyzeCopyOperation(layer, instruction, allLayers, index) {
    if (!instruction.includes('COPY') && !instruction.includes('ADD')) return null;
    
    if (instruction.includes('COPY . .') || instruction.includes('ADD . .')) {
      let hasDepsBefore = false;
      for (let i = 0; i < index; i++) {
        const prevLayer = allLayers[i];
        if (prevLayer && (
          prevLayer.createdBy?.includes('npm install') ||
          prevLayer.createdBy?.includes('yarn install') ||
          prevLayer.createdBy?.includes('pip install')
        )) {
          hasDepsBefore = true;
          break;
        }
      }
      
      if (!hasDepsBefore) {
        return {
          layerIndex: index,
          layer,
          issue: 'Copying all files before installing dependencies breaks cache',
          impact: {
            performance: 'Cache invalidates on any code change',
            size: 'Dependencies rebuild on every code change',
          },
          suggestion: 'Copy dependency files (package.json, etc.) first, install deps, then copy source',
          priority: 'high',
          reasoning: 'Copying source code before dependencies means dependency layers rebuild on every change.',
        };
      }
    }
    
    return null;
  }

  analyzeConsolidation(layer, allLayers, index) {
    if (index === 0) return null;
    
    const instruction = this.extractInstruction(layer.createdBy);
    if (!instruction.includes('RUN')) return null;
    
    const prevLayer = allLayers[index - 1];
    if (!prevLayer) return null;
    
    const prevInstruction = this.extractInstruction(prevLayer.createdBy);
    
    if (prevInstruction.includes('RUN') && instruction.includes('RUN')) {
      const bothPackageMgr = 
        (prevInstruction.includes('apt-get') && instruction.includes('apt-get')) ||
        (prevInstruction.includes('apk') && instruction.includes('apk')) ||
        (prevInstruction.includes('npm') && instruction.includes('npm'));
      
      if (bothPackageMgr) {
        return {
          layerIndex: index,
          layer,
          issue: 'Consecutive package manager commands create separate layers',
          impact: {
            size: 'Extra layer overhead',
            performance: 'Reduced cache efficiency',
          },
          suggestion: `Merge with layer ${index - 1} using && operator`,
          priority: 'medium',
          reasoning: 'Combining RUN commands reduces layer count and improves cache efficiency.',
        };
      }
    }
    
    return null;
  }

  analyzeCacheBusting(layer, allLayers, index) {
    const instruction = this.extractInstruction(layer.createdBy);
    
    if (instruction.includes('COPY . .') || instruction.includes('ADD . .')) {
      let hasLowRiskAfter = false;
      for (let i = index + 1; i < allLayers.length; i++) {
        const nextLayer = allLayers[i];
        if (!nextLayer) continue;
        
        const nextInstruction = this.extractInstruction(nextLayer.createdBy);
        if (nextInstruction.includes('apt-get') || 
            nextInstruction.includes('npm ci') ||
            nextInstruction.includes('COPY package.json')) {
          hasLowRiskAfter = true;
          break;
        }
      }
      
      if (hasLowRiskAfter) {
        return {
          layerIndex: index,
          layer,
          issue: 'High cache-bust risk layer placed before stable layers',
          impact: {
            performance: 'Subsequent layers rebuild unnecessarily',
          },
          suggestion: 'Reorder: copy dependency files first, install deps, then copy source code',
          priority: 'high',
          reasoning: 'Placing volatile COPY operations before stable operations causes unnecessary rebuilds.',
        };
      }
    }
    
    return null;
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

