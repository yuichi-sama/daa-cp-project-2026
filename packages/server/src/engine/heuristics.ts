import type { Coord } from '@sokoban/shared';

/**
 * Solve the minimum-cost bipartite matching problem on an n x m matrix
 * using the Hungarian (Kuhn-Munkres) algorithm with O(n^2 * m) time complexity.
 */
export function hungarianMinCost(matrix: number[][]): number {
  const n = matrix.length;
  if (n === 0) return 0;
  const m = matrix[0]?.length ?? 0;
  if (m === 0) return 0;

  // Hungarian algorithm requires n <= m. If n > m, transpose the cost matrix.
  if (n > m) {
    const transposed: number[][] = Array.from({ length: m }, (_, i) =>
      Array.from({ length: n }, (_, j) => matrix[j]![i]!)
    );
    return hungarianMinCost(transposed);
  }

  // 1-indexed potential and matching arrays (index 0 is reserved/sentinel)
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(m + 1).fill(0);
  const p = new Array<number>(m + 1).fill(0);
  const way = new Array<number>(m + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array<number>(m + 1).fill(Infinity);
    const used = new Array<boolean>(m + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0]!;
      let delta = Infinity;
      let j1 = 0;

      for (let j = 1; j <= m; j++) {
        if (!used[j]) {
          const cur = matrix[i0 - 1]![j - 1]! - u[i0]! - v[j]!;
          if (cur < minv[j]!) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j]! < delta) {
            delta = minv[j]!;
            j1 = j;
          }
        }
      }

      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[p[j]!] = u[p[j]!]! + delta;
          v[j] = v[j]! - delta;
        } else {
          minv[j] = minv[j]! - delta;
        }
      }

      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0]!;
      p[j0] = p[j1]!;
      j0 = j1;
    } while (j0 !== 0);
  }

  return -v[0]! || 0;
}

/**
 * Compute the heuristic value for A* and Greedy Best-First Search.
 * 
 * Uses Manhattan distance between boxes and targets, solved as a min-cost
 * bipartite matching via the Hungarian algorithm (O(n³) on box count).
 * 
 * WHY HUNGARIAN AND NOT GREEDY NEAREST-TARGET:
 * A greedy nearest-target assignment is NOT admissible — it can overestimate
 * the true cost when assignments overlap. The Hungarian algorithm gives the
 * globally optimal (minimum cost) assignment, guaranteeing admissibility.
 * This is critical for A*'s optimality guarantee.
 * 
 * For the small box counts in this project (n ≤ 8), O(n³) is trivial.
 */
export function manhattanHeuristic(boxes: Coord[], targets: Coord[]): number {
  if (boxes.length === 0 || targets.length === 0) {
    return 0;
  }

  const costMatrix: number[][] = [];
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i]!;
    const row: number[] = [];
    for (let j = 0; j < targets.length; j++) {
      const target = targets[j]!;
      const dist = Math.abs(box.x - target.x) + Math.abs(box.y - target.y);
      row.push(dist);
    }
    costMatrix.push(row);
  }

  return hungarianMinCost(costMatrix);
}
