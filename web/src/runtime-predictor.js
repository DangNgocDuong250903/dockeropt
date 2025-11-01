/**
 * Browser-compatible Runtime Predictor
 */

export class RuntimePredictor {
  predict(ast) {
    const manifest = {
      appType: 'Unknown',
      exposedPorts: [],
      expectedMemory: '256MB',
      expectedCPU: '0.5',
      environment: {},
      volumes: [],
    };
    
    for (const inst of ast.instructions || []) {
      this.analyzeInstruction(inst, manifest);
    }
    
    manifest.appType = this.determineAppType(ast, manifest);
    this.estimateResources(ast, manifest);
    
    return manifest;
  }

  analyzeInstruction(inst, manifest) {
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

  determineAppType(ast, manifest) {
    const fromInstr = (ast.instructions || []).find(i => i.type === 'FROM');
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
    
    if (manifest.command || manifest.entrypoint) {
      const cmd = (manifest.command || manifest.entrypoint || '').toLowerCase();
      
      if (cmd.includes('node') || cmd.includes('npm')) return 'Node.js Application';
      if (cmd.includes('python') || cmd.includes('gunicorn') || cmd.includes('uvicorn')) {
        return 'Python Application';
      }
      if (cmd.includes('java')) return 'Java Application';
      if (cmd.includes('nginx')) return 'Web Server (Nginx)';
    }
    
    return 'Container Application';
  }

  estimateResources(ast, manifest) {
    let baseMemory = 256;
    let cpu = 0.5;
    
    const fromInstr = (ast.instructions || []).find(i => i.type === 'FROM');
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
      }
    }
    
    manifest.expectedMemory = `${baseMemory}MB`;
    manifest.expectedCPU = cpu.toString();
  }

  extractPorts(value) {
    const ports = [];
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

  extractEnvVars(value) {
    const envVars = {};
    const match = value.match(/(\w+)=(.+)/);
    if (match) {
      envVars[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
    const pairs = value.match(/(\w+)=([^\s]+)/g);
    if (pairs) {
      for (const pair of pairs) {
        const [key, val] = pair.split('=');
        envVars[key] = val.replace(/^["']|["']$/g, '');
      }
    }
    return envVars;
  }

  extractVolumes(value) {
    const volumes = [];
    const matches = value.match(/["']([^"']+)["']|\S+/g);
    if (matches) {
      for (const match of matches) {
        volumes.push(match.replace(/^["']|["']$/g, ''));
      }
    }
    return volumes;
  }
}

