/**
 * Optimizer - Generates optimized Dockerfile from findings
 */

import { DockerfileAST, Finding, Stage, Instruction } from './types';

export class DockerfileOptimizer {
  optimize(ast: DockerfileAST, findings: Finding[]): string {
    let optimized = ast.raw;

    // Group findings by rule
    const findingsByRule = new Map<string, Finding[]>();
    for (const finding of findings.filter(f => f.fixable)) {
      if (!findingsByRule.has(finding.rule)) {
        findingsByRule.set(finding.rule, []);
      }
      findingsByRule.get(finding.rule)!.push(finding);
    }

    // Apply fixes in order of impact
    const fixOrder = [
      'multi-stage-build',
      'cache-order',
      'pin-base-image',
      'latest-tag',
      'consolidate-run',
      'clean-cache',
      'prefer-copy',
      'nonroot-user',
    ];

    for (const rule of fixOrder) {
      if (findingsByRule.has(rule)) {
        optimized = this.applyFix(optimized, ast, rule, findingsByRule.get(rule)!);
      }
    }

    return optimized;
  }

  private applyFix(dockerfile: string, ast: DockerfileAST, rule: string, findings: Finding[]): string {
    switch (rule) {
      case 'pin-base-image':
      case 'latest-tag':
        return this.fixBaseImage(dockerfile, ast);
      
      case 'multi-stage-build':
        return this.fixMultiStage(dockerfile, ast);
      
      case 'cache-order':
        return this.fixCacheOrder(dockerfile, ast);
      
      case 'consolidate-run':
        return this.fixConsolidateRun(dockerfile, ast);
      
      case 'clean-cache':
        return this.fixCleanCache(dockerfile, ast);
      
      case 'prefer-copy':
        return this.fixPreferCopy(dockerfile, ast);
      
      case 'nonroot-user':
        return this.fixNonrootUser(dockerfile, ast);
      
      default:
        return dockerfile;
    }
  }

  private fixBaseImage(dockerfile: string, ast: DockerfileAST): string {
    let result = dockerfile;

    for (const stage of ast.stages) {
      // Add comment about pinning (actual digest would require registry lookup)
      if (!stage.fromDigest) {
        const oldFrom = `FROM ${stage.from}${stage.name ? ` AS ${stage.name}` : ''}`;
        const newFrom = `# TODO: Pin with digest - run: docker pull ${stage.from} && docker inspect ${stage.from} | grep -i digest
FROM ${stage.from}${stage.name ? ` AS ${stage.name}` : ''}`;
        result = result.replace(oldFrom, newFrom);
      }
    }

    return result;
  }

  private fixMultiStage(dockerfile: string, ast: DockerfileAST): string {
    if (ast.stages.length > 1) return dockerfile;

    const lines = dockerfile.split('\n');
    const stage = ast.stages[0];
    
    // Detect package manager and build commands
    const hasBuildCmd = stage.instructions.some(i => 
      i.type === 'RUN' && (
        i.value.includes('npm run build') ||
        i.value.includes('cargo build') ||
        i.value.includes('go build') ||
        i.value.includes('mvn package')
      )
    );

    if (!hasBuildCmd) return dockerfile;

    // Find base image type
    const baseImage = stage.from;
    let runtimeBase = baseImage;
    
    if (baseImage.includes('node')) {
      runtimeBase = baseImage.replace('node:', 'node:') + '-slim';
    } else if (baseImage.includes('golang')) {
      runtimeBase = 'alpine:latest';
    } else if (baseImage.includes('rust')) {
      runtimeBase = 'debian:bullseye-slim';
    }

    // Find where to split (after build, before CMD)
    let splitIndex = -1;
    for (let i = stage.instructions.length - 1; i >= 0; i--) {
      const inst = stage.instructions[i];
      if (inst.type === 'RUN' && (
        inst.value.includes('build') ||
        inst.value.includes('compile')
      )) {
        splitIndex = i;
        break;
      }
    }

    if (splitIndex === -1) return dockerfile;

    // Insert runtime stage
    const fromLine = lines.findIndex(l => l.trim().startsWith('FROM'));
    if (fromLine !== -1) {
      lines[fromLine] = lines[fromLine].replace('FROM ', 'FROM ') + ' AS builder';
    }

    // Add runtime stage before CMD
    const cmdIndex = lines.findIndex(l => l.trim().startsWith('CMD') || l.trim().startsWith('ENTRYPOINT'));
    if (cmdIndex !== -1) {
      const runtimeStage = [
        '',
        '# Runtime stage',
        `FROM ${runtimeBase}`,
        'WORKDIR /app',
        'COPY --from=builder /app /app',
      ];
      lines.splice(cmdIndex, 0, ...runtimeStage);
    }

    return lines.join('\n');
  }

