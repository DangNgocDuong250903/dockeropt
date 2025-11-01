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

  async generateInspectJSON(imageName) {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file');
    }

    const prompt = this.buildInspectJSONPrompt(imageName);

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
            temperature: 0.2,
            maxOutputTokens: 8000,
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
      
      return this.parseInspectJSONResponse(text);
    } catch (error) {
      console.error('Gemini AI inspect JSON generation failed:', error);
      throw error;
    }
  }

  buildInspectJSONPrompt(imageName) {
    const imageLower = imageName.toLowerCase();
    let imageType = 'generic';
    let exposedPorts = {};
    let envVars = ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'];
    let volumes = {};
    let cmd = [];
    let entrypoint = [];

    // Determine image type and set defaults
    if (imageLower.includes('mysql')) {
      imageType = 'mysql';
      exposedPorts = { "3306/tcp": {} };
      envVars.push("MYSQL_ROOT_PASSWORD=");
      envVars.push("MYSQL_DATABASE=");
      envVars.push("MYSQL_USER=");
      envVars.push("MYSQL_PASSWORD=");
      envVars.push("MYSQL_ALLOW_EMPTY_PASSWORD=");
      volumes = { "/var/lib/mysql": {} };
      cmd = ["mysqld"];
      entrypoint = ["docker-entrypoint.sh"];
    } else if (imageLower.includes('postgres')) {
      imageType = 'postgres';
      exposedPorts = { "5432/tcp": {} };
      envVars.push("POSTGRES_PASSWORD=");
      envVars.push("POSTGRES_DB=");
      envVars.push("POSTGRES_USER=");
      volumes = { "/var/lib/postgresql/data": {} };
      cmd = ["postgres"];
    } else if (imageLower.includes('redis')) {
      imageType = 'redis';
      exposedPorts = { "6379/tcp": {} };
      envVars.push("REDIS_PASSWORD=");
      cmd = ["redis-server"];
    } else if (imageLower.includes('nginx')) {
      imageType = 'nginx';
      exposedPorts = { "80/tcp": {} };
      volumes = { "/usr/share/nginx/html": {} };
      cmd = ["nginx", "-g", "daemon off;"];
    } else if (imageLower.includes('node')) {
      imageType = 'node';
      envVars.push("NODE_ENV=production");
      cmd = ["node"];
    } else if (imageLower.includes('python')) {
      imageType = 'python';
      envVars.push("PYTHONUNBUFFERED=1");
      cmd = ["python"];
    }

    // Generate realistic hash
    const hashChars = '0123456789abcdef';
    const generateHash = (prefix = 'sha256:') => {
      let hash = prefix;
      for (let i = 0; i < 64; i++) {
        hash += hashChars[Math.floor(Math.random() * hashChars.length)];
      }
      return hash;
    };

    // Generate layer digests
    const layers = [];
    const numLayers = Math.floor(Math.random() * 5) + 3; // 3-7 layers
    for (let i = 0; i < numLayers; i++) {
      layers.push(generateHash('sha256:'));
    }

    // Create base image name without tag
    const baseName = imageName.split(':')[0];
    const tag = imageName.includes(':') ? imageName.split(':')[1] : 'latest';
    const repoDigest = `${baseName}@${generateHash('sha256:')}`;

    // Build complete Docker inspect JSON structure
    const inspectJSON = [{
      "Id": generateHash('sha256:'),
      "RepoTags": [imageName],
      "RepoDigests": [repoDigest],
      "Parent": "",
      "Comment": "",
      "Created": new Date().toISOString(),
      "Container": generateHash('sha256:').substring(7, 19),
      "ContainerConfig": {
        "Hostname": "",
        "Domainname": "",
        "User": "",
        "AttachStdin": false,
        "AttachStdout": false,
        "AttachStderr": false,
        "Tty": false,
        "OpenStdin": false,
        "StdinOnce": false,
        "Env": envVars,
        "Cmd": cmd,
        "Image": imageName,
        "Volumes": volumes,
        "WorkingDir": "",
        "Entrypoint": entrypoint.length > 0 ? entrypoint : null,
        "OnBuild": null,
        "Labels": {}
      },
      "DockerVersion": "20.10.24",
      "Author": "",
      "Config": {
        "Hostname": "",
        "Domainname": "",
        "User": "",
        "AttachStdin": false,
        "AttachStdout": false,
        "AttachStderr": false,
        "Tty": false,
        "OpenStdin": false,
        "StdinOnce": false,
        "Env": envVars,
        "Cmd": cmd,
        "Image": imageName,
        "Volumes": volumes,
        "WorkingDir": "",
        "Entrypoint": entrypoint.length > 0 ? entrypoint : null,
        "OnBuild": null,
        "Labels": {},
        "ExposedPorts": exposedPorts
      },
      "Architecture": "amd64",
      "Os": "linux",
      "Size": Math.floor(Math.random() * 500000000) + 100000000, // 100MB - 600MB
      "VirtualSize": 0,
      "GraphDriver": {
        "Data": {
          "LowerDir": "",
          "MergedDir": "",
          "UpperDir": "",
          "WorkDir": ""
        },
        "Name": "overlay2"
      },
      "RootFS": {
        "Type": "layers",
        "Layers": layers
      },
      "Metadata": {
        "LastTagTime": "0001-01-01T00:00:00Z"
      }
    }];

    return `You are an expert Docker engineer. Generate a COMPLETE and REALISTIC Docker inspect JSON output for the image "${imageName}".

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON in the EXACT format that "docker inspect" outputs
2. The output MUST be an array with exactly one object
3. Include ALL standard fields that docker inspect returns:
   - Id (sha256 hash)
   - RepoTags (array with image name)
   - RepoDigests (array with digest)
   - Created (ISO 8601 timestamp)
   - Size (bytes, realistic for image type)
   - Config.ExposedPorts (object with port mappings)
   - Config.Env (array of environment variables)
   - Config.Volumes (object with volume paths)
   - Config.Cmd (array)
   - Config.Entrypoint (array or null)
   - RootFS.Layers (array of sha256 digests)
   - ContainerConfig (full structure)
   - Architecture, Os, GraphDriver, etc.

Image type: ${imageType}
Default ports: ${JSON.stringify(exposedPorts)}
Default env vars: ${JSON.stringify(envVars.slice(0, 3))}
Default volumes: ${JSON.stringify(volumes)}
Default cmd: ${JSON.stringify(cmd)}

Return ONLY the JSON array with COMPLETE structure matching real docker inspect output. No explanations, no markdown, no code blocks.

Example structure (use this as reference but generate complete JSON):
${JSON.stringify(inspectJSON, null, 2)}

Now generate the FULL inspect JSON for: ${imageName}`;
  }

  parseInspectJSONResponse(text) {
    // Remove markdown code blocks if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/g, '');
    }

    // Try to find JSON array in the text
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(cleaned);
      // Ensure it's an array
      let result = Array.isArray(parsed) ? parsed : [parsed];
      
      // Validate structure matches docker inspect format
      if (result.length === 0) {
        throw new Error('Empty array returned from AI');
      }
      
      const firstImage = result[0];
      if (!firstImage || typeof firstImage !== 'object') {
        throw new Error('Invalid image object structure');
      }
      
      // Ensure required fields exist
      if (!firstImage.Id) {
        firstImage.Id = 'sha256:' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      }
      if (!firstImage.RepoTags || !Array.isArray(firstImage.RepoTags)) {
        firstImage.RepoTags = [];
      }
      if (!firstImage.Config || typeof firstImage.Config !== 'object') {
        firstImage.Config = {};
      }
      if (!firstImage.Config.Env || !Array.isArray(firstImage.Config.Env)) {
        firstImage.Config.Env = firstImage.Config.Env || [];
      }
      if (!firstImage.Config.ExposedPorts || typeof firstImage.Config.ExposedPorts !== 'object') {
        firstImage.Config.ExposedPorts = firstImage.Config.ExposedPorts || {};
      }
      if (!firstImage.Config.Volumes || typeof firstImage.Config.Volumes !== 'object') {
        firstImage.Config.Volumes = firstImage.Config.Volumes || {};
      }
      if (!firstImage.RootFS || typeof firstImage.RootFS !== 'object') {
        firstImage.RootFS = {
          Type: 'layers',
          Layers: []
        };
      }
      if (!Array.isArray(firstImage.RootFS.Layers)) {
        firstImage.RootFS.Layers = [];
      }
      
      // Ensure ContainerConfig exists (matches Config structure)
      if (!firstImage.ContainerConfig) {
        firstImage.ContainerConfig = JSON.parse(JSON.stringify(firstImage.Config));
      }
      
      return result;
    } catch (error) {
      console.error('Failed to parse Gemini inspect JSON response:', text);
      console.error('Cleaned text:', cleaned);
      console.error('Parse error:', error);
      throw new Error(`Invalid JSON format from Gemini AI: ${error.message}`);
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

