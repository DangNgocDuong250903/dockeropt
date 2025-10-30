#!/usr/bin/env node

/**
 * CLI for Dockerfile Optimizer
 */

import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { DockerfileOptimizerEngine } from './index';
import { ReportFormat } from './reporter';

const engine = new DockerfileOptimizerEngine();

// Version
const packageJson = require('../package.json');

program
  .name('dockeropt')
  .description('Dockerfile Optimizer - Lint, analyze, and optimize Dockerfiles')
  .version(packageJson.version);

// Lint command
program
  .command('lint <dockerfile>')
  .description('Lint Dockerfile and report issues')
  .option('-f, --format <format>', 'Output format: text, json, sarif', 'text')
  .option('--context <path>', 'Path to build context directory')
  .option('--package-manager <pm>', 'Package manager: npm, pnpm, yarn, apt, apk, pip, poetry, go, cargo')
  .action(async (dockerfilePath: string, options: any) => {
    try {
      const dockerfile = fs.readFileSync(dockerfilePath, 'utf-8');
      const dockerignore = tryReadFile(path.join(path.dirname(dockerfilePath), '.dockerignore'));

      const findings = await engine.lint(dockerfile, {
        dockerignore,
        packageManager: options.packageManager,
      });

      if (options.format === 'json') {
        console.log(JSON.stringify(findings, null, 2));
      } else if (options.format === 'sarif') {
        const result = await engine.analyze(dockerfile, { dockerignore });
        console.log(engine.generateReport(result, 'sarif'));
      } else {
        // Text output with colors
        console.log(chalk.bold('\n📋 Dockerfile Lint Results\n'));
        
        if (findings.length === 0) {
          console.log(chalk.green('✓ No issues found!\n'));
          return;
        }

        const grouped = groupBySeverity(findings);
        
        for (const severity of ['high', 'medium', 'low']) {
          const items = grouped[severity] || [];
          if (items.length === 0) continue;

          const color = severity === 'high' ? chalk.red : severity === 'medium' ? chalk.yellow : chalk.blue;
          console.log(color.bold(`\n${severity.toUpperCase()} (${items.length}):`));
          
          items.forEach((finding, i) => {
            console.log(color(`  ${i + 1}. ${finding.message}`));
            if (finding.suggestion) {
              console.log(chalk.gray(`     Fix: ${finding.suggestion}`));
            }
          });
        }
        
        console.log();
      }

      // Exit with error if critical issues found
      const hasCritical = findings.some(f => f.severity === 'high');
      process.exit(hasCritical ? 1 : 0);
    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

// Fix command
program
  .command('fix <dockerfile>')
  .description('Analyze and generate optimized Dockerfile')
  .option('-o, --output <path>', 'Output directory', 'out')
  .option('-f, --format <format>', 'Report format: text, markdown, json', 'markdown')
  .option('--context <path>', 'Path to build context directory')
  .option('--package-manager <pm>', 'Package manager type')
  .action(async (dockerfilePath: string, options: any) => {
    try {
      console.log(chalk.bold('\n🔧 Analyzing Dockerfile...\n'));

      const dockerfile = fs.readFileSync(dockerfilePath, 'utf-8');
      const dockerignore = tryReadFile(path.join(path.dirname(dockerfilePath), '.dockerignore'));

      const result = await engine.analyze(dockerfile, {
        dockerignore,
        packageManager: options.packageManager,
      });

      // Create output directory
      const outputDir = options.output;
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write optimized Dockerfile
      const optimizedPath = path.join(outputDir, 'Dockerfile.optimized');
      fs.writeFileSync(optimizedPath, result.optimized);
      console.log(chalk.green(`✓ Wrote ${optimizedPath}`));

      // Write report
      const report = engine.generateReport(result, options.format as ReportFormat);
      const reportExt = options.format === 'json' ? 'json' : options.format === 'markdown' ? 'md' : 'txt';
      const reportPath = path.join(outputDir, `report.${reportExt}`);
      fs.writeFileSync(reportPath, report);
      console.log(chalk.green(`✓ Wrote ${reportPath}`));

      // Write diff
      const diffPath = path.join(outputDir, 'Dockerfile.diff');
      fs.writeFileSync(diffPath, result.diff);
      console.log(chalk.green(`✓ Wrote ${diffPath}`));

      // Print summary
      console.log(chalk.bold('\n📊 Summary:\n'));
      console.log(`  Score: ${chalk.bold(result.score + '/100')}`);
      console.log(`  Findings: ${chalk.bold(result.findings.length.toString())}`);
      console.log(`  Size savings: ${chalk.bold(result.metrics.estimatedSizeSavings + ' MB')}`);
      console.log(`  Layer reduction: ${chalk.bold(result.metrics.layerReduction.toString())}`);
      console.log(`  Build time improvement: ${chalk.bold(result.metrics.buildTimeImprovement + '%')}`);
      console.log();

    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

// CI command
program
  .command('ci <dockerfile>')
  .description('Run in CI mode - fail on severity threshold')
  .option('--format <format>', 'Output format: sarif, json', 'sarif')
  .option('--out <file>', 'Output file path', 'results.sarif')
  .option('--fail-on <severity>', 'Fail on severity: high, medium, low', 'high')
  .option('--context <path>', 'Path to build context directory')
  .action(async (dockerfilePath: string, options: any) => {
    try {
      const dockerfile = fs.readFileSync(dockerfilePath, 'utf-8');
      const dockerignore = tryReadFile(path.join(path.dirname(dockerfilePath), '.dockerignore'));

      const result = await engine.analyze(dockerfile, { dockerignore });

      // Generate report
      const report = engine.generateReport(result, options.format as ReportFormat);
      fs.writeFileSync(options.out, report);

      console.log(`✓ Generated ${options.out}`);
      console.log(`  Score: ${result.score}/100`);
      console.log(`  Findings: ${result.findings.length}`);

      // Check if should fail CI
      const shouldFail = engine.shouldFailCI(result.findings, options.failOn);
      
      if (shouldFail) {
        console.error(chalk.red(`\n✗ CI check failed: Found ${options.failOn} severity issues`));
        process.exit(1);
      } else {
        console.log(chalk.green('\n✓ CI check passed'));
        process.exit(0);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

// Explain command
program
  .command('explain <dockerfile>')
  .description('Explain Dockerfile structure and suggestions')
  .option('--context <path>', 'Path to build context directory')
  .action(async (dockerfilePath: string, options: any) => {
    try {
      const dockerfile = fs.readFileSync(dockerfilePath, 'utf-8');
      const dockerignore = tryReadFile(path.join(path.dirname(dockerfilePath), '.dockerignore'));

      const result = await engine.analyze(dockerfile, { dockerignore });

      console.log(chalk.bold('\n📚 Dockerfile Analysis\n'));

      // Show structure
      console.log(chalk.bold('Structure:'));
      const lines = dockerfile.split('\n');
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          console.log(chalk.gray(`  ${i + 1}: ${line}`));
        }
      });

      // Show findings with explanations
      console.log(chalk.bold('\n\nFindings & Explanations:\n'));
      
      if (result.findings.length === 0) {
        console.log(chalk.green('✓ No issues found!\n'));
        return;
      }

      result.findings.forEach((finding, i) => {
        const color = finding.severity === 'high' ? chalk.red : 
                     finding.severity === 'medium' ? chalk.yellow : chalk.blue;
        
        console.log(color.bold(`\n${i + 1}. [${finding.severity.toUpperCase()}] ${finding.message}`));
        
        if (finding.description) {
          console.log(chalk.white(`   ${finding.description}`));
        }
        
        if (finding.suggestion) {
          console.log(chalk.green(`   💡 ${finding.suggestion}`));
        }
      });

      console.log();
    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

program.parse();

// Helper functions
function tryReadFile(filePath: string): string | undefined {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return undefined;
  }
}

function groupBySeverity(findings: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {
    high: [],
    medium: [],
    low: [],
  };

  findings.forEach(f => {
    if (grouped[f.severity]) {
      grouped[f.severity].push(f);
    }
  });

  return grouped;
}

