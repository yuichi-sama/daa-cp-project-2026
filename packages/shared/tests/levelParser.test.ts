import { describe, it, expect } from 'vitest';
import { parseLevel, serializeLevel } from '../src/levelParser.js';

describe('levelParser', () => {
  describe('parseLevel', () => {
    it('should parse a simple 1-box level', () => {
      const raw = [
        '####',
        '#@ #',
        '# $#',
        '#  #',
        '# .#',
        '####',
      ].join('\n');

      const { board, initialState } = parseLevel(raw);
      expect(board.width).toBe(4);
      expect(board.height).toBe(6);
      expect(initialState.player).toEqual({ x: 1, y: 1 });
      expect(initialState.boxes).toEqual([{ x: 2, y: 2 }]);
      expect(board.targets).toEqual([{ x: 2, y: 4 }]);
    });

    it('should parse a level with player on target', () => {
      const raw = [
        '######',
        '#    #',
        '#$$$ #',
        '# .. #',
        '#  + #',
        '######',
      ].join('\n');

      const { board, initialState } = parseLevel(raw);
      expect(initialState.player).toEqual({ x: 3, y: 4 });
      expect(initialState.boxes.length).toBe(3);
      // 2 targets + player-on-target = 3 targets total
      expect(board.targets.length).toBe(3);
    });

    it('should parse a level with box on target (*)', () => {
      const raw = [
        '#####',
        '#@ .#',
        '#*$ #',
        '#####',
      ].join('\n');

      const { board, initialState } = parseLevel(raw);
      // * = box on target, $ = box on floor → 2 boxes, . = target + * target → 2 targets
      expect(initialState.boxes.length).toBe(2);
      expect(board.targets).toEqual(expect.arrayContaining([
        { x: 1, y: 2 },
        { x: 3, y: 1 },
      ]));
    });

    it('should pad short rows to make rectangular board', () => {
      const raw = [
        '######',
        '#@  #',
        '# $.#',
        '####',
      ].join('\n');

      const { board } = parseLevel(raw);
      expect(board.width).toBe(6);
      // Every row should have 6 cells
      for (const row of board.cells) {
        expect(row.length).toBe(6);
      }
    });

    it('should canonically sort boxes', () => {
      const raw = [
        '######',
        '# @  #',
        '# $$ #',
        '# .. #',
        '######',
      ].join('\n');

      const { initialState } = parseLevel(raw);
      // Boxes should be sorted by x then y
      for (let i = 1; i < initialState.boxes.length; i++) {
        const prev = initialState.boxes[i - 1]!;
        const curr = initialState.boxes[i]!;
        const isOrdered = prev.x < curr.x || (prev.x === curr.x && prev.y <= curr.y);
        expect(isOrdered).toBe(true);
      }
    });
  });

  describe('parseLevel - error cases', () => {
    it('should throw on empty level', () => {
      expect(() => parseLevel('')).toThrow('Level is empty');
    });

    it('should throw on level with no player', () => {
      const raw = [
        '####',
        '# $#',
        '# .#',
        '####',
      ].join('\n');
      expect(() => parseLevel(raw)).toThrow('No player found');
    });

    it('should throw on level with multiple players', () => {
      const raw = [
        '####',
        '#@@#',
        '#$.#',
        '####',
      ].join('\n');
      expect(() => parseLevel(raw)).toThrow('Multiple players');
    });

    it('should throw on box/target count mismatch', () => {
      const raw = [
        '####',
        '#@ #',
        '#$$#',
        '# .#',
        '####',
      ].join('\n');
      expect(() => parseLevel(raw)).toThrow('Mismatch');
    });

    it('should throw on level with no boxes', () => {
      const raw = [
        '####',
        '#@ #',
        '# .#',
        '####',
      ].join('\n');
      expect(() => parseLevel(raw)).toThrow('No boxes found');
    });
  });

  describe('serializeLevel round-trip', () => {
    it('should round-trip a simple level', () => {
      const raw = [
        '####',
        '#@ #',
        '#$.#',
        '####',
      ].join('\n');

      const { board, initialState } = parseLevel(raw);
      const serialized = serializeLevel(board, initialState);
      expect(serialized).toBe(raw);
    });
  });

  describe('Microban-format levels', () => {
    it('should parse Microban level 1', () => {
      const raw = [
        '####  ',
        '# .#  ',
        '#  ###',
        '#*@  #',
        '#  $ #',
        '#  ###',
        '####  ',
      ].join('\n');

      const { board, initialState } = parseLevel(raw);
      expect(initialState.player).toEqual({ x: 2, y: 3 });
      expect(initialState.boxes.length).toBe(2);
      expect(board.targets.length).toBe(2);
    });

    it('should parse a Microban level with mixed notation', () => {
      const raw = [
        '  ####',
        '###  #',
        '# $ .#',
        '# @$ #',
        '##. ##',
        ' ####',
      ].join('\n');

      const { board, initialState } = parseLevel(raw);
      expect(initialState.boxes.length).toBe(2);
      expect(board.targets.length).toBe(2);
      expect(board.width).toBe(6);
    });
  });
});
