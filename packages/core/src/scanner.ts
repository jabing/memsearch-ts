/**
 * File scanner - find markdown files in directories
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ScannedFile } from './types/index.js';
import { FileSystemError } from './types/errors.js';

/**
 * Scan paths for markdown files
 */
export async function scanPaths(paths: string[]): Promise<ScannedFile[]> {
  const files: ScannedFile[] = [];

  for (const p of paths) {
    const resolvedPath = path.resolve(p);
    
    if (!fs.existsSync(resolvedPath)) {
      throw new FileSystemError(`Path does not exist: ${resolvedPath}`);
    }

    const stats = fs.statSync(resolvedPath);

    if (stats.isFile()) {
      if (isMarkdownFile(resolvedPath)) {
        files.push(createScannedFile(resolvedPath));
      }
    } else if (stats.isDirectory()) {
      const dirFiles = await scanDirectory(resolvedPath);
      files.push(...dirFiles);
    }
  }

  return files;
}

/**
 * Scan directory recursively for markdown files
 */
async function scanDirectory(dirPath: string): Promise<ScannedFile[]> {
  const files: ScannedFile[] = [];
  
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const dirFiles = await scanDirectory(fullPath);
        files.push(...dirFiles);
      } else if (entry.isFile() && isMarkdownFile(fullPath)) {
        files.push(createScannedFile(fullPath));
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }

  return files;
}

/**
 * Check if file is markdown
 */
function isMarkdownFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.md' || ext === '.markdown';
}

/**
 * Create ScannedFile from path
 */
function createScannedFile(filePath: string): ScannedFile {
  const stats = fs.statSync(filePath);
  return {
    path: filePath,
    mtime: stats.mtimeMs,
    size: stats.size,
  };
}
