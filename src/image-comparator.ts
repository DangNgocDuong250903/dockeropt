/**
 * Image Comparator - Compares two Docker images (like diff checker)
 */

import { ImageInfo, ImageLayer, ImageInspector } from './image-inspector';

export interface ImageDiff {
  image1: ImageInfo;
  image2: ImageInfo;
  sizeDiff: number; // bytes
  layerDiff: number; // number of layers difference
  differentLayers: LayerDifference[];
  commonLayers: ImageLayer[];
  uniqueToImage1: ImageLayer[];
  uniqueToImage2: ImageLayer[];
  efficiencyGain: number; // percentage improvement
}

export interface LayerDifference {
  layer1Index: number;
  layer2Index: number;
  layer1: ImageLayer;
  layer2: ImageLayer;
  sizeDiff: number;
  instructionDiff: string;
  type: 'changed' | 'added' | 'removed';
}

export class ImageComparator {
  private inspector: ImageInspector;

  constructor() {
    this.inspector = new ImageInspector();
  }

  /**
   * Compare two Docker images
   */
  compare(image1: ImageInfo, image2: ImageInfo): ImageDiff {
    const sizeDiff = image2.size - image1.size;
    const layerDiff = image2.layers.length - image1.layers.length;

    // Find different layers
    const differentLayers = this.findDifferentLayers(image1, image2);
    
    // Find common layers
    const commonLayers = this.findCommonLayers(image1, image2);
    
    // Find unique layers
    const uniqueToImage1 = this.findUniqueLayers(image1, image2);
    const uniqueToImage2 = this.findUniqueLayers(image2, image1);

    // Calculate efficiency gain
    const efficiencyGain = this.calculateEfficiencyGain(image1, image2);

    return {
      image1,
      image2,
      sizeDiff,
      layerDiff,
      differentLayers,
      commonLayers,
      uniqueToImage1,
      uniqueToImage2,
      efficiencyGain,
    };
  }

  /**
   * Find layers that differ between two images
   */
  private findDifferentLayers(
    image1: ImageInfo,
    image2: ImageInfo
  ): LayerDifference[] {
    const differences: LayerDifference[] = [];
    const maxLayers = Math.max(image1.layers.length, image2.layers.length);

    for (let i = 0; i < maxLayers; i++) {
      const layer1 = image1.layers[i];
      const layer2 = image2.layers[i];

      if (!layer1 && layer2) {
        // Layer added in image2
        differences.push({
          layer1Index: -1,
          layer2Index: i,
          layer1: null as any,
          layer2,
          sizeDiff: layer2.size,
          instructionDiff: `Added: ${layer2.createdBy || 'New layer'}`,
          type: 'added',
        });
      } else if (layer1 && !layer2) {
        // Layer removed in image2
        differences.push({
          layer1Index: i,
          layer2Index: -1,
          layer1,
          layer2: null as any,
          sizeDiff: -layer1.size,
          instructionDiff: `Removed: ${layer1.createdBy || 'Layer removed'}`,
          type: 'removed',
        });
      } else if (layer1 && layer2) {
        // Check if layers are different
        if (this.layersAreDifferent(layer1, layer2)) {
          differences.push({
            layer1Index: i,
            layer2Index: i,
            layer1,
            layer2,
            sizeDiff: layer2.size - layer1.size,
            instructionDiff: this.getInstructionDiff(layer1, layer2),
            type: 'changed',
          });
        }
      }
    }

    return differences;
  }

  /**
   * Check if two layers are different
   */
  private layersAreDifferent(layer1: ImageLayer, layer2: ImageLayer): boolean {
    // Compare by size, instruction, or ID
    if (layer1.size !== layer2.size) return true;
    if (layer1.createdBy !== layer2.createdBy) return true;
    if (layer1.id !== layer2.id && layer1.id !== 'base' && layer2.id !== 'base') {
      return true;
    }
    return false;
  }

  /**
   * Get instruction diff between two layers
   */
  private getInstructionDiff(layer1: ImageLayer, layer2: ImageLayer): string {
    const inst1 = this.extractInstruction(layer1.createdBy);
    const inst2 = this.extractInstruction(layer2.createdBy);
    
    if (inst1 === inst2) return 'Same instruction, different size';
    
    const diff = [];
    if (inst1) diff.push(`- ${inst1}`);
    if (inst2) diff.push(`+ ${inst2}`);
    
    return diff.join('\n');
  }

