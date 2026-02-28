import { describe, it, expect } from 'vitest';
import { OpenAIEmbedding } from './openai.js';

describe('OpenAIEmbedding', () => {
  it('should initialize with default model', () => {
    process.env.OPENAI_API_KEY = 'sk-test123';
    const embedder = new OpenAIEmbedding();
    
    expect(embedder.modelName).toBe('text-embedding-3-small');
    expect(embedder.dimension).toBe(1536);
  });

  it('should accept custom model', () => {
    process.env.OPENAI_API_KEY = 'sk-test123';
    const embedder = new OpenAIEmbedding({ model: 'text-embedding-3-large' });
    
    expect(embedder.modelName).toBe('text-embedding-3-large');
  });

  it('should throw without API key', () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => new OpenAIEmbedding()).toThrow();
  });
});
