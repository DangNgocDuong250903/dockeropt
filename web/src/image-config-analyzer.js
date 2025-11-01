/**
 * Image Configuration Analyzer
 * Analyzes Docker image configuration and generates run commands
 */

export class ImageConfigAnalyzer {
  analyzeImageConfig(inspectData) {
    const image = Array.isArray(inspectData) ? inspectData[0] : inspectData;
    
    const config = image.Config || {};
    const exposedPorts = this.parseExposedPorts(image.Config?.ExposedPorts);
    const envVars = this.parseEnvVars(config.Env || []);
    const volumes = this.parseVolumes(image.Config?.Volumes || {});
    const entrypoint = this.parseCommand(config.Entrypoint);
    const cmd = this.parseCommand(config.Cmd);
    const workingDir = config.WorkingDir || '/';
    const user = config.User || 'root';
    
    // Detect image type for better defaults
    const imageType = this.detectImageType(image.RepoTags?.[0] || '', config);
    
    return {
      image: image.RepoTags?.[0] || 'unknown:latest',
      imageType,
      exposedPorts,
      envVars,
      volumes,
      entrypoint,
      cmd,
      workingDir,
      user,
      description: this.generateDescription(imageType, exposedPorts, envVars, volumes),
    };
  }

  parseExposedPorts(exposedPorts) {
    if (!exposedPorts || typeof exposedPorts !== 'object') return [];
    
    const ports = [];
    for (const [port, protocol] of Object.entries(exposedPorts)) {
      ports.push({
        port: port.split('/')[0],
        protocol: port.split('/')[1] || 'tcp',
        raw: port,
      });
    }
    
    return ports.sort((a, b) => parseInt(a.port) - parseInt(b.port));
  }

  parseEnvVars(env) {
    if (!Array.isArray(env)) return [];
    
    const envVars = [];
    for (const envStr of env) {
      const [key, ...valueParts] = envStr.split('=');
      const value = valueParts.join('=');
      
      envVars.push({
        key,
        value: value || '',
        required: this.isRequiredEnvVar(key, value),
        description: this.getEnvVarDescription(key),
        defaultValue: value || '',
      });
    }
    
    return envVars;
  }

  parseVolumes(volumes) {
    if (!volumes || typeof volumes !== 'object') return [];
    
    const volumeList = [];
    for (const [path, obj] of Object.entries(volumes)) {
      volumeList.push({
        path,
        required: this.isRequiredVolume(path),
        description: this.getVolumeDescription(path),
      });
    }
    
    return volumeList;
  }

  parseCommand(cmd) {
    if (!cmd) return null;
    if (Array.isArray(cmd)) {
      return cmd.join(' ');
    }
    return cmd;
  }

  detectImageType(imageName, config) {
    const name = (imageName || '').toLowerCase();
    
    if (name.includes('mysql') || name.includes('mariadb')) {
      return 'mysql';
    }
    if (name.includes('postgres') || name.includes('postgresql')) {
      return 'postgres';
    }
    if (name.includes('redis')) {
      return 'redis';
    }
    if (name.includes('mongodb') || name.includes('mongo')) {
      return 'mongodb';
    }
    if (name.includes('nginx')) {
      return 'nginx';
    }
    if (name.includes('node')) {
      return 'node';
    }
    if (name.includes('python')) {
      return 'python';
    }
    if (name.includes('php')) {
      return 'php';
    }
    
    return 'generic';
  }

  isRequiredEnvVar(key, value) {
    // Common required env vars
    const requiredPatterns = [
      'PASSWORD',
      'SECRET',
      'KEY',
      'TOKEN',
      'ROOT_PASSWORD',
      'DATABASE',
    ];
    
    const keyUpper = key.toUpperCase();
    return requiredPatterns.some(pattern => keyUpper.includes(pattern)) && !value;
  }

  getEnvVarDescription(key) {
    const descriptions = {
      MYSQL_ROOT_PASSWORD: 'Root user password for MySQL',
      MYSQL_DATABASE: 'Initial database name to create',
      MYSQL_USER: 'MySQL user to create',
      MYSQL_PASSWORD: 'Password for MySQL user',
      POSTGRES_PASSWORD: 'PostgreSQL superuser password',
      POSTGRES_DB: 'PostgreSQL database name',
      POSTGRES_USER: 'PostgreSQL username',
      REDIS_PASSWORD: 'Redis password',
      MONGO_INITDB_ROOT_USERNAME: 'MongoDB root username',
      MONGO_INITDB_ROOT_PASSWORD: 'MongoDB root password',
      MONGO_INITDB_DATABASE: 'MongoDB initial database',
    };
    
    return descriptions[key] || '';
  }

  isRequiredVolume(path) {
    // Common required volumes
    const requiredPaths = [
      '/var/lib/mysql',
      '/var/lib/postgresql/data',
      '/data',
      '/var/lib/mongodb',
    ];
    
    return requiredPaths.some(p => path.includes(p));
  }

  getVolumeDescription(path) {
    const descriptions = {
      '/var/lib/mysql': 'MySQL data storage',
      '/var/lib/postgresql/data': 'PostgreSQL data storage',
      '/data': 'Application data',
      '/var/lib/mongodb': 'MongoDB data storage',
      '/usr/share/nginx/html': 'Nginx web root',
      '/var/www/html': 'Web content',
    };
    
    for (const [pattern, desc] of Object.entries(descriptions)) {
      if (path.includes(pattern)) {
        return desc;
      }
    }
    
    return 'Data volume';
  }

