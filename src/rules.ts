/**
 * Rules Engine - Core optimization and lint rules
 */

import { DockerfileAST, Rule, Finding, Context, Severity } from './types';

function createFinding(
  rule: string,
  severity: Severity,
  message: string,
  description?: string,
  suggestion?: string,
  fixable: boolean = true
): Finding {
  return {
    id: `${rule}-${Date.now()}-${Math.random()}`,
    rule,
    severity,
    message,
    description,
    suggestion,
    fixable,
  };
}

// Rule: Pin base image with digest
export const pinBaseImageRule: Rule = {
  id: 'pin-base-image',
  name: 'Pin Base Image with Digest',
  severity: 'high',
  description: 'Base images should be pinned with SHA256 digest for reproducibility',
  check: (ast: DockerfileAST, ctx: Context): Finding[] => {
    const findings: Finding[] = [];

    for (const stage of ast.stages) {
      if (!stage.fromDigest) {
        findings.push(
          createFinding(
            'pin-base-image',
            'high',
            `Base image '${stage.from}' is not pinned with digest`,
            'Pinning base images with SHA256 digest ensures reproducible builds and prevents unexpected changes.',
            `Pin the image: FROM ${stage.from}@sha256:... ${stage.name ? `AS ${stage.name}` : ''}`,
            true
          )
        );
      }
    }

    return findings;
  },
};

// Rule: Use multi-stage builds
export const multiStageRule: Rule = {
  id: 'multi-stage-build',
  name: 'Use Multi-Stage Builds',
  severity: 'high',
  description: 'Multi-stage builds reduce final image size by separating build and runtime environments',
  check: (ast: DockerfileAST, ctx: Context): Finding[] => {
    const findings: Finding[] = [];

    // Check if there are build tools in a single-stage build
    if (ast.stages.length === 1) {
      const hasCompiler = ast.instructions.some(inst => 
        inst.type === 'RUN' && (
          inst.value.includes('gcc') ||
          inst.value.includes('g++') ||
          inst.value.includes('make') ||
          inst.value.includes('build-essential') ||
          inst.value.includes('npm install') ||
          inst.value.includes('npm i') ||
          inst.value.includes('cargo build') ||
          inst.value.includes('go build')
        )
      );

      if (hasCompiler) {
        findings.push(
          createFinding(
            'multi-stage-build',
            'high',
            'Consider using multi-stage build to separate build and runtime environments',
            'Single-stage builds include build tools in the final image, increasing size and attack surface.',
            'Split into builder stage (with build tools) and runtime stage (minimal, with only artifacts)',
            true
          )
        );
      }
    }

    return findings;
  },
};

// Rule: Consolidate RUN commands
export const consolidateRunRule: Rule = {
  id: 'consolidate-run',
  name: 'Consolidate RUN Commands',
  severity: 'medium',
  description: 'Multiple RUN commands create unnecessary layers',
  check: (ast: DockerfileAST, ctx: Context): Finding[] => {
    const findings: Finding[] = [];

    for (const stage of ast.stages) {
      const runInstructions = stage.instructions.filter(i => i.type === 'RUN');
      
      // Check for consecutive package manager commands
      for (let i = 0; i < runInstructions.length - 1; i++) {
        const current = runInstructions[i].value;
        const next = runInstructions[i + 1].value;

        const isPackageManager = (cmd: string) => 
          cmd.includes('apt-get') || 
          cmd.includes('apk add') || 
          cmd.includes('yum install') ||
          cmd.includes('dnf install');

        if (isPackageManager(current) && isPackageManager(next)) {
          findings.push(
            createFinding(
              'consolidate-run',
              'medium',
              'Consecutive package manager RUN commands should be consolidated',
              'Multiple RUN commands create separate layers. Consolidating reduces layer count.',
              'Combine into single RUN with && operator and clean up cache in same layer',
              true
            )
          );
          break;
        }
      }
    }

    return findings;
  },
};

// Rule: Cache-friendly ordering
export const cacheOrderRule: Rule = {
  id: 'cache-order',
  name: 'Optimize Layer Caching',
  severity: 'medium',
  description: 'Place frequently changing files after dependency installation',
  check: (ast: DockerfileAST, ctx: Context): Finding[] => {
    const findings: Finding[] = [];

    for (const stage of ast.stages) {
      const instructions = stage.instructions;
      let foundCopyAll = false;
      let copyAllIndex = -1;
      let foundInstall = false;

      for (let i = 0; i < instructions.length; i++) {
        const inst = instructions[i];

        // Check for COPY . . before package install
        if ((inst.type === 'COPY' || inst.type === 'ADD') && 
            (inst.value.includes('. .') || inst.value.includes('. /') || inst.args[0] === '.')) {
          foundCopyAll = true;
          copyAllIndex = i;
        }

        // Check for package install commands
        if (inst.type === 'RUN' && (
          inst.value.includes('npm install') ||
          inst.value.includes('npm ci') ||
          inst.value.includes('yarn install') ||
          inst.value.includes('pnpm install') ||
          inst.value.includes('pip install') ||
          inst.value.includes('go mod download')
        )) {
          foundInstall = true;
          
          if (foundCopyAll && copyAllIndex < i) {
            findings.push(
              createFinding(
                'cache-order',
                'medium',
                'COPY . . before dependency installation breaks cache',
                'Copying all files before installing dependencies means cache invalidates on any code change.',
                'Copy dependency files (package.json, go.mod, etc.) first, install dependencies, then copy source code',
                true
              )
            );
            break;
          }
        }
      }
    }

    return findings;
  },
};

