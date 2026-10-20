/**
 * Generic binary min-heap implementation for priority queues.
 * Accepts a comparator: (a, b) => negative if a < b (a has higher priority).
 */
export class MinHeap<T> {
  private heap: T[] = [];
  private comparator: (a: T, b: T) => number;

  constructor(comparator: (a: T, b: T) => number) {
    this.comparator = comparator;
  }

  /**
   * Insert an element into the min-heap.
   */
  push(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Remove and return the minimum element from the heap.
   * Returns undefined if the heap is empty.
   */
  pop(): T | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }
    const top = this.heap[0]!;
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.bubbleDown(0);
    }
    return top;
  }

  /**
   * Return the minimum element without removing it.
   */
  peek(): T | undefined {
    return this.heap[0];
  }

  /**
   * Current number of elements in the heap.
   */
  get size(): number {
    return this.heap.length;
  }

  /**
   * Returns true if the heap contains no elements.
   */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const p = this.parent(index);
      const currItem = this.heap[index]!;
      const parentItem = this.heap[p]!;
      if (this.comparator(currItem, parentItem) < 0) {
        this.swap(index, p);
        index = p;
      } else {
        break;
      }
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const left = this.leftChild(index);
      const right = this.rightChild(index);
      let smallest = index;

      if (
        left < length &&
        this.comparator(this.heap[left]!, this.heap[smallest]!) < 0
      ) {
        smallest = left;
      }
      if (
        right < length &&
        this.comparator(this.heap[right]!, this.heap[smallest]!) < 0
      ) {
        smallest = right;
      }

      if (smallest !== index) {
        this.swap(index, smallest);
        index = smallest;
      } else {
        break;
      }
    }
  }

  private swap(i: number, j: number): void {
    const temp = this.heap[i]!;
    this.heap[i] = this.heap[j]!;
    this.heap[j] = temp;
  }

  private parent(i: number): number {
    return Math.floor((i - 1) / 2);
  }

  private leftChild(i: number): number {
    return 2 * i + 1;
  }

  private rightChild(i: number): number {
    return 2 * i + 2;
  }
}
