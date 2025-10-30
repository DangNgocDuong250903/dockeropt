import { parseDockerfile } from '../parser';
import {
  pinBaseImageRule,
  multiStageRule,
  consolidateRunRule,
  cacheOrderRule,
  nonrootUserRule,
  preferCopyRule,
  cleanCacheRule,
  latestTagRule,
  secretsRule,
} from '../rules';
import { Context } from '../types';

const mockContext: Context = {
  dockerfile: '',
  buildArgs: {},
};

describe('Rules Engine', () => {
  describe('pinBaseImageRule', () => {
    it('should flag unpinned base image', () => {
      const dockerfile = 'FROM node:18';
      const ast = parseDockerfile(dockerfile);
      const findings = pinBaseImageRule.check(ast, mockContext);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('high');
      expect(findings[0].rule).toBe('pin-base-image');
    });

    it('should pass for pinned base image', () => {
      const dockerfile = 'FROM node:18@sha256:abc123';
      const ast = parseDockerfile(dockerfile);
      const findings = pinBaseImageRule.check(ast, mockContext);

      expect(findings).toHaveLength(0);
    });
  });

  describe('multiStageRule', () => {
    it('should flag single-stage build with build tools', () => {
      const dockerfile = `
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["npm", "start"]
      `.trim();
      const ast = parseDockerfile(dockerfile);
      const findings = multiStageRule.check(ast, mockContext);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('high');
    });

    it('should pass for multi-stage build', () => {
      const dockerfile = `
FROM node:18 AS builder
WORKDIR /app
RUN npm run build

FROM node:18-alpine
COPY --from=builder /app/dist /app
CMD ["node", "index.js"]
      `.trim();
      const ast = parseDockerfile(dockerfile);
      const findings = multiStageRule.check(ast, mockContext);

      expect(findings).toHaveLength(0);
    });
  });

  describe('consolidateRunRule', () => {
    it('should flag consecutive package manager commands', () => {
      const dockerfile = `
FROM ubuntu:20.04
RUN apt-get update
RUN apt-get install -y curl
      `.trim();
      const ast = parseDockerfile(dockerfile);
      const findings = consolidateRunRule.check(ast, mockContext);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('medium');
    });

    it('should pass for consolidated commands', () => {
      const dockerfile = `
FROM ubuntu:20.04
RUN apt-get update && apt-get install -y curl
      `.trim();
      const ast = parseDockerfile(dockerfile);
      const findings = consolidateRunRule.check(ast, mockContext);

      expect(findings).toHaveLength(0);
    });
  });

  describe('cacheOrderRule', () => {
    it('should flag COPY . before npm install', () => {
      const dockerfile = `
FROM node:18
WORKDIR /app
COPY . .
RUN npm ci
      `.trim();
      const ast = parseDockerfile(dockerfile);
      const findings = cacheOrderRule.check(ast, mockContext);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('medium');
    });

    it('should pass for proper cache ordering', () => {
      const dockerfile = `
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
      `.trim();
      const ast = parseDockerfile(dockerfile);
      const findings = cacheOrderRule.check(ast, mockContext);

      expect(findings).toHaveLength(0);
    });
  });

  describe('nonrootUserRule', () => {
    it('should flag missing USER directive', () => {
      const dockerfile = `
FROM node:18
WORKDIR /app
CMD ["npm", "start"]
      `.trim();
      const ast = parseDockerfile(dockerfile);
      const findings = nonrootUserRule.check(ast, mockContext);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('medium');
    });

    it('should pass with non-root user', () => {
      const dockerfile = `
FROM node:18
WORKDIR /app
USER node
CMD ["npm", "start"]
      `.trim();
      const ast = parseDockerfile(dockerfile);
      const findings = nonrootUserRule.check(ast, mockContext);

      expect(findings).toHaveLength(0);
    });
  });

  describe('preferCopyRule', () => {
    it('should flag ADD for regular files', () => {
      const dockerfile = 'ADD app.js /app/';
      const ast = parseDockerfile(dockerfile);
      const findings = preferCopyRule.check(ast, mockContext);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('low');
    });

    it('should pass ADD for tar files', () => {
      const dockerfile = 'ADD archive.tar.gz /app/';
      const ast = parseDockerfile(dockerfile);
      const findings = preferCopyRule.check(ast, mockContext);

      expect(findings).toHaveLength(0);
    });

    it('should pass ADD for URLs', () => {
      const dockerfile = 'ADD https://example.com/file.tar.gz /app/';
      const ast = parseDockerfile(dockerfile);
      const findings = preferCopyRule.check(ast, mockContext);

      expect(findings).toHaveLength(0);
    });
  });

  describe('cleanCacheRule', () => {
    it('should flag apt-get without cache cleanup', () => {
      const dockerfile = 'RUN apt-get update && apt-get install -y curl';
      const ast = parseDockerfile(dockerfile);
      const findings = cleanCacheRule.check(ast, mockContext);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('medium');
    });

    it('should pass apt-get with cache cleanup', () => {
      const dockerfile = 'RUN apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*';
      const ast = parseDockerfile(dockerfile);
      const findings = cleanCacheRule.check(ast, mockContext);

      expect(findings).toHaveLength(0);
    });

    it('should flag apk without --no-cache', () => {
      const dockerfile = 'RUN apk add curl';
      const ast = parseDockerfile(dockerfile);
      const findings = cleanCacheRule.check(ast, mockContext);

      expect(findings).toHaveLength(1);
    });

    it('should pass apk with --no-cache', () => {
      const dockerfile = 'RUN apk add --no-cache curl';
      const ast = parseDockerfile(dockerfile);
      const findings = cleanCacheRule.check(ast, mockContext);

      expect(findings).toHaveLength(0);
    });
  });

  describe('latestTagRule', () => {
    it('should flag :latest tag', () => {
      const dockerfile = 'FROM node:latest';
      const ast = parseDockerfile(dockerfile);
      const findings = latestTagRule.check(ast, mockContext);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('high');
    });

    it('should flag missing tag (implicit latest)', () => {
      const dockerfile = 'FROM node';
      const ast = parseDockerfile(dockerfile);
      const findings = latestTagRule.check(ast, mockContext);

      expect(findings).toHaveLength(1);
    });

    it('should pass with specific tag', () => {
      const dockerfile = 'FROM node:18-alpine';
      const ast = parseDockerfile(dockerfile);
      const findings = latestTagRule.check(ast, mockContext);

      expect(findings).toHaveLength(0);
    });
  });

  describe('secretsRule', () => {
    it('should flag potential secrets in ENV', () => {
      const dockerfile = 'ENV API_KEY="secret123"';
      const ast = parseDockerfile(dockerfile);
      const findings = secretsRule.check(ast, mockContext);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('high');
    });

    it('should flag PASSWORD in ARG', () => {
      const dockerfile = 'ARG PASSWORD="mypass"';
      const ast = parseDockerfile(dockerfile);
      const findings = secretsRule.check(ast, mockContext);

      expect(findings).toHaveLength(1);
    });

    it('should pass for non-secret ENV', () => {
      const dockerfile = 'ENV NODE_ENV=production';
      const ast = parseDockerfile(dockerfile);
      const findings = secretsRule.check(ast, mockContext);

      expect(findings).toHaveLength(0);
    });
  });
});

