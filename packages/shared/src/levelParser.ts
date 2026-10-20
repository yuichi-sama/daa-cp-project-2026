import type { StaticBoard, SokobanState, Coord, Cell } from './types.js';

/**
 * Parse a standard Sokoban text level into a StaticBoard and initial SokobanState.
 *
 * Standard Sokoban text notation:
 *   # = wall
 *   @ = player on floor
 *   + = player on target
 *   $ = box on floor
 *   * = box on target
 *   . = target (empty)
 *   (space) or - = floor
 *
 * Validates:
 *   - Exactly one player
 *   - Equal number of boxes and targets
 *   - Board is rectangular (short rows are padded with floor)
 *   - At least one box and one target
 */
export function parseLevel(raw: string): { board: StaticBoard; initialState: SokobanState } {
  const lines = raw.split('\n').filter((line, idx, arr) => {
    // Remove leading/trailing empty lines but keep internal ones
    if (line.trim() === '' && idx === 0) return false;
    if (line.trim() === '' && idx === arr.length - 1) return false;
    return true;
  });

  if (lines.length === 0) {
    throw new Error('Level is empty');
  }

  // Find max width and pad short rows
  const maxWidth = Math.max(...lines.map(l => l.length));
  const paddedLines = lines.map(l => l.padEnd(maxWidth, ' '));

  const height = paddedLines.length;
  const width = maxWidth;

  const cells: Cell[][] = [];
  const targets: Coord[] = [];
  const boxes: Coord[] = [];
  let player: Coord | null = null;

  for (let y = 0; y < height; y++) {
    const row: Cell[] = [];
    const line = paddedLines[y]!;
    for (let x = 0; x < width; x++) {
      const ch = line[x] ?? ' ';
      switch (ch) {
        case '#':
          row.push('wall');
          break;
        case '@':
          row.push('floor');
          if (player !== null) throw new Error('Multiple players found in level');
          player = { x, y };
          break;
        case '+':
          row.push('target');
          targets.push({ x, y });
          if (player !== null) throw new Error('Multiple players found in level');
          player = { x, y };
          break;
        case '$':
          row.push('floor');
          boxes.push({ x, y });
          break;
        case '*':
          row.push('target');
          targets.push({ x, y });
          boxes.push({ x, y });
          break;
        case '.':
          row.push('target');
          targets.push({ x, y });
          break;
        case ' ':
        case '-':
          row.push('floor');
          break;
        default:
          // Treat unknown characters as floor
          row.push('floor');
          break;
      }
    }
    cells.push(row);
  }

  // Validation
  if (player === null) {
    throw new Error('No player found in level');
  }

  if (boxes.length === 0) {
    throw new Error('No boxes found in level');
  }

  if (targets.length === 0) {
    throw new Error('No targets found in level');
  }

  if (boxes.length !== targets.length) {
    throw new Error(
      `Mismatch: ${boxes.length} box(es) but ${targets.length} target(s). These must be equal.`
    );
  }

  // Canonically sort boxes by (x, y) for consistent hashing
  boxes.sort((a, b) => a.x - b.x || a.y - b.y);

  const board: StaticBoard = { width, height, cells, targets };
  const initialState: SokobanState = { player, boxes };

  return { board, initialState };
}

/**
 * Serialize a board state back to standard Sokoban text notation.
 * Useful for debugging and round-trip testing.
 */
export function serializeLevel(board: StaticBoard, state: SokobanState): string {
  const lines: string[] = [];
  const boxSet = new Set(state.boxes.map(b => `${b.x},${b.y}`));

  for (let y = 0; y < board.height; y++) {
    let line = '';
    for (let x = 0; x < board.width; x++) {
      const cell = board.cells[y]![x]!;
      const isPlayer = state.player.x === x && state.player.y === y;
      const isBox = boxSet.has(`${x},${y}`);
      const isTarget = cell === 'target';

      if (isPlayer && isTarget) {
        line += '+';
      } else if (isPlayer) {
        line += '@';
      } else if (isBox && isTarget) {
        line += '*';
      } else if (isBox) {
        line += '$';
      } else if (isTarget) {
        line += '.';
      } else if (cell === 'wall') {
        line += '#';
      } else {
        line += ' ';
      }
    }
    lines.push(line);
  }

  return lines.join('\n');
}
