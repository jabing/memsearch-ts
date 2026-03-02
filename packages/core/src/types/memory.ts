/**
 * Memory types for the Triple Memory system
 * Defines relation types and memory structures for the in-memory graph engine
 */

/**
 * Supported relation types between memory units
 */
export type RelationType =
  | 'is_a'
  | 'has_part'
  | 'instance_of'
  | 'depends_on'
  | 'uses'
  | 'implements'
  | 'related_to'
  | 'similar_to'
  | 'causes'
  | 'prevents'
  | 'precedes'
  | 'follows';

/**
 * Memory relation representation
 */
export interface MemoryRelation {
  /** Unique identifier for the relation */
  id: string;
  /** Type of relation */
  type: RelationType;
  /** Target memory unit ID */
  targetId: string;
  /** Weight/strength of the relation (0-1) */
  weight: number;
  /** Confidence score (0-1), optional */
  confidence?: number;
  /** Whether this relation was inferred, optional */
  inferred?: boolean;
}

/**
 * Direction for traversing relations
 */
export type TraversalDirection = 'outgoing' | 'incoming' | 'both';

/**
 * Options for getting neighbors in the graph
 */
export interface NeighborOptions {
  /** Maximum depth to traverse (default: 1) */
  depth?: number;
  /** Filter by specific relation types */
  relationTypes?: RelationType[];
  /** Direction of traversal (default: 'outgoing') */
  direction?: TraversalDirection;
}

/**
 * Options for path finding
 */
export interface PathOptions {
  /** Maximum depth to search (default: 10) */
  maxDepth?: number;
  /** Filter by specific relation types */
  relationTypes?: RelationType[];
  /** Direction of traversal (default: 'outgoing') */
  direction?: TraversalDirection;
}

/**
 * Memory types for the Triple Memory system
 */
export type MemoryType = 'semantic' | 'episodic' | 'procedural' | 'chunk';

/**
 * Node types for semantic memory
 */
export type SemanticNodeType = 'concept' | 'entity' | 'rule' | 'pattern' | 'api' | 'type';

/**
 * Episode types for episodic memory
 */
export type EpisodeType = 'task_execution' | 'error_recovery' | 'learning' | 'decision' | 'exploration';

/**
 * Skill types for procedural memory
 */
export type SkillType = 'workflow' | 'template' | 'pattern' | 'heuristic' | 'macro';

/**
 * Base memory interface shared by all memory types
 */
export interface BaseMemory {
  id: string;
  memoryType: MemoryType;
  content: string;
  embedding?: number[];
  source?: string;
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  importance: number;
}

/**
 * Semantic memory: concepts, entities, rules, patterns
 */
export interface SemanticMemory extends BaseMemory {
  memoryType: 'semantic';
  nodeType: SemanticNodeType;
  label: string;
  data: {
    properties?: Record<string, unknown>;
    source?: {
      type: 'documentation' | 'code' | 'conversation' | 'learning';
      uri?: string;
      line?: number;
    };
  };
  relations: MemoryRelation[];
}

/**
 * Episodic memory: task executions, experiences
 */
export interface EpisodicMemory extends BaseMemory {
  memoryType: 'episodic';
  data: {
    episodeType: EpisodeType;
    timestamp: number;
    duration?: number;
    context: {
      task?: { id: string; prompt: string };
      environment?: { cwd?: string; files?: string[] };
    };
    actions: Array<{
      action: string;
      actionType: string;
      success: boolean;
      timestamp: number;
    }>;
    outcome: {
      status: 'success' | 'failure' | 'partial' | 'cancelled';
      summary: string;
      metrics?: Record<string, number>;
    };
    lessons: Array<{
      type: 'success_pattern' | 'failure_pattern' | 'best_practice';
      description: string;
    }>;
  };
  relations: {
    relatedEpisodes: string[];
    involvedConcepts: string[];
    usedSkills: string[];
  };
}

/**
 * Procedural memory: skills, workflows, heuristics
 */
export interface ProceduralMemory extends BaseMemory {
  memoryType: 'procedural';
  label: string;
  data: {
    skillType: SkillType;
    description: string;
    triggers: Array<{
      type: 'keyword' | 'context' | 'event';
      condition: string;
      priority: number;
    }>;
    steps: Array<{
      order: number;
      action: string;
      actionType: string;
      parameters?: Record<string, unknown>;
    }>;
    stats: {
      totalExecutions: number;
      successCount: number;
      successRate: number;
      avgDuration: number;
      lastExecuted?: number;
    };
    evolution: {
      version: number;
      generation: number;
      parentSkill?: string;
      fitnessScore: number;
    };
    dependencies: {
      requiredSkills: string[];
      requiredConcepts: string[];
    };
  };
}

/**
 * Union type for all memory types
 */
export type Memory = SemanticMemory | EpisodicMemory | ProceduralMemory;

/**
 * Input for creating/updating a relation
 */
export interface RelationInput {
  type: RelationType;
  targetId: string;
  weight?: number;
  confidence?: number;
}

/**
 * Input for creating a memory
 */
export interface MemoryInput {
  type: 'semantic' | 'episodic' | 'procedural';
  content: string;
  label?: string;
  nodeType?: SemanticNodeType;
  data?: Record<string, unknown>;
  relations?: RelationInput[];
  importance?: number;
  source?: string;
}

/**
 * Options for searching memories
 */
export interface MemorySearchOptions {
  topK?: number;
  memoryType?: 'semantic' | 'episodic' | 'procedural';
  nodeType?: SemanticNodeType;
  filter?: string;
  includeRelations?: boolean;
}

/**
 * Result from memory search
 */
export interface MemorySearchResult {
  memory: Memory;
  score: number;
  path?: Memory[];
}

/**
 * Statistics about memory collection
 */
export interface MemoryStats {
  total: number;
  byType: {
    semantic: number;
    episodic: number;
    procedural: number;
    chunk: number;
  };
  avgImportance: number;
}

