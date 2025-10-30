/**
 * Reporter - Generate reports in various formats
 */

import { OptimizationResult, Finding, Metrics } from './types';
import { Scorer } from './scorer';

export type ReportFormat = 'text' | 'markdown' | 'json' | 'sarif';

export class Reporter {
  private scorer = new Scorer();

  generate(result: OptimizationResult, format: ReportFormat = 'text'): string {
    switch (format) {
      case 'text':
        return this.generateText(result);
      case 'markdown':
        return this.generateMarkdown(result);
      case 'json':
        return this.generateJSON(result);
      case 'sarif':
        return this.generateSARIF(result);
      default:
        return this.generateText(result);
    }
  }

  private generateText(result: OptimizationResult): string {
    const lines: string[] = [];
    const grade = this.scorer.getScoreGrade(result.score);

    lines.push('='.repeat(60));
    lines.push('DOCKERFILE OPTIMIZER REPORT');
    lines.push('='.repeat(60));
    lines.push('');
    lines.push(`Score: ${result.score}/100 (${grade}) | Size: ${result.metrics.estimatedSizeSavings}MB | Layers: -${result.metrics.layerReduction}`);
    lines.push('');

    if (result.findings.length === 0) {
      lines.push('✓ No issues found! Your Dockerfile is well optimized.');
      return lines.join('\n');
    }

    const counts = this.scorer.getSeverityCounts(result.findings);
    lines.push(`Findings: ${result.findings.length} total`);
    lines.push(`  HIGH: ${counts.high} | MEDIUM: ${counts.medium} | LOW: ${counts.low}`);
    lines.push('');
    lines.push('-'.repeat(60));

    // Group by severity
    const grouped = this.groupBySeverity(result.findings);

    for (const severity of ['high', 'medium', 'low']) {
      const items = grouped[severity] || [];
      if (items.length === 0) continue;

      lines.push('');
      lines.push(`${severity.toUpperCase()} SEVERITY (${items.length}):`);
      lines.push('');

      for (let i = 0; i < items.length; i++) {
        const finding = items[i];
        lines.push(`${i + 1}. [${severity.toUpperCase()}] ${finding.message}`);
        
        if (finding.description) {
          lines.push(`   ${finding.description}`);
        }
        
        if (finding.suggestion) {
          lines.push(`   Fix: ${finding.suggestion}`);
        }
        
        lines.push('');
      }
    }

    lines.push('-'.repeat(60));
    lines.push('');
    lines.push('Metrics:');
    lines.push(`  Estimated Size Savings: ${result.metrics.estimatedSizeSavings} MB`);
    lines.push(`  Layer Reduction: ${result.metrics.layerReduction}`);
    lines.push(`  Build Time Improvement: ${result.metrics.buildTimeImprovement}%`);
    lines.push(`  Cache Efficiency: ${result.metrics.cacheEfficiency}/100`);
    lines.push(`  Security Score: ${result.metrics.securityScore}/100`);
    lines.push('');

    return lines.join('\n');
  }

