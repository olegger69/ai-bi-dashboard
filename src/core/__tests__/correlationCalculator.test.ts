import { describe, it, expect } from 'vitest';
import {
    calculateCorrelationMatrix,
    getCorrelationColor,
    getCorrelationTextColor
} from '../correlationCalculator';
import { ColumnMeta, DataRow } from '../types';

describe('correlationCalculator', () => {
    const mockColumns: ColumnMeta[] = [
        { name: 'Sales', type: 'number', uniqueCount: 30, missingCount: 0 },
        { name: 'Profit', type: 'number', uniqueCount: 30, missingCount: 0 },
        { name: 'Quantity', type: 'number', uniqueCount: 20, missingCount: 0 },
        { name: 'Discount', type: 'number', uniqueCount: 3, missingCount: 0 },
    ];

    const mockData: DataRow[] = [
        { Sales: 2100, Profit: 420, Quantity: 13, Discount: 0.1 },
        { Sales: 650, Profit: 160, Quantity: 4, Discount: 0.05 },
        { Sales: 420, Profit: 100, Quantity: 17, Discount: 0.15 },
        { Sales: 1600, Profit: 320, Quantity: 10, Discount: 0.1 },
        { Sales: 880, Profit: 215, Quantity: 6, Discount: 0.05 },
        { Sales: 2200, Profit: 440, Quantity: 14, Discount: 0.1 },
        { Sales: 720, Profit: 175, Quantity: 5, Discount: 0.05 },
        { Sales: 460, Profit: 110, Quantity: 18, Discount: 0.15 },
        { Sales: 1800, Profit: 360, Quantity: 11, Discount: 0.1 },
        { Sales: 950, Profit: 230, Quantity: 7, Discount: 0.05 },
    ];

    describe('calculateCorrelationMatrix', () => {
        it('должен возвращать матрицу корреляций', () => {
            const result = calculateCorrelationMatrix(mockData, mockColumns);
            expect(result).toHaveProperty('columns');
            expect(result).toHaveProperty('matrix');
            expect(Array.isArray(result.columns)).toBe(true);
            expect(Array.isArray(result.matrix)).toBe(true);
        });

        it('должен включать все числовые колонки', () => {
            const result = calculateCorrelationMatrix(mockData, mockColumns);
            expect(result.columns.length).toBe(4);
            expect(result.columns).toContain('Sales');
            expect(result.columns).toContain('Profit');
            expect(result.columns).toContain('Quantity');
            expect(result.columns).toContain('Discount');
        });

        it('матрица должна быть квадратной', () => {
            const result = calculateCorrelationMatrix(mockData, mockColumns);
            expect(result.matrix.length).toBe(result.columns.length);
            result.matrix.forEach((row: number[]) => {
                expect(row.length).toBe(result.columns.length);
            });
        });

        it('диагональ должна содержать 1 (корреляция с самой собой)', () => {
            const result = calculateCorrelationMatrix(mockData, mockColumns);
            result.matrix.forEach((row: number[], i: number) => {
                expect(row[i]).toBe(1);
            });
        });

        it('корреляция Sales и Profit должна быть положительной', () => {
            const result = calculateCorrelationMatrix(mockData, mockColumns);
            const salesIdx = result.columns.indexOf('Sales');
            const profitIdx = result.columns.indexOf('Profit');
            const correlation = result.matrix[salesIdx][profitIdx];
            expect(correlation).toBeGreaterThan(0.5);
        });

        it('корреляция должна быть симметричной', () => {
            const result = calculateCorrelationMatrix(mockData, mockColumns);
            for (let i = 0; i < result.matrix.length; i++) {
                for (let j = 0; j < result.matrix[i].length; j++) {
                    expect(result.matrix[i][j]).toBeCloseTo(result.matrix[j][i], 5);
                }
            }
        });

        it('все значения должны быть в диапазоне [-1, 1]', () => {
            const result = calculateCorrelationMatrix(mockData, mockColumns);
            result.matrix.forEach((row: number[]) => {
                row.forEach((value: number) => {
                    expect(value).toBeGreaterThanOrEqual(-1);
                    expect(value).toBeLessThanOrEqual(1);
                });
            });
        });

        it('должен возвращать пустую матрицу при менее чем 2 числовых колонках', () => {
            const fewColumns: ColumnMeta[] = [
                { name: 'Sales', type: 'number', uniqueCount: 30, missingCount: 0 },
            ];
            const result = calculateCorrelationMatrix(mockData, fewColumns);
            expect(result.columns.length).toBe(0);
            expect(result.matrix.length).toBe(0);
        });

        it('должен возвращать пустую матрицу для пустых данных', () => {
            const result = calculateCorrelationMatrix([], mockColumns);
            expect(result.columns.length).toBe(0);
        });
    });

    describe('getCorrelationColor', () => {
        it('должен возвращать синий для положительной корреляции', () => {
            const color = getCorrelationColor(0.8);
            expect(color).toContain('rgb');
            expect(color).toMatch(/rgb\(\d+, \d+, 255\)/);
        });

        it('должен возвращать красный для отрицательной корреляции', () => {
            const color = getCorrelationColor(-0.8);
            expect(color).toContain('rgb');
            expect(color).toMatch(/rgb\(255, \d+, \d+\)/);
        });

        it('должен возвращать белый для нулевой корреляции', () => {
            const color = getCorrelationColor(0);
            expect(color).toBe('rgb(255, 255, 255)');
        });

        it('должен возвращать насыщенный синий для корреляции 1', () => {
            const color = getCorrelationColor(1);
            expect(color).toBe('rgb(55, 55, 255)');
        });

        it('должен возвращать насыщенный красный для корреляции -1', () => {
            const color = getCorrelationColor(-1);
            expect(color).toBe('rgb(255, 55, 55)');
        });
    });

    describe('getCorrelationTextColor', () => {
        it('должен возвращать белый для сильной корреляции', () => {
            expect(getCorrelationTextColor(0.8)).toBe('white');
            expect(getCorrelationTextColor(-0.8)).toBe('white');
        });

        it('должен возвращать чёрный для слабой корреляции', () => {
            expect(getCorrelationTextColor(0.2)).toBe('black');
            expect(getCorrelationTextColor(-0.2)).toBe('black');
        });

        it('порог должен быть 0.5', () => {
            expect(getCorrelationTextColor(0.5)).toBe('black');
            expect(getCorrelationTextColor(0.51)).toBe('white');
        });
    });
});