#!/usr/bin/env node
import { existsSync, writeFileSync, readFileSync, openSync, writeSync, closeSync } from 'fs';
import { join } from 'path';
import { parseHookInput, outputHookResult, getMemoryDir, deriveCollectionName, getTodayMemoryFile, type HookInput, type HookOutput } from './config.ts';

async function sessionStart(input: HookInput): Promise<HookOutput> {
  const projectDir = input.claude_project_dir || process.cwd();
  const memoryDir = getMemoryDir(projectDir);
  const collectionName = deriveCollectionName(projectDir);
  
  try {
    const todayFile = getTodayMemoryFile(memoryDir);
    const sessionTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const sessionHeading = `\n## Session ${sessionTime}\n\n`;
    
    if (!existsSync(todayFile) || readFileSync(todayFile, 'utf-8').length === 0) {
      writeFileSync(todayFile, `# ${new Date().toISOString().split('T')[0]}\n${sessionHeading}`);
    } else {
      const fd = openSync(todayFile, 'a'); writeSync(fd, sessionHeading); closeSync(fd);
    }
    
    let recentContext = '';
    try {
      const files = [join(memoryDir, `${new Date(Date.now() - 86400000).toISOString().split('T')[0]}.md`), todayFile];
      for (const file of files) {
        if (existsSync(file)) {
          const content = readFileSync(file, 'utf-8');
          const lines = content.split('\n').slice(-15);
          recentContext += `\n\nRecent from ${file.split('/').pop()}:\n${lines.join('\n')}`;
        }
      }
    } catch {}
    
    const output: HookOutput = { systemMessage: `[memsearch] collection: ${collectionName}` };
    if (recentContext.trim()) output.additionalContext = `Recent memories:${recentContext}`;
    outputHookResult(output);
  } catch (error) {
    outputHookResult({ systemMessage: '[memsearch] Ready', errorMessage: (error as Error).message });
  }
}

if (process.argv[1]?.endsWith('session-start.ts')) {
  let input = '';
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => { sessionStart(parseHookInput(input)).catch(console.error); });
}

export { sessionStart };
