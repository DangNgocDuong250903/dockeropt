# Example of an optimized Dockerfile following best practices
FROM node:18-alpine@sha256:a6385524b09b9de27e332b22e90fb7a70e3adf1a41a54edd0c8e6e597f4e9aaf AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with clean cache
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy source code after dependencies
COPY . .

# Build application
RUN npm run build

# Runtime stage - smaller image
FROM node:18-alpine@sha256:a6385524b09b9de27e332b22e90fb7a70e3adf1a41a54edd0c8e6e597f4e9aaf

WORKDIR /app

# Copy only built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000

# Run as non-root user
USER node

CMD ["node", "dist/index.js"]

