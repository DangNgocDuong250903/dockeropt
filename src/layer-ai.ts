/**
 * Layer AI - AI-powered layer analysis and optimization suggestions
 * Uses rule engine + AI hybrid approach
 */

import { ImageLayer, LayerAnalysis } from './image-inspector';
import { Instruction } from './types';

export interface LayerAISuggestion {
  layerIndex: number;
  layer: ImageLayer;
  issue: string;
  impact: {
    size?: string;
    performance?: string;
    security?: string;
  };
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface LayerBehaviorAnalysis {
  layer: ImageLayer;
  purpose: string;
  dependencies: string[];
  estimatedBuildTime: number; // seconds
  cacheEfficiency: number; // 0-100
  sizeBreakdown: {
    packages?: number;
    files?: number;
    cache?: number;
  };
}

export class LayerAI {
  /**
   * Analyze layer behavior and purpose
   */
  analyzeLayerBehavior(layer: ImageLayer, allLayers: ImageLayer[]): LayerBehaviorAnalysis {
    const instruction = this.extractInstruction(layer.createdBy);
    
    // Determine purpose
    const purpose = this.determinePurpose(instruction, layer);
    
    // Find dependencies (layers this depends on)
    const dependencies = this.findDependencies(layer, allLayers);
    
    // Estimate build time based on instruction type and size
    const estimatedBuildTime = this.estimateBuildTime(layer, instruction);
    
    // Calculate cache efficiency
    const cacheEfficiency = this.calculateCacheEfficiency(layer, allLayers);
    
    // Size breakdown
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

  /**
   * Generate AI-powered optimization suggestions
   */
  generateSuggestions(
    layer: ImageLayer,
    index: number,
    allLayers: ImageLayer[],
    behavior: LayerBehaviorAnalysis
  ): LayerAISuggestion[] {
    const suggestions: LayerAISuggestion[] = [];
    const instruction = this.extractInstruction(layer.createdBy);
    
    // Analyze package installations
    if (instruction.includes('apt-get install')) {
      const suggestion = this.analyzeAptInstall(layer, instruction, behavior);
      if (suggestion) suggestions.push(suggestion);
    }
    
    // Analyze npm/yarn installs
    if (instruction.includes('npm install') || instruction.includes('yarn install')) {
      const suggestion = this.analyzeNpmInstall(layer, instruction, behavior);
      if (suggestion) suggestions.push(suggestion);
    }
    
    // Analyze COPY operations
    if (instruction.includes('COPY') || instruction.includes('ADD')) {
      const suggestion = this.analyzeCopyOperation(layer, instruction, allLayers, index);
      if (suggestion) suggestions.push(suggestion);
    }
    
    // Analyze RUN commands for consolidation opportunities
    const consolidationSuggestion = this.analyzeConsolidation(layer, allLayers, index);
    if (consolidationSuggestion) suggestions.push(consolidationSuggestion);
    
    // Analyze cache busting risks
    const cacheSuggestion = this.analyzeCacheBusting(layer, allLayers, index);
    if (cacheSuggestion) suggestions.push(cacheSuggestion);
    
    return suggestions;
  }

  private determinePurpose(instruction: string, layer: ImageLayer): string {
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

  private findDependencies(layer: ImageLayer, allLayers: ImageLayer[]): string[] {
    const deps: string[] = [];
    const instruction = this.extractInstruction(layer.createdBy);
    
    // Check if this layer copies from previous layers
    if (instruction.includes('--from=')) {
      const match = instruction.match(/--from=(\S+)/);
      if (match) deps.push(match[1]);
    }
    
    // Check if this layer depends on files from previous COPY operations
    if (instruction.includes('COPY') || instruction.includes('ADD')) {
      // This layer depends on files that might have been copied earlier
      for (let i = 0; i < layer.order; i++) {
        const prevLayer = allLayers[i];
        if (prevLayer && (prevLayer.createdBy?.includes('COPY') || prevLayer.createdBy?.includes('ADD'))) {
          deps.push(`Layer ${i}`);
        }
      }
    }
    
    return deps;
  }

  private estimateBuildTime(layer: ImageLayer, instruction: string): number {
    if (!instruction) return 0;
    
    let baseTime = 0;
    
    // Package installation
    if (instruction.includes('apt-get install')) {
      const packageCount = (instruction.match(/\b[a-z0-9-]+\b/g) || []).length - 3; // subtract apt-get, install, -y
      baseTime = packageCount * 2; // ~2s per package
    }
    
    // npm/yarn install
    if (instruction.includes('npm install') || instruction.includes('yarn install')) {
      baseTime = 30; // Base 30s for node_modules
      if (instruction.includes('ci')) baseTime = 20; // npm ci is faster
    }
    
    // Build commands
    if (instruction.includes('npm run build') || instruction.includes('yarn build')) {
      baseTime = 60; // Typical build time
    }
    
    // Copy operations are usually fast
    if (instruction.includes('COPY') || instruction.includes('ADD')) {
      const sizeMB = layer.size / (1024 * 1024);
      baseTime = Math.max(1, sizeMB / 10); // ~0.1s per MB
    }
    
    return Math.round(baseTime);
  }

  private calculateCacheEfficiency(layer: ImageLayer, allLayers: ImageLayer[]): number {
    let efficiency = 100;
    
    // High-risk operations reduce efficiency
    const instruction = this.extractInstruction(layer.createdBy);
    
    if (instruction.includes('COPY . .') || instruction.includes('ADD . .')) {
      efficiency -= 30; // High cache bust risk
    }
    
    if (instruction.includes('RUN') && !instruction.includes('--no-cache')) {
      // Check if previous layers might invalidate cache
      for (let i = 0; i < layer.order; i++) {
        const prevLayer = allLayers[i];
        if (prevLayer && (prevLayer.createdBy?.includes('COPY . .'))) {
          efficiency -= 20;
          break;
        }
      }
    }
    
    return Math.max(0, Math.min(100, efficiency));
  }

  private analyzeSizeBreakdown(layer: ImageLayer, instruction: string): {
    packages?: number;
    files?: number;
    cache?: number;
  } {
    const breakdown: any = {};
    const sizeMB = layer.size / (1024 * 1024);
    
    if (instruction.includes('apt-get install')) {
      const packageCount = (instruction.match(/\b[a-z0-9-]+\b/g) || []).length - 3;
      breakdown.packages = packageCount;
      breakdown.cache = sizeMB * 0.3; // Estimate 30% is cache
    }
    
    if (instruction.includes('npm install') || instruction.includes('yarn install')) {
      breakdown.packages = Math.round(sizeMB / 2); // Estimate package count
      breakdown.cache = sizeMB * 0.2; // node_modules cache
    }
    
    if (instruction.includes('COPY') || instruction.includes('ADD')) {
      breakdown.files = Math.round(sizeMB * 10); // Estimate file count
    }
    
    return breakdown;
  }

  private analyzeAptInstall(
    layer: ImageLayer,
    instruction: string,
    behavior: LayerBehaviorAnalysis
  ): LayerAISuggestion | null {
    if (!instruction.includes('apt-get install')) return null;
    
    const issues: string[] = [];
    const suggestions: string[] = [];
    let priority: 'high' | 'medium' | 'low' = 'medium';
    
    // Check for --no-install-recommends
    if (!instruction.includes('--no-install-recommends')) {
      issues.push('Installing recommended packages adds unnecessary size');
      suggestions.push('Add --no-install-recommends to reduce size by ~20-30%');
      priority = 'high';
    }
    
    // Check for cache cleanup
    if (!instruction.includes('apt-get clean') && !instruction.includes('rm -rf /var/lib/apt/lists')) {
      issues.push('APT cache not cleaned');
      suggestions.push('Add: && apt-get clean && rm -rf /var/lib/apt/lists/*');
      priority = 'high';
    }
    
    // Check for consolidation with previous RUN commands
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

  private analyzeNpmInstall(
    layer: ImageLayer,
    instruction: string,
    behavior: LayerBehaviorAnalysis
  ): LayerAISuggestion | null {
    if (!instruction.includes('npm install') && !instruction.includes('yarn install')) return null;
    
    const issues: string[] = [];
    const suggestions: string[] = [];
    let priority: 'high' | 'medium' | 'low' = 'medium';
    
    // Check for npm ci vs npm install
    if (instruction.includes('npm install') && !instruction.includes('npm ci')) {
      issues.push('Using npm install instead of npm ci');
      suggestions.push('Use npm ci for faster, more reliable builds');
      priority = 'high';
    }
    
    // Check for --production flag
    if (!instruction.includes('--production') && !instruction.includes('--omit=dev')) {
      issues.push('Installing dev dependencies in production image');
      suggestions.push('Add --production or --omit=dev flag');
      priority = 'medium';
    }
    
    // Check for cache cleanup
    if (!instruction.includes('npm cache clean')) {
      issues.push('npm cache not cleaned');
      suggestions.push('Add: && npm cache clean --force');
      priority = 'low';
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

  private analyzeCopyOperation(
    layer: ImageLayer,
    instruction: string,
    allLayers: ImageLayer[],
    index: number
  ): LayerAISuggestion | null {
    if (!instruction.includes('COPY') && !instruction.includes('ADD')) return null;
    
    // Check for COPY . .
    if (instruction.includes('COPY . .') || instruction.includes('ADD . .')) {
      // Check if dependencies were installed before this
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

  private analyzeConsolidation(
    layer: ImageLayer,
    allLayers: ImageLayer[],
    index: number
  ): LayerAISuggestion | null {
    // Check if multiple RUN commands can be consolidated
    if (index === 0) return null;
    
    const instruction = this.extractInstruction(layer.createdBy);
    if (!instruction.includes('RUN')) return null;
    
    // Check if previous layer is also a RUN command with same type
    const prevLayer = allLayers[index - 1];
    if (!prevLayer) return null;
    
    const prevInstruction = this.extractInstruction(prevLayer.createdBy);
    
    // Both are RUN commands and could be merged
    if (prevInstruction.includes('RUN') && instruction.includes('RUN')) {
      // Check if they're related (both package managers, both file operations)
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

  private analyzeCacheBusting(
    layer: ImageLayer,
    allLayers: ImageLayer[],
    index: number
  ): LayerAISuggestion | null {
    const instruction = this.extractInstruction(layer.createdBy);
    
    // Check if this layer will bust cache for subsequent layers
    if (instruction.includes('COPY . .') || instruction.includes('ADD . .')) {
      // Check if there are low-risk layers after this
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

  private extractInstruction(createdBy?: string): string {
    if (!createdBy) return '';
    const match = createdBy.match(/\/bin\/sh\s+-c\s+#\(nop\)\s+(.*)/);
    if (match) return match[1];
    const match2 = createdBy.match(/\/bin\/sh\s+-c\s+(.*)/);
    if (match2) return match2[1];
    return createdBy;
  }
}

