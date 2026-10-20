import type { Coord, SokobanState, StaticBoard } from '@sokoban/shared';
import { isWalkable } from './board.js';
import { hasBoxAt } from './state.js';

/**
 * Precompute the set of dead squares on a board using a reverse-BFS "pull" simulation.
 * 
 * Algorithm:
 * 1. Mark all target squares as alive and seed the queue with them.
 * 2. While queue is not empty, pop coordinate `curr`.
 * 3. For each direction vector `dir`:
 *    A box could have been pushed from `fromCoord = curr - dir` to `curr`
 *    if the player could have stood at `playerCoord = curr - 2 * dir`.
 *    If both `fromCoord` and `playerCoord` are walkable (not walls and inside bounds),
 *    mark `fromCoord` as alive and enqueue it.
 * 4. Any walkable cell never reached by reverse-BFS is a dead square.
 *    Placing a box on such a square means it can never reach any target.
 */
export function computeDeadSquares(board: StaticBoard): Set<string> {
  const alive = new Set<string>();
  const queue: Coord[] = [];

  // Targets can always contain a box that is at goal, so they are alive by definition
  for (const target of board.targets) {
    const key = `${target.x},${target.y}`;
    if (!alive.has(key)) {
      alive.add(key);
      queue.push({ x: target.x, y: target.y });
    }
  }

  const dirs: readonly Coord[] = [
    { x: 0, y: -1 }, // up
    { x: 0, y: 1 },  // down
    { x: -1, y: 0 }, // left
    { x: 1, y: 0 },  // right
  ];

  while (queue.length > 0) {
    const curr = queue.shift()!;

    for (const dir of dirs) {
      const fromCoord: Coord = { x: curr.x - dir.x, y: curr.y - dir.y };
      const playerCoord: Coord = { x: curr.x - 2 * dir.x, y: curr.y - 2 * dir.y };

      if (isWalkable(board, fromCoord) && isWalkable(board, playerCoord)) {
        const key = `${fromCoord.x},${fromCoord.y}`;
        if (!alive.has(key)) {
          alive.add(key);
          queue.push(fromCoord);
        }
      }
    }
  }

  // Any walkable cell that is not in `alive` is a dead square
  const deadSquares = new Set<string>();
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const coord = { x, y };
      if (isWalkable(board, coord)) {
        const key = `${x},${y}`;
        if (!alive.has(key)) {
          deadSquares.add(key);
        }
      }
    }
  }

  return deadSquares;
}

/**
 * Checks whether a cell is blocked by either an out-of-bounds boundary, a wall, or a box.
 */
function isBlocked(board: StaticBoard, state: SokobanState, coord: Coord): boolean {
  return !isWalkable(board, coord) || hasBoxAt(state, coord);
}

/**
 * Check if a moved box is frozen (immovable in both axes) and NOT on a target.
 * 
 * LIMITATION:
 * This heuristic detects corner blocks, wall-adjacent blocks, and 2x2 freeze patterns.
 * It is not a fully general freeze-deadlock solver for arbitrarily shaped deadlock
 * bipartite components.
 */
export function isFreezeDeadlock(
  board: StaticBoard,
  state: SokobanState,
  movedBox: Coord
): boolean {
  // If the box is already on a target, it is not deadlocked
  const isOnTarget = board.targets.some(
    (t) => t.x === movedBox.x && t.y === movedBox.y
  );
  if (isOnTarget) {
    return false;
  }

  const { x, y } = movedBox;

  const upBlocked = isBlocked(board, state, { x, y: y - 1 });
  const downBlocked = isBlocked(board, state, { x, y: y + 1 });
  const leftBlocked = isBlocked(board, state, { x: x - 1, y });
  const rightBlocked = isBlocked(board, state, { x: x + 1, y });

  // 1. Corner freeze: blocked on one vertical and one horizontal side.
  // To move vertically, the opposite vertical side must be free for the player to push.
  // If adjacent sides are blocked, the box cannot be pushed in any direction.
  if (
    (upBlocked && leftBlocked) ||
    (upBlocked && rightBlocked) ||
    (downBlocked && leftBlocked) ||
    (downBlocked && rightBlocked)
  ) {
    return true;
  }

  // 2. Both axes completely blocked (e.g. in a tunnel between walls or boxes)
  if (
    (upBlocked && downBlocked && leftBlocked) ||
    (upBlocked && downBlocked && rightBlocked) ||
    (leftBlocked && rightBlocked && upBlocked) ||
    (leftBlocked && rightBlocked && downBlocked)
  ) {
    return true;
  }

  // 3. 2x2 deadlock pattern:
  // Any 2x2 square of 4 cells consisting solely of walls and boxes,
  // with at least one box not on target, is permanently immovable.
  const offsets = [
    [0, 0, 1, 0, 0, 1, 1, 1],       // bottom-right
    [-1, 0, 0, 0, -1, 1, 0, 1],     // bottom-left
    [0, -1, 1, -1, 0, 0, 1, 0],     // top-right
    [-1, -1, 0, -1, -1, 0, 0, 0],   // top-left
  ] as const;

  for (const [dx1, dy1, dx2, dy2, dx3, dy3, dx4, dy4] of offsets) {
    const c1 = { x: x + dx1, y: y + dy1 };
    const c2 = { x: x + dx2, y: y + dy2 };
    const c3 = { x: x + dx3, y: y + dy3 };
    const c4 = { x: x + dx4, y: y + dy4 };

    if (
      isBlocked(board, state, c1) &&
      isBlocked(board, state, c2) &&
      isBlocked(board, state, c3) &&
      isBlocked(board, state, c4)
    ) {
      // Check if any box in this 2x2 is not on a target
      const coords = [c1, c2, c3, c4];
      const hasUntargetedBox = coords.some((c) => {
        const hasBox = hasBoxAt(state, c);
        const onTarget = board.targets.some((t) => t.x === c.x && t.y === c.y);
        return hasBox && !onTarget;
      });

      if (hasUntargetedBox) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Combined deadlock check:
 * 1. Checks if any box is on a precomputed dead square (O(n) where n = box count).
 * 2. If movedBox is provided, checks freeze deadlock for that box.
 */
export function isDeadlocked(
  board: StaticBoard,
  state: SokobanState,
  deadSquares: Set<string>,
  movedBox?: Coord
): boolean {
  // 1. Dead square check
  for (const box of state.boxes) {
    if (deadSquares.has(`${box.x},${box.y}`)) {
      return true;
    }
  }

  // 2. Freeze deadlock check for the moved box
  if (movedBox && isFreezeDeadlock(board, state, movedBox)) {
    return true;
  }

  return false;
}
