import { describe, it, expect } from 'vitest';
import { recommendCharts, getChartData } from '../chartRecommender';
import { DatasetProfile, DataRow, ChartRecommendation } from '../types';

describe('chartRecommender', () => {
    const mockProfile: DatasetProfile = {
        totalRows: 30,
        totalColumns: 6,
        columns: [
            { name: 'Date', type: 'date', uniqueCount: 30, missingCount: 0 },
            { name: 'Category', type: 'category', uniqueCount: 3, missingCount: 0 },
            { name: 'Sales', type: 'number', uniqueCount: 30, missingCount: 0, min: 420, max: 2600, mean: 1200 },
            { name: 'Profit', type: 'number', uniqueCount: 30, missingCount: 0, min: 100, max: 520, mean: 280 },
            { name: 'Quantity', type: 'number', uniqueCount: 20, missingCount: 0, min: 4, max: 25, mean: 12 },
            { name: 'Discount', type: 'number', uniqueCount: 3, missingCount: 0, min: 0.05, max: 0.15, mean: 0.1 },
        ],
    };

    const mockData: DataRow[] = [
        { Date: '2024-01-01', Category: 'Electronics', Sales: 2100, Profit: 420, Quantity: 13, Discount: 0.1 },
        { Date: '2024-01-02', Category: 'Furniture', Sales: 650, Profit: 160, Quantity: 4, Discount: 0.05 },
        { Date: '2024-01-03', Category: 'Clothing', Sales: 420, Profit: 100, Quantity: 17, Discount: 0.15 },
    ];

    describe('recommendCharts', () => {
        it('должен возвращать массив рекомендаций', () => {
            const recommendations = recommendCharts(mockProfile, mockData);
            expect(recommendations).toBeInstanceOf(Array);
            expect(recommendations.length).toBeGreaterThan(0);
        });

        it('должен рекомендовать линейный график для данных с датой', () => {
            const recommendations = recommendCharts(mockProfile, mockData);
            const lineChart = recommendations.find((r: ChartRecommendation) => r.chartType === 'line');
            expect(lineChart).toBeDefined();
            expect(lineChart!.xColumn).toBe('Date');
        });

        it('должен рекомендовать столбчатую диаграмму для категориальных данных', () => {
            const recommendations = recommendCharts(mockProfile, mockData);
            const barChart = recommendations.find((r: ChartRecommendation) => r.chartType === 'bar');
            expect(barChart).toBeDefined();
            expect(barChart!.xColumn).toBe('Category');
        });

        it('должен рекомендовать круговую диаграмму', () => {
            const recommendations = recommendCharts(mockProfile, mockData);
            const pieChart = recommendations.find((r: ChartRecommendation) => r.chartType === 'pie');
            expect(pieChart).toBeDefined();
        });

        it('должен рекомендовать scatter plot при наличии 2+ числовых колонок', () => {
            const recommendations = recommendCharts(mockProfile, mockData);
            const scatterChart = recommendations.find((r: ChartRecommendation) => r.chartType === 'scatter');
            expect(scatterChart).toBeDefined();
        });

        it('должен рекомендовать heatmap при наличии 2+ числовых колонок', () => {
            const recommendations = recommendCharts(mockProfile, mockData);
            const heatmap = recommendations.find((r: ChartRecommendation) => r.chartType === 'heatmap');
            expect(heatmap).toBeDefined();
        });

        it('не должен возвращать больше 5 рекомендаций', () => {
            const recommendations = recommendCharts(mockProfile, mockData);
            expect(recommendations.length).toBeLessThanOrEqual(5);
        });

        it('каждая рекомендация должна иметь все обязательные поля', () => {
            const recommendations = recommendCharts(mockProfile, mockData);
            recommendations.forEach((rec: ChartRecommendation) => {
                expect(rec).toHaveProperty('id');
                expect(rec).toHaveProperty('chartType');
                expect(rec).toHaveProperty('title');
                expect(rec).toHaveProperty('description');
                expect(rec).toHaveProperty('xColumn');
                expect(rec).toHaveProperty('yColumn');
            });
        });

        it('должен возвращать пустой массив для профиля без числовых колонок', () => {
            const emptyProfile: DatasetProfile = {
                totalRows: 10,
                totalColumns: 2,
                columns: [
                    { name: 'Name', type: 'text', uniqueCount: 10, missingCount: 0 },
                    { name: 'Category', type: 'category', uniqueCount: 3, missingCount: 0 },
                ],
            };
            const recommendations = recommendCharts(emptyProfile, mockData);
            expect(recommendations.length).toBe(0);
        });
    });

    describe('getChartData', () => {
        it('должен агрегировать данные для bar chart', () => {
            const rec: ChartRecommendation = {
                id: 'test',
                chartType: 'bar',
                title: 'Test',
                description: 'Test',
                xColumn: 'Category',
                yColumn: 'Sales',
            };
            const data = getChartData(rec, mockData);
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBeGreaterThan(0);
            expect(data[0]).toHaveProperty('name');
            expect(data[0]).toHaveProperty('value');
        });

        it('должен агрегировать данные для pie chart', () => {
            const rec: ChartRecommendation = {
                id: 'test',
                chartType: 'pie',
                title: 'Test',
                description: 'Test',
                xColumn: 'Category',
                yColumn: 'Sales',
            };
            const data = getChartData(rec, mockData);
            expect(Array.isArray(data)).toBe(true);
            expect(data[0]).toHaveProperty('name');
            expect(data[0]).toHaveProperty('value');
        });

        it('должен возвращать исходные данные для line chart', () => {
            const rec: ChartRecommendation = {
                id: 'test',
                chartType: 'line',
                title: 'Test',
                description: 'Test',
                xColumn: 'Date',
                yColumn: 'Sales',
            };
            const data = getChartData(rec, mockData);
            expect(data).toEqual(mockData);
        });

        it('должен возвращать исходные данные для scatter chart', () => {
            const rec: ChartRecommendation = {
                id: 'test',
                chartType: 'scatter',
                title: 'Test',
                description: 'Test',
                xColumn: 'Sales',
                yColumn: 'Profit',
            };
            const data = getChartData(rec, mockData);
            expect(data).toEqual(mockData);
        });
    });
});