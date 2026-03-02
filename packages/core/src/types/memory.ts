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
