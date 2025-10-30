/**
 * Browser-compatible Dockerfile Optimizer Core
 * Simplified version for web demo
 */

export class DockerfileParser {
  parse(content) {
    const lines = content.split('\n');
    const instructions = [];
    const stages = [];
    let currentStage = null;
    let lineNum = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('#')) {
        lineNum++;
        continue;
      }

      const instruction = this.parseInstruction(line, lineNum);
      instructions.push(instruction);

      if (instruction.type === 'FROM') {
        if (currentStage) stages.push(currentStage);
        
        const { from, name, digest } = this.parseFromInstruction(instruction.value);
        currentStage = {
          from,
          fromDigest: digest,
          name,
          instructions: [instruction],
          startLine: lineNum,
          endLine: lineNum,
        };
      } else if (currentStage) {
        currentStage.instructions.push(instruction);
      }

      lineNum++;
    }

    if (currentStage) {
      currentStage.endLine = lineNum - 1;
      stages.push(currentStage);
    }

    return { stages, instructions, raw: content };
  }

  parseInstruction(line, lineNum) {
    const match = line.trim().match(/^(\w+)\s+(.*)$/);
    if (!match) return { type: 'COMMENT', value: line, args: [], lineNum };

    const [, type, value] = match;
    const args = value.split(/\s+/).filter(Boolean);

    return {
      type: type.toUpperCase(),
      value: value.trim(),
      args,
      lineNum,
    };
  }

  parseFromInstruction(value) {
    const asMatch = value.match(/^(.+?)\s+AS\s+(\S+)$/i);
    const name = asMatch ? asMatch[2] : undefined;
    const imageString = asMatch ? asMatch[1] : value;

    const digestMatch = imageString.match(/^(.+?)@(sha256:[a-f0-9]+)$/);
    const digest = digestMatch ? digestMatch[2] : undefined;
    const from = digestMatch ? digestMatch[1] : imageString;

    return { from, name, digest };
  }
}

export class DockerfileAnalyzer {
  analyze(ast) {
    const findings = [];

    // Rule 1: Pin base image
    for (const stage of ast.stages) {
      if (!stage.fromDigest) {
        findings.push({
          id: `pin-base-${Math.random()}`,
          rule: 'pin-base-image',
          severity: 'high',
          message: `Base image '${stage.from}' is not pinned with digest`,
          description: 'Pinning base images ensures reproducible builds.',
          suggestion: `Use: FROM ${stage.from}@sha256:...`,
          fixable: true,
        });
      }
    }

    // Rule 2: Latest tag
    for (const stage of ast.stages) {
      if (stage.from.endsWith(':latest') || (!stage.from.includes(':') && !stage.from.includes('@'))) {
        findings.push({
          id: `latest-tag-${Math.random()}`,
          rule: 'latest-tag',
          severity: 'high',
          message: `Base image '${stage.from}' uses 'latest' tag`,
          description: 'Latest tag makes builds non-reproducible.',
          suggestion: 'Use specific version tag.',
          fixable: true,
        });
      }
    }

    // Rule 3: Multi-stage build
    if (ast.stages.length === 1) {
      const hasBuildCmd = ast.instructions.some(i => 
        i.type === 'RUN' && (
          i.value.includes('npm install') ||
          i.value.includes('npm run build') ||
          i.value.includes('go build')
        )
      );

      if (hasBuildCmd) {
        findings.push({
          id: `multi-stage-${Math.random()}`,
          rule: 'multi-stage-build',
          severity: 'high',
          message: 'Consider using multi-stage build',
          description: 'Single-stage builds include build tools in final image.',
          suggestion: 'Split into builder and runtime stages.',
          fixable: true,
        });
      }
    }

    // Rule 4: Cache order
    for (const stage of ast.stages) {
      let foundCopyAll = false;
      let foundInstall = false;

      for (const inst of stage.instructions) {
        if ((inst.type === 'COPY' || inst.type === 'ADD') && 
            (inst.value.includes('. .') || inst.args[0] === '.')) {
          foundCopyAll = true;
        }

        if (inst.type === 'RUN' && (
          inst.value.includes('npm install') ||
          inst.value.includes('npm ci') ||
          inst.value.includes('pip install')
        )) {
          if (foundCopyAll) {
            findings.push({
              id: `cache-order-${Math.random()}`,
              rule: 'cache-order',
              severity: 'medium',
              message: 'COPY . . before dependency installation breaks cache',
              description: 'Copy dependency files first, install, then copy source.',
              suggestion: 'Reorder: COPY package.json → RUN install → COPY source',
              fixable: true,
            });
            break;
          }
          foundInstall = true;
        }
      }
    }

    // Rule 5: Non-root user
    const hasNonRootUser = ast.instructions.some(i => 
      i.type === 'USER' && i.value !== 'root' && i.value !== '0'
    );

    if (!hasNonRootUser) {
      findings.push({
        id: `nonroot-${Math.random()}`,
        rule: 'nonroot-user',
        severity: 'medium',
        message: 'Container runs as root user',
        description: 'Running as root increases security risk.',
        suggestion: 'Add: USER node (or USER 10001)',
        fixable: true,
      });
    }

    // Rule 6: Clean cache
    for (const inst of ast.instructions) {
      if (inst.type === 'RUN') {
        if (inst.value.includes('apt-get install') && !inst.value.includes('apt-get clean')) {
          findings.push({
            id: `clean-cache-apt-${Math.random()}`,
            rule: 'clean-cache',
            severity: 'medium',
            message: 'apt-get install without cleaning cache',
            description: 'APT cache increases image size.',
            suggestion: 'Add: && apt-get clean && rm -rf /var/lib/apt/lists/*',
            fixable: true,
          });
        }

        if (inst.value.includes('apk add') && !inst.value.includes('--no-cache')) {
          findings.push({
            id: `clean-cache-apk-${Math.random()}`,
            rule: 'clean-cache',
            severity: 'medium',
            message: 'apk add without --no-cache flag',
            description: 'APK cache increases image size.',
            suggestion: 'Add --no-cache flag',
            fixable: true,
          });
        }
      }
    }

    return findings;
  }
}

