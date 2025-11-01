/**
 * Browser-compatible Image Comparator
 */

import { ImageInspector } from './image-inspector.js';

export class ImageComparator {
  constructor() {
    this.inspector = new ImageInspector();
  }

  compare(image1, image2) {
    const sizeDiff = image2.size - image1.size;
    const layerDiff = image2.layers.length - image1.layers.length;

    const differentLayers = this.findDifferentLayers(image1, image2);
    const commonLayers = this.findCommonLayers(image1, image2);
    const uniqueToImage1 = this.findUniqueLayers(image1, image2);
    const uniqueToImage2 = this.findUniqueLayers(image2, image1);

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

  findDifferentLayers(image1, image2) {
    const differences = [];
    const maxLayers = Math.max(image1.layers.length, image2.layers.length);

    for (let i = 0; i < maxLayers; i++) {
      const layer1 = image1.layers[i];
      const layer2 = image2.layers[i];

      if (!layer1 && layer2) {
        // Calculate size for new layer
        const layer2Size = layer2.size > 0 ? layer2.size : 
                          (image2.size > 0 && image2.layers.length > 0 ? image2.size / image2.layers.length : 0);
        differences.push({
          layer1Index: -1,
          layer2Index: i,
          layer1: null,
          layer2: { ...layer2, size: layer2Size },
          sizeDiff: layer2Size,
          instructionDiff: `Added: ${layer2.createdBy || 'New layer'}`,
          type: 'added',
          image1: image1,
          image2: image2,
        });
      } else if (layer1 && !layer2) {
        // Calculate size for removed layer
        const layer1Size = layer1.size > 0 ? layer1.size : 
                          (image1.size > 0 && image1.layers.length > 0 ? image1.size / image1.layers.length : 0);
        differences.push({
          layer1Index: i,
          layer2Index: -1,
          layer1: { ...layer1, size: layer1Size },
          layer2: null,
          sizeDiff: -layer1Size,
          instructionDiff: `Removed: ${layer1.createdBy || 'Layer removed'}`,
          type: 'removed',
          image1: image1,
          image2: image2,
        });
      } else if (layer1 && layer2) {
        if (this.layersAreDifferent(layer1, layer2)) {
          // Calculate sizes for changed layers
          const layer1Size = layer1.size > 0 ? layer1.size : 
                            (image1.size > 0 && image1.layers.length > 0 ? image1.size / image1.layers.length : 0);
          const layer2Size = layer2.size > 0 ? layer2.size : 
                            (image2.size > 0 && image2.layers.length > 0 ? image2.size / image2.layers.length : 0);
          differences.push({
            layer1Index: i,
            layer2Index: i,
            layer1: { ...layer1, size: layer1Size },
            layer2: { ...layer2, size: layer2Size },
            sizeDiff: layer2Size - layer1Size,
            instructionDiff: this.getInstructionDiff(layer1, layer2),
            type: 'changed',
            image1: image1,
            image2: image2,
          });
        }
      }
    }

    return differences;
  }

  layersAreDifferent(layer1, layer2) {
    if (layer1.size !== layer2.size) return true;
    if (layer1.createdBy !== layer2.createdBy) return true;
    if (layer1.id !== layer2.id && layer1.id !== 'base' && layer2.id !== 'base') {
      return true;
    }
    return false;
  }

  getInstructionDiff(layer1, layer2) {
    const inst1 = this.extractInstruction(layer1.createdBy);
    const inst2 = this.extractInstruction(layer2.createdBy);
    
    if (inst1 === inst2) return 'Same instruction, different size';
    
    const diff = [];
    if (inst1) diff.push(`- ${inst1}`);
    if (inst2) diff.push(`+ ${inst2}`);
    
    return diff.join('\n');
  }

  findCommonLayers(image1, image2) {
    const common = [];
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

  layersAreSame(layer1, layer2) {
    if (layer1.id === layer2.id && layer1.id !== 'base') return true;
    if (layer1.createdBy === layer2.createdBy && 
        layer1.size === layer2.size &&
        Math.abs(layer1.size) > 0) return true;
    return false;
  }

  findUniqueLayers(image1, image2) {
    const unique = [];

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

  calculateEfficiencyGain(image1, image2) {
    const analysis1 = this.inspector.analyzeLayers(image1);
    const analysis2 = this.inspector.analyzeLayers(image2);

    const score1 = this.inspector.calculateEfficiencyScore(analysis1);
    const score2 = this.inspector.calculateEfficiencyScore(analysis2);

    return score2 - score1;
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

