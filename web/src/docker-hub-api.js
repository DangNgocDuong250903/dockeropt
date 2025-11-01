/**
 * Docker Hub API Client
 * Fetches image metadata from Docker Hub Registry API
 */

export class DockerHubAPI {
  constructor() {
    this.baseUrl = 'https://registry-1.docker.io/v2';
    this.authUrl = 'https://auth.docker.io/token';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async getImageConfig(imageName) {
    try {
      // Parse image name
      const parsed = this.parseImageName(imageName);
      if (!parsed) {
        throw new Error('Invalid image name format');
      }

      // Check if it's a Docker Hub image (not private registry)
      if (parsed.registry && parsed.registry !== 'docker.io' && parsed.registry !== 'registry-1.docker.io') {
        throw new Error('Private registries are not supported. Please use Docker Hub public images.');
      }

      // Get auth token
      const token = await this.getAuthToken(parsed.repository);

      // Get manifest
      const manifest = await this.getManifest(parsed.repository, parsed.tag, token);

      // Get config blob
      const config = await this.getConfigBlob(parsed.repository, manifest.config.digest, token);

      // Convert to docker inspect format
      return this.convertToInspectFormat(config, manifest, imageName);
    } catch (error) {
      console.error('Docker Hub API error:', error);
      throw new Error(`Failed to fetch image from Docker Hub: ${error.message}`);
    }
  }

  parseImageName(imageName) {
    // Examples: mysql:8, node:20, library/mysql:8, circleci/mysql:latest, docker.io/mysql:8
    let registry = null;
    let repository = '';
    let tag = 'latest';

    // Remove docker.io prefix if present
    imageName = imageName.replace(/^docker\.io\//, '');

    // Extract tag first
    if (imageName.includes(':')) {
      const tagParts = imageName.split(':');
      imageName = tagParts[0];
      tag = tagParts.slice(1).join(':');
    }

    // Check for registry or namespace
    if (imageName.includes('/')) {
      const parts = imageName.split('/');
      if (parts.length === 3) {
        // registry/namespace/image
        registry = parts[0];
        repository = parts.slice(1).join('/');
      } else if (parts.length === 2) {
        // namespace/image (like circleci/mysql)
        repository = imageName; // Keep as is
      } else {
        repository = imageName;
      }
    } else {
      // No slash - default to library namespace (like mysql -> library/mysql)
      repository = `library/${imageName}`;
    }

    return { registry, repository, tag };
  }

  async getAuthToken(repository) {
    const scope = `repository:${repository}:pull`;
    const url = `${this.authUrl}?service=registry.docker.io&scope=${scope}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get auth token (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();
      if (!data.token) {
        throw new Error('No token received from auth service');
      }
      return data.token;
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        throw new Error('CORS error: Cannot access Docker Hub API from browser. Please use Docker inspect JSON instead.');
      }
      throw error;
    }
  }

  async getManifest(repository, tag, token) {
    const url = `${this.baseUrl}/${repository}/manifests/${tag}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.docker.distribution.manifest.v2+json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Image ${repository}:${tag} not found on Docker Hub. Make sure the image exists and is public.`);
        }
        const errorText = await response.text();
        throw new Error(`Failed to get manifest (${response.status}): ${errorText || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        throw new Error('CORS error: Cannot access Docker Hub API from browser. Please use Docker inspect JSON instead.');
      }
      throw error;
    }
  }

  async getConfigBlob(repository, digest, token) {
    const url = `${this.baseUrl}/${repository}/blobs/${digest}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get config blob (${response.status}): ${errorText || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        throw new Error('CORS error: Cannot access Docker Hub API from browser. Please use Docker inspect JSON instead.');
      }
      throw error;
    }
  }

  convertToInspectFormat(config, manifest, imageName) {
    // Convert registry config to docker inspect format
    const inspectFormat = [{
      Id: manifest.config.digest.replace('sha256:', '').slice(0, 64),
      RepoTags: [imageName],
      RepoDigests: [`${imageName.split(':')[0]}@${manifest.config.digest}`],
      Created: config.created || new Date().toISOString(),
      Size: 0, // Size not available in manifest
      VirtualSize: 0,
      Config: {
        ExposedPorts: config.config?.ExposedPorts || {},
        Env: config.config?.Env || [],
        Cmd: config.config?.Cmd || [],
        Entrypoint: config.config?.Entrypoint || [],
        WorkingDir: config.config?.WorkingDir || '',
        User: config.config?.User || '',
      },
      RootFS: {
        Type: 'layers',
        Layers: manifest.layers?.map(layer => `sha256:${layer.digest.replace('sha256:', '')}`) || [],
      },
    }];

    return inspectFormat;
  }

  async fetchImageMetadata(imageName) {
    // Check cache first
    const cacheKey = imageName;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    // Fetch from API
    const data = await this.getImageConfig(imageName);

    // Cache it
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }
}