  generateDescription(imageType, exposedPorts, envVars, volumes) {
    const typeDescriptions = {
      mysql: 'MySQL database server',
      postgres: 'PostgreSQL database server',
      redis: 'Redis in-memory data store',
      mongodb: 'MongoDB NoSQL database',
      nginx: 'Nginx web server',
      node: 'Node.js application runtime',
      python: 'Python application runtime',
      php: 'PHP application runtime',
      generic: 'Docker container',
    };
    
    const typeDesc = typeDescriptions[imageType] || 'Docker container';
    const portInfo = exposedPorts.length > 0 
      ? ` It exposes port${exposedPorts.length > 1 ? 's' : ''} ${exposedPorts.map(p => p.port).join(', ')}.`
      : '';
    
    const envInfo = envVars.filter(e => e.required).length > 0
      ? ` It requires ${envVars.filter(e => e.required).length} environment variable${envVars.filter(e => e.required).length > 1 ? 's' : ''}.`
      : '';
    
    return `This image runs a ${typeDesc}.${portInfo}${envInfo}`;
  }

  generateRunCommand(image, config) {
    const parts = ['docker run -d'];
    
    // Add name if image name is provided
    const imageName = config.image || image;
    const containerName = imageName.split(':')[0].replace(/[^a-z0-9]/gi, '_');
    parts.push(`--name ${containerName}`);
    
    // Ports
    for (const port of config.exposedPorts || []) {
      const hostPort = port.hostPort || port.port;
      parts.push(`-p ${hostPort}:${port.port}/${port.protocol}`);
    }
    
    // Environment variables
    for (const envVar of config.envVars || []) {
      const value = envVar.value || envVar.defaultValue || '';
      if (value) {
        parts.push(`-e ${envVar.key}=${value}`);
      } else if (envVar.required) {
        parts.push(`-e ${envVar.key}=<value>`);
      }
    }
    
    // Volumes
    for (const volume of config.volumes || []) {
      if (volume.path) {
        const hostPath = volume.hostPath || volume.path.split('/').pop().replace(/[^a-z0-9]/gi, '_') + '_data';
        parts.push(`-v ${hostPath}:${volume.path}`);
      }
    }
    
    // Working directory
    if (config.workingDir && config.workingDir !== '/') {
      parts.push(`-w ${config.workingDir}`);
    }
    
    // User
    if (config.user && config.user !== 'root') {
      parts.push(`-u ${config.user}`);
    }
    
    // Image name
    parts.push(imageName);
    
    // Command
    if (config.cmd) {
      parts.push(config.cmd);
    }
    
    return parts.join(' \\\n  ');
  }

  generateDockerCompose(image, config) {
    const serviceName = (image.split(':')[0] || 'app').replace(/[^a-z0-9]/gi, '_');
    
    const compose = {
      version: '3.8',
      services: {
        [serviceName]: {
          image: image,
          ...(config.exposedPorts.length > 0 && {
            ports: config.exposedPorts.map(p => {
              const hostPort = p.hostPort || p.port;
              return `"${hostPort}:${p.port}/${p.protocol}"`;
            }),
          }),
          ...(config.envVars.length > 0 && {
            environment: config.envVars.reduce((acc, env) => {
              const value = env.value || env.defaultValue || '';
              if (value || env.required) {
                acc[env.key] = value || '<required>';
              }
              return acc;
            }, {}),
          }),
          ...(config.volumes.length > 0 && {
            volumes: config.volumes.map(v => {
              const hostPath = v.hostPath || v.path.split('/').pop().replace(/[^a-z0-9]/gi, '_') + '_data';
              return `${hostPath}:${v.path}`;
            }),
          }),
          ...(config.workingDir && config.workingDir !== '/' && {
            working_dir: config.workingDir,
          }),
          ...(config.user && config.user !== 'root' && {
            user: config.user,
          }),
          ...(config.cmd && {
            command: config.cmd,
          }),
        },
      },
      ...(config.volumes.length > 0 && {
        volumes: config.volumes.reduce((acc, v) => {
          const volumeName = v.path.split('/').pop().replace(/[^a-z0-9]/gi, '_') + '_data';
          acc[volumeName] = {};
          return acc;
        }, {}),
      }),
    };
    
    return this.formatDockerCompose(compose);
  }

  formatDockerCompose(compose) {
    let yaml = 'services:\n';
    
    for (const [serviceName, service] of Object.entries(compose.services)) {
      yaml += `  ${serviceName}:\n`;
      yaml += `    image: ${service.image}\n`;
      
      if (service.ports) {
        yaml += `    ports:\n`;
        for (const port of service.ports) {
          yaml += `      - ${port}\n`;
        }
      }
      
      if (service.environment) {
        yaml += `    environment:\n`;
        for (const [key, value] of Object.entries(service.environment)) {
          yaml += `      ${key}: ${value}\n`;
        }
      }
      
      if (service.volumes) {
        yaml += `    volumes:\n`;
        for (const volume of service.volumes) {
          yaml += `      - ${volume}\n`;
        }
      }
      
      if (service.working_dir) {
        yaml += `    working_dir: ${service.working_dir}\n`;
      }
      
      if (service.user) {
        yaml += `    user: ${service.user}\n`;
      }
      
      if (service.command) {
        yaml += `    command: ${service.command}\n`;
      }
    }
    
    if (compose.volumes) {
      yaml += '\nvolumes:\n';
      for (const [volumeName] of Object.entries(compose.volumes)) {
        yaml += `  ${volumeName}:\n`;
      }
    }
    
    return yaml;
  }
}

