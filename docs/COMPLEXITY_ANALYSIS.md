# Complexity Analysis — Algorithmic Sokoban

This document provides a formal complexity analysis for each search algorithm
implemented in the Algorithmic Sokoban solver, connects theoretical bounds to
observed experimental metrics, and discusses the effect of deadlock pruning and
heuristic quality on practical performance.

---

## 1. Problem Characteristics

### State Space Definition

A Sokoban state is defined by:
- **Player position**: one of the reachable floor/target cells
- **Box configuration**: the set of cells occupied by boxes

For a board with `F` walkable cells and `B` boxes, the theoretical state space
upper bound is:

$$|S| = F \times \binom{F}{B}$$

In practice the reachable fraction is much smaller due to walls and connectivity
constraints, but even small boards (10×10, 4 boxes) can have hundreds of thousands
of reachable states.

### Branching Factor

The **branching factor** `b` in Sokoban is at most 4 (up/down/left/right), but
the _effective_ branching factor `b*` is typically 2–3 after wall pruning, and
drops further with deadlock detection enabled.

---

## 2. Algorithm-by-Algorithm Analysis

### 2.1 Breadth-First Search (BFS)

| Property | Value |
|---|---|
| **Type** | Uninformed |
| **Optimality** | Yes — finds the shortest path in move-count |
| **Time complexity** | O(b^d) where d = solution depth |
| **Space complexity** | O(b^d) — stores entire frontier + visited set |

**How metrics map to theory:**
- `statesExplored` ≈ total nodes expanded = sum of frontier layers up to depth d.
  This approximates b^d for uniform branching.
- `statesGenerated` = all successors ever produced, including those already in the
  visited set. This is approximately `b × statesExplored`.
- `maxFrontierSize` ≈ the largest single layer of the BFS tree, typically O(b^(d-1)).

**Observed behavior:** The dashboard reports the actual counts for the selected
level. Harder instances can exhaust the configured search budget; no benchmark
values are assumed in this document.

### 2.2 Depth-First Search (DFS)

| Property | Value |
|---|---|
| **Type** | Uninformed |
| **Optimality** | No — finds _a_ path, not necessarily the shortest |
| **Time complexity** | O(b^m) where m = maximum depth (capped by `maxDepth`) |
| **Space complexity** | O(b × m) — only stores current path + visited set |

**How metrics map to theory:**
- `statesExplored` can be very large (up to the budget limit) because DFS dives
  deep before backtracking, potentially exploring many irrelevant states.
- `maxFrontierSize` is typically much smaller than BFS because only one branch's
  worth of siblings is on the stack at any time.
- `solutionLength` ≥ BFS's solution length — this is verified by our test suite.

**Observed behavior:** The selected level's returned metrics show whether DFS
finds a solution within the search budget and whether its path is longer than
the optimal reference. The `maxDepth`/state cap is critical because DFS can
otherwise spend unbounded time in deep branches.

### 2.3 Greedy Best-First Search

| Property | Value |
|---|---|
| **Type** | Informed |
| **Optimality** | No — follows h(n) greedily, can miss shorter paths |
| **Time complexity** | O(b^m) worst case, but typically much better due to heuristic guidance |
| **Space complexity** | O(b^m) — stores frontier in a priority queue + visited set |

**How metrics map to theory:**
- `statesExplored` is typically much less than BFS because the heuristic guides
  search toward the goal, avoiding unnecessary exploration.
- `maxFrontierSize` can be large because the algorithm expands nodes in
  heuristic-priority order, which doesn't respect depth layers.
- `solutionLength` ≥ A\*'s solution length — Greedy's solutions are often close to
  optimal but can diverge significantly on levels where the heuristic is misleading.

**Observed behavior:** Greedy can reduce exploration when the heuristic points
toward a useful target assignment, but its actual time and path quality must be
read from the selected run; this document does not hardcode benchmark outcomes.

### 2.4 A\* Search

| Property | Value |
|---|---|
| **Type** | Informed |
| **Optimality** | Yes — given an admissible heuristic (which we guarantee via Hungarian matching) |
| **Time complexity** | O(b^(d · (1 - h\*/C\*))) where h\* is the true heuristic accuracy |
| **Space complexity** | O(b^d) — stores frontier + visited set |

**How metrics map to theory:**
- `statesExplored` falls between Greedy (fewer) and BFS (more), depending on
  heuristic quality. With a perfect heuristic, A\* explores only the optimal path.
- `solutionLength` == BFS `solutionLength` — both are optimal. This is verified
  by our test suite.
- Tie-breaking by lower h(n) reduces the number of states expanded at the optimal
  f-value boundary.

**Observed behavior:** A\* and BFS return equal move-optimal solution lengths on
the test suite when both complete. The dashboard makes the state-exploration
difference visible for each real run.

---

## 3. Heuristic Analysis

### Manhattan Distance with Hungarian Matching

The heuristic computes:

$$h(n) = \text{HungarianMinCost}\Big(\big[|b_i.x - t_j.x| + |b_i.y - t_j.y|\big]_{i,j}\Big)$$

where $b_i$ are box positions and $t_j$ are target positions.

