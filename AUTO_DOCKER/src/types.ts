/**
 * Core types for Dockerfile Optimizer
 */

export type Severity = 'high' | 'medium' | 'low' | 'info';

export interface Position {
  line: number;
  column: number;
}

export interface Location {
  start: Position;
  end: Position;
}

export interface Instruction {
  type: 'FROM' | 'RUN' | 'COPY' | 'ADD' | 'WORKDIR' | 'ENV' | 'ARG' | 'EXPOSE' | 'CMD' | 'ENTRYPOINT' | 'USER' | 'LABEL' | 'VOLUME' | 'HEALTHCHECK' | 'SHELL' | 'ONBUILD' | 'STOPSIGNAL' | 'COMMENT';
  value: string;
  args: string[];
  location: Location;
  raw: string;
}

export interface Stage {
  name?: string;
  from: string;
  fromDigest?: string;
  instructions: Instruction[];
  startLine: number;
  endLine: number;
}

export interface DockerfileAST {
  stages: Stage[];
  instructions: Instruction[];
  raw: string;
}

export interface Finding {
  id: string;
  rule: string;
  severity: Severity;
  message: string;
  description?: string;
  location?: Location;
  suggestion?: string;
  fixable: boolean;
}

export interface Context {
  dockerfile: string;
  dockerignore?: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'apt' | 'apk' | 'pip' | 'poetry' | 'go' | 'cargo';
  targetStage?: string;
  buildArgs?: Record<string, string>;
}

export interface OptimizationResult {
  original: string;
  optimized: string;
  findings: Finding[];
  score: number;
  metrics: Metrics;
  diff: string;
}

export interface Metrics {
  estimatedSizeSavings: number; // MB
  layerReduction: number;
  buildTimeImprovement: number; // %
  cacheEfficiency: number; // 0-100
  securityScore: number; // 0-100
}

export interface Rule {
  id: string;
  name: string;
  severity: Severity;
  description: string;
  check: (ast: DockerfileAST, ctx: Context) => Finding[];
}

export interface Fix {
  finding: Finding;
  apply: (ast: DockerfileAST) => DockerfileAST;
}
