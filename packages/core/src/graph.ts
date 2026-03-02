/**
 * In-memory graph engine for storing and querying memory relations
 * Uses adjacency list structure for efficient sparse graph operations
 *
 * Performance characteristics:
 * - Space: O(V + E) where V = nodes, E = edges
 * - 1-hop neighbor: O(degree)
 * - BFS traversal: O(V + E)
 * - Shortest path: O(V + E) using BFS
 */

import type {
  RelationType,
  TraversalDirection,
  NeighborOptions,
  PathOptions,
} from './types/memory.js';

/**
 * Represents a node in the memory graph
 */
export interface GraphNode {
  /** Unique identifier */
  id: string;
  /** Optional metadata */
  data?: Record<string, unknown>;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Represents an edge (relation) in the memory graph
 */
export interface GraphEdge {
  /** Unique identifier for the edge */
  id: string;
  /** Source node ID */
  fromId: string;
  /** Target node ID */
  toId: string;
  /** Type of relation */
  type: RelationType;
  /** Weight/strength of the relation */
  weight: number;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Serialized format for the graph
 */
interface SerializedGraph {
  nodes: Array<[string, GraphNode]>;
  edges: GraphEdge[];
}

/**
 * In-memory graph for storing memory relations
 * Optimized for sparse graphs with efficient neighbor queries
 */
export class MemoryGraph {
  /** Map of node ID to node data */
  private nodes: Map<string, GraphNode>;

  /**
   * Adjacency list: Map<sourceId, Map<targetId, edges[]>>
   * Stores edges between pairs of nodes for O(1) edge lookup
   */
  private adjacencyList: Map<string, Map<string, GraphEdge[]>>;

  /** Map of edge ID to edge data */
  private edges: Map<string, GraphEdge>;

  /** Counter for generating unique edge IDs */
  private edgeCounter: number;

  constructor() {
    this.nodes = new Map();
    this.adjacencyList = new Map();
    this.edges = new Map();
    this.edgeCounter = 0;
  }

  // ============================================================================
  // Node Operations
  // ============================================================================

  /**
   * Add a node to the graph
   * @param id - Unique identifier for the node
   * @param data - Optional metadata to attach to the node
   */
  addNode(id: string, data?: Record<string, unknown>): void {
    if (this.nodes.has(id)) {
      // Update data if node exists
      const node = this.nodes.get(id)!;
      if (data) {
        node.data = { ...node.data, ...data };
      }
      return;
    }

    this.nodes.set(id, {
      id,
      data,
      createdAt: Date.now(),
    });

    // Initialize adjacency list entry
    if (!this.adjacencyList.has(id)) {
      this.adjacencyList.set(id, new Map());
    }
  }

  /**
   * Remove a node and all its connected edges from the graph
   * @param id - Node ID to remove
   */
  removeNode(id: string): void {
    if (!this.nodes.has(id)) return;

    // Remove all edges connected to this node
    const edgesToRemove: string[] = [];

    for (const [edgeId, edge] of this.edges) {
      if (edge.fromId === id || edge.toId === id) {
        edgesToRemove.push(edgeId);
      }
    }

    for (const edgeId of edgesToRemove) {
      this.removeEdge(edgeId);
    }

    // Remove node
    this.nodes.delete(id);

    // Remove from adjacency list
    this.adjacencyList.delete(id);

    // Remove references from other nodes' adjacency lists
    for (const [, targets] of this.adjacencyList) {
      targets.delete(id);
    }
  }

  /**
   * Get a node by ID
   * @param id - Node ID
   * @returns The node or undefined if not found
   */
  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Check if a node exists
   * @param id - Node ID
   * @returns true if node exists
   */
  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  // ============================================================================
  // Edge Operations
  // ============================================================================

