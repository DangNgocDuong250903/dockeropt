/**
 * Main entry point for Dockerfile Optimizer
 */

import { parseDockerfile } from './parser.js';
import { analyzeDockerfile, allRules } from './rules.js';
import { DockerfileOptimizer } from './optimizer.js';
import { Patcher } from './patcher.js';
import { Estimators } from './estimators.js';
import { Reporter, ReportFormat } from './reporter.js';
import { Scorer } from './scorer.js';
import { Context, OptimizationResult, Finding, Rule } from './types.js';

export class DockerfileOptimizerEngine {
  private optimizer = new DockerfileOptimizer();
  private patcher = new Patcher();
  private estimators = new Estimators();
  private reporter = new Reporter();
  private scorer = new Scorer();

  /**
   * Analyze and optimize a Dockerfile
   */
  async analyze(
    dockerfile: string,
    context: Partial<Context> = {},
    rules: Rule[] = allRules
  ): Promise<OptimizationResult> {
    // Parse
    const ast = parseDockerfile(dockerfile);

    // Build context
    const ctx: Context = {
      dockerfile,
      dockerignore: context.dockerignore,
      packageManager: context.packageManager,
      targetStage: context.targetStage,
      buildArgs: context.buildArgs || {},
    };

    // Analyze
    const findings = analyzeDockerfile(ast, ctx, rules);

    // Calculate score
    const score = this.scorer.calculateScore(findings, ast);

    // Optimize
    const optimized = this.optimizer.optimize(ast, findings);
    const optimizedAST = parseDockerfile(optimized);

    // Generate diff
    const diff = this.patcher.createDiff(dockerfile, optimized);

    // Estimate metrics
    const metrics = this.estimators.estimateMetrics(ast, optimizedAST);

    return {
      original: dockerfile,
      optimized,
      findings,
      score,
      metrics,
      diff,
    };
  }

  /**
   * Lint only - don't generate optimizations
   */
  async lint(
    dockerfile: string,
    context: Partial<Context> = {},
    rules: Rule[] = allRules
  ): Promise<Finding[]> {
    const ast = parseDockerfile(dockerfile);
    const ctx: Context = {
      dockerfile,
      dockerignore: context.dockerignore,
      packageManager: context.packageManager,
      targetStage: context.targetStage,
      buildArgs: context.buildArgs || {},
    };

    return analyzeDockerfile(ast, ctx, rules);
  }

  /**
   * Generate report in specified format
   */
  generateReport(result: OptimizationResult, format: ReportFormat = 'text'): string {
    return this.reporter.generate(result, format);
  }

  /**
   * Check if findings meet severity threshold for CI
   */
  shouldFailCI(findings: Finding[], failOn: 'high' | 'medium' | 'low' = 'high'): boolean {
    const severityLevels = ['low', 'medium', 'high'];
    const threshold = severityLevels.indexOf(failOn);

    for (const finding of findings) {
      const findingSeverity = severityLevels.indexOf(finding.severity);
      if (findingSeverity >= threshold) {
        return true;
      }
    }

    return false;
  }
}

// Export everything
export * from './types';
export * from './parser';
export * from './rules';
export * from './optimizer';
export * from './patcher';
export * from './estimators';
export * from './reporter';
export * from './scorer';
export * from './layer-analyzer';

// Default export
export default DockerfileOptimizerEngine;

