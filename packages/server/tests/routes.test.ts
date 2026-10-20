import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Server API Endpoints', () => {
  it('GET /health returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /api/levels returns list of manifests', async () => {
    const res = await request(app).get('/api/levels');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('POST /api/solve validates request and solves level', async () => {
    const levelsRes = await request(app).get('/api/levels');
    const levelId = levelsRes.body[0].id;

    const res = await request(app)
      .post('/api/solve')
      .send({
        levelId,
        algorithm: 'bfs',
        deadlockDetection: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.algorithm).toBe('bfs');
    expect(res.body.solved).toBe(true);
    expect(Array.isArray(res.body.path)).toBe(true);
  });

  it('POST /api/solve returns 404 for unknown level', async () => {
    const res = await request(app)
      .post('/api/solve')
      .send({
        levelId: 'non-existent-level-id-xyz',
        algorithm: 'astar',
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/compare executes all 4 algorithms', async () => {
    const levelsRes = await request(app).get('/api/levels');
    const levelId = levelsRes.body[0].id;

    const res = await request(app)
      .post('/api/compare')
      .send({
        levelId,
        deadlockDetection: true,
      });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(4);
    const algos = res.body.map((r: { algorithm: string }) => r.algorithm);
    expect(algos).toEqual(['bfs', 'dfs', 'greedy', 'astar']);
  });
});
