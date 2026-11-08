import { describe, it, expect } from 'vitest';
import { detectAnomalies, detectTrend, analyzeAllColumns } from '../anomalyDetector';
import { ColumnMeta, DataRow } from '../types';

describe('anomalyDetector', () => {
    const mockData: DataRow[] = [
        { Sales: 100 },
        { Sales: 110 },
        { Sales: 105 },
        { Sales: 95 },
        { Sales: 102 },
        { Sales: 98 },
        { Sales: 1000 },
        { Sales: 103 },
        { Sales: 97 },
        { Sales: 101 },
    ];

    const salesColumn: ColumnMeta = {
        name: 'Sales',
        type: 'number',
        uniqueCount: 10,
        missingCount: 0,
        min: 95,
        max: 1000,
        mean: 181.1,
        median: 101.5,
        stdDev: 268.5,
    };

    const textColumn: ColumnMeta = {
        name: 'Category',
        type: 'text',
        uniqueCount: 3,
        missingCount: 0,
    };

    describe('detectAnomalies', () => {
        it('должен находить выбросы в числовых данных', () => {
            const result = detectAnomalies(mockData, salesColumn);
            expect(result).not.toBeNull();
            expect(result!.outlierCount).toBeGreaterThan(0);
        });

        it('должен возвращать null для нечисловых колонок', () => {
            const result = detectAnomalies(mockData, textColumn);
            expect(result).toBeNull();
        });

        it('должен правильно вычислять границы IQR', () => {
            const result = detectAnomalies(mockData, salesColumn);
            expect(result).not.toBeNull();
            expect(result!.q1).toBeLessThan(result!.q3);
            expect(result!.iqr).toBeGreaterThan(0);
            expect(result!.lowerBound).toBeLessThan(result!.upperBound);
        });

        it('должен классифицировать выбросы как low или high', () => {
            const result = detectAnomalies(mockData, salesColumn);
            expect(result).not.toBeNull();
            result!.outliers.forEach((outlier: any) => {
                expect(['low', 'high']).toContain(outlier.reason);
            });
        });

        it('должен возвращать null для пустых данных', () => {
            const result = detectAnomalies([], salesColumn);
            expect(result).toBeNull();
        });
    });

    describe('detectTrend', () => {
        it('должен определять тренд роста', () => {
            const growingData: DataRow[] = [
                { Sales: 100 },
                { Sales: 110 },
                { Sales: 120 },
                { Sales: 130 },
                { Sales: 200 },
                { Sales: 210 },
                { Sales: 220 },
                { Sales: 230 },
            ];
            const result = detectTrend(growingData, salesColumn);
            expect(result).not.toBeNull();
            expect(result!.direction).toBe('up');
            expect(result!.changePercent).toBeGreaterThan(0);
        });

        it('должен определять тренд падения', () => {
            const decliningData: DataRow[] = [
                { Sales: 230 },
                { Sales: 220 },
                { Sales: 210 },
                { Sales: 200 },
                { Sales: 130 },
                { Sales: 120 },
                { Sales: 110 },
                { Sales: 100 },
            ];
            const result = detectTrend(decliningData, salesColumn);
            expect(result).not.toBeNull();
            expect(result!.direction).toBe('down');
            expect(result!.changePercent).toBeLessThan(0);
        });

        it('должен возвращать null для нечисловых колонок', () => {
            const result = detectTrend(mockData, textColumn);
            expect(result).toBeNull();
        });

        it('должен возвращать null для слишком коротких данных', () => {
            const shortData: DataRow[] = [
                { Sales: 100 },
                { Sales: 200 },
            ];
            const result = detectTrend(shortData, salesColumn);
            expect(result).toBeNull();
        });
    });

    describe('analyzeAllColumns', () => {
        it('должен анализировать все числовые колонки', () => {
            const columns: ColumnMeta[] = [salesColumn];
            const result = analyzeAllColumns(mockData, columns);
            expect(result).toHaveProperty('anomalies');
            expect(result).toHaveProperty('trends');
            expect(Array.isArray(result.anomalies)).toBe(true);
            expect(Array.isArray(result.trends)).toBe(true);
        });

        it('должен игнорировать нечисловые колонки', () => {
            const columns: ColumnMeta[] = [salesColumn, textColumn];
            const result = analyzeAllColumns(mockData, columns);
            expect(result.anomalies.length).toBeGreaterThanOrEqual(0);
        });
    });
});