  /**
   * Add an edge (relation) between two nodes
   * @param fromId - Source node ID
   * @param toId - Target node ID
   * @param relation - Edge properties (type, weight, confidence)
   * @returns The generated edge ID
   */
  addEdge(
    fromId: string,
    toId: string,
    relation: Omit<GraphEdge, 'id' | 'fromId' | 'toId' | 'createdAt'>
  ): string {
    // Ensure nodes exist
    if (!this.nodes.has(fromId)) {
      this.addNode(fromId);
    }
    if (!this.nodes.has(toId)) {
      this.addNode(toId);
    }

    const edgeId = `edge_${++this.edgeCounter}`;
    const edge: GraphEdge = {
      id: edgeId,
      fromId,
      toId,
      type: relation.type,
      weight: relation.weight,
      confidence: relation.confidence,
      createdAt: Date.now(),
    };

    // Add to edges map
    this.edges.set(edgeId, edge);

    // Add to adjacency list
    if (!this.adjacencyList.has(fromId)) {
      this.adjacencyList.set(fromId, new Map());
    }
    const sourceMap = this.adjacencyList.get(fromId)!;
    if (!sourceMap.has(toId)) {
      sourceMap.set(toId, []);
    }
    sourceMap.get(toId)!.push(edge);

    return edgeId;
  }

  /**
   * Remove an edge by ID
   * @param edgeId - Edge ID to remove
   * @returns true if edge was removed
   */
  removeEdge(edgeId: string): boolean {
    const edge = this.edges.get(edgeId);
    if (!edge) return false;

    // Remove from edges map
    this.edges.delete(edgeId);

    // Remove from adjacency list
    const sourceMap = this.adjacencyList.get(edge.fromId);
    if (sourceMap) {
      const targetEdges = sourceMap.get(edge.toId);
      if (targetEdges) {
        const index = targetEdges.findIndex((e) => e.id === edgeId);
        if (index !== -1) {
          targetEdges.splice(index, 1);
          // Clean up empty arrays
          if (targetEdges.length === 0) {
            sourceMap.delete(edge.toId);
          }
        }
      }
    }

    return true;
  }

  /**
   * Get an edge by ID
   * @param edgeId - Edge ID
   * @returns The edge or undefined if not found
   */
  getEdge(edgeId: string): GraphEdge | undefined {
    return this.edges.get(edgeId);
  }

  /**
   * Get all edges between two nodes
   * @param fromId - Source node ID
   * @param toId - Target node ID
   * @returns Array of edges between the nodes
   */
  getEdgesBetween(fromId: string, toId: string): GraphEdge[] {
    const sourceMap = this.adjacencyList.get(fromId);
    if (!sourceMap) return [];
    return sourceMap.get(toId) || [];
  }

  // ============================================================================
  // Relation Queries
  // ============================================================================

  /**
   * Get relations for a node
   * @param id - Node ID
   * @param options - Query options (direction, relationTypes)
   * @returns Array of matching edges
   */
  getRelations(
    id: string,
    options?: {
      direction?: TraversalDirection;
      relationTypes?: RelationType[];
    }
  ): GraphEdge[] {
    const { direction = 'outgoing', relationTypes } = options || {};
    const result: GraphEdge[] = [];

    if (!this.nodes.has(id)) return result;

    if (direction === 'outgoing' || direction === 'both') {
      const sourceMap = this.adjacencyList.get(id);
      if (sourceMap) {
        for (const edges of sourceMap.values()) {
          for (const edge of edges) {
            if (!relationTypes || relationTypes.includes(edge.type)) {
              result.push(edge);
            }
          }
        }
      }
    }

    if (direction === 'incoming' || direction === 'both') {
      // Scan all edges for incoming
      for (const edge of this.edges.values()) {
        if (edge.toId === id && edge.fromId !== id) {
          if (!relationTypes || relationTypes.includes(edge.type)) {
            // Avoid duplicates in 'both' mode
            if (direction === 'both' && edge.fromId === id) continue;
            result.push(edge);
          }
        }
      }
    }

    return result;
  }

  // ============================================================================
  // Graph Traversal
  // ============================================================================

  /**
   * Get edges for a node in a specific direction
   * @private
   */
  private getEdgesForDirection(
    nodeId: string,
    direction: TraversalDirection,
    relationTypes?: RelationType[]
  ): GraphEdge[] {
    const edges: GraphEdge[] = [];

    if (direction === 'outgoing' || direction === 'both') {
      const sourceMap = this.adjacencyList.get(nodeId);
      if (sourceMap) {
        for (const targetEdges of sourceMap.values()) {
          for (const edge of targetEdges) {
            if (!relationTypes || relationTypes.includes(edge.type)) {
              edges.push(edge);
            }
          }
        }
      }
    }

    if (direction === 'incoming' || direction === 'both') {
      for (const edge of this.edges.values()) {
        if (edge.toId === nodeId) {
          if (!relationTypes || relationTypes.includes(edge.type)) {
            if (direction === 'both' && edge.fromId === nodeId) continue;
            edges.push(edge);
          }
        }
      }
    }

    return edges;
  }

