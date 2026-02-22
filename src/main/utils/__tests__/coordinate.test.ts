import { gtpCoordinateToArray, coordinateToGTP, isValidCoordinate } from '../coordinate';

describe('Coordinate Utils', () => {
  describe('gtpCoordinateToArray', () => {
    it('应该正确转换GTP坐标到数组索引', () => {
      expect(gtpCoordinateToArray('A1', 19)).toEqual({ x: 0, y: 18 });
      expect(gtpCoordinateToArray('B2', 19)).toEqual({ x: 1, y: 17 });
      expect(gtpCoordinateToArray('T19', 19)).toEqual({ x: 18, y: 0 });
    });

    it('应该跳过字母I', () => {
      expect(gtpCoordinateToArray('J1', 19)).toEqual({ x: 8, y: 18 });
      expect(gtpCoordinateToArray('K1', 19)).toEqual({ x: 9, y: 18 });
    });

    it('应该处理小写字母', () => {
      expect(gtpCoordinateToArray('a1', 19)).toEqual({ x: 0, y: 18 });
      expect(gtpCoordinateToArray('t19', 19)).toEqual({ x: 18, y: 0 });
    });

    it('应该处理不同棋盘大小', () => {
      expect(gtpCoordinateToArray('A1', 9)).toEqual({ x: 0, y: 8 });
      expect(gtpCoordinateToArray('J9', 9)).toEqual({ x: 8, y: 0 });
    });

    it('应该对无效坐标抛出错误', () => {
      expect(() => gtpCoordinateToArray('', 19)).toThrow();
      expect(() => gtpCoordinateToArray('A0', 19)).toThrow();
      expect(() => gtpCoordinateToArray('A20', 19)).toThrow();
      expect(() => gtpCoordinateToArray('Z1', 19)).toThrow();
    });

    it('应该处理特殊坐标', () => {
      expect(gtpCoordinateToArray('pass', 19)).toEqual({ x: -1, y: -1 });
      expect(gtpCoordinateToArray('RESIGN', 19)).toEqual({ x: -1, y: -1 });
    });
  });

  describe('coordinateToGTP', () => {
    it('应该正确转换数组索引到GTP坐标', () => {
      expect(coordinateToGTP({ x: 0, y: 18 }, 19)).toBe('A1');
      expect(coordinateToGTP({ x: 1, y: 17 }, 19)).toBe('B2');
      expect(coordinateToGTP({ x: 18, y: 0 }, 19)).toBe('T19');
    });

    it('应该跳过字母I', () => {
      expect(coordinateToGTP({ x: 8, y: 18 }, 19)).toBe('J1');
      expect(coordinateToGTP({ x: 9, y: 18 }, 19)).toBe('K1');
    });

    it('应该处理不同棋盘大小', () => {
      expect(coordinateToGTP({ x: 0, y: 8 }, 9)).toBe('A1');
      expect(coordinateToGTP({ x: 8, y: 0 }, 9)).toBe('J9');
    });

    it('应该对无效索引抛出错误', () => {
      expect(() => coordinateToGTP({ x: -1, y: 0 }, 19)).toThrow();
      expect(() => coordinateToGTP({ x: 0, y: -1 }, 19)).toThrow();
      expect(() => coordinateToGTP({ x: 19, y: 0 }, 19)).toThrow();
      expect(() => coordinateToGTP({ x: 0, y: 19 }, 19)).toThrow();
    });
  });

  describe('双向转换', () => {
    it('应该保持往返转换的一致性', () => {
      const testCases = ['A1', 'B2', 'J10', 'T19', 'K5'];
      
      testCases.forEach(coord => {
        const arrayCoord = gtpCoordinateToArray(coord, 19);
        expect(isValidCoordinate(arrayCoord, 19)).toBe(true);
        
        const backToGtp = coordinateToGTP(arrayCoord, 19);
        expect(backToGtp).toBe(coord);
      });
    });
  });

  describe('isValidCoordinate', () => {
    it('应该正确验证有效坐标', () => {
      expect(isValidCoordinate({ x: 0, y: 0 }, 19)).toBe(true);
      expect(isValidCoordinate({ x: 18, y: 18 }, 19)).toBe(true);
      expect(isValidCoordinate({ x: 9, y: 9 }, 19)).toBe(true);
    });

    it('应该正确识别无效坐标', () => {
      expect(isValidCoordinate({ x: -1, y: 0 }, 19)).toBe(false);
      expect(isValidCoordinate({ x: 0, y: -1 }, 19)).toBe(false);
      expect(isValidCoordinate({ x: 19, y: 0 }, 19)).toBe(false);
      expect(isValidCoordinate({ x: 0, y: 19 }, 19)).toBe(false);
    });
  });
});