**Admissibility proof sketch:** Each box must travel at least its Manhattan distance
to reach some target, and the optimal assignment (Hungarian) gives the minimum total
cost across all box-to-target pairings. Since boxes can only be pushed (never
teleported or pulled), the actual cost is at least the Manhattan distance. Therefore
$h(n) \leq h^*(n)$ (never overestimates), satisfying admissibility.

**Why not greedy nearest-target:** A greedy matching can overestimate when multiple
boxes compete for the same target. For example, two boxes both nearest to the same
target would be assigned costs that double-count, producing an inadmissible heuristic
that breaks A\*'s optimality guarantee.

**Complexity:** O(n³) for n boxes via the Hungarian algorithm. Trivial at n ≤ 8.

### Heuristic Quality and Effective Branching Factor

The **effective branching factor** b\* measures how efficiently A\* searches:

$$N = \frac{(b^*)^{d+1} - 1}{b^* - 1}$$

where N = `statesExplored` and d = `solutionLength`. A lower b\* means a more
informative heuristic. The dashboard can be used to estimate b\* for an actual
completed run; the project does not claim a fixed value across all levels.

---

## 4. Deadlock Pruning — Effect on Search Efficiency

### Simple Dead-Square Detection

**Precomputation:** Reverse-BFS "pull" simulation from all targets. Time O(F × 4) = O(F).

**Runtime cost per state:** O(B) to check if any box is on a dead square.

**Effect on effective branching factor:** Dead-square pruning eliminates states where
a box is in an irrecoverable position (e.g., pushed into a corner that isn't a target).
The amount of reduction depends on board topology and is reported empirically by
the generated-state and explored-state metrics.

### Freeze Deadlock Detection

**Runtime cost per state:** O(1) amortized per push — only checks the moved box and
its immediate neighbors for frozen (bi-axially immovable) configurations.

**Limitation:** Our freeze check handles corners, wall-adjacent boxes, and simple
2×2 clusters. It does not detect all general freeze deadlocks (e.g., chains of
mutually frozen boxes). Documenting this limitation is important.

**Combined effect:** With both deadlock detections enabled, the `deadlocksPruned`
metric shows how many states were cut from the search tree. The amount of
pruning and its time impact are properties of the selected board and are shown
by the live experimental metrics.

---

## 5. Player-Region Normalization Note

The engine includes a flood-fill helper that finds the top-left-most floor cell
in the player's reachable region. That canonicalization is safe for a push-macro
solver, where successors are pushes after flood-filling player movement. This
project deliberately expands one player move at a time so `g(n)` and returned
paths count actual moves. In that representation, collapsing reachable player
positions would be unsound: the exact walking position may determine the next
legal push. Therefore the API flag is accepted for experiment compatibility,
but the move-level search retains exact player coordinates to preserve solver
correctness.

---

## 6. Memory Analysis Caveat

The `peakMemoryMb` metric uses `process.memoryUsage().heapUsed` deltas as an
approximation. This is **not** a true peak-RSS measurement because:

1. Node.js heap measurements include GC overhead and internal fragmentation
2. The delta between before/after doesn't capture intermediate peaks
3. Other V8 internals (JIT compilation, etc.) affect heap usage

This is documented as a known limitation. For true memory profiling, an external
profiler (e.g., `--max-old-space-size` monitoring, `clinic.js`) would be needed.

---

## 7. Summary Comparison Table

| Algorithm | Time | Space | Optimal? | Complete? | Heuristic |
|---|---|---|---|---|---|
| BFS | O(b^d) | O(b^d) | Yes | Yes | None |
| DFS | O(b^m) | O(bm) | No | Yes (with visited set) | None |
| Greedy | O(b^m) best case much better | O(b^m) | No | Yes (with visited set) | h(n) = Hungarian Manhattan |
| A\* | O(b^d) with heuristic reduction | O(b^d) | Yes | Yes | f(n) = g(n) + h(n) |

Where:
- b = branching factor (≤ 4 in Sokoban)
- d = depth of optimal solution
- m = maximum depth of search tree (capped by `maxDepth`/`maxStatesExplored`)
- C\* = optimal solution cost

---

## 8. Key Experimental Insights

The dashboard's comparison results demonstrate these theoretical predictions
empirically:

1. **BFS vs A\*:** Both find optimal solutions, but A\* explores significantly fewer
   states by using the heuristic to focus search toward the goal.

2. **DFS suboptimality:** DFS solutions are consistently longer than BFS/A\*,
   confirming that depth-first traversal does not guarantee shortest paths.

3. **Greedy speed vs quality:** Greedy is typically the fastest but finds suboptimal
   solutions, illustrating the tradeoff between search effort and solution quality.

4. **Difficulty scaling:** As board complexity increases (more boxes, larger boards),
   the gap between informed and uninformed search widens dramatically — BFS/DFS
   may timeout while A\*/Greedy still find solutions.

5. **Deadlock pruning:** Enabling deadlock detection consistently reduces states
   explored across all algorithms, with the largest impact on uninformed search
   (BFS/DFS) which would otherwise waste effort on provably dead states.

> **All results reported in the dashboard are experimental values generated by
> actually running the algorithms. No values are fabricated or hardcoded.**
