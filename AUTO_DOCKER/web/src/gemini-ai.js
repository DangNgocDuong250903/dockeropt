/**
 * Gemini AI Integration for Dockerfile Analysis
 */

// Get API key from environment variable
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export class GeminiAnalyzer {
  constructor(apiKey = GEMINI_API_KEY) {
    this.apiKey = apiKey || GEMINI_API_KEY;
    
    // Warn if API key is not set
    if (!this.apiKey) {
      console.warn('⚠️ GEMINI_API_KEY is not set. AI features will not work.');
      console.warn('Please set VITE_GEMINI_API_KEY in your .env file');
    }
  }

  async analyzeDockerfile(dockerfile) {
    const prompt = this.buildAnalysisPrompt(dockerfile);
    
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4000,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE"
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error response:', errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      
      return this.parseGeminiResponse(text);
    } catch (error) {
      console.error('Gemini AI analysis failed:', error);
      throw error;
    }
  }

  buildAnalysisPrompt(dockerfile) {
    return `You are an expert Docker and DevOps engineer. Analyze this Dockerfile and provide detailed optimization recommendations.

DOCKERFILE:
\`\`\`dockerfile
${dockerfile}
\`\`\`

Please analyze and return a JSON response with the following structure:
{
  "findings": [
    {
      "severity": "high|medium|low",
      "category": "security|performance|size|cache|best-practice",
      "title": "Short title",
      "message": "Detailed issue description",
      "lineNumber": 5,
      "currentCode": "FROM node:18",
      "suggestedCode": "FROM node:18-alpine@sha256:...",
      "explanation": "Detailed explanation why this is important",
      "impact": {
        "security": "high|medium|low|none",
        "performance": "high|medium|low|none",
        "size": "Estimated MB reduction"
      }
    }
  ],
  "metrics": {
    "estimatedSizeSavingsMB": 150,
    "securityIssuesCount": 3,
    "performanceIssuesCount": 2,
    "overallScore": 65
  },
  "optimizedDockerfile": "Complete optimized Dockerfile here",
  "commitMessage": "Generated commit message for the fixes",
  "summary": "Overall summary of the analysis"
}

Focus on:
1. Base image optimization (use Alpine, slim, or distroless variants)
2. Multi-stage builds for compiled languages
3. Layer caching optimization (COPY package files before source)
4. Security (non-root user, no secrets, pinned versions)
5. Size optimization (clean package manager cache, remove build tools)
6. Specific language best practices (Node.js, Python, Go, Java, Rust)

Return ONLY valid JSON, no markdown formatting.`;
  }

  parseGeminiResponse(text) {
    // Remove markdown code blocks if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/g, '');
    }

    // Try to find JSON in the text if it's wrapped in other content
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    try {
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Failed to parse Gemini response:', text);
      console.error('Cleaned text:', cleaned);
      throw new Error('Invalid JSON response from Gemini AI');
    }
  }

  async explainFinding(finding, dockerfile) {
    const prompt = `As a Docker expert, explain in detail why this optimization is important:

FINDING: ${finding.message}
CONTEXT: 
\`\`\`dockerfile
${dockerfile}
\`\`\`

Provide a clear, educational explanation covering:
1. Why this is a problem
2. What impact it has (security, performance, size)
3. How to fix it properly
4. Best practices to follow

Keep it concise but informative (3-4 paragraphs).`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 800,
          }
        })
      });

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Failed to get AI explanation:', error);
      return 'AI explanation unavailable.';
    }
  }

  async generateCommitMessage(findings) {
    const prompt = `Generate a concise Git commit message for Dockerfile optimizations that fix these issues:

${findings.map((f, i) => `${i + 1}. ${f.message}`).join('\n')}

Follow conventional commits format:
- Start with "chore(docker):", "fix(docker):", or "refactor(docker):"
- One line summary (max 72 chars)
- Blank line
- Bullet points of key changes

Example:
chore(docker): optimize Node.js Dockerfile

- Use multi-stage build to reduce image size
- Pin base image with SHA256 digest
- Add non-root user for security
- Optimize layer caching order`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 200,
          }
        })
      });

      const data = await response.json();
      return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      console.error('Failed to generate commit message:', error);
      return 'chore(docker): optimize Dockerfile';
    }
  }

  async detectLanguage(dockerfile) {
    const patterns = {
      node: /FROM node|npm install|yarn|pnpm|package\.json/i,
      python: /FROM python|pip install|requirements\.txt|poetry/i,
      go: /FROM golang|go build|go\.mod/i,
      java: /FROM (java|openjdk)|maven|gradle|\.jar/i,
      rust: /FROM rust|cargo build|Cargo\.toml/i,
      php: /FROM php|composer/i,
      ruby: /FROM ruby|bundle install|Gemfile/i,
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(dockerfile)) {
        return lang;
      }
    }

    return 'unknown';
  }

  async getLanguageSpecificTips(language, dockerfile) {
    const tips = {
      node: `
Node.js Best Practices:
- Use \`npm ci\` instead of \`npm install\` for reproducible builds
- Copy package*.json before source for better caching
- Use \`--omit=dev\` to exclude dev dependencies in production
- Clean npm cache: \`npm cache clean --force\`
- Consider using multi-stage build with distroless/node-slim runtime
      `,
      python: `
Python Best Practices:
- Use specific Python version (not latest)
- Pin dependencies in requirements.txt
- Use \`pip install --no-cache-dir\` to reduce size
- Consider using slim or alpine variants
- Multi-stage build: install in builder, copy only site-packages
      `,
      go: `
Go Best Practices:
- Use multi-stage build: compile with golang image, run in alpine/scratch
- Use \`CGO_ENABLED=0\` for static binary
- Use \`-ldflags="-s -w"\` to strip debug info
- Leverage Go module caching
- Final image can be FROM scratch for minimal size
      `,
      java: `
Java Best Practices:
- Use multi-stage build: build with Maven/Gradle, run in JRE
- Use \`eclipse-temurin\` or \`amazoncorretto\` base images
- Copy only .jar file to runtime stage
- Consider using JLink for custom JRE
- Use \`-XX:+UseContainerSupport\` for better memory handling
      `,
      rust: `
Rust Best Practices:
- Use multi-stage build: compile in rust image, run in minimal image
- Use \`--release\` flag for optimized binary
- Strip binary: \`strip target/release/app\`
- Final image can be FROM scratch or alpine
- Cache Cargo dependencies separately from source
      `,
    };

    return tips[language] || 'No specific tips available for this language.';
  }
}

export default GeminiAnalyzer;

