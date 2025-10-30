/**
 * Scorer - Calculate optimization score
 */

import { Finding, DockerfileAST } from './types';

interface ScoreWeights {
  high: number;
  medium: number;
  low: number;
  info: number;
}

const SEVERITY_WEIGHTS: ScoreWeights = {
  high: 40,
  medium: 15,
  low: 5,
  info: 1,
};

const BONUS_POINTS = {
  multiStage: 20,
  pinnedDigest: 20,
  nonRoot: 15,
  cacheOptimized: 10,
  noSecrets: 10,
};

export class Scorer {
  calculateScore(findings: Finding[], ast: DockerfileAST): number {
    let score = 100;

    // Deduct points for findings
    for (const finding of findings) {
      const weight = SEVERITY_WEIGHTS[finding.severity] || 0;
      score -= weight;
    }

    // Ensure minimum score
    score = Math.max(0, score);

    // Add bonus points for good practices
    const bonuses = this.calculateBonuses(ast, findings);
    score = Math.min(100, score + bonuses);

    return Math.round(score);
  }

  private calculateBonuses(ast: DockerfileAST, findings: Finding[]): number {
    let bonus = 0;

    // Multi-stage build bonus
    if (ast.stages.length > 1) {
      bonus += BONUS_POINTS.multiStage;
    }

    // Pinned digest bonus
    const hasPinnedImages = ast.stages.some(s => s.fromDigest);
    if (hasPinnedImages) {
      bonus += BONUS_POINTS.pinnedDigest;
    }

    // Non-root user bonus
    const hasNonRoot = ast.instructions.some(i => 
      i.type === 'USER' && i.value !== 'root' && i.value !== '0'
    );
    if (hasNonRoot) {
      bonus += BONUS_POINTS.nonRoot;
    }

    // Cache-optimized bonus (no cache-order findings)
    const hasCacheIssues = findings.some(f => f.rule === 'cache-order');
    if (!hasCacheIssues) {
      bonus += BONUS_POINTS.cacheOptimized;
    }

    // No secrets bonus
    const hasSecrets = findings.some(f => f.rule === 'no-secrets');
    if (!hasSecrets) {
      bonus += BONUS_POINTS.noSecrets;
    }

    return bonus;
  }

  getScoreGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  getSeverityCounts(findings: Finding[]): Record<string, number> {
    const counts: Record<string, number> = {
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const finding of findings) {
      counts[finding.severity]++;
    }

    return counts;
  }
}

