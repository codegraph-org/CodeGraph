#!/usr/bin/env node
import { Command } from 'commander';
import { walkSafe, GraphBuilder } from '@codegraph/core';
import * as fs from 'fs/promises';
import * as path from 'path';

const program = new Command();

const formatError = (message: string) => {
  const redBold = (text: string) => `\x1b[31m\x1b[1m${text}\x1b[0m`;
  return `${redBold('Error:')} ${message}`;
};

program
  .name('codegraph')
  .description('CodeGraph - Interactive architecture graph for Stellar/Soroban')
  .version('0.1.0');

program
  .command('analyze')
  .description('Analyze a directory and emit a graph JSON')
  .argument('<path>', 'Directory to analyze')
  .option('-o, --out <file>', 'Output file', 'graph.json')
  .option('--max-files <number>', 'Maximum number of files to process', '10000')
  .action(async (targetPath, options) => {
    try {
      const fullPath = path.resolve(process.cwd(), targetPath);
      console.log(`Analyzing: ${fullPath}`);
      
      const maxFiles = parseInt(options.maxFiles, 10);
      const { files, skipped } = await walkSafe(fullPath, { maxFiles });
      console.log(`Found ${files.length} files.`);
      if (skipped.length > 0) {
        console.warn(`\nWARNING: Skipped ${skipped.length} files:`);
        for (const s of skipped.slice(0, 5)) {
          console.warn(`  - ${s.file} (${s.reason})`);
        }
        if (skipped.length > 5) {
          console.warn(`  ... and ${skipped.length - 5} more.`);
        }
        console.warn(''); // blank line
      }

      const builder = new GraphBuilder();
      builder.setCoverage(files.length, skipped);
      
      const { SorobanAnalyzerPlugin } = await import('@codegraph/analyzer-soroban');
      const plugins = [new SorobanAnalyzerPlugin()];

      for (const p of plugins) {
        if (await p.detect(fullPath)) {
          console.log(`Plugin ${p.name} detected, analyzing...`);
          const res = await p.analyze(files);
          builder.addNodes(res.nodes);
          builder.addEdges(res.edges);
        }
      }

      const graph = builder.build();
      
      const outPath = path.resolve(process.cwd(), options.out);
      await fs.writeFile(outPath, JSON.stringify(graph, null, 2), 'utf-8');
      
      console.log(`Graph successfully written to ${options.out}`);
    } catch (err: unknown) {
      console.error(formatError(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

program
  .command('docs')
  .description('Generate a Markdown architecture document from a graph JSON')
  .argument('<graphJson>', 'Path to graph JSON file')
  .option('-o, --out <file>', 'Output markdown file', 'ARCHITECTURE.md')
  .option('--detail <level>', 'Detail level (e.g. function)', 'contract')
  .action(async (graphJson, options) => {
    try {
      const graphData = JSON.parse(await fs.readFile(graphJson, 'utf-8'));
      const { generateMarkdownDocs } = await import('./docs.js');
      const md = generateMarkdownDocs(graphData, options.detail);
      await fs.writeFile(options.out, md, 'utf-8');
      console.log(`Documentation generated at ${options.out}`);
    } catch (err: unknown) {
      console.error(formatError(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

program
  .command('export')
  .description('Export the graph in a different format')
  .argument('<graphJson>', 'Path to graph JSON file')
  .option('-f, --format <format>', 'Export format (mermaid)', 'mermaid')
  .option('-o, --out <file>', 'Output file', 'graph.mermaid')
  .action(async (graphJson, options) => {
    try {
      const graphData = JSON.parse(await fs.readFile(graphJson, 'utf-8'));
      if (options.format === 'mermaid') {
        const { generateMermaid } = await import('./docs.js');
        const mermaid = generateMermaid(graphData);
        await fs.writeFile(options.out, mermaid, 'utf-8');
        console.log(`Graph exported as Mermaid to ${options.out}`);
      } else {
        throw new Error(`Unsupported format: ${options.format}`);
      }
    } catch (err: unknown) {
      console.error(formatError(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

program.parse();
