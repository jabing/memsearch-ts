/**
 * Tests for MemoryGraph - In-memory graph engine for memory relations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryGraph, type GraphNode, type GraphEdge } from './graph.js';
import type { RelationType } from './types/memory.js';

describe('MemoryGraph', () => {
  let graph: MemoryGraph;

  beforeEach(() => {
    graph = new MemoryGraph();
  });

  // ============================================================================
  // Node CRUD Operations
  // ============================================================================

  describe('Node Operations', () => {
    it('should add a node', () => {
      graph.addNode('node1');
      expect(graph.hasNode('node1')).toBe(true);
      expect(graph.getNode('node1')).toBeDefined();
    });

    it('should add a node with data', () => {
      graph.addNode('node1', { name: 'Test', value: 42 });
      const node = graph.getNode('node1');
      expect(node).toBeDefined();
      expect(node?.data).toEqual({ name: 'Test', value: 42 });
    });

    it('should update node data when adding existing node', () => {
      graph.addNode('node1', { name: 'Original' });
      graph.addNode('node1', { value: 42 });
      const node = graph.getNode('node1');
      expect(node?.data).toEqual({ name: 'Original', value: 42 });
    });

    it('should remove a node', () => {
      graph.addNode('node1');
      graph.removeNode('node1');
      expect(graph.hasNode('node1')).toBe(false);
    });

    it('should remove all edges when removing a node', () => {
      graph.addNode('node1');
      graph.addNode('node2');
      graph.addEdge('node1', 'node2', { type: 'related_to', weight: 1 });
      graph.addEdge('node2', 'node1', { type: 'related_to', weight: 1 });

      graph.removeNode('node1');

      expect(graph.size()).toEqual({ nodes: 1, edges: 0 });
    });

    it('should return undefined for non-existent node', () => {
      expect(graph.getNode('nonexistent')).toBeUndefined();
    });

    it('should track creation timestamp', () => {
      const before = Date.now();
      graph.addNode('node1');
      const after = Date.now();
      const node = graph.getNode('node1');
      expect(node?.createdAt).toBeGreaterThanOrEqual(before);
      expect(node?.createdAt).toBeLessThanOrEqual(after);
    });
  });

  // ============================================================================
  // Edge CRUD Operations
  // ============================================================================

  describe('Edge Operations', () => {
    beforeEach(() => {
      graph.addNode('node1');
      graph.addNode('node2');
    });

    it('should add an edge', () => {
      const edgeId = graph.addEdge('node1', 'node2', {
        type: 'related_to',
        weight: 0.8,
      });
      expect(edgeId).toBeDefined();
      expect(graph.getEdge(edgeId)).toBeDefined();
    });

    it('should auto-create nodes when adding edge', () => {
      const edgeId = graph.addEdge('node3', 'node4', {
        type: 'related_to',
        weight: 1,
      });
      expect(graph.hasNode('node3')).toBe(true);
      expect(graph.hasNode('node4')).toBe(true);
    });

    it('should add edge with confidence', () => {
      const edgeId = graph.addEdge('node1', 'node2', {
        type: 'similar_to',
        weight: 0.9,
        confidence: 0.85,
      });
      const edge = graph.getEdge(edgeId);
      expect(edge?.confidence).toBe(0.85);
    });

    it('should remove an edge', () => {
      const edgeId = graph.addEdge('node1', 'node2', {
        type: 'related_to',
        weight: 1,
      });
      expect(graph.removeEdge(edgeId)).toBe(true);
      expect(graph.getEdge(edgeId)).toBeUndefined();
    });

    it('should return false when removing non-existent edge', () => {
      expect(graph.removeEdge('nonexistent')).toBe(false);
    });

    it('should get edges between nodes', () => {
      graph.addEdge('node1', 'node2', { type: 'related_to', weight: 1 });
      graph.addEdge('node1', 'node2', { type: 'similar_to', weight: 0.8 });

      const edges = graph.getEdgesBetween('node1', 'node2');
      expect(edges).toHaveLength(2);
    });

    it('should support multiple edges between same nodes', () => {
      const edge1 = graph.addEdge('node1', 'node2', { type: 'related_to', weight: 1 });
      const edge2 = graph.addEdge('node1', 'node2', { type: 'similar_to', weight: 0.8 });
      expect(edge1).not.toBe(edge2);
    });
  });

  // ============================================================================
  // Relation Queries
  // ============================================================================

  describe('getRelations', () => {
    beforeEach(() => {
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');
      graph.addEdge('A', 'B', { type: 'related_to', weight: 1 });
      graph.addEdge('A', 'C', { type: 'similar_to', weight: 0.8 });
      graph.addEdge('B', 'A', { type: 'depends_on', weight: 1 });
    });

    it('should get outgoing relations', () => {
      const relations = graph.getRelations('A', { direction: 'outgoing' });
      expect(relations).toHaveLength(2);
    });

    it('should get incoming relations', () => {
      const relations = graph.getRelations('A', { direction: 'incoming' });
      expect(relations).toHaveLength(1);
      expect(relations[0].type).toBe('depends_on');
    });

    it('should get both directions', () => {
      const relations = graph.getRelations('A', { direction: 'both' });
      expect(relations).toHaveLength(3);
    });

    it('should filter by relation types', () => {
      const relations = graph.getRelations('A', {
        direction: 'outgoing',
        relationTypes: ['similar_to'],
      });
      expect(relations).toHaveLength(1);
      expect(relations[0].type).toBe('similar_to');
    });
  });

  // ============================================================================
  // Neighbor Queries
  // ============================================================================

  describe('getNeighbors', () => {
    /**
     * Creates a test graph:
     *
     *     A -- B -- D
     *     |    |
     *     C -- E -- F
     *          |
     *          G
     */
    function createTestGraph(): void {
      // Nodes
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');
      graph.addNode('D');
      graph.addNode('E');
      graph.addNode('F');
      graph.addNode('G');

      // Edges
      graph.addEdge('A', 'B', { type: 'related_to', weight: 1 });
      graph.addEdge('A', 'C', { type: 'related_to', weight: 1 });
      graph.addEdge('B', 'D', { type: 'related_to', weight: 1 });
      graph.addEdge('B', 'E', { type: 'related_to', weight: 1 });
      graph.addEdge('C', 'E', { type: 'related_to', weight: 1 });
      graph.addEdge('E', 'F', { type: 'related_to', weight: 1 });
      graph.addEdge('E', 'G', { type: 'related_to', weight: 1 });
    }

    it('should get 1-hop neighbors', () => {
      createTestGraph();
      const neighbors = graph.getNeighbors('A', { depth: 1 });
      expect(neighbors.sort()).toEqual(['B', 'C']);
    });

    it('should get 2-hop neighbors', () => {
      createTestGraph();
      const neighbors = graph.getNeighbors('A', { depth: 2 });
      expect(neighbors.sort()).toEqual(['B', 'C', 'D', 'E']);
    });

    it('should get 3-hop neighbors', () => {
      createTestGraph();
      const neighbors = graph.getNeighbors('A', { depth: 3 });
      expect(neighbors.sort()).toEqual(['B', 'C', 'D', 'E', 'F', 'G']);
    });

    it('should not include starting node in results', () => {
      createTestGraph();
      const neighbors = graph.getNeighbors('A', { depth: 3 });
      expect(neighbors).not.toContain('A');
    });

    it('should return empty array for non-existent node', () => {
      const neighbors = graph.getNeighbors('nonexistent', { depth: 1 });
      expect(neighbors).toEqual([]);
    });

    it('should filter by relation types', () => {
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');
      graph.addEdge('A', 'B', { type: 'related_to', weight: 1 });
      graph.addEdge('A', 'C', { type: 'similar_to', weight: 1 });

      const neighbors = graph.getNeighbors('A', {
        depth: 1,
        relationTypes: ['similar_to'],
      });
      expect(neighbors).toEqual(['C']);
    });

    it('should handle incoming direction', () => {
      graph.addNode('A');
      graph.addNode('B');
      graph.addEdge('B', 'A', { type: 'related_to', weight: 1 });

      const neighbors = graph.getNeighbors('A', {
        depth: 1,
        direction: 'incoming',
      });
      expect(neighbors).toEqual(['B']);
    });

    it('should handle both directions', () => {
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');
      graph.addEdge('A', 'B', { type: 'related_to', weight: 1 });
      graph.addEdge('C', 'A', { type: 'related_to', weight: 1 });

      const neighbors = graph.getNeighbors('A', {
        depth: 1,
        direction: 'both',
      });
      expect(neighbors.sort()).toEqual(['B', 'C']);
    });
  });

  // ============================================================================
  // Path Finding
  // ============================================================================

  describe('findPath', () => {
    /**
     * Creates a test graph:
     *
     *     A -- B -- C -- D
     *     |         |
     *     E -- F -- G
     */
    function createPathTestGraph(): void {
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');
      graph.addNode('D');
      graph.addNode('E');
      graph.addNode('F');
      graph.addNode('G');

      graph.addEdge('A', 'B', { type: 'related_to', weight: 1 });
      graph.addEdge('B', 'C', { type: 'related_to', weight: 1 });
      graph.addEdge('C', 'D', { type: 'related_to', weight: 1 });
      graph.addEdge('A', 'E', { type: 'related_to', weight: 1 });
      graph.addEdge('E', 'F', { type: 'related_to', weight: 1 });
      graph.addEdge('F', 'G', { type: 'related_to', weight: 1 });
      graph.addEdge('C', 'G', { type: 'related_to', weight: 1 });
    }

    it('should find direct path', () => {
      createPathTestGraph();
      const path = graph.findPath('A', 'B');
      expect(path).toEqual(['A', 'B']);
    });

    it('should find multi-hop path', () => {
      createPathTestGraph();
      const path = graph.findPath('A', 'D');
      expect(path).toEqual(['A', 'B', 'C', 'D']);
    });

    it('should find shortest path', () => {
      createPathTestGraph();
      // A -> B -> C -> G is 3 hops
      // A -> E -> F -> G is also 3 hops
      // Both are same length, BFS finds first
      const path = graph.findPath('A', 'G');
      expect(path).toHaveLength(4);
      expect(path?.[0]).toBe('A');
      expect(path?.[path!.length - 1]).toBe('G');
    });

    it('should return null for disconnected nodes', () => {
      graph.addNode('A');
      graph.addNode('B');
      const path = graph.findPath('A', 'B');
      expect(path).toBeNull();
    });

    it('should return null for non-existent nodes', () => {
      const path = graph.findPath('nonexistent1', 'nonexistent2');
      expect(path).toBeNull();
    });

    it('should return single-element path for same node', () => {
      graph.addNode('A');
      const path = graph.findPath('A', 'A');
      expect(path).toEqual(['A']);
    });

    it('should respect maxDepth', () => {
      createPathTestGraph();
      // A to D is 3 hops
      const path = graph.findPath('A', 'D', { maxDepth: 2 });
      expect(path).toBeNull();
    });

    it('should filter by relation types', () => {
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');
      graph.addEdge('A', 'B', { type: 'related_to', weight: 1 });
      graph.addEdge('B', 'C', { type: 'similar_to', weight: 1 });

      // Should work without filter
      expect(graph.findPath('A', 'C')).toEqual(['A', 'B', 'C']);

      // Should fail with wrong filter
      const path = graph.findPath('A', 'C', { relationTypes: ['related_to'] });
      expect(path).toBeNull();
    });

    it('should handle incoming direction', () => {
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');
      graph.addEdge('A', 'B', { type: 'related_to', weight: 1 });
      graph.addEdge('B', 'C', { type: 'related_to', weight: 1 });

      // Forward: A -> B -> C works
      expect(graph.findPath('A', 'C')).toEqual(['A', 'B', 'C']);

      // Backward: C -> B -> A with incoming direction
      const path = graph.findPath('C', 'A', { direction: 'incoming' });
      expect(path).toEqual(['C', 'B', 'A']);
    });
  });

  // ============================================================================
  // Serialization
  // ============================================================================

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      graph.addNode('A', { name: 'Node A' });
      graph.addNode('B');
      graph.addEdge('A', 'B', { type: 'related_to', weight: 0.8 });

      const json = graph.toJson();
      const data = JSON.parse(json);

      expect(data.nodes).toHaveLength(2);
      expect(data.edges).toHaveLength(1);
    });

    it('should deserialize from JSON', () => {
      // Create original graph
      graph.addNode('A', { name: 'Node A' });
      graph.addNode('B');
      graph.addNode('C');
      const edgeId = graph.addEdge('A', 'B', { type: 'related_to', weight: 0.8 });
      graph.addEdge('B', 'C', { type: 'similar_to', weight: 0.9 });

      // Serialize
      const json = graph.toJson();

      // Create new graph and deserialize
      const newGraph = new MemoryGraph();
      newGraph.loadFromJson(json);

      // Verify
      expect(newGraph.size()).toEqual({ nodes: 3, edges: 2 });
      expect(newGraph.hasNode('A')).toBe(true);
      expect(newGraph.hasNode('B')).toBe(true);
      expect(newGraph.hasNode('C')).toBe(true);
      expect(newGraph.getEdge(edgeId)).toBeDefined();
      expect(newGraph.getNode('A')?.data).toEqual({ name: 'Node A' });
    });

    it('should preserve edge IDs after serialization', () => {
      graph.addNode('A');
      graph.addNode('B');
      const edgeId = graph.addEdge('A', 'B', { type: 'related_to', weight: 1 });

      const json = graph.toJson();
      const newGraph = new MemoryGraph();
      newGraph.loadFromJson(json);

      // After loading, the next edge should have a higher counter
      const newEdgeId = newGraph.addEdge('C', 'D', { type: 'related_to', weight: 1 });
      const oldNum = parseInt(edgeId.replace('edge_', ''), 10);
      const newNum = parseInt(newEdgeId.replace('edge_', ''), 10);
      expect(newNum).toBeGreaterThan(oldNum);
    });

    it('should handle empty graph serialization', () => {
      const json = graph.toJson();
      const newGraph = new MemoryGraph();
      newGraph.loadFromJson(json);
      expect(newGraph.size()).toEqual({ nodes: 0, edges: 0 });
    });
  });

  // ============================================================================
  // Utilities
  // ============================================================================

  describe('Utilities', () => {
    it('should return correct size', () => {
      expect(graph.size()).toEqual({ nodes: 0, edges: 0 });

      graph.addNode('A');
      graph.addNode('B');
      expect(graph.size()).toEqual({ nodes: 2, edges: 0 });

      graph.addEdge('A', 'B', { type: 'related_to', weight: 1 });
      expect(graph.size()).toEqual({ nodes: 2, edges: 1 });
    });

    it('should clear the graph', () => {
      graph.addNode('A');
      graph.addNode('B');
      graph.addEdge('A', 'B', { type: 'related_to', weight: 1 });

      graph.clear();

      expect(graph.size()).toEqual({ nodes: 0, edges: 0 });
      expect(graph.hasNode('A')).toBe(false);
    });

    it('should get all node IDs', () => {
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');

      const nodeIds = graph.getNodeIds();
      expect(nodeIds.sort()).toEqual(['A', 'B', 'C']);
    });

    it('should get all edges', () => {
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');
      graph.addEdge('A', 'B', { type: 'related_to', weight: 1 });
      graph.addEdge('B', 'C', { type: 'similar_to', weight: 0.8 });

      const edges = graph.getAllEdges();
      expect(edges).toHaveLength(2);
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should handle 1000 nodes and 3-hop query under 100ms', () => {
      // Create a graph with 1000 nodes in a grid-like structure
      const nodeCount = 1000;

      // Add nodes
      for (let i = 0; i < nodeCount; i++) {
        graph.addNode(`node_${i}`);
      }

      // Create connections: each node connects to next 3 nodes
      for (let i = 0; i < nodeCount; i++) {
        for (let j = 1; j <= 3 && i + j < nodeCount; j++) {
          graph.addEdge(`node_${i}`, `node_${i + j}`, {
            type: 'related_to',
            weight: 1,
          });
        }
      }

      // Time 3-hop neighbor query
      const start = performance.now();
      const neighbors = graph.getNeighbors('node_0', { depth: 3 });
      const elapsed = performance.now() - start;

      console.log(`3-hop neighbors from node_0: ${neighbors.length} nodes found`);
      console.log(`Query time: ${elapsed.toFixed(2)}ms`);

      expect(elapsed).toBeLessThan(100);
      expect(neighbors.length).toBeGreaterThan(0);
    });

    it('should handle path finding efficiently', () => {
      // Create a graph with 1000 nodes
      const nodeCount = 1000;

      for (let i = 0; i < nodeCount; i++) {
        graph.addNode(`node_${i}`);
      }

      // Create a linear chain
      for (let i = 0; i < nodeCount - 1; i++) {
        graph.addEdge(`node_${i}`, `node_${i + 1}`, {
          type: 'related_to',
          weight: 1,
        });
      }

      // Time path finding
      const start = performance.now();
      const path = graph.findPath('node_0', 'node_50', { maxDepth: 60 });
      const elapsed = performance.now() - start;

      console.log(`Path from node_0 to node_50: ${path?.length} hops`);
      console.log(`Path finding time: ${elapsed.toFixed(2)}ms`);

      expect(path).toHaveLength(51);
      expect(elapsed).toBeLessThan(50); // Should be fast for linear path
    });

    it('should handle serialization efficiently', () => {
      // Create graph with 1000 nodes and ~3000 edges
      const nodeCount = 1000;

      for (let i = 0; i < nodeCount; i++) {
        graph.addNode(`node_${i}`);
      }

      for (let i = 0; i < nodeCount; i++) {
        for (let j = 1; j <= 3 && i + j < nodeCount; j++) {
          graph.addEdge(`node_${i}`, `node_${i + j}`, {
            type: 'related_to',
            weight: 1,
          });
        }
      }

      // Time serialization
      const startSerialize = performance.now();
      const json = graph.toJson();
      const serializeTime = performance.now() - startSerialize;

      // Time deserialization
      const startDeserialize = performance.now();
      const newGraph = new MemoryGraph();
      newGraph.loadFromJson(json);
      const deserializeTime = performance.now() - startDeserialize;

      console.log(`Serialization time: ${serializeTime.toFixed(2)}ms`);
      console.log(`Deserialization time: ${deserializeTime.toFixed(2)}ms`);
      console.log(`JSON size: ${(json.length / 1024).toFixed(2)}KB`);

      expect(newGraph.size()).toEqual(graph.size());
      expect(serializeTime).toBeLessThan(500);
      expect(deserializeTime).toBeLessThan(500);
    });
  });
});
