#!/usr/bin/env node
import { readFileSync, existsSync, openSync, writeSync, closeSync } from 'fs';
import { parseHookInput, outputHookResult, getMemoryDir, getTodayMemoryFile, type HookInput, type HookOutput } from './config.ts';

async function stop(input: HookInput): Promise<HookOutput> {
  const projectDir = input.claude_project_dir || process.cwd();
  const memoryDir = getMemoryDir(projectDir);
  const transcriptPath = input.transcript_path;
  
  if (!transcriptPath || !existsSync(transcriptPath)) { outputHookResult({}); return; }
  
  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n').slice(-200);
    if (lines.length < 3) { outputHookResult({}); return; }
    
    const sessionDate = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const summary = `### ${sessionDate}\n\n${lines.length} turns processed.\n\n`;
    
    const todayFile = getTodayMemoryFile(memoryDir);
    const fd = openSync(todayFile, 'a'); writeSync(fd, summary); closeSync(fd);
    
    outputHookResult({});
  } catch (error) {
    console.error('Stop hook error:', (error as Error).message);
    outputHookResult({});
  }
}

if (process.argv[1]?.endsWith('stop.ts')) {
  let input = '';
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => { stop(parseHookInput(input)).catch(console.error); });
}

export { stop };
