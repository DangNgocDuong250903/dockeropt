/**
 * Browser-compatible Secret Detector
 */

export class SecretDetector {
  detectSecrets(layers) {
    const findings = [];
    
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const instruction = this.extractInstruction(layer.createdBy);
      
      if (instruction.includes('COPY') || instruction.includes('ADD')) {
        const fileFindings = this.checkSensitiveFiles(instruction, layer, i);
        findings.push(...fileFindings);
      }
      
      if (instruction.includes('RUN')) {
        const secretFindings = this.checkSecretPatterns(instruction, layer, i);
        findings.push(...secretFindings);
      }
    }
    
    return findings;
  }

  checkSensitiveFiles(instruction, layer, index) {
    const findings = [];
    
    const sensitivePatterns = [
      {
        pattern: /\.(env|env\.local|env\.production)/i,
        type: 'file',
        severity: 'high',
        name: '.env file',
        description: 'Environment files may contain secrets',
      },
      {
        pattern: /id_rsa|id_ed25519|id_dsa|\.pem|\.key|\.p12|\.pfx/i,
        type: 'file',
        severity: 'high',
        name: 'Private key file',
        description: 'Private keys should never be in images',
      },
      {
        pattern: /credentials\.json|service-account\.json|\.credentials/i,
        type: 'file',
        severity: 'high',
        name: 'Credentials file',
        description: 'Credentials files contain sensitive authentication data',
      },
      {
        pattern: /\.git\/config|\.git\/\.gitconfig/i,
        type: 'file',
        severity: 'medium',
        name: 'Git config',
        description: 'Git config may contain tokens or credentials',
      },
      {
        pattern: /\.dockerignore|\.gitignore/i,
        type: 'file',
        severity: 'low',
        name: 'Ignore file',
        description: 'Should be in .dockerignore, not in image',
      },
      {
        pattern: /docker-compose\.yml|docker-compose\.yaml/i,
        type: 'file',
        severity: 'low',
        name: 'Docker Compose file',
        description: 'Not needed in production image',
      },
      {
        pattern: /\.sql|\.db|\.sqlite/i,
        type: 'file',
        severity: 'medium',
        name: 'Database file',
        description: 'Database files should not be in images',
      },
    ];
    
    for (const pattern of sensitivePatterns) {
      if (pattern.pattern.test(instruction)) {
        findings.push({
          layer,
          layerIndex: index,
          type: pattern.type,
          severity: pattern.severity,
          finding: `${pattern.name} detected in COPY/ADD operation`,
          description: `${pattern.description}. Found in: ${instruction}`,
          suggestion: this.getSuggestion(pattern.name, pattern.severity),
        });
      }
    }
    
    if (instruction.includes('COPY . .') || instruction.includes('ADD . .')) {
      findings.push({
        layer,
        layerIndex: index,
        type: 'file',
        severity: 'high',
        finding: 'Copying entire directory (COPY . .)',
        description: 'This may include sensitive files. Use .dockerignore to exclude them.',
        suggestion: 'Add sensitive files to .dockerignore before copying',
      });
    }
    
    return findings;
  }

  checkSecretPatterns(instruction, layer, index) {
    const findings = [];
    
    const secretPatterns = [
      {
        pattern: /api[_-]?key\s*=\s*['"]\w+['"]/i,
        severity: 'high',
        name: 'API key in command',
      },
      {
        pattern: /password\s*=\s*['"][^'"]+['"]/i,
        severity: 'high',
        name: 'Password in command',
      },
      {
        pattern: /token\s*=\s*['"][^'"]+['"]/i,
        severity: 'high',
        name: 'Token in command',
      },
      {
        pattern: /secret\s*=\s*['"][^'"]+['"]/i,
        severity: 'high',
        name: 'Secret in command',
      },
      {
        pattern: /aws[_-]?access[_-]?key/i,
        severity: 'high',
        name: 'AWS credentials',
      },
      {
        pattern: /azure[_-]?key/i,
        severity: 'high',
        name: 'Azure credentials',
      },
      {
        pattern: /gcp[_-]?key|google[_-]?cloud[_-]?key/i,
        severity: 'high',
        name: 'GCP credentials',
      },
    ];
    
    for (const pattern of secretPatterns) {
      if (pattern.pattern.test(instruction)) {
        findings.push({
          layer,
          layerIndex: index,
          type: 'pattern',
          severity: pattern.severity,
          finding: `${pattern.name} detected in RUN command`,
          description: `Potential secret found in command: ${instruction.substring(0, 100)}...`,
          suggestion: 'Use environment variables or secrets management instead of hardcoding',
        });
      }
    }
    
    return findings;
  }

  getSuggestion(fileName, severity) {
    const suggestions = {
      '.env file': 'Add .env files to .dockerignore and use environment variables at runtime',
      'Private key file': 'Use mounted volumes or secrets management, never copy keys into image',
      'Credentials file': 'Use secrets management (Docker secrets, Kubernetes secrets, etc.)',
      'Git config': 'Add .git to .dockerignore',
      'Ignore file': 'These files are not needed in the image',
      'Docker Compose file': 'Remove docker-compose.yml from image',
      'Database file': 'Use volumes for persistent data, not image layers',
    };
    
    return suggestions[fileName] || `Remove ${fileName} before building image`;
  }

  extractInstruction(createdBy) {
    if (!createdBy) return '';
    const match = createdBy.match(/\/bin\/sh\s+-c\s+#\(nop\)\s+(.*)/);
    if (match) return match[1];
    const match2 = createdBy.match(/\/bin\/sh\s+-c\s+(.*)/);
    if (match2) return match2[1];
    return createdBy;
  }
}

