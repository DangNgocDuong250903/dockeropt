/**
 * Patcher - Generate unified diff between original and optimized Dockerfile
 */

import { createPatch } from 'diff';

export class Patcher {
  createDiff(original: string, optimized: string, filename: string = 'Dockerfile'): string {
    const patch = createPatch(
      filename,
      original,
      optimized,
      'original',
      'optimized',
      { context: 3 }
    );

    return patch;
  }

  createUnifiedDiff(original: string, optimized: string): string {
    const originalLines = original.split('\n');
    const optimizedLines = optimized.split('\n');

    const diff: string[] = ['--- Dockerfile', '+++ Dockerfile.optimized'];
    let i = 0;
    let j = 0;

    while (i < originalLines.length || j < optimizedLines.length) {
      if (i < originalLines.length && j < optimizedLines.length) {
        if (originalLines[i] === optimizedLines[j]) {
          diff.push(` ${originalLines[i]}`);
          i++;
          j++;
        } else {
          // Find next matching line
          let foundMatch = false;
          for (let k = i + 1; k < Math.min(i + 5, originalLines.length); k++) {
            if (originalLines[k] === optimizedLines[j]) {
              // Lines removed
              for (let m = i; m < k; m++) {
                diff.push(`-${originalLines[m]}`);
              }
              i = k;
              foundMatch = true;
              break;
            }
          }

          if (!foundMatch) {
            for (let k = j + 1; k < Math.min(j + 5, optimizedLines.length); k++) {
              if (originalLines[i] === optimizedLines[k]) {
                // Lines added
                for (let m = j; m < k; m++) {
                  diff.push(`+${optimizedLines[m]}`);
                }
                j = k;
                foundMatch = true;
                break;
              }
            }
          }

          if (!foundMatch) {
            diff.push(`-${originalLines[i]}`);
            diff.push(`+${optimizedLines[j]}`);
            i++;
            j++;
          }
        }
      } else if (i < originalLines.length) {
        diff.push(`-${originalLines[i]}`);
        i++;
      } else {
        diff.push(`+${optimizedLines[j]}`);
        j++;
      }
    }

    return diff.join('\n');
  }
}

