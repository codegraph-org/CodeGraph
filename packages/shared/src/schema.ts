import { z } from 'zod';

export const NodeSchema = z.object({
  id: z.string(),
  type: z.enum(['contract', 'function', 'storage_key', 'event', 'frontend_call', 'file']),
  name: z.string(),
  file: z.string(),
  span: z.object({
    startLine: z.number(),
    endLine: z.number()
  }),
  meta: z.record(z.string(), z.any()).optional()
});

export const EdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string().nullable(),
  type: z.enum(['calls', 'reads_storage', 'writes_storage', 'emits_event', 'frontend_calls', 'depends_on']),
  confidence: z.enum(['high', 'medium', 'low']),
  resolved: z.boolean(),
  evidence: z.object({
    file: z.string(),
    line: z.number()
  }).optional(),
  meta: z.record(z.string(), z.any()).optional()
});

export const HeuristicResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  count: z.number(),
  evidence: z.array(z.object({
    file: z.string(),
    line: z.number().optional(),
    detail: z.string()
  })),
  falsePositiveNote: z.string(),
  severity: z.enum(['info', 'warning', 'error']).optional()
});

export const GraphSchema = z.object({
  schemaVersion: z.literal(1),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  heuristics: z.array(HeuristicResultSchema).optional(),
  coverage: z.object({
    filesAnalyzed: z.number(),
    skippedFiles: z.array(z.object({
      file: z.string(),
      reason: z.string()
    }))
  }).optional()
});

export type Node = z.infer<typeof NodeSchema>;
export type Edge = z.infer<typeof EdgeSchema>;
export type Graph = z.infer<typeof GraphSchema>;
export type HeuristicResult = z.infer<typeof HeuristicResultSchema>;
