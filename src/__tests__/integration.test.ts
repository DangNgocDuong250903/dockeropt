import { DockerfileOptimizerEngine } from '../index';

describe('Integration Tests', () => {
  const engine = new DockerfileOptimizerEngine();

  describe('End-to-end optimization', () => {
    it('should analyze and optimize a bad Dockerfile', async () => {
      const badDockerfile = `
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN apt-get update
RUN apt-get install -y curl
EXPOSE 3000
CMD ["npm", "start"]
      `.trim();

      const result = await engine.analyze(badDockerfile);

      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(100);
      expect(result.optimized).toBeTruthy();
      expect(result.diff).toBeTruthy();
      expect(result.metrics.estimatedSizeSavings).toBeGreaterThanOrEqual(0);
    });

    it('should give high score to well-optimized Dockerfile', async () => {
      const goodDockerfile = `
FROM node:18-alpine@sha256:a6385524b09b9de27e332b22e90fb7a70e3adf1a41a54edd0c8e6e597f4e9aaf AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
RUN npm run build

FROM node:18-alpine@sha256:a6385524b09b9de27e332b22e90fb7a70e3adf1a41a54edd0c8e6e597f4e9aaf
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
CMD ["node", "dist/index.js"]
      `.trim();

      const result = await engine.analyze(goodDockerfile);

      expect(result.score).toBeGreaterThan(70);
    });
  });

  describe('Lint-only mode', () => {
    it('should return only findings without optimization', async () => {
      const dockerfile = `
FROM node:latest
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
      `.trim();

      const findings = await engine.lint(dockerfile);

      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some(f => f.rule === 'latest-tag')).toBe(true);
    });
  });

  describe('CI mode', () => {
    it('should fail on high severity findings', async () => {
      const dockerfile = `
FROM node:latest
ENV API_KEY="secret123"
WORKDIR /app
CMD ["npm", "start"]
      `.trim();

      const findings = await engine.lint(dockerfile);
      const shouldFail = engine.shouldFailCI(findings, 'high');

      expect(shouldFail).toBe(true);
    });

    it('should pass when no critical findings', async () => {
      const dockerfile = `
FROM node:18-alpine@sha256:a6385524b09b9de27e332b22e90fb7a70e3adf1a41a54edd0c8e6e597f4e9aaf
WORKDIR /app
USER node
CMD ["npm", "start"]
      `.trim();

      const findings = await engine.lint(dockerfile);
      const shouldFail = engine.shouldFailCI(findings, 'high');

      expect(shouldFail).toBe(false);
    });
  });

  describe('Report generation', () => {
    it('should generate text report', async () => {
      const dockerfile = 'FROM node:18\nWORKDIR /app';
      const result = await engine.analyze(dockerfile);
      const report = engine.generateReport(result, 'text');

      expect(report).toContain('DOCKERFILE OPTIMIZER REPORT');
      expect(report).toContain('Score:');
    });

    it('should generate markdown report', async () => {
      const dockerfile = 'FROM node:18\nWORKDIR /app';
      const result = await engine.analyze(dockerfile);
      const report = engine.generateReport(result, 'markdown');

      expect(report).toContain('# Dockerfile Optimizer Report');
      expect(report).toContain('**Score:**');
    });

    it('should generate JSON report', async () => {
      const dockerfile = 'FROM node:18\nWORKDIR /app';
      const result = await engine.analyze(dockerfile);
      const report = engine.generateReport(result, 'json');

      const parsed = JSON.parse(report);
      expect(parsed).toHaveProperty('score');
      expect(parsed).toHaveProperty('findings');
      expect(parsed).toHaveProperty('metrics');
    });

    it('should generate SARIF report', async () => {
      const dockerfile = 'FROM node:18\nWORKDIR /app';
      const result = await engine.analyze(dockerfile);
      const report = engine.generateReport(result, 'sarif');

      const parsed = JSON.parse(report);
      expect(parsed).toHaveProperty('version', '2.1.0');
      expect(parsed).toHaveProperty('runs');
      expect(parsed.runs[0]).toHaveProperty('tool');
    });
  });
});

