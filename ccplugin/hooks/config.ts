#!/usr/bin/env node
/** Common utilities for memsearch hooks */
import { readFileSync, existsSync, writeFileSync, mkdirSync, openSync, writeSync, closeSync } from 'fs';
import { join, dirname } from 'path';

export interface HookInput { claude_project_dir?: string; session_id?: string; prompt?: string; transcript_path?: string; [key: string]: unknown; }
export interface HookOutput { additionalContext?: string; systemMessage?: string; errorMessage?: string; }

export function getMemoryDir(projectDir: string): string {
  const memoryDir = join(projectDir, '.memsearch', 'memory');
  if (!existsSync(memoryDir)) mkdirSync(memoryDir, { recursive: true });
  return memoryDir;
}

export function deriveCollectionName(projectDir: string): string {
  const projectName = projectDir.split(/[\/]/).pop() || 'default';
  return `memsearch_${projectName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

export function parseHookInput(input: string): HookInput {
  try { return JSON.parse(input); } catch { return { claude_project_dir: process.cwd() }; }
}

export function outputHookResult(output: HookOutput): void { console.log(JSON.stringify(output)); }

export function getTodayMemoryFile(memoryDir: string): string {
  return join(memoryDir, `${new Date().toISOString().split('T')[0]}.md`);
}

export function appendToMemoryFile(filePath: string, content: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(filePath)) writeFileSync(filePath, `# ${new Date().toISOString().split('T')[0]}\n\n`);
  const fd = openSync(filePath, 'a'); writeSync(fd, content); closeSync(fd);
}
