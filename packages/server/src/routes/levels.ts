import { Router } from 'express';
import { LevelsQuerySchema } from '@sokoban/shared';
import { getAllLevelManifests, getLoadedLevel } from '../engine/index.js';

export const levelsRouter = Router();

/**
 * GET /api/levels
 * Query parameters: optional `?difficulty=easy|medium|hard`
 * Returns array of level manifests matching the query.
 */
levelsRouter.get('/', (req, res, next) => {
  try {
    const parseResult = LevelsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: parseResult.error.format(),
      });
      return;
    }

    const manifests = getAllLevelManifests(parseResult.data.difficulty);
    res.json(manifests);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/levels/:id
 * Returns the loaded level (manifest, board, initialState) by ID.
 */
levelsRouter.get('/:id', (req, res, next) => {
  try {
    const level = getLoadedLevel(req.params.id);
    if (!level) {
      res.status(404).json({ error: `Level not found: ${req.params.id}` });
      return;
    }
    res.json(level);
  } catch (err) {
    next(err);
  }
});
