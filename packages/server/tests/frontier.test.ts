import { describe, it, expect } from 'vitest';
import { MinHeap } from '../src/engine/frontier.js';

describe('MinHeap', () => {
  it('returns undefined when popping or peeking an empty heap', () => {
    const heap = new MinHeap<number>((a, b) => a - b);
    expect(heap.isEmpty()).toBe(true);
    expect(heap.size).toBe(0);
    expect(heap.pop()).toBeUndefined();
    expect(heap.peek()).toBeUndefined();
  });

  it('correctly tracks size on push and pop', () => {
    const heap = new MinHeap<number>((a, b) => a - b);
    expect(heap.size).toBe(0);
    heap.push(10);
    heap.push(5);
    heap.push(20);
    expect(heap.size).toBe(3);
    expect(heap.isEmpty()).toBe(false);

    heap.pop();
    expect(heap.size).toBe(2);
    heap.pop();
    heap.pop();
    expect(heap.size).toBe(0);
    expect(heap.isEmpty()).toBe(true);
  });

  it('peek returns minimum element without removing it', () => {
    const heap = new MinHeap<number>((a, b) => a - b);
    heap.push(15);
    heap.push(3);
    heap.push(8);

    expect(heap.peek()).toBe(3);
    expect(heap.size).toBe(3);
    expect(heap.pop()).toBe(3);
    expect(heap.peek()).toBe(8);
  });

  it('inserts N random priorities and pops them in non-decreasing order', () => {
    const heap = new MinHeap<number>((a, b) => a - b);
    const N = 1000;
    const values: number[] = [];

    for (let i = 0; i < N; i++) {
      const val = Math.floor(Math.random() * 100_000);
      values.push(val);
      heap.push(val);
    }

    expect(heap.size).toBe(N);

    let prev = -Infinity;
    for (let i = 0; i < N; i++) {
      const curr = heap.pop();
      expect(curr).toBeDefined();
      expect(curr!).toBeGreaterThanOrEqual(prev);
      prev = curr!;
    }

    expect(heap.isEmpty()).toBe(true);
  });
});
