#!/usr/bin/env node
import { Command } from 'commander';
import { walkSafe, GraphBuilder } from '@codegraph/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createRequire } from 'module';

// Read the version from package.json so `--version` cannot drift from the
// published package metadata.
const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const program = new Command();

const formatError = (message: string) => {
  const redBold = (text: string) => `\x1b[31m\x1b[1m${text}\x1b[0m`;
  return `${redBold('Error:')} ${message}`;
};

program
  .name('codegraph')
  .description('CodeGraph - Interactive architecture graph for Stellar/Soroban')
  .version(version, '-v, --version', 'output the current version');

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
  .command('check')
  .description('Run architectural heuristics and health checks against a graph JSON')
  .argument('<graphJson>', 'Path to graph JSON file')
  .option('--fail-on <heuristics>', 'Comma-separated heuristic IDs that cause a non-zero exit code')
  .option('--strict', 'Fail with exit code 1 if any heuristic finding is detected', false)
  .option('--format <format>', 'Output format: text or json', 'text')
  .action(async (graphJson, options) => {
    try {
      const fullPath = path.resolve(process.cwd(), graphJson);
      let graphData;
      try {
        graphData = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
      } catch (readErr: unknown) {
        throw new Error(`Unable to read or parse graph JSON at ${fullPath}: ${readErr instanceof Error ? readErr.message : String(readErr)}`);
      }

      let heuristics = graphData.heuristics;
      if (!heuristics || !Array.isArray(heuristics)) {
        const { runHeuristics } = await import('@codegraph/core');
        heuristics = runHeuristics(graphData);
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(heuristics, null, 2));
      } else {
        console.log(`\nRunning health checks on: ${path.basename(fullPath)}`);
        console.log('='.repeat(50));
        if (heuristics.length === 0) {
          console.log('\x1b[32m✔ All health checks passed! No issues detected.\x1b[0m\n');
        } else {
          for (const h of heuristics) {
            const countBadge = `\x1b[33m[${h.count} finding${h.count === 1 ? '' : 's'}]\x1b[0m`;
            console.log(`\n\x1b[1m${h.name}\x1b[0m (ID: \x1b[36m${h.id}\x1b[0m) ${countBadge}`);
            console.log(`  ${h.description}`);
            if (h.evidence && h.evidence.length > 0) {
              console.log('  Evidence:');
              for (const ev of h.evidence.slice(0, 5)) {
                const loc = ev.line ? `:${ev.line}` : '';
                console.log(`    - ${ev.detail} (\x1b[90m${ev.file}${loc}\x1b[0m)`);
              }
              if (h.evidence.length > 5) {
                console.log(`    ... and ${h.evidence.length - 5} more.`);
              }
            }
            if (h.falsePositiveNote) {
              console.log(`  \x1b[90mNote: ${h.falsePositiveNote}\x1b[0m`);
            }
          }
          console.log('\n' + '='.repeat(50));
        }
      }

      const failOnList = options.failOn
        ? options.failOn.split(',').map((s: string) => s.trim().toLowerCase())
        : [];

      let shouldFail = false;
      const failedReasons: string[] = [];

      for (const h of heuristics) {
        if (h.count > 0) {
          if (options.strict) {
            shouldFail = true;
            failedReasons.push(`${h.id} (${h.count} findings, --strict enabled)`);
          } else if (failOnList.includes(h.id.toLowerCase()) || failOnList.includes('all')) {
            shouldFail = true;
            failedReasons.push(`${h.id} (${h.count} findings, matches --fail-on)`);
          }
        }
      }

      if (shouldFail) {
        console.error(`\n\x1b[31m\x1b[1mFAILED:\x1b[0m Health check failed on: ${failedReasons.join(', ')}`);
        process.exit(1);
      }
    } catch (err: unknown) {
      console.error(formatError(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

program
  .command('export')
  .description('Export the graph in a different format (mermaid, dot)')
  .argument('<graphJson>', 'Path to graph JSON file')
  .option('-f, --format <format>', 'Export format (mermaid, dot)', 'mermaid')
  .option('-o, --out <file>', 'Output file')
  .action(async (graphJson, options) => {
    try {
      const graphData = JSON.parse(await fs.readFile(graphJson, 'utf-8'));
      const format = options.format.toLowerCase();
      if (format === 'mermaid') {
        const { generateMermaid } = await import('./docs.js');
        const mermaid = generateMermaid(graphData);
        const out = options.out || 'graph.mermaid';
        await fs.writeFile(out, mermaid, 'utf-8');
        console.log(`Graph exported as Mermaid to ${out}`);
      } else if (format === 'dot') {
        const { generateDot } = await import('./docs.js');
        const dot = generateDot(graphData);
        const out = options.out || 'graph.dot';
        await fs.writeFile(out, dot, 'utf-8');
        console.log(`Graph exported as DOT to ${out}`);
      } else {
        throw new Error(`Unsupported format: ${options.format}. Supported formats: mermaid, dot`);
      }
    } catch (err: unknown) {
      console.error(formatError(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

program.parse();
