import { z } from 'zod';

export const AlgorithmIdSchema = z.enum(['bfs', 'dfs', 'greedy', 'astar']);

export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);

export const SolveRequestSchema = z.object({
  levelId: z.string().min(1),
  algorithm: AlgorithmIdSchema,
  deadlockDetection: z.boolean().default(true),
  normalizePlayerPosition: z.boolean().default(false),
  maxStatesExplored: z.number().int().positive().optional(),
  maxDepth: z.number().int().positive().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export const CompareRequestSchema = z.object({
  levelId: z.string().min(1),
  deadlockDetection: z.boolean().default(true),
  normalizePlayerPosition: z.boolean().default(false),
  maxStatesExplored: z.number().int().positive().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export const LevelsQuerySchema = z.object({
  difficulty: DifficultySchema.optional(),
});

export type SolveRequest = z.infer<typeof SolveRequestSchema>;
export type CompareRequest = z.infer<typeof CompareRequestSchema>;
export type LevelsQuery = z.infer<typeof LevelsQuerySchema>;
