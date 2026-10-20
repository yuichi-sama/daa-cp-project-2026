import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  Difficulty,
  LevelManifest,
  SokobanState,
  StaticBoard,
} from '@sokoban/shared';
import { parseLevel } from '@sokoban/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LoadedLevel {
  manifest: LevelManifest;
  board: StaticBoard;
  initialState: SokobanState;
}

const levelsMap = new Map<string, LoadedLevel>();

const DEFAULT_LEVEL_RAW = `####
#. #
#  #
#$ #
#@ #
####`;

/**
 * Searches candidate directory locations for `levels/manifest.json`.
 */
function findLevelsDirectory(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'levels'),
    path.resolve(process.cwd(), '../../levels'),
    path.resolve(__dirname, '../../../../levels'),
    path.resolve(__dirname, '../../../levels'),
    path.resolve(__dirname, '../../levels'),
    path.resolve(__dirname, '../levels'),
  ];

  for (const candidate of candidates) {
    const manifestPath = path.join(candidate, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Loads and parses all levels specified in manifest.json.
 * Falls back gracefully to built-in default levels if manifest.json is not found.
 */
export function initLevels(): void {
  levelsMap.clear();

  const levelsDir = findLevelsDirectory();

  if (levelsDir) {
    try {
      const manifestPath = path.join(levelsDir, 'manifest.json');
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      const rawManifestList: unknown = JSON.parse(manifestContent);

      if (Array.isArray(rawManifestList)) {
        for (const item of rawManifestList) {
          const m = item as Partial<LevelManifest> & {
            file?: string;
            board?: string[];
            ascii?: string;
          };

          if (!m.id) continue;

          let rawContent = '';
          const relativeFilePath = m.filePath || m.file;

          if (relativeFilePath) {
            // The manifest may be authored from the repository root
            // (`levels/easy/level1.txt`) or relative to the levels directory
            // (`easy/level1.txt`). Accept both forms so the API works whether
            // it is started from the workspace root or from packages/server.
            const candidates = [
              path.resolve(levelsDir, relativeFilePath),
              path.resolve(levelsDir, '..', relativeFilePath),
            ];
            const filePath = candidates.find((candidate) => fs.existsSync(candidate));
            if (filePath) {
              rawContent = fs.readFileSync(filePath, 'utf-8');
            }
          } else if (Array.isArray(m.board)) {
            rawContent = m.board.join('\n');
          } else if (typeof m.ascii === 'string') {
            rawContent = m.ascii;
          }

          if (rawContent) {
            try {
              const { board, initialState } = parseLevel(rawContent);
              const manifest: LevelManifest = {
                id: m.id,
                name: m.name ?? m.id,
                difficulty: (m.difficulty ?? 'easy') as Difficulty,
                filePath: relativeFilePath ?? '',
                boxCount: m.boxCount ?? initialState.boxes.length,
                width: m.width ?? board.width,
                height: m.height ?? board.height,
              };

              levelsMap.set(m.id, {
                manifest,
                board,
                initialState,
              });
            } catch (err) {
              console.error(`Failed to parse level ${m.id}:`, err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error reading levels manifest:', err);
    }
  }

  // If no levels were loaded, register a default fallback level
  if (levelsMap.size === 0) {
    const { board, initialState } = parseLevel(DEFAULT_LEVEL_RAW);
    const manifest: LevelManifest = {
      id: 'default-1',
      name: 'Default Push Level',
      difficulty: 'easy',
      filePath: '',
      boxCount: initialState.boxes.length,
      width: board.width,
      height: board.height,
    };
    levelsMap.set(manifest.id, { manifest, board, initialState });
  }
}

/**
 * Returns a loaded level by ID, or undefined if not found.
 */
export function getLoadedLevel(id: string): LoadedLevel | undefined {
  if (levelsMap.size === 0) {
    initLevels();
  }
  return levelsMap.get(id);
}

/**
 * Returns an array of all loaded level manifests.
 */
export function getAllLevelManifests(difficulty?: Difficulty): LevelManifest[] {
  if (levelsMap.size === 0) {
    initLevels();
  }

  const manifests = Array.from(levelsMap.values()).map((l) => l.manifest);
  if (difficulty) {
    return manifests.filter((m) => m.difficulty === difficulty);
  }
  return manifests;
}

/**
 * Direct registration of a level (useful for testing or dynamic levels).
 */
export function registerLevel(level: LoadedLevel): void {
  levelsMap.set(level.manifest.id, level);
}
