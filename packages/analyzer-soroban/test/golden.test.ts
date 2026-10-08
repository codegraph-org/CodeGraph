import { describe, it, expect } from 'vitest';
import { SorobanAnalyzerPlugin } from '../src/plugin.js';
import { walkSafe } from '@codegraph/core';
import path from 'path';
import fs from 'fs/promises';

describe('Soroban Analyzer Golden Tests', () => {
  const plugin = new SorobanAnalyzerPlugin();

  const runFixture = async (fixturePath: string) => {
    const root = path.resolve(__dirname, '../../../fixtures', fixturePath);
    const { files } = await walkSafe(root);
    return plugin.analyze(files);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalize = (graph: any) => {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodes: graph.nodes.map((n: any) => ({ ...n, id: n.id.split('_').slice(0, 3).join('_') })).sort((a: any, b: any) => a.id.localeCompare(b.id)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      edges: graph.edges.map((e: any) => ({ ...e, id: e.id.split('_').slice(0, 3).join('_'), from: e.from.split('_').slice(0, 3).join('_') })).sort((a: any, b: any) => a.id.localeCompare(b.id))
    };
  };

  it('should analyze soroban-single correctly', async () => {
    const result = await runFixture('soroban-single');
    const norm = normalize(result);

    expect(norm.nodes).toContainEqual(expect.objectContaining({ type: 'contract', name: 'SingleContract' }));
    expect(norm.nodes).toContainEqual(expect.objectContaining({ type: 'function', name: 'do_something' }));
    expect(norm.edges).toContainEqual(expect.objectContaining({ type: 'writes_storage' }));
    expect(norm.edges).toContainEqual(expect.objectContaining({ type: 'emits_event' }));
  });

  it('should analyze soroban-two-contracts correctly', async () => {
    const result = await runFixture('soroban-two-contracts');
    const norm = normalize(result);

    expect(norm.nodes).toContainEqual(expect.objectContaining({ type: 'contract', name: 'ContractA' }));
    expect(norm.nodes).toContainEqual(expect.objectContaining({ type: 'contract', name: 'ContractB' }));
    expect(norm.edges).toContainEqual(expect.objectContaining({ type: 'depends_on', from: 'contract-a', to: 'contract-b' }));
    expect(norm.edges).toContainEqual(expect.objectContaining({ type: 'calls', resolved: false }));
  });

  it('should analyze soroban-unresolved correctly', async () => {
    const result = await runFixture('soroban-unresolved');
    const norm = normalize(result);

    expect(norm.nodes).toContainEqual(expect.objectContaining({ type: 'contract', name: 'UnresolvedContract' }));
    expect(norm.edges).toContainEqual(expect.objectContaining({ type: 'calls', resolved: false }));
  });

  it('should resolve client targets for contract imports', async () => {
    const result = await runFixture('soroban-client-resolved');
    const norm = normalize(result);

    expect(norm.nodes).toContainEqual(expect.objectContaining({ type: 'contract', name: 'ClientContract' }));
    expect(norm.edges).toContainEqual(expect.objectContaining({
      type: 'calls',
      resolved: true,
      to: 'contract_token',
      confidence: 'medium',
      meta: { addressSource: 'runtime' }
    }));
  });

  it('should exhibit failure on soroban-failure-helpers (does not detect storage in helper)', async () => {
    const result = await runFixture('soroban-failure-helpers');
    const norm = normalize(result);
    // Should detect contract and function, but no storage edges
    expect(norm.nodes).toContainEqual(expect.objectContaining({ type: 'contract', name: 'HelperContract' }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(norm.edges.some((e: any) => e.type === 'writes_storage')).toBe(false);
  });

  it('should exhibit failure on soroban-failure-macros (does not detect contract in macro)', async () => {
    const result = await runFixture('soroban-failure-macros');
    const norm = normalize(result);
    // AST doesn't expand macros easily in tree-sitter without preprocessor
    expect(norm.nodes.length).toBe(0);
  });

  it('should exhibit failure on soroban-failure-clients (does not detect client call)', async () => {
    const result = await runFixture('soroban-failure-clients');
    const norm = normalize(result);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(norm.edges.some((e: any) => e.type === 'calls')).toBe(false);
  });

  it('should analyze soroban-failure-workspace', async () => {
    const result = await runFixture('soroban-failure-workspace');
    const norm = normalize(result);
    expect(norm.nodes).toContainEqual(expect.objectContaining({ type: 'contract', name: 'ContractA' }));
  });

  it('should generate stable IDs across line number changes', async () => {
    // We run analysis directly on a string by overriding fs temporarily or just writing a temp file
    const fs = await import('fs/promises');
    const tmpFile = path.resolve(__dirname, '../../../fixtures/tmp_stable.rs');
    const code1 = `
      #[contract] pub struct C;
      #[contractimpl] impl C { pub fn foo() { env.storage().instance().set(1, 1); } }
    `;
    const code2 = `
      // some new lines added



      #[contract] pub struct C;
      #[contractimpl] impl C { pub fn foo() { env.storage().instance().set(1, 1); } }
    `;
    
    await fs.writeFile(tmpFile, code1);
    const result1 = await plugin.analyze([tmpFile]);
    
    await fs.writeFile(tmpFile, code2);
    const result2 = await plugin.analyze([tmpFile]);
    
    await fs.rm(tmpFile);
    
    expect(result1.nodes.map(n => n.id)).toEqual(result2.nodes.map(n => n.id));
    expect(result1.edges.map(e => e.id)).toEqual(result2.edges.map(e => e.id));
    // Verify line numbers did actually change to prove the test is valid
    expect(result1.nodes[0].span.startLine).not.toEqual(result2.nodes[0].span.startLine);
  });

  it('matches canonical golden snapshot for soroban-single', async () => {
    const result = await runFixture('soroban-single');
    const snapshotPath = path.resolve(__dirname, '../../../fixtures/golden/soroban-single.graph.json');
    const snapshotRaw = await fs.readFile(snapshotPath, 'utf-8');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const golden = JSON.parse(snapshotRaw);

    expect(result.nodes.length).toBe(golden.nodes.length);
    expect(result.edges.length).toBe(golden.edges.length);
    expect(result.nodes.map(n => ({ type: n.type, name: n.name }))).toEqual(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      golden.nodes.map((n: any) => ({ type: n.type, name: n.name }))
    );
    expect(result.edges.map(e => ({ type: e.type, resolved: e.resolved }))).toEqual(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      golden.edges.map((e: any) => ({ type: e.type, resolved: e.resolved }))
    );
  });
});

