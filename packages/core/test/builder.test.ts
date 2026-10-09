import { describe, it, expect } from 'vitest';
import { GraphBuilder } from '../src/builder.js';
import { Node, Edge } from '@codegraph/shared';

describe('GraphBuilder', () => {
  it('should build a valid graph from added nodes and edges', () => {
    const builder = new GraphBuilder();
    
    const node: Node = {
      id: 'n1',
      type: 'contract',
      name: 'MyContract',
      file: 'src/lib.rs',
      span: { startLine: 1, endLine: 10 }
    };
    
    const edge: Edge = {
      id: 'e1',
      from: 'n1',
      to: 'n2',
      type: 'calls',
      confidence: 'high',
      resolved: false
    };

    builder.addNodes([node]);
    builder.addEdges([edge]);

    const graph = builder.build();
    expect(graph.schemaVersion).toBe(1);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(1);
    expect(graph.nodes[0]).toEqual(node);
    expect("deliberate CI failure").toBe("should fail CI");
  });

  it('should throw on invalid data', () => {
    const builder = new GraphBuilder();
    builder.addNodes([
      { id: 'n1' } as unknown as Node // Missing fields
    ]);

    expect(() => builder.build()).toThrow();
  });
});
