/**
 * Markdown chunking - split markdown files into semantic chunks by headings
 */

import type { Chunk } from './types/index.js';
import { computeContentHash, computeChunkId } from './types/chunk.js';

const HEADING_RE = /^(#{1,6})\s+(.+)$/m;

export interface ChunkOptions {
  maxChunkSize?: number;
  overlapLines?: number;
  source?: string;
}

/**
 * Split markdown text into chunks
 */
export function chunkMarkdown(text: string, options: ChunkOptions = {}): Chunk[] {
  const {
    source = '',
  } = options;

  const lines = text.split('\n');
  const chunks: Chunk[] = [];

  // Find all heading positions
  const headingPositions: Array<{ line: number; level: number; title: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(HEADING_RE);
    if (match && match[1] && match[2]) {
      headingPositions.push({
        line: i,
        level: match[1].length,
        title: match[2].trim(),
      });
    }
  }

  // Build sections between headings
  const sections: Array<{ start: number; end: number; heading: string; level: number }> = [];
  
  const firstHeadingLine = headingPositions[0]?.line;
  if (headingPositions.length === 0 || firstHeadingLine !== undefined && firstHeadingLine > 0) {
    sections.push({
      start: 0,
      end: firstHeadingLine ?? lines.length,
      heading: '',
      level: 0,
    });
  }

  for (let idx = 0; idx < headingPositions.length; idx++) {
    const pos = headingPositions[idx];
    if (!pos) continue;
    const nextHeadingLine = headingPositions[idx + 1]?.line;
    sections.push({
      start: pos.line,
      end: nextHeadingLine ?? lines.length,
      heading: pos.title,
      level: pos.level,
    });
  }

  // Create chunks from sections
  for (const section of sections) {
    const sectionLines = lines.slice(section.start, section.end);
    const content = sectionLines.join('\n');

    if (content.trim()) {
      const contentHash = computeContentHash(content);
      chunks.push({
        content,
        source,
        heading: section.heading,
        headingLevel: section.level,
        startLine: section.start + 1, // 1-indexed
        endLine: section.end,
        contentHash,
      });
    }
  }

  return chunks;
}

export { computeChunkId, computeContentHash };
