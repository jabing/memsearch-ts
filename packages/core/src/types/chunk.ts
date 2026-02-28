import { Chunk } from './index.js';

/**
 * Compute composite chunk ID matching OpenClaw's format
 * hash(source:startLine:endLine:contentHash:model)
 */
export function computeChunkId(
  source: string,
  startLine: number,
  endLine: number,
  contentHash: string,
  model: string
): string {
  const raw = `markdown:${source}:${startLine}:${endLine}:${contentHash}:${model}`;
  return sha256Sync(raw).substring(0, 16);
}

/**
 * Compute SHA-256 hash of text (sync version for Node.js)
 */
export function sha256Sync(text: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(text, 'utf-8').digest('hex');
}

/**
 * Compute content hash for a chunk
 */
export function computeContentHash(content: string): string {
  return sha256Sync(content).substring(0, 16);
}