  /**
   * Find common layers between two images
   */
  private findCommonLayers(image1: ImageInfo, image2: ImageInfo): ImageLayer[] {
    const common: ImageLayer[] = [];
    const minLayers = Math.min(image1.layers.length, image2.layers.length);

    for (let i = 0; i < minLayers; i++) {
      const layer1 = image1.layers[i];
      const layer2 = image2.layers[i];

      if (this.layersAreSame(layer1, layer2)) {
        common.push(layer1);
      }
    }

    return common;
  }

  /**
   * Check if two layers are the same
   */
  private layersAreSame(layer1: ImageLayer, layer2: ImageLayer): boolean {
    // Layers are same if they have same ID or same instruction and size
    if (layer1.id === layer2.id && layer1.id !== 'base') return true;
    if (layer1.createdBy === layer2.createdBy && 
        layer1.size === layer2.size &&
        Math.abs(layer1.size) > 0) return true;
    return false;
  }

  /**
   * Find layers unique to first image (not in second)
   */
  private findUniqueLayers(image1: ImageInfo, image2: ImageInfo): ImageLayer[] {
    const unique: ImageLayer[] = [];

    for (const layer1 of image1.layers) {
      const found = image2.layers.find(layer2 => 
        this.layersAreSame(layer1, layer2)
      );
      if (!found) {
        unique.push(layer1);
      }
    }

    return unique;
  }

  /**
   * Calculate efficiency gain from image1 to image2
   */
  private calculateEfficiencyGain(image1: ImageInfo, image2: ImageInfo): number {
    const analysis1 = this.inspector.analyzeLayers(image1);
    const analysis2 = this.inspector.analyzeLayers(image2);

    const score1 = this.inspector.calculateEfficiencyScore(analysis1);
    const score2 = this.inspector.calculateEfficiencyScore(analysis2);

    return score2 - score1; // Positive means improvement
  }

  /**
   * Generate comparison report
   */
  generateReport(diff: ImageDiff): string {
    const sizeDiffMB = (diff.sizeDiff / (1024 * 1024)).toFixed(2);
    const sizeDiffSign = diff.sizeDiff >= 0 ? '+' : '';
    const efficiencySign = diff.efficiencyGain >= 0 ? '+' : '';

    return `
# Docker Image Comparison Report

## Summary

| Metric | Image 1 | Image 2 | Difference |
|--------|---------|---------|------------|
| **Repository** | ${diff.image1.repo}:${diff.image1.tag} | ${diff.image2.repo}:${diff.image2.tag} | - |
| **Total Size** | ${(diff.image1.size / (1024 * 1024)).toFixed(2)} MB | ${(diff.image2.size / (1024 * 1024)).toFixed(2)} MB | ${sizeDiffSign}${sizeDiffMB} MB |
| **Layers** | ${diff.image1.layers.length} | ${diff.image2.layers.length} | ${diff.layerDiff > 0 ? '+' : ''}${diff.layerDiff} |
| **Efficiency Score** | ${this.inspector.calculateEfficiencyScore(this.inspector.analyzeLayers(diff.image1))} | ${this.inspector.calculateEfficiencyScore(this.inspector.analyzeLayers(diff.image2))} | ${efficiencySign}${diff.efficiencyGain} |

## Layer Differences

${diff.differentLayers.length === 0 ? 'No differences found' : diff.differentLayers.map((d, i) => `
### ${i + 1}. ${d.type === 'added' ? 'Added Layer' : d.type === 'removed' ? 'Removed Layer' : 'Changed Layer'}

${d.type === 'added' ? `
- **Layer Index**: ${d.layer2Index}
- **Size**: ${(d.layer2.size / (1024 * 1024)).toFixed(2)} MB
- **Instruction**: ${d.layer2.createdBy || 'N/A'}
` : d.type === 'removed' ? `
- **Layer Index**: ${d.layer1Index}
- **Size Saved**: ${(-d.sizeDiff / (1024 * 1024)).toFixed(2)} MB
- **Instruction**: ${d.layer1.createdBy || 'N/A'}
` : `
- **Layer Index**: ${d.layer1Index} → ${d.layer2Index}
- **Size Change**: ${d.sizeDiff >= 0 ? '+' : ''}${(d.sizeDiff / (1024 * 1024)).toFixed(2)} MB
- **Diff**:
\`\`\`
${d.instructionDiff}
\`\`\`
`}
`).join('\n')}

## Common Layers

${diff.commonLayers.length} layers are shared between both images.

## Unique Layers

- **Unique to Image 1**: ${diff.uniqueToImage1.length} layers
- **Unique to Image 2**: ${diff.uniqueToImage2.length} layers
`;
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

