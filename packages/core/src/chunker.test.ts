import { describe, it, expect } from 'vitest';
import { chunkMarkdown, computeChunkId, computeContentHash } from './chunker.js';

describe('chunkMarkdown', () => {
  it('should split markdown by headings', () => {
    const md = '# Title\n\nContent 1\n\n## Section\n\nContent 2';
    const chunks = chunkMarkdown(md, { source: 'test.md' });
    
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].heading).toBe('Title');
  });

  it('should handle empty content', () => {
    const chunks = chunkMarkdown('', { source: 'test.md' });
    expect(chunks.length).toBe(0);
  });

  it('should compute content hashes', () => {
    const md = '# Test\n\nContent';
    const chunks = chunkMarkdown(md, { source: 'test.md' });
    
    chunks.forEach(chunk => {
      expect(chunk.contentHash).toBeDefined();
      expect(chunk.contentHash.length).toBeGreaterThan(0);
    });
  });

  it('should track line numbers', () => {
    const md = '# Title\n\nLine 3\n\nLine 5';
    const chunks = chunkMarkdown(md, { source: 'test.md' });
    
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBeGreaterThanOrEqual(chunks[0].startLine);
  });
});

describe('computeChunkId', () => {
  it('should generate consistent IDs', () => {
    const id1 = computeChunkId('test.md', 1, 10, 'abc123', 'openai');
    const id2 = computeChunkId('test.md', 1, 10, 'abc123', 'openai');
    
    expect(id1).toBe(id2);
    expect(id1.length).toBe(16);
  });

  it('should generate different IDs for different inputs', () => {
    const id1 = computeChunkId('test.md', 1, 10, 'abc123', 'openai');
    const id2 = computeChunkId('test.md', 1, 10, 'def456', 'openai');
    
    expect(id1).not.toBe(id2);
  });
});

describe('computeContentHash', () => {
  it('should generate consistent hashes', () => {
    const hash1 = computeContentHash('test content');
    const hash2 = computeContentHash('test content');
    
    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different content', () => {
    const hash1 = computeContentHash('content 1');
    const hash2 = computeContentHash('content 2');
    
    expect(hash1).not.toBe(hash2);
  });
});
