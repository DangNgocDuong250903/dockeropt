// Language-specific examples
const EXAMPLES = {
  node: {
    bad: `FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN apt-get update
RUN apt-get install -y curl wget
EXPOSE 3000
CMD ["npm", "start"]`,
    good: `FROM node:18-alpine@sha256:a6385524b09b9de27e332b22e90fb7a70e3adf1a41a54edd0c8e6e597f4e9aaf AS builder
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
CMD ["node", "dist/index.js"]`
  },
  go: {
    bad: `FROM golang:latest
WORKDIR /app
COPY . .
RUN go build -o app
CMD ["./app"]`,
    good: `FROM golang:1.21-alpine@sha256:... AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o app

FROM alpine:latest@sha256:...
RUN addgroup -g 1000 appuser && adduser -D -u 1000 -G appuser appuser
WORKDIR /app
COPY --from=builder /app/app .
USER appuser
CMD ["./app"]`
  },
  python: {
    bad: `FROM python:3.11
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["python", "app.py"]`,
    good: `FROM python:3.11-slim@sha256:... AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user -r requirements.txt

FROM python:3.11-slim@sha256:...
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
USER 1000
CMD ["python", "app.py"]`
  },
  java: {
    bad: `FROM openjdk:17
WORKDIR /app
COPY . .
RUN ./gradlew build
CMD ["java", "-jar", "app.jar"]`,
    good: `FROM gradle:7-jdk17-alpine@sha256:... AS builder
WORKDIR /app
COPY build.gradle settings.gradle ./
COPY gradle ./gradle
RUN gradle build --no-daemon

FROM openjdk:17-jre-slim@sha256:...
WORKDIR /app
COPY --from=builder /app/build/libs/app.jar .
USER 1000
CMD ["java", "-jar", "app.jar"]`
  }
};

export function renderExamples({ onLoadBad, onLoadGood, onLoadExample, onFetchURL }) {
  return `
    <div class="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-6 border border-primary-100">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-2xl">💡</span>
        <div>
          <h3 class="font-semibold text-gray-900">Try Examples</h3>
          <p class="text-sm text-gray-600">Load a sample Dockerfile or fetch from GitHub URL</p>
        </div>
      </div>
      
      <!-- Language Tabs -->
      <div class="mb-4">
        <div class="flex flex-wrap gap-2 border-b border-primary-200 pb-2">
          ${['Node', 'Go', 'Python', 'Java'].map((lang, idx) => `
            <button
              data-lang-tab="${lang.toLowerCase()}"
              class="px-4 py-2 text-sm font-medium rounded-t-lg transition ${
                idx === 0 
                  ? 'bg-white text-primary-600 border-b-2 border-primary-600' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }"
            >
              ${lang}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Examples for selected language (will be updated by JS) -->
      <div id="examples-container" class="grid md:grid-cols-2 gap-4 mb-4">
        <button
          data-load-example="bad"
          data-lang="node"
          class="text-left p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-primary-400 transition group"
        >
          <div class="flex items-start gap-3">
            <div class="text-2xl">⚠️</div>
            <div>
              <div class="font-medium text-gray-900 group-hover:text-primary-700 mb-1">
                Bad Example
              </div>
              <div class="text-sm text-gray-600">
                Unoptimized Dockerfile with common issues
              </div>
            </div>
          </div>
        </button>

        <button
          data-load-example="good"
          data-lang="node"
          class="text-left p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-green-400 transition group"
        >
          <div class="flex items-start gap-3">
            <div class="text-2xl">✅</div>
            <div>
              <div class="font-medium text-gray-900 group-hover:text-green-700 mb-1">
                Good Example
              </div>
              <div class="text-sm text-gray-600">
                Optimized Dockerfile following best practices
              </div>
            </div>
          </div>
        </button>
      </div>

      <!-- URL Fetch -->
      <div class="mt-4 p-4 bg-white rounded-lg border border-gray-200">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-lg">🔗</span>
          <span class="text-sm font-medium text-gray-700">Or fetch from GitHub:</span>
        </div>
        <div class="flex gap-2">
          <input
            type="text"
            id="github-url-input"
            placeholder="https://github.com/user/repo/blob/main/Dockerfile"
            class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            id="fetch-url-btn"
            class="btn-secondary text-sm px-4 py-2"
          >
            Fetch
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          Supports raw GitHub URLs or direct Dockerfile links
        </p>
      </div>
    </div>
  `;
}

export { EXAMPLES };

