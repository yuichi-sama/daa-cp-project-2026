import express from 'express';
import cors from 'cors';
import { initLevels } from './engine/index.js';
import { levelsRouter } from './routes/levels.js';
import { solveRouter } from './routes/solve.js';
import { compareRouter } from './routes/compare.js';
import { solveStreamRouter } from './routes/solveStream.js';

// Initialize and load levels from manifest.json at server startup
initLevels();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/levels', levelsRouter);
app.use('/api/solve/stream', solveStreamRouter);
app.use('/api/solve', solveRouter);
app.use('/api/compare', compareRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Global error handler
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled server error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    res.status(500).json({ error: message });
  }
);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Only start listening if not running under a test runner (e.g. Vitest / Supertest)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Algorithmic Sokoban server listening on port ${PORT}`);
  });
}

export { app };
