#!/usr/bin/env node
import { parseHookInput, outputHookResult, type HookInput, type HookOutput } from './config.ts';

async function userPromptSubmit(input: HookInput): Promise<HookOutput> {
  const prompt = input.prompt || '';
  if (prompt.length < 10) { outputHookResult({}); return; }
  outputHookResult({ systemMessage: '[memsearch] Memory available' });
}

if (process.argv[1]?.endsWith('user-prompt-submit.ts')) {
  let input = '';
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => { userPromptSubmit(parseHookInput(input)).catch(console.error); });
}

export { userPromptSubmit };
