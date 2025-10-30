/**
 * Estimators - Estimate size, build time, and efficiency improvements
 */

import { DockerfileAST, Metrics } from './types';
import { LayerAnalyzer } from './layer-analyzer';

interface BaseImageSize {
  [key: string]: number; // MB
}

const BASE_IMAGE_SIZES: BaseImageSize = {
  'alpine': 5,
  'debian': 120,
  'ubuntu': 70,
  'node:.*-alpine': 40,
  'node:.*-slim': 70,
  'node': 300,
  'python:.*-alpine': 45,
  'python:.*-slim': 120,
  'python': 900,
  'golang:.*-alpine': 300,
  'golang': 800,
  'nginx:.*-alpine': 20,
  'nginx': 130,
  'redis:.*-alpine': 30,
  'redis': 110,
  'postgres:.*-alpine': 200,
  'postgres': 350,
  'distroless': 20,
};

export class Estimators {
  private layerAnalyzer = new LayerAnalyzer();

  estimateMetrics(originalAST: DockerfileAST, optimizedAST: DockerfileAST): Metrics {
    const originalSize = this.estimateImageSize(originalAST);
    const optimizedSize = this.estimateImageSize(optimizedAST);
    
    const originalLayers = this.countLayers(originalAST);
    const optimizedLayers = this.countLayers(optimizedAST);

    const originalCache = this.layerAnalyzer.getCacheEfficiency(originalAST);
    const optimizedCache = this.layerAnalyzer.getCacheEfficiency(optimizedAST);

    const buildTimeImprovement = this.estimateBuildTimeImprovement(
      originalAST,
      optimizedAST,
      originalCache,
      optimizedCache
    );

    const securityScore = this.calculateSecurityScore(optimizedAST);

    return {
      estimatedSizeSavings: originalSize - optimizedSize,
      layerReduction: originalLayers - optimizedLayers,
      buildTimeImprovement,
      cacheEfficiency: optimizedCache,
      securityScore,
    };
  }

  private estimateImageSize(ast: DockerfileAST): number {
    let totalSize = 0;

    // Base image size
    for (const stage of ast.stages) {
      const baseSize = this.getBaseImageSize(stage.from);
      totalSize += baseSize;
    }

    // Layer sizes
    const cacheMap = this.layerAnalyzer.analyze(ast);
    for (const layer of cacheMap.layers) {
      totalSize += layer.estimatedSize;
    }

    // Multi-stage builds reduce final size
    if (ast.stages.length > 1) {
      totalSize = totalSize * 0.4; // Only runtime stage matters
    }

    return Math.round(totalSize);
  }

  private getBaseImageSize(imageName: string): number {
    for (const [pattern, size] of Object.entries(BASE_IMAGE_SIZES)) {
      const regex = new RegExp(pattern);
      if (regex.test(imageName)) {
        return size;
      }
    }

    // Default size
    return 150;
  }

  private countLayers(ast: DockerfileAST): number {
    const layerInstructions = ['FROM', 'RUN', 'COPY', 'ADD'];
    return ast.instructions.filter(i => layerInstructions.includes(i.type)).length;
  }

  private estimateBuildTimeImprovement(
    originalAST: DockerfileAST,
    optimizedAST: DockerfileAST,
    originalCache: number,
    optimizedCache: number
  ): number {
    // Better cache efficiency = faster rebuilds
    const cacheImprovement = (optimizedCache - originalCache) / 100;

    // Fewer layers = faster build
    const originalLayers = this.countLayers(originalAST);
    const optimizedLayers = this.countLayers(optimizedAST);
    const layerImprovement = (originalLayers - optimizedLayers) / originalLayers;

    // Consolidated RUN commands = faster execution
    const originalRuns = originalAST.instructions.filter(i => i.type === 'RUN').length;
    const optimizedRuns = optimizedAST.instructions.filter(i => i.type === 'RUN').length;
    const runImprovement = (originalRuns - optimizedRuns) / originalRuns;

    // Weighted average
    const improvement = (
      cacheImprovement * 0.5 +
      layerImprovement * 0.3 +
      runImprovement * 0.2
    ) * 100;

    return Math.max(0, Math.min(100, Math.round(improvement)));
  }

  private calculateSecurityScore(ast: DockerfileAST): number {
    let score = 100;

    // Check for non-root user
    const hasNonRootUser = ast.instructions.some(i => 
      i.type === 'USER' && i.value !== 'root' && i.value !== '0'
    );
    if (!hasNonRootUser) score -= 30;

    // Check for pinned base images
    const unpinnedStages = ast.stages.filter(s => !s.fromDigest).length;
    score -= unpinnedStages * 15;

    // Check for secrets
    const hasSecrets = ast.instructions.some(i => 
      (i.type === 'ENV' || i.type === 'ARG') && (
        /password|secret|key|token/i.test(i.value)
      )
    );
    if (hasSecrets) score -= 25;

    // Check for latest tag
    const hasLatest = ast.stages.some(s => 
      s.from.endsWith(':latest') || !s.from.includes(':')
    );
    if (hasLatest) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  estimateSingleImage(ast: DockerfileAST): number {
    return this.estimateImageSize(ast);
  }
}