export class DockerfileOptimizer {
  optimize(ast, findings) {
    let optimized = ast.raw;

    // Simple fixes
    if (findings.some(f => f.rule === 'nonroot-user')) {
      optimized += '\n\n# Run as non-root user\nUSER node';
    }

    if (findings.some(f => f.rule === 'clean-cache' && f.message.includes('apt-get'))) {
      optimized = optimized.replace(
        /apt-get install -y ([^\n]+)/g,
        'apt-get install -y $1 && apt-get clean && rm -rf /var/lib/apt/lists/*'
      );
    }

    if (findings.some(f => f.rule === 'clean-cache' && f.message.includes('apk'))) {
      optimized = optimized.replace(/apk add /g, 'apk add --no-cache ');
    }

    return optimized;
  }
}

export class DockerfileOptimizerEngine {
  constructor(useAI = false, geminiAnalyzer = null) {
    this.parser = new DockerfileParser();
    this.analyzer = new DockerfileAnalyzer();
    this.optimizer = new DockerfileOptimizer();
    this.useAI = useAI;
    this.geminiAnalyzer = geminiAnalyzer;
  }

  async analyze(dockerfile) {
    // If AI is enabled, use Gemini
    if (this.useAI && this.geminiAnalyzer) {
      return await this.analyzeWithAI(dockerfile);
    }

    // Fallback to heuristic analysis
    return await this.analyzeWithHeuristics(dockerfile);
  }

  async analyzeWithAI(dockerfile) {
    try {
      const aiResult = await this.geminiAnalyzer.analyzeDockerfile(dockerfile);
      
      // Transform AI response to our format
      const findings = aiResult.findings.map(f => ({
        id: `ai-${Math.random()}`,
        rule: f.category,
        severity: f.severity,
        message: f.title || f.message,
        description: f.message,
        suggestion: f.suggestedCode || f.explanation,
        explanation: f.explanation,
        impact: f.impact,
        lineNumber: f.lineNumber,
        fixable: true,
      }));

      const score = aiResult.metrics?.overallScore || this.calculateScore(findings);
      const optimized = aiResult.optimizedDockerfile || dockerfile;
      const diff = this.createDiff(dockerfile, optimized);

      const metrics = {
        estimatedSizeSavings: aiResult.metrics?.estimatedSizeSavingsMB || 100,
        layerReduction: findings.filter(f => f.category === 'performance').length,
        buildTimeImprovement: 20,
        cacheEfficiency: Math.max(0, 100 - findings.filter(f => f.category === 'cache').length * 20),
        securityScore: Math.max(0, 100 - aiResult.metrics?.securityIssuesCount * 15),
      };

      return {
        original: dockerfile,
        optimized,
        findings,
        score,
        metrics,
        diff,
        commitMessage: aiResult.commitMessage,
        summary: aiResult.summary,
        isAIAnalyzed: true,
      };
    } catch (error) {
      console.error('AI analysis failed, falling back to heuristics:', error);
      return await this.analyzeWithHeuristics(dockerfile);
    }
  }

  async analyzeWithHeuristics(dockerfile) {
    // Parse
    const ast = this.parser.parse(dockerfile);

    // Analyze
    const findings = this.analyzer.analyze(ast);

    // Calculate score
    const score = this.calculateScore(findings, ast);

    // Optimize
    const optimized = this.optimizer.optimize(ast, findings);

    // Generate diff
    const diff = this.createDiff(dockerfile, optimized);

    // Estimate metrics
    const metrics = this.estimateMetrics(ast, findings);

    return {
      original: dockerfile,
      optimized,
      findings,
      score,
      metrics,
      diff,
      isAIAnalyzed: false,
    };
  }

  calculateScore(findings, ast) {
    let score = 100;

    for (const finding of findings) {
      if (finding.severity === 'high') score -= 40;
      else if (finding.severity === 'medium') score -= 15;
      else if (finding.severity === 'low') score -= 5;
    }

    // Bonuses
    if (ast.stages.length > 1) score += 20;

    return Math.max(0, Math.min(100, score));
  }

  estimateMetrics(ast, findings) {
    const hasMultiStage = ast.stages.length > 1;
    const sizeSavings = hasMultiStage ? 200 : 100;
    const layerReduction = findings.filter(f => f.rule === 'consolidate-run').length * 2;
    
    return {
      estimatedSizeSavings: sizeSavings,
      layerReduction: layerReduction || 0,
      buildTimeImprovement: 15,
      cacheEfficiency: 100 - (findings.filter(f => f.rule === 'cache-order').length * 30),
      securityScore: 100 - (findings.filter(f => f.severity === 'high').length * 20),
    };
  }

  createDiff(original, optimized) {
    const originalLines = original.split('\n');
    const optimizedLines = optimized.split('\n');
    
    let diff = '--- Dockerfile\n+++ Dockerfile.optimized\n';
    
    const maxLen = Math.max(originalLines.length, optimizedLines.length);
    for (let i = 0; i < maxLen; i++) {
      const origLine = originalLines[i];
      const optLine = optimizedLines[i];
      
      if (origLine !== optLine) {
        if (origLine) diff += `-${origLine}\n`;
        if (optLine) diff += `+${optLine}\n`;
      } else if (origLine) {
        diff += ` ${origLine}\n`;
      }
    }
    
    return diff;
  }
}

