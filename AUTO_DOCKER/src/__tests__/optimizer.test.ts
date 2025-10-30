import { parseDockerfile } from '../parser';
import { DockerfileOptimizer } from '../optimizer';
import { Finding } from '../types';

describe('DockerfileOptimizer', () => {
  const optimizer = new DockerfileOptimizer();

  describe('fixPreferCopy', () => {
    it('should replace ADD with COPY for regular files', () => {
      const dockerfile = `
FROM node:18
ADD app.js /app/
CMD ["node", "app.js"]
      `.trim();
      const ast = parseDockerfile(dockerfile);
      const findings: Finding[] = [
        {
          id: '1',
          rule: 'prefer-copy',
          severity: 'low',
          message: 'Use COPY instead of ADD',
          fixable: true,
        },
      ];

      const optimized = optimizer.optimize(ast, findings);

      expect(optimized).toContain('COPY app.js /app/');
      expect(optimized).not.toContain('ADD app.js /app/');
    });
  });

  describe('fixNonrootUser', () => {
    it('should add USER directive', () => {
      const dockerfile = `
FROM node:18
WORKDIR /app
COPY . .
CMD ["npm", "start"]
      `.trim();
      const ast = parseDockerfile(dockerfile);
      const findings: Finding[] = [
        {
          id: '1',
          rule: 'nonroot-user',
          severity: 'medium',
          message: 'Container runs as root',
          fixable: true,
        },
      ];

      const optimized = optimizer.optimize(ast, findings);

      expect(optimized).toContain('USER 10001');
    });
  });

  describe('fixCleanCache', () => {
    it('should add apt-get clean to apt-get install', () => {
      const dockerfile = `
FROM ubuntu:20.04
RUN apt-get update && apt-get install -y curl
      `.trim();
      const ast = parseDockerfile(dockerfile);
      const findings: Finding[] = [
        {
          id: '1',
          rule: 'clean-cache',
          severity: 'medium',
          message: 'apt-get without cleaning cache',
          fixable: true,
        },
      ];

      const optimized = optimizer.optimize(ast, findings);

      expect(optimized).toContain('apt-get clean');
      expect(optimized).toContain('rm -rf /var/lib/apt/lists/*');
    });

    it('should add --no-cache to apk add', () => {
      const dockerfile = `
FROM alpine:3.18
RUN apk add curl
      `.trim();
      const ast = parseDockerfile(dockerfile);
      const findings: Finding[] = [
        {
          id: '1',
          rule: 'clean-cache',
          severity: 'medium',
          message: 'apk without --no-cache',
          fixable: true,
        },
      ];

      const optimized = optimizer.optimize(ast, findings);

      expect(optimized).toContain('apk add --no-cache');
    });
  });

  describe('fixConsolidateRun', () => {
    it('should merge consecutive RUN commands', () => {
      const dockerfile = `
FROM ubuntu:20.04
RUN apt-get update
RUN apt-get install -y curl
      `.trim();
      const ast = parseDockerfile(dockerfile);
      const findings: Finding[] = [
        {
          id: '1',
          rule: 'consolidate-run',
          severity: 'medium',
          message: 'Consecutive RUN commands',
          fixable: true,
        },
      ];

      const optimized = optimizer.optimize(ast, findings);

      // Should have only one RUN with both commands
      const runCount = (optimized.match(/^RUN /gm) || []).length;
      expect(runCount).toBe(1);
      expect(optimized).toContain('apt-get update');
      expect(optimized).toContain('apt-get install');
    });
  });

  describe('fixCacheOrder', () => {
    it('should reorder COPY to optimize cache', () => {
      const dockerfile = `
FROM node:18
WORKDIR /app
COPY . .
RUN npm ci
      `.trim();
      const ast = parseDockerfile(dockerfile);
      const findings: Finding[] = [
        {
          id: '1',
          rule: 'cache-order',
          severity: 'medium',
          message: 'COPY . before npm ci',
          fixable: true,
        },
      ];

      const optimized = optimizer.optimize(ast, findings);

      expect(optimized).toContain('package*.json');
      const packageCopyIndex = optimized.indexOf('package*.json');
      const npmCiIndex = optimized.indexOf('npm ci');
      const copyAllIndex = optimized.indexOf('COPY . .');

      expect(packageCopyIndex).toBeLessThan(npmCiIndex);
      expect(npmCiIndex).toBeLessThan(copyAllIndex);
    });
  });

  describe('fixMultiStage', () => {
    it('should convert single-stage to multi-stage build', () => {
      const dockerfile = `
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["npm", "start"]
      `.trim();
      const ast = parseDockerfile(dockerfile);
      const findings: Finding[] = [
        {
          id: '1',
          rule: 'multi-stage-build',
          severity: 'high',
          message: 'Missing multi-stage build',
          fixable: true,
        },
      ];

      const optimized = optimizer.optimize(ast, findings);

      // Should have two FROM statements
      const fromCount = (optimized.match(/^FROM /gm) || []).length;
      expect(fromCount).toBeGreaterThanOrEqual(2);
      expect(optimized).toContain('AS builder');
      expect(optimized).toContain('COPY --from=builder');
    });
  });
});

