import { parseDockerfile } from '../parser';

describe('DockerfileParser', () => {
  test('parses simple Dockerfile', () => {
    const dockerfile = `
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
    `.trim();

    const ast = parseDockerfile(dockerfile);

    expect(ast.stages).toHaveLength(1);
    expect(ast.stages[0].from).toBe('node:18');
    expect(ast.instructions).toHaveLength(5);
  });

  test('parses multi-stage Dockerfile', () => {
    const dockerfile = `
FROM node:18 AS builder
WORKDIR /app
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
COPY --from=builder /app/dist /app
CMD ["node", "/app/index.js"]
    `.trim();

    const ast = parseDockerfile(dockerfile);

    expect(ast.stages).toHaveLength(2);
    expect(ast.stages[0].name).toBe('builder');
    expect(ast.stages[1].name).toBe('runtime');
  });

  test('parses base image with digest', () => {
    const dockerfile = `FROM node:18@sha256:abc123`;
    const ast = parseDockerfile(dockerfile);

    expect(ast.stages[0].from).toBe('node:18');
    expect(ast.stages[0].fromDigest).toBe('sha256:abc123');
  });

  test('parses RUN with line continuation', () => {
    const dockerfile = `
RUN apt-get update && \\
    apt-get install -y curl && \\
    rm -rf /var/lib/apt/lists/*
    `.trim();

    const ast = parseDockerfile(dockerfile);
    expect(ast.instructions[0].type).toBe('RUN');
  });

  test('parses comments', () => {
    const dockerfile = `
# This is a comment
FROM node:18
# Another comment
WORKDIR /app
    `.trim();

    const ast = parseDockerfile(dockerfile);
    const comments = ast.instructions.filter(i => i.type === 'COMMENT');
    expect(comments).toHaveLength(2);
  });
});