  private generateMarkdown(result: OptimizationResult): string {
    const lines: string[] = [];
    const grade = this.scorer.getScoreGrade(result.score);

    lines.push('# Dockerfile Optimizer Report');
    lines.push('');
    lines.push(`**Score:** ${result.score}/100 (${grade}) | **Estimated size:** -${result.metrics.estimatedSizeSavings}MB | **Build steps:** -${result.metrics.layerReduction} layers`);
    lines.push('');

    if (result.findings.length === 0) {
      lines.push('✅ **No issues found!** Your Dockerfile is well optimized.');
      lines.push('');
      return lines.join('\n');
    }

    const counts = this.scorer.getSeverityCounts(result.findings);
    lines.push(`## Findings (${result.findings.length})`);
    lines.push('');
    lines.push(`| Severity | Count |`);
    lines.push(`|----------|-------|`);
    lines.push(`| 🔴 HIGH | ${counts.high} |`);
    lines.push(`| 🟡 MEDIUM | ${counts.medium} |`);
    lines.push(`| 🔵 LOW | ${counts.low} |`);
    lines.push('');

    const grouped = this.groupBySeverity(result.findings);

    for (const severity of ['high', 'medium', 'low']) {
      const items = grouped[severity] || [];
      if (items.length === 0) continue;

      const emoji = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🔵';
      lines.push(`### ${emoji} ${severity.toUpperCase()} Priority`);
      lines.push('');

      for (let i = 0; i < items.length; i++) {
        const finding = items[i];
        lines.push(`${i + 1}. **${finding.message}**`);
        
        if (finding.description) {
          lines.push(`   - ${finding.description}`);
        }
        
        if (finding.suggestion) {
          lines.push(`   - 💡 **Fix:** ${finding.suggestion}`);
        }
        
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
    lines.push('## 📊 Metrics');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Estimated Size Savings | ${result.metrics.estimatedSizeSavings} MB |`);
    lines.push(`| Layer Reduction | ${result.metrics.layerReduction} |`);
    lines.push(`| Build Time Improvement | ${result.metrics.buildTimeImprovement}% |`);
    lines.push(`| Cache Efficiency | ${result.metrics.cacheEfficiency}/100 |`);
    lines.push(`| Security Score | ${result.metrics.securityScore}/100 |`);
    lines.push('');

    if (result.diff) {
      lines.push('## 📝 Patch (Unified Diff)');
      lines.push('');
      lines.push('```diff');
      lines.push(result.diff);
      lines.push('```');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('*Generated by Dockerfile Optimizer*');
    lines.push('');

    return lines.join('\n');
  }

  private generateJSON(result: OptimizationResult): string {
    return JSON.stringify(result, null, 2);
  }

  private generateSARIF(result: OptimizationResult): string {
    const sarif = {
      version: '2.1.0',
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      runs: [
        {
          tool: {
            driver: {
              name: 'DockerfileOptimizer',
              version: '1.0.0',
              informationUri: 'https://github.com/dockeropt/dockeropt',
              rules: this.generateSARIFRules(result.findings),
            },
          },
          results: this.generateSARIFResults(result.findings),
        },
      ],
    };

    return JSON.stringify(sarif, null, 2);
  }

  private generateSARIFRules(findings: Finding[]): any[] {
    const rulesMap = new Map<string, Finding>();
    
    for (const finding of findings) {
      if (!rulesMap.has(finding.rule)) {
        rulesMap.set(finding.rule, finding);
      }
    }

    return Array.from(rulesMap.values()).map(finding => ({
      id: finding.rule,
      name: finding.rule,
      shortDescription: {
        text: finding.message,
      },
      fullDescription: {
        text: finding.description || finding.message,
      },
      help: {
        text: finding.suggestion || '',
      },
      defaultConfiguration: {
        level: this.severityToSARIFLevel(finding.severity),
      },
    }));
  }

  private generateSARIFResults(findings: Finding[]): any[] {
    return findings.map(finding => ({
      ruleId: finding.rule,
      level: this.severityToSARIFLevel(finding.severity),
      message: {
        text: finding.message,
      },
      locations: finding.location ? [
        {
          physicalLocation: {
            artifactLocation: {
              uri: 'Dockerfile',
            },
            region: {
              startLine: finding.location.start.line,
              startColumn: finding.location.start.column,
              endLine: finding.location.end.line,
              endColumn: finding.location.end.column,
            },
          },
        },
      ] : [],
    }));
  }

  private severityToSARIFLevel(severity: string): string {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'note';
      default:
        return 'note';
    }
  }

  private groupBySeverity(findings: Finding[]): Record<string, Finding[]> {
    const grouped: Record<string, Finding[]> = {
      high: [],
      medium: [],
      low: [],
      info: [],
    };

    for (const finding of findings) {
      grouped[finding.severity].push(finding);
    }

    return grouped;
  }
}

