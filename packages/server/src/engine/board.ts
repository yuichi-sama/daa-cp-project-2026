import type { Cell, Coord, StaticBoard } from '@sokoban/shared';

/**
 * Checks if a coordinate is within the boundaries of the board.
 */
export function isInBounds(board: StaticBoard, coord: Coord): boolean {
  return (
    coord.x >= 0 &&
    coord.x < board.width &&
    coord.y >= 0 &&
    coord.y < board.height
  );
}

/**
 * Retrieves the cell type at the specified coordinate.
 * Returns null if the coordinate is out of bounds.
 */
export function getCell(board: StaticBoard, coord: Coord): Cell | null {
  if (!isInBounds(board, coord)) {
    return null;
  }
  const row = board.cells[coord.y];
  if (!row) {
    return null;
  }
  return row[coord.x] ?? null;
}

/**
 * Returns true if the coordinate is within bounds and is not a wall.
 */
export function isWalkable(board: StaticBoard, coord: Coord): boolean {
  const cell = getCell(board, coord);
  return cell !== null && cell !== 'wall';
}
