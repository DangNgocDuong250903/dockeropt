/**
 * Dockerfile Parser - Converts Dockerfile text to AST
 */

import { DockerfileAST, Instruction, Stage, Position, Location } from './types';

export class DockerfileParser {
  private lines: string[];
  private currentLine: number = 0;

  constructor(private content: string) {
    this.lines = content.split('\n');
  }

  parse(): DockerfileAST {
    const instructions: Instruction[] = [];
    const stages: Stage[] = [];
    let currentStage: Stage | null = null;

    this.currentLine = 0;

    while (this.currentLine < this.lines.length) {
      const line = this.lines[this.currentLine];
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        if (trimmed.startsWith('#')) {
          const instruction = this.parseComment(line);
          instructions.push(instruction);
          if (currentStage) {
            currentStage.instructions.push(instruction);
          }
        }
        this.currentLine++;
        continue;
      }

      const instruction = this.parseInstruction(line);
      instructions.push(instruction);

      // Handle multi-stage builds
      if (instruction.type === 'FROM') {
        if (currentStage) {
          currentStage.endLine = this.currentLine - 1;
          stages.push(currentStage);
        }

        const { from, name, digest } = this.parseFromInstruction(instruction.value);
        currentStage = {
          from,
          fromDigest: digest,
          name,
          instructions: [instruction],
          startLine: this.currentLine,
          endLine: this.currentLine,
        };
      } else if (currentStage) {
        currentStage.instructions.push(instruction);
      }

      this.currentLine++;
    }

    if (currentStage) {
      currentStage.endLine = this.lines.length - 1;
      stages.push(currentStage);
    }

    return {
      stages,
      instructions,
      raw: this.content,
    };
  }

  private parseComment(line: string): Instruction {
    return {
      type: 'COMMENT',
      value: line.trim().substring(1).trim(),
      args: [],
      location: this.getLocation(line),
      raw: line,
    };
  }

  private parseInstruction(line: string): Instruction {
    const trimmed = line.trim();
    
    // Handle line continuations
    let fullLine = trimmed;
    let startLine = this.currentLine;
    
    while (fullLine.endsWith('\\') && this.currentLine + 1 < this.lines.length) {
      this.currentLine++;
      fullLine = fullLine.slice(0, -1) + ' ' + this.lines[this.currentLine].trim();
    }

    // Parse instruction
    const match = fullLine.match(/^(\w+)\s+(.*)$/);
    
    if (!match) {
      return {
        type: 'COMMENT',
        value: fullLine,
        args: [],
        location: this.getLocationFromLine(startLine),
        raw: line,
      };
    }

    const [, instructionType, value] = match;
    const type = instructionType.toUpperCase() as Instruction['type'];
    
    // Parse arguments
    const args = this.parseArgs(value, type);

    return {
      type,
      value: value.trim(),
      args,
      location: this.getLocationFromLine(startLine),
      raw: line,
    };
  }

  private parseArgs(value: string, type: string): string[] {
    // Handle JSON array format (CMD/ENTRYPOINT)
    if (value.trim().startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        return [value];
      }
    }

    // Handle shell form
    if (type === 'RUN' || type === 'CMD' || type === 'ENTRYPOINT') {
      return [value];
    }

    // Split by whitespace for other instructions
    return value.split(/\s+/).filter(Boolean);
  }

  private parseFromInstruction(value: string): { from: string; name?: string; digest?: string } {
    // FROM image:tag@digest AS name
    const asMatch = value.match(/^(.+?)\s+AS\s+(\S+)$/i);
    const name = asMatch ? asMatch[2] : undefined;
    const imageString = asMatch ? asMatch[1] : value;

    // Check for digest
    const digestMatch = imageString.match(/^(.+?)@(sha256:[a-f0-9]+)$/);
    const digest = digestMatch ? digestMatch[2] : undefined;
    const from = digestMatch ? digestMatch[1] : imageString;

    return { from, name, digest };
  }

  private getLocation(line: string): Location {
    return this.getLocationFromLine(this.currentLine);
  }

  private getLocationFromLine(lineNum: number): Location {
    return {
      start: { line: lineNum + 1, column: 1 },
      end: { line: lineNum + 1, column: this.lines[lineNum]?.length || 1 },
    };
  }
}

export function parseDockerfile(content: string): DockerfileAST {
  const parser = new DockerfileParser(content);
  return parser.parse();
}
