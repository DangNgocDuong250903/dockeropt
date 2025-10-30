import { parseDockerfile } from '../parser';
import { Estimators } from '../estimators';

describe('Estimators', () => {
  const estimators = new Estimators();

  describe('estimateImageSize', () => {
    it('should estimate alpine image as small', () => {
      const dockerfile = 'FROM alpine:3.18';
      const ast = parseDockerfile(dockerfile);
      const size = estimators.estimateSingleImage(ast);

      expect(size).toBeLessThan(50);
    });

    it('should estimate node:18 as large', () => {
      const dockerfile = 'FROM node:18';
      const ast = parseDockerfile(dockerfile);
      const size = estimators.estimateSingleImage(ast);

      expect(size).toBeGreaterThan(100);
    });

    it('should estimate node:18-alpine as smaller than node:18', () => {
      const dockerfileRegular = 'FROM node:18';
      const dockerfileAlpine = 'FROM node:18-alpine';
      
      const astRegular = parseDockerfile(dockerfileRegular);
      const astAlpine = parseDockerfile(dockerfileAlpine);
      
      const sizeRegular = estimators.estimateSingleImage(astRegular);
      const sizeAlpine = estimators.estimateSingleImage(astAlpine);

      expect(sizeAlpine).toBeLessThan(sizeRegular);
    });
  });

  describe('estimateMetrics', () => {
    it('should show size savings for multi-stage optimization', () => {
      const originalDockerfile = `
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["npm", "start"]
      `.trim();

      const optimizedDockerfile = `
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist /app
USER node
CMD ["node", "/app/index.js"]
      `.trim();

      const originalAST = parseDockerfile(originalDockerfile);
      const optimizedAST = parseDockerfile(optimizedDockerfile);

      const metrics = estimators.estimateMetrics(originalAST, optimizedAST);

      expect(metrics.estimatedSizeSavings).toBeGreaterThan(0);
      expect(metrics.securityScore).toBeGreaterThan(0);
      expect(metrics.cacheEfficiency).toBeGreaterThan(0);
    });

    it('should calculate security score improvements', () => {
      const insecureDockerfile = `
FROM node:latest
WORKDIR /app
COPY . .
CMD ["npm", "start"]
      `.trim();

      const secureDockerfile = `
FROM node:18-alpine@sha256:abc123
WORKDIR /app
COPY . .
USER node
CMD ["npm", "start"]
      `.trim();

      const insecureAST = parseDockerfile(insecureDockerfile);
      const secureAST = parseDockerfile(secureDockerfile);

      const metrics = estimators.estimateMetrics(insecureAST, secureAST);

      expect(metrics.securityScore).toBeGreaterThan(50);
    });

    it('should estimate cache efficiency improvements', () => {
      const badCacheDockerfile = `
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
      `.trim();

      const goodCacheDockerfile = `
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
      `.trim();

      const badAST = parseDockerfile(badCacheDockerfile);
      const goodAST = parseDockerfile(goodCacheDockerfile);

      const metrics = estimators.estimateMetrics(badAST, goodAST);

      expect(metrics.cacheEfficiency).toBeGreaterThan(80);
    });
  });
});

