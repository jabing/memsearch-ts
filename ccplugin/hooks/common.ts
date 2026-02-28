#!/usr/bin/env node

/**
 * Common utilities for memsearch Claude Code hooks
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface HookInput {
  claude_project_dir: string;
  session_id?: string;
  prompt?: string;
  transcript_path?: string;
  [key: string]: unknown;
}

export interface HookOutput {
  additionalContext?: string;
  systemMessage?: string;
  errorMessage?: string;
}

/**
 * Get memory directory path
 */
export function getMemoryDir(projectDir: string): string {
  const memsearchDir = join(projectDir, '.memsearch');
  const memoryDir = join(memsearchDir, 'memory');
  
  if (!existsSync(memoryDir)) {
    mkdirSync(memoryDir, { recursive: true });
  }
  
  return memoryDir;
}

/**
 * Derive collection name from project path
 */
export function deriveCollectionName(projectDir: string): string {
  const projectName = projectDir.split(/[\/]/).pop() || 'default';
  const sanitized = projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `memsearch_${sanitized}`;
}

/**
 * Run memsearch CLI command
 */
export async function runMemsearch(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    
    const child = spawn('memsearch', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });
    
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`memsearch exited with code ${code}: ${stderr}`));
      }
    });
    
    child.on('error', reject);
  });
}

/**
 * Parse JSON input from stdin
 */
export function parseHookInput(input: string): HookInput {
  try {
    return JSON.parse(input);
  } catch {
    return { claude_project_dir: process.cwd() };
  }
}

/**
 * Output hook result as JSON
 */
export function outputHookResult(output: HookOutput): void {
  console.log(JSON.stringify(output));
}

/**
 * Get today's memory file path
 */
export function getTodayMemoryFile(memoryDir: string): string {
  const today = new Date().toISOString().split('T')[0];
  return join(memoryDir, `${today}.md`);
}

/**
 * Append content to memory file
 */
export function appendToMemoryFile(filePath: string, content: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  if (!existsSync(filePath)) {
    writeFileSync(filePath, `# ${new Date().toISOString().split('T')[0]}\n\n`);
  }
  
  appendFileSync(filePath, content);
}

/**
 * Simple file append (sync)
 */
function appendFileSync(filePath: string, content: string): void {
  const { openSync, writeSync, closeSync } = require('fs');
  const fd = openSync(filePath, 'a');
  writeSync(fd, content);
  closeSync(fd);
}
