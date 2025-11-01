/**
 * Runtime Behavior Predictor - Predict runtime footprint from Dockerfile
 */

import { DockerfileAST, Instruction } from './types';

export interface RuntimeManifest {
  appType: string;
  defaultPort?: number;
  exposedPorts: number[];
  expectedMemory: string;
  expectedCPU: string;
  environment: Record<string, string>;
  volumes: string[];
  healthCheck?: string;
  entrypoint?: string;
  command?: string;
}

export class RuntimePredictor {
  /**
   * Predict runtime behavior from Dockerfile AST
   */
  predict(ast: DockerfileAST): RuntimeManifest {
    const manifest: RuntimeManifest = {
      appType: 'Unknown',
      exposedPorts: [],
      expectedMemory: '256MB',
      expectedCPU: '0.5',
      environment: {},
      volumes: [],
    };
    
    // Analyze instructions
    for (const inst of ast.instructions) {
      this.analyzeInstruction(inst, manifest);
    }
    
    // Determine app type
    manifest.appType = this.determineAppType(ast, manifest);
    
    // Estimate resource requirements
    this.estimateResources(ast, manifest);
    
    return manifest;
  }

  private analyzeInstruction(inst: Instruction, manifest: RuntimeManifest) {
    switch (inst.type) {
      case 'EXPOSE':
        const ports = this.extractPorts(inst.value);
        manifest.exposedPorts.push(...ports);
        if (!manifest.defaultPort && ports.length > 0) {
          manifest.defaultPort = ports[0];
        }
        break;
      
      case 'ENV':
        const envVars = this.extractEnvVars(inst.value);
        Object.assign(manifest.environment, envVars);
        break;
      
      case 'VOLUME':
        const volumes = this.extractVolumes(inst.value);
        manifest.volumes.push(...volumes);
        break;
      
      case 'HEALTHCHECK':
        manifest.healthCheck = inst.value;
        break;
      
      case 'ENTRYPOINT':
        manifest.entrypoint = inst.value;
        break;
      
      case 'CMD':
        manifest.command = inst.value;
        break;
    }
  }

  private determineAppType(ast: DockerfileAST, manifest: RuntimeManifest): string {
    // Check base image
    const fromInstr = ast.instructions.find(i => i.type === 'FROM');
    if (fromInstr) {
      const baseImage = fromInstr.value.toLowerCase();
      
      if (baseImage.includes('node')) return 'Node.js Application';
      if (baseImage.includes('python')) return 'Python Application';
      if (baseImage.includes('golang') || baseImage.includes('go')) return 'Go Application';
      if (baseImage.includes('java') || baseImage.includes('openjdk')) return 'Java Application';
      if (baseImage.includes('php')) return 'PHP Application';
      if (baseImage.includes('ruby')) return 'Ruby Application';
      if (baseImage.includes('rust') || baseImage.includes('cargo')) return 'Rust Application';
      if (baseImage.includes('nginx')) return 'Web Server (Nginx)';
      if (baseImage.includes('apache')) return 'Web Server (Apache)';
      if (baseImage.includes('redis')) return 'Cache/Queue (Redis)';
      if (baseImage.includes('postgres') || baseImage.includes('mysql')) return 'Database';
    }
    
    // Check CMD/ENTRYPOINT
    if (manifest.command || manifest.entrypoint) {
      const cmd = (manifest.command || manifest.entrypoint || '').toLowerCase();
      
      if (cmd.includes('node') || cmd.includes('npm')) return 'Node.js Application';
      if (cmd.includes('python') || cmd.includes('gunicorn') || cmd.includes('uvicorn')) {
        return 'Python Application';
      }
      if (cmd.includes('java')) return 'Java Application';
      if (cmd.includes('nginx')) return 'Web Server (Nginx)';
    }
    
    // Check for build tools
    for (const inst of ast.instructions) {
      if (inst.type === 'RUN') {
        const runCmd = inst.value.toLowerCase();
        if (runCmd.includes('npm install') || runCmd.includes('yarn install')) {
          return 'Node.js Application';
        }
        if (runCmd.includes('pip install') || runCmd.includes('poetry')) {
          return 'Python Application';
        }
        if (runCmd.includes('go build')) return 'Go Application';
        if (runCmd.includes('cargo build')) return 'Rust Application';
      }
    }
    
    return 'Container Application';
  }

  private estimateResources(ast: DockerfileAST, manifest: RuntimeManifest) {
    // Estimate memory based on base image and dependencies
    let baseMemory = 256; // MB
    let cpu = 0.5;
    
    // Check base image size (estimate)
    const fromInstr = ast.instructions.find(i => i.type === 'FROM');
    if (fromInstr) {
      const baseImage = fromInstr.value.toLowerCase();
      
      if (baseImage.includes('alpine') || baseImage.includes('slim')) {
        baseMemory = 128;
        cpu = 0.25;
      } else if (baseImage.includes('node')) {
        baseMemory = 512;
        cpu = 0.5;
      } else if (baseImage.includes('python')) {
        baseMemory = 384;
        cpu = 0.5;
      } else if (baseImage.includes('java') || baseImage.includes('openjdk')) {
        baseMemory = 1024;
        cpu = 1.0;
      } else if (baseImage.includes('golang')) {
        baseMemory = 256;
        cpu = 0.5;
      }
    }
    
    // Add memory for dependencies
    for (const inst of ast.instructions) {
      if (inst.type === 'RUN') {
        const runCmd = inst.value.toLowerCase();
        
        if (runCmd.includes('npm install') || runCmd.includes('yarn install')) {
          baseMemory += 256; // Node modules
        }
        
        if (runCmd.includes('pip install')) {
          baseMemory += 128; // Python packages
        }
        
        if (runCmd.includes('apt-get install')) {
          const packageCount = (runCmd.match(/\b[a-z0-9-]+\b/g) || []).length - 3;
          baseMemory += packageCount * 10;
        }
      }
    }
    
    // Adjust based on app type
    if (manifest.appType.includes('Database')) {
      baseMemory = Math.max(512, baseMemory);
      cpu = 1.0;
    }
    
    if (manifest.appType.includes('Web Server')) {
      baseMemory = Math.max(256, baseMemory);
      cpu = 0.5;
    }
    
    manifest.expectedMemory = `${baseMemory}MB`;
    manifest.expectedCPU = cpu.toString();
  }

  private extractPorts(value: string): number[] {
    const ports: number[] = [];
    const matches = value.match(/\d+/g);
    if (matches) {
      for (const match of matches) {
        const port = parseInt(match, 10);
        if (port > 0 && port < 65536) {
          ports.push(port);
        }
      }
    }
    return ports;
  }

  private extractEnvVars(value: string): Record<string, string> {
    const envVars: Record<string, string> = {};
    
    // Handle ENV KEY=VALUE or ENV KEY="VALUE"
    const match = value.match(/(\w+)=(.+)/);
    if (match) {
      envVars[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
    
    // Handle ENV KEY1=VAL1 KEY2=VAL2
    const pairs = value.match(/(\w+)=([^\s]+)/g);
    if (pairs) {
      for (const pair of pairs) {
        const [key, val] = pair.split('=');
        envVars[key] = val.replace(/^["']|["']$/g, '');
      }
    }
    
    return envVars;
  }

  private extractVolumes(value: string): string[] {
    const volumes: string[] = [];
    const matches = value.match(/["']([^"']+)["']|\S+/g);
    if (matches) {
      for (const match of matches) {
        volumes.push(match.replace(/^["']|["']$/g, ''));
      }
    }
    return volumes;
  }
}