  /**
   * Get all neighbors within a specified depth using BFS
   * @param id - Starting node ID
   * @param options - Traversal options (depth, relationTypes, direction)
   * @returns Array of neighbor node IDs
   */
  getNeighbors(id: string, options: NeighborOptions = {}): string[] {
    const { depth = 1, relationTypes, direction = 'outgoing' } = options;

    if (!this.nodes.has(id)) return [];

    const visited = new Set<string>([id]);
    const queue: Array<{ id: string; currentDepth: number }> = [{ id, currentDepth: 0 }];
    const neighbors: string[] = [];

    while (queue.length > 0) {
      const { id: currentId, currentDepth } = queue.shift()!;

      if (currentDepth >= depth) continue;

      const edges = this.getEdgesForDirection(currentId, direction, relationTypes);

      for (const edge of edges) {
        const neighborId = edge.fromId === currentId ? edge.toId : edge.fromId;

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          neighbors.push(neighborId);
          queue.push({ id: neighborId, currentDepth: currentDepth + 1 });
        }
      }
    }

    return neighbors;
  }

  /**
   * Find the shortest path between two nodes using BFS
   * @param fromId - Starting node ID
   * @param toId - Target node ID
   * @param options - Path options (maxDepth, relationTypes, direction)
   * @returns Array of node IDs representing the path, or null if no path exists
   */
  findPath(fromId: string, toId: string, options: PathOptions = {}): string[] | null {
    const { maxDepth = 10, relationTypes, direction = 'outgoing' } = options;

    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) return null;
    if (fromId === toId) return [fromId];

    const visited = new Set<string>([fromId]);
    const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }];

    while (queue.length > 0) {
      const { id: currentId, path } = queue.shift()!;

      if (path.length > maxDepth) continue;

      const edges = this.getEdgesForDirection(currentId, direction, relationTypes);

      for (const edge of edges) {
        const neighborId = direction === 'incoming' ? edge.fromId : edge.toId;

        if (neighborId === toId) {
          return [...path, neighborId];
        }

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({ id: neighborId, path: [...path, neighborId] });
        }
      }
    }

    return null;
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  /**
   * Serialize the graph to JSON
   * @returns JSON string representation
   */
  toJson(): string {
    const data: SerializedGraph = {
      nodes: Array.from(this.nodes.entries()),
      edges: Array.from(this.edges.values()),
    };
    return JSON.stringify(data);
  }

  /**
   * Load graph from JSON
   * @param json - JSON string representation
   */
  loadFromJson(json: string): void {
    const data: SerializedGraph = JSON.parse(json);
    this.clear();

    // Restore nodes
    for (const [id, node] of data.nodes) {
      this.nodes.set(id, node);
    }

    // Restore edges
    for (const edge of data.edges) {
      this.edges.set(edge.id, edge);

      // Rebuild adjacency list
      if (!this.adjacencyList.has(edge.fromId)) {
        this.adjacencyList.set(edge.fromId, new Map());
      }
      const sourceMap = this.adjacencyList.get(edge.fromId)!;
      if (!sourceMap.has(edge.toId)) {
        sourceMap.set(edge.toId, []);
      }
      sourceMap.get(edge.toId)!.push(edge);

      // Update counter to avoid ID collisions
      const edgeNum = parseInt(edge.id.replace('edge_', ''), 10);
      if (edgeNum > this.edgeCounter) {
        this.edgeCounter = edgeNum;
      }
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Get the size of the graph
   * @returns Object with node and edge counts
   */
  size(): { nodes: number; edges: number } {
    return {
      nodes: this.nodes.size,
      edges: this.edges.size,
    };
  }

  /**
   * Clear all nodes and edges
   */
  clear(): void {
    this.nodes.clear();
    this.adjacencyList.clear();
    this.edges.clear();
    this.edgeCounter = 0;
  }

  /**
   * Get all node IDs
   * @returns Array of node IDs
   */
  getNodeIds(): string[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * Get all edges
   * @returns Array of all edges
   */
  getAllEdges(): GraphEdge[] {
    return Array.from(this.edges.values());
  }
}
