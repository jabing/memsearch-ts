import { describe, it, expect } from 'vitest';
import type {
  MemoryType,
  RelationType,
  SemanticNodeType,
  EpisodeType,
  SkillType,
  BaseMemory,
  SemanticMemory,
  EpisodicMemory,
  ProceduralMemory,
  Memory,
  MemoryRelation,
  RelationInput,
  MemoryInput,
  MemorySearchOptions,
  MemoryStats,
} from './memory.js';

describe('Memory Types', () => {
  describe('MemoryType', () => {
    it('should accept semantic', () => {
      const type: MemoryType = 'semantic';
      expect(type).toBe('semantic');
    });

    it('should accept episodic', () => {
      const type: MemoryType = 'episodic';
      expect(type).toBe('episodic');
    });

    it('should accept procedural', () => {
      const type: MemoryType = 'procedural';
      expect(type).toBe('procedural');
    });

    it('should accept chunk', () => {
      const type: MemoryType = 'chunk';
      expect(type).toBe('chunk');
    });
  });

  describe('RelationType', () => {
    it('should accept all relation types', () => {
      const types: RelationType[] = [
        'is_a',
        'has_part',
        'instance_of',
        'depends_on',
        'uses',
        'implements',
        'related_to',
        'similar_to',
        'causes',
        'prevents',
        'precedes',
        'follows',
      ];
      expect(types).toHaveLength(12);
    });
  });

  describe('SemanticNodeType', () => {
    it('should accept all node types', () => {
      const types: SemanticNodeType[] = ['concept', 'entity', 'rule', 'pattern', 'api', 'type'];
      expect(types).toHaveLength(6);
    });
  });

  describe('EpisodeType', () => {
    it('should accept all episode types', () => {
      const types: EpisodeType[] = [
        'task_execution',
        'error_recovery',
        'learning',
        'decision',
        'exploration',
      ];
      expect(types).toHaveLength(5);
    });
  });

  describe('SkillType', () => {
    it('should accept all skill types', () => {
      const types: SkillType[] = ['workflow', 'template', 'pattern', 'heuristic', 'macro'];
      expect(types).toHaveLength(5);
    });
  });

  describe('MemoryRelation', () => {
    it('should create valid relation', () => {
      const relation: MemoryRelation = {
        id: 'rel-1',
        type: 'is_a',
        targetId: 'concept-1',
        weight: 0.9,
        confidence: 0.95,
      };
      expect(relation.id).toBe('rel-1');
    });
  });

  describe('RelationInput', () => {
    it('should create valid relation input', () => {
      const input: RelationInput = {
        type: 'uses',
        targetId: 'concept-2',
        weight: 0.8,
      };
      expect(input.type).toBe('uses');
    });
  });

  describe('MemoryInput', () => {
    it('should create valid semantic memory input', () => {
      const input: MemoryInput = {
        type: 'semantic',
        content: 'JWT is a token standard',
        label: 'JWT Authentication',
        nodeType: 'concept',
        importance: 0.8,
      };
      expect(input.type).toBe('semantic');
      expect(input.label).toBe('JWT Authentication');
    });
  });

  describe('MemoryStats', () => {
    it('should create valid stats object', () => {
      const stats: MemoryStats = {
        total: 100,
        byType: {
          semantic: 40,
          episodic: 30,
          procedural: 20,
          chunk: 10,
        },
        avgImportance: 0.75,
      };
      expect(stats.total).toBe(100);
    });
  });
});