  private fixCacheOrder(dockerfile: string, ast: DockerfileAST): string {
    let result = dockerfile;

    // Find COPY . . before npm install pattern
    const lines = dockerfile.split('\n');
    let copyAllIdx = -1;
    let installIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if ((line.startsWith('COPY . .') || line.startsWith('COPY . /')) && copyAllIdx === -1) {
        copyAllIdx = i;
      }

      if (line.includes('npm ci') || line.includes('npm install') || 
          line.includes('yarn install') || line.includes('pnpm install')) {
        installIdx = i;
      }
    }

    if (copyAllIdx !== -1 && installIdx !== -1 && copyAllIdx < installIdx) {
      // Reorder: copy package files, install, then copy all
      const copyAll = lines[copyAllIdx];
      lines.splice(copyAllIdx, 1);

      // Find WORKDIR or FROM to insert after
      let insertIdx = 0;
      for (let i = copyAllIdx - 1; i >= 0; i--) {
        if (lines[i].trim().startsWith('WORKDIR') || lines[i].trim().startsWith('FROM')) {
          insertIdx = i + 1;
          break;
        }
      }

      // Insert package file copy
      lines.splice(insertIdx, 0, 
        'COPY package*.json ./',
        '# Install dependencies first for better caching'
      );

      // Move COPY . . to after install
      const newInstallIdx = lines.findIndex((l, idx) => 
        idx > insertIdx && (l.includes('npm ci') || l.includes('npm install'))
      );

      if (newInstallIdx !== -1) {
        lines.splice(newInstallIdx + 1, 0, '', copyAll);
      }

      result = lines.join('\n');
    }

    return result;
  }

  private fixConsolidateRun(dockerfile: string, ast: DockerfileAST): string {
    const lines = dockerfile.split('\n');
    const result: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Check if this is a RUN apt-get or apk command
      if (line.startsWith('RUN apt-get') || line.startsWith('RUN apk add')) {
        const runCommands: string[] = [line.replace('RUN ', '')];
        let j = i + 1;

        // Look ahead for consecutive RUN commands
        while (j < lines.length) {
          const nextLine = lines[j].trim();
          if (nextLine.startsWith('RUN apt-get') || nextLine.startsWith('RUN apk add')) {
            runCommands.push(nextLine.replace('RUN ', ''));
            j++;
          } else if (nextLine === '' || nextLine.startsWith('#')) {
            j++;
          } else {
            break;
          }
        }

        // Consolidate if multiple found
        if (runCommands.length > 1) {
          result.push(`RUN ${runCommands.join(' && \\\n    ')}`);
          i = j;
          continue;
        }
      }

      result.push(lines[i]);
      i++;
    }

    return result.join('\n');
  }

  private fixCleanCache(dockerfile: string, ast: DockerfileAST): string {
    let result = dockerfile;

    // Fix apt-get without clean
    result = result.replace(
      /(RUN\s+.*apt-get\s+install[^&\n]+)(?!.*apt-get clean)/g,
      '$1 && \\\n    apt-get clean && \\\n    rm -rf /var/lib/apt/lists/*'
    );

    // Fix apk without --no-cache
    result = result.replace(
      /apk add(?!\s+--no-cache)\s+/g,
      'apk add --no-cache '
    );

    return result;
  }

  private fixPreferCopy(dockerfile: string, ast: DockerfileAST): string {
    let result = dockerfile;

    // Replace ADD with COPY for regular files
    for (const inst of ast.instructions) {
      if (inst.type === 'ADD') {
        const isUrl = inst.args[0]?.startsWith('http');
        const isTar = inst.args[0]?.match(/\.(tar|tar\.gz|tgz)$/);
        
        if (!isUrl && !isTar) {
          result = result.replace(
            new RegExp(`^ADD\\s+${inst.value}`, 'm'),
            `COPY ${inst.value}`
          );
        }
      }
    }

    return result;
  }

  private fixNonrootUser(dockerfile: string, ast: DockerfileAST): string {
    const lines = dockerfile.split('\n');

    // Find the last stage or before CMD/ENTRYPOINT
    let insertIdx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('EXPOSE') || line.startsWith('COPY') || line.startsWith('WORKDIR')) {
        insertIdx = i + 1;
        break;
      }
    }

    if (insertIdx === -1) {
      insertIdx = lines.length - 1;
    }

    // Check if USER already exists
    const hasUser = lines.some(l => l.trim().startsWith('USER ') && !l.includes('USER root'));
    
    if (!hasUser) {
      lines.splice(insertIdx, 0, '', '# Run as non-root user', 'USER 10001');
    }

    return lines.join('\n');
  }
}