// Rule: USER nonroot
export const nonrootUserRule: Rule = {
  id: 'nonroot-user',
  name: 'Run as Non-Root User',
  severity: 'medium',
  description: 'Containers should not run as root for security',
  check: (ast: DockerfileAST, ctx: Context): Finding[] => {
    const findings: Finding[] = [];

    for (const stage of ast.stages) {
      const hasUser = stage.instructions.some(i => i.type === 'USER' && i.value !== 'root' && i.value !== '0');
      
      if (!hasUser) {
        findings.push(
          createFinding(
            'nonroot-user',
            'medium',
            'Container runs as root user',
            'Running containers as root increases security risk. Use a dedicated non-root user.',
            'Add USER directive with non-root user (e.g., USER 10001 or USER node)',
            true
          )
        );
      }
    }

    return findings;
  },
};

// Rule: Prefer COPY over ADD
export const preferCopyRule: Rule = {
  id: 'prefer-copy',
  name: 'Prefer COPY over ADD',
  severity: 'low',
  description: 'ADD has implicit behavior that can be unexpected',
  check: (ast: DockerfileAST, ctx: Context): Finding[] => {
    const findings: Finding[] = [];

    for (const inst of ast.instructions) {
      if (inst.type === 'ADD') {
        // ADD is ok for URLs or tar extraction
        const isUrl = inst.args[0]?.startsWith('http');
        const isTar = inst.args[0]?.match(/\.(tar|tar\.gz|tgz|tar\.bz2|tar\.xz)$/);
        
        if (!isUrl && !isTar) {
          findings.push(
            createFinding(
              'prefer-copy',
              'low',
              'Use COPY instead of ADD for regular files',
              'ADD has implicit tar extraction and URL download. COPY is more explicit and predictable.',
              `Replace ADD with COPY: COPY ${inst.args.join(' ')}`,
              true
            )
          );
        }
      }
    }

    return findings;
  },
};

// Rule: Clean package manager cache
export const cleanCacheRule: Rule = {
  id: 'clean-cache',
  name: 'Clean Package Manager Cache',
  severity: 'medium',
  description: 'Package manager cache increases image size',
  check: (ast: DockerfileAST, ctx: Context): Finding[] => {
    const findings: Finding[] = [];

    for (const inst of ast.instructions) {
      if (inst.type === 'RUN') {
        const hasAptInstall = inst.value.includes('apt-get install') || inst.value.includes('apt install');
        const hasAptClean = inst.value.includes('apt-get clean') || inst.value.includes('rm -rf /var/lib/apt/lists');

        if (hasAptInstall && !hasAptClean) {
          findings.push(
            createFinding(
              'clean-cache',
              'medium',
              'apt-get install without cleaning cache',
              'APT cache adds unnecessary size to the image layer.',
              'Add to same RUN: && apt-get clean && rm -rf /var/lib/apt/lists/*',
              true
            )
          );
        }

        const hasApkAdd = inst.value.includes('apk add');
        const hasApkClean = inst.value.includes('--no-cache') || inst.value.includes('rm -rf /var/cache/apk');

        if (hasApkAdd && !hasApkClean) {
          findings.push(
            createFinding(
              'clean-cache',
              'medium',
              'apk add without --no-cache flag',
              'APK cache adds unnecessary size to the image layer.',
              'Add --no-cache flag: apk add --no-cache <packages>',
              true
            )
          );
        }
      }
    }

    return findings;
  },
};

