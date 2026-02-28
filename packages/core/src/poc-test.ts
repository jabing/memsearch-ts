/**
 * Proof of Concept - Technical Validation
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  error?: string;
  duration: number;
  details?: string;
}

const results: TestResult[] = [];

async function testMilvusSDK(): Promise<TestResult> {
  const start = Date.now();
  try {
    const pkgPath = path.join(process.cwd(), 'node_modules', '@zilliz', 'milvus2-sdk-node', 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      return { name: 'Milvus JS SDK', status: 'pass', duration: Date.now() - start, details: `Version: ${pkg.version}` };
    }
    return { name: 'Milvus JS SDK', status: 'fail', duration: Date.now() - start, error: 'Package not found' };
  } catch (error) {
    return { name: 'Milvus JS SDK', status: 'fail', duration: Date.now() - start, error: (error as Error).message };
  }
}

async function testOpenAI(): Promise<TestResult> {
  const start = Date.now();
  if (!process.env.OPENAI_API_KEY) {
    return { name: 'OpenAI Embedding', status: 'skip', duration: Date.now() - start, details: 'OPENAI_API_KEY not set' };
  }
  try {
    const { OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.embeddings.create({ model: 'text-embedding-3-small', input: ['test'] });
    const embedding = response.data[0];
    if (embedding) {
      return { name: 'OpenAI Embedding', status: 'pass', duration: Date.now() - start, details: `Dimension: ${embedding.embedding.length}` };
    }
    return { name: 'OpenAI Embedding', status: 'fail', duration: Date.now() - start, error: 'No embedding returned' };
  } catch (error) {
    return { name: 'OpenAI Embedding', status: 'fail', duration: Date.now() - start, error: (error as Error).message };
  }
}

async function testChokidar(): Promise<TestResult> {
  const start = Date.now();
  const pkgPath = path.join(process.cwd(), 'node_modules', 'chokidar', 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return { name: 'Chokidar', status: 'pass', duration: Date.now() - start, details: `Version: ${pkg.version}` };
  }
  return { name: 'Chokidar', status: 'fail', duration: Date.now() - start, error: 'Package not found' };
}

async function runPOCTests() {
  console.log('=== memsearch-ts POC Test ===\n');
  results.push(await testMilvusSDK());
  results.push(await testOpenAI());
  results.push(await testChokidar());
  
  results.forEach(r => {
    const icon = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️';
    console.log(`${icon} ${r.name} (${r.duration}ms)`);
    if (r.details) console.log(`   ${r.details}`);
    if (r.error) console.log(`   Error: ${r.error}`);
  });

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  console.log(`\n=== Summary: ${passed} passed, ${failed} failed, ${skipped} skipped ===`);
}

runPOCTests();
