/**
 * Unit tests for filter syntax converter
 */
import { describe, it, expect } from 'vitest';
import { convertFilter } from './filter-converter.js';

describe('convertFilter', () => {
  // ===========================================
  // Basic Operator Conversions
  // ===========================================
  describe('operator conversions', () => {
    it('should convert == to =', () => {
      expect(convertFilter('source == "file.md"')).toBe("source = 'file.md'");
    });

    it('should preserve != operator', () => {
      expect(convertFilter('status != "deleted"')).toBe("status != 'deleted'");
    });

    it('should handle multiple == operators', () => {
      expect(convertFilter('a == "1" and b == "2"')).toBe("a = '1' AND b = '2'");
    });
  });

  // ===========================================
  // Boolean Operator Conversions
  // ===========================================
  describe('boolean operator conversions', () => {
    it('should convert lowercase and to AND', () => {
      expect(convertFilter('a == "1" and b == "2"')).toBe("a = '1' AND b = '2'");
    });

    it('should convert uppercase AND (no change)', () => {
      expect(convertFilter('a == "1" AND b == "2"')).toBe("a = '1' AND b = '2'");
    });

    it('should convert mixed case AnD to AND', () => {
      expect(convertFilter('a == "1" AnD b == "2"')).toBe("a = '1' AND b = '2'");
    });

    it('should convert lowercase or to OR', () => {
      expect(convertFilter('a == "1" or b == "2"')).toBe("a = '1' OR b = '2'");
    });

    it('should convert uppercase OR (no change)', () => {
      expect(convertFilter('a == "1" OR b == "2"')).toBe("a = '1' OR b = '2'");
    });

    it('should handle mixed and/or', () => {
      expect(convertFilter('a == "1" and b == "2" or c == "3"')).toBe(
        "a = '1' AND b = '2' OR c = '3'"
      );
    });

    it('should not convert "and" inside identifiers', () => {
      expect(convertFilter('band_name == "rock"')).toBe("band_name = 'rock'");
    });

    it('should not convert "or" inside identifiers', () => {
      expect(convertFilter('door_type == "wood"')).toBe("door_type = 'wood'");
    });
  });

  // ===========================================
  // IN Operator Conversions
  // ===========================================
  describe('IN operator conversions', () => {
    it('should convert lowercase in to IN', () => {
      expect(convertFilter('status in ["a", "b"]')).toBe("status IN ['a', 'b']");
    });

    it('should handle IN with single value', () => {
      expect(convertFilter('chunk_hash in ["hash1"]')).toBe("chunk_hash IN ['hash1']");
    });

    it('should handle IN with multiple values', () => {
      expect(convertFilter('chunk_hash in ["hash1", "hash2", "hash3"]')).toBe(
        "chunk_hash IN ['hash1', 'hash2', 'hash3']"
      );
    });

    it('should not convert "in" inside identifiers', () => {
      expect(convertFilter('within_range == "yes"')).toBe("within_range = 'yes'");
    });
  });

  // ===========================================
  // Quote Conversions
  // ===========================================
  describe('quote conversions', () => {
    it('should convert double quotes to single quotes', () => {
      expect(convertFilter('source == "file.md"')).toBe("source = 'file.md'");
    });

    it('should preserve single quotes', () => {
      expect(convertFilter("source == 'file.md'")).toBe("source = 'file.md'");
    });

    it('should handle string with spaces', () => {
      expect(convertFilter('title == "hello world"')).toBe("title = 'hello world'");
    });

    it('should handle string with special characters', () => {
      expect(convertFilter('path == "/path/to/file.md"')).toBe("path = '/path/to/file.md'");
    });
  });

  // ===========================================
  // Complex Expressions
  // ===========================================
  describe('complex expressions', () => {
    it('should handle nested parentheses', () => {
      expect(convertFilter('(a == "1" and b == "2") or c == "3"')).toBe(
        "(a = '1' AND b = '2') OR c = '3'"
      );
    });

    it('should handle multiple conditions with IN', () => {
      expect(convertFilter('memory_type == "semantic" and label in ["redis", "db"]')).toBe(
        "memory_type = 'semantic' AND label IN ['redis', 'db']"
      );
    });

    it('should handle complex nested expression', () => {
      const input = '(a == "1" or b == "2") and (c == "3" or d == "4")';
      const expected = "(a = '1' OR b = '2') AND (c = '3' OR d = '4')";
      expect(convertFilter(input)).toBe(expected);
    });

    it('should handle real Milvus filter example', () => {
      expect(convertFilter('memory_type == "semantic" and label == "redis"')).toBe(
        "memory_type = 'semantic' AND label = 'redis'"
      );
    });
  });

  // ===========================================
  // Edge Cases
  // ===========================================
  describe('edge cases', () => {
    it('should return empty string unchanged', () => {
      expect(convertFilter('')).toBe('');
    });

    it('should return whitespace string unchanged', () => {
      expect(convertFilter('   ')).toBe('   ');
    });

    it('should handle filter without quotes', () => {
      expect(convertFilter('count > 10')).toBe('count > 10');
    });

    it('should handle filter with numbers', () => {
      expect(convertFilter('importance > 0.5')).toBe('importance > 0.5');
    });

    it('should handle filter with comparison operators', () => {
      expect(convertFilter('count >= 10 and count <= 100')).toBe('count >= 10 AND count <= 100');
    });

    it('should handle filter with not equal', () => {
      expect(convertFilter('status != "deleted"')).toBe("status != 'deleted'");
    });

    it('should not convert == inside string values', () => {
      // This tests that string content is preserved
      expect(convertFilter('code == "a == b"')).toBe("code = 'a == b'");
    });

    it('should handle filter with escaped quotes', () => {
      // Escaped double quote inside string
      expect(convertFilter('msg == "say \\"hello\\""')).toBe('msg = \'say "hello"\'');
    });
  });

  // ===========================================
  // Real-world Examples from Codebase
  // ===========================================
  describe('real-world examples', () => {
    it('should convert source filter', () => {
      expect(convertFilter('source == "file.md"')).toBe("source = 'file.md'");
    });

    it('should convert chunk_hash IN filter', () => {
      expect(convertFilter('chunk_hash in ["hash1", "hash2"]')).toBe(
        "chunk_hash IN ['hash1', 'hash2']"
      );
    });

    it('should convert memory_type filter', () => {
      expect(convertFilter('memory_type == "semantic"')).toBe("memory_type = 'semantic'");
    });

    it('should convert combined filter', () => {
      expect(convertFilter('source == "file.md" and memory_type == "semantic"')).toBe(
        "source = 'file.md' AND memory_type = 'semantic'"
      );
    });

    it('should convert deleteBySource filter format', () => {
      expect(convertFilter('source == "test.md"')).toBe("source = 'test.md'");
    });

    it('should convert deleteByHashes filter format', () => {
      expect(convertFilter('chunk_hash in ["hash1","hash2","hash3"]')).toBe(
        "chunk_hash IN ['hash1','hash2','hash3']"
      );
    });
  });
});