// Rule: Pin package versions
export const pinVersionsRule: Rule = {
  id: 'pin-versions',
  name: 'Pin Package Versions',
  severity: 'medium',
  description: 'Unpinned packages can cause reproducibility issues',
  check: (ast: DockerfileAST, ctx: Context): Finding[] => {
    const findings: Finding[] = [];

    for (const inst of ast.instructions) {
      if (inst.type === 'RUN') {
        // Check apt-get without versions
        const aptMatch = inst.value.match(/apt-get install\s+([^&|;]+)/);
        if (aptMatch) {
          const packages = aptMatch[1].split(/\s+/).filter(p => 
            p && !p.startsWith('-') && !p.includes('=')
          );
          if (packages.length > 0 && !inst.value.includes('=')) {
            findings.push(
              createFinding(
                'pin-versions',
                'low',
                'apt-get install without pinned versions',
                'Unpinned package versions can lead to non-reproducible builds.',
                'Pin versions: apt-get install package=version',
                false
              )
            );
          }
        }

        // Check apk without versions
        const apkMatch = inst.value.match(/apk add\s+([^&|;]+)/);
        if (apkMatch) {
          const packages = apkMatch[1].split(/\s+/).filter(p => 
            p && !p.startsWith('-') && !p.includes('=')
          );
          if (packages.length > 0 && !inst.value.includes('=')) {
            findings.push(
              createFinding(
                'pin-versions',
                'low',
                'apk add without pinned versions',
                'Unpinned package versions can lead to non-reproducible builds.',
                'Pin versions: apk add package=version',
                false
              )
            );
          }
        }
      }
    }

    return findings;
  },
};

// Rule: Use .dockerignore
export const dockerignoreRule: Rule = {
  id: 'dockerignore',
  name: 'Use .dockerignore',
  severity: 'low',
  description: '.dockerignore prevents sending unnecessary files to build context',
  check: (ast: DockerfileAST, ctx: Context): Finding[] => {
    const findings: Finding[] = [];

    // This requires context - check if dockerignore is provided
    if (!ctx.dockerignore) {
      const hasCopyAll = ast.instructions.some(i => 
        (i.type === 'COPY' || i.type === 'ADD') && 
        (i.value.includes('. .') || i.args[0] === '.')
      );

      if (hasCopyAll) {
        findings.push(
          createFinding(
            'dockerignore',
            'low',
            'No .dockerignore file detected',
            'Without .dockerignore, unnecessary files (node_modules, .git, etc.) are sent to build context.',
            'Create .dockerignore with common exclusions',
            false
          )
        );
      }
    }

    return findings;
  },
};

// Rule: Use latest tag
export const latestTagRule: Rule = {
  id: 'latest-tag',
  name: 'Avoid latest Tag',
  severity: 'high',
  description: 'Using latest tag makes builds non-reproducible',
  check: (ast: DockerfileAST, ctx: Context): Finding[] => {
    const findings: Finding[] = [];

    for (const stage of ast.stages) {
      if (stage.from.endsWith(':latest') || (!stage.from.includes(':') && !stage.from.includes('@'))) {
        findings.push(
          createFinding(
            'latest-tag',
            'high',
            `Base image '${stage.from}' uses 'latest' tag or no tag`,
            'latest tag can change over time, making builds non-reproducible.',
            'Use specific version tag and pin with digest',
            true
          )
        );
      }
    }

    return findings;
  },
};

// Rule: Detect secrets
export const secretsRule: Rule = {
  id: 'no-secrets',
  name: 'No Secrets in Dockerfile',
  severity: 'high',
  description: 'Secrets should not be hardcoded in Dockerfile',
  check: (ast: DockerfileAST, ctx: Context): Finding[] => {
    const findings: Finding[] = [];

    const secretPatterns = [
      /API[_-]?KEY\s*=\s*['"][^'"]+['"]/i,
      /SECRET[_-]?KEY\s*=\s*['"][^'"]+['"]/i,
      /PASSWORD\s*=\s*['"][^'"]+['"]/i,
      /TOKEN\s*=\s*['"][^'"]+['"]/i,
      /AWS[_-]?ACCESS[_-]?KEY/i,
      /PRIVATE[_-]?KEY/i,
    ];

    for (const inst of ast.instructions) {
      if (inst.type === 'ENV' || inst.type === 'ARG') {
        for (const pattern of secretPatterns) {
          if (pattern.test(inst.value)) {
            findings.push(
              createFinding(
                'no-secrets',
                'high',
                'Potential secret detected in Dockerfile',
                'Secrets should be passed via build args at build time or environment variables at runtime.',
                'Use ARG for build-time secrets (not committed) or mount secrets using BuildKit',
                false
              )
            );
            break;
          }
        }
      }
    }

    return findings;
  },
};

// Export all rules
export const allRules: Rule[] = [
  pinBaseImageRule,
  multiStageRule,
  consolidateRunRule,
  cacheOrderRule,
  nonrootUserRule,
  preferCopyRule,
  cleanCacheRule,
  pinVersionsRule,
  dockerignoreRule,
  latestTagRule,
  secretsRule,
];

export function analyzeDockerfile(ast: DockerfileAST, ctx: Context, rules: Rule[] = allRules): Finding[] {
  const findings: Finding[] = [];

  for (const rule of rules) {
    const ruleFindings = rule.check(ast, ctx);
    findings.push(...ruleFindings);
  }

  return findings;
}

