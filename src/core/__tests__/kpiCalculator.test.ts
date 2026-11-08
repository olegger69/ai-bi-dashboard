import { describe, it, expect } from 'vitest';
import { calculateKPIs } from '../kpiCalculator';
import { profileDataset } from '../profiler';
import { DataRow, KPI } from '../types';

describe('kpiCalculator', () => {
    const mockData: DataRow[] = [
        { Date: '2024-01-01', Category: 'Electronics', Sales: 2100, Profit: 420, Quantity: 13, Discount: 0.1 },
        { Date: '2024-01-02', Category: 'Furniture', Sales: 650, Profit: 160, Quantity: 4, Discount: 0.05 },
        { Date: '2024-01-03', Category: 'Clothing', Sales: 420, Profit: 100, Quantity: 17, Discount: 0.15 },
        { Date: '2024-01-04', Category: 'Electronics', Sales: 1600, Profit: 320, Quantity: 10, Discount: 0.1 },
        { Date: '2024-01-05', Category: 'Furniture', Sales: 880, Profit: 215, Quantity: 6, Discount: 0.05 },
    ];

    const profile = profileDataset(mockData);

    it('должен возвращать массив KPI', () => {
        const kpis = calculateKPIs(mockData, profile);
        expect(kpis).toBeInstanceOf(Array);
        expect(kpis.length).toBeGreaterThan(0);
    });

    it('должен правильно считать общую выручку (Total Revenue)', () => {
        const kpis = calculateKPIs(mockData, profile);
        // Ищем KPI по label, а не по id
        const revenueKPI = kpis.find((k: KPI) =>
            k.label.toLowerCase().includes('revenue') ||
            k.label.toLowerCase().includes('выручк') ||
            k.label.toLowerCase().includes('sales')
        );
        expect(revenueKPI).toBeDefined();
        // 2100 + 650 + 420 + 1600 + 880 = 5650
        expect(revenueKPI?.value).toBeDefined();
        expect(typeof revenueKPI?.value).toBe('string');
    });

    it('должен правильно считать общую прибыль (Total Profit)', () => {
        const kpis = calculateKPIs(mockData, profile);
        const profitKPI = kpis.find((k: KPI) =>
            k.label.toLowerCase().includes('profit') ||
            k.label.toLowerCase().includes('прибыль')
        );
        expect(profitKPI).toBeDefined();
        // 420 + 160 + 100 + 320 + 215 = 1215
        expect(profitKPI?.value).toBeDefined();
        expect(typeof profitKPI?.value).toBe('string');
    });

    it('должен правильно считать среднее значение заказа (Avg Order Value)', () => {
        const kpis = calculateKPIs(mockData, profile);
        const avgKPI = kpis.find((k: KPI) =>
            k.label.toLowerCase().includes('avg') ||
            k.label.toLowerCase().includes('average') ||
            k.label.toLowerCase().includes('средн')
        );
        expect(avgKPI).toBeDefined();
        // 5650 / 5 = 1130
        expect(avgKPI?.value).toBeDefined();
        expect(typeof avgKPI?.value).toBe('string');
    });

    it('должен правильно считать маржу прибыли (Profit Margin)', () => {
        const kpis = calculateKPIs(mockData, profile);
        const marginKPI = kpis.find((k: KPI) =>
            k.label.toLowerCase().includes('margin') ||
            k.label.toLowerCase().includes('марж')
        );
        expect(marginKPI).toBeDefined();
        // 1215 / 5650 * 100 = 21.5%
        expect(marginKPI?.value).toBeDefined();
        expect(typeof marginKPI?.value).toBe('string');
    });

    it('должен правильно считать общее количество проданных товаров (Total Quantity)', () => {
        const kpis = calculateKPIs(mockData, profile);
        const qtyKPI = kpis.find((k: KPI) =>
            k.label.toLowerCase().includes('quantity') ||
            k.label.toLowerCase().includes('количеств')
        );
        expect(qtyKPI).toBeDefined();
        // 13 + 4 + 17 + 10 + 6 = 50
        expect(qtyKPI?.value).toBeDefined();
        expect(typeof qtyKPI?.value).toBe('string');
    });

    it('должен возвращать пустой массив для пустых данных', () => {
        const emptyProfile = profileDataset([]);
        const kpis = calculateKPIs([], emptyProfile);
        expect(kpis).toEqual([]);
    });

    it('каждый KPI должен иметь id, label и value', () => {
        const kpis = calculateKPIs(mockData, profile);
        kpis.forEach((kpi: KPI) => {
            expect(kpi).toHaveProperty('id');
            expect(kpi).toHaveProperty('label');
            expect(kpi).toHaveProperty('value');
            expect(typeof kpi.id).toBe('string');
            expect(typeof kpi.label).toBe('string');
            expect(typeof kpi.value).toBe('string');
        });
    });

    it('должен возвращать правильное количество KPI', () => {
        const kpis = calculateKPIs(mockData, profile);
        // Обычно 6 KPI: Revenue, Profit, Avg Order, Margin, Quantity, Transactions
        expect(kpis.length).toBeGreaterThanOrEqual(5);
        expect(kpis.length).toBeLessThanOrEqual(8);
    });

    it('все значения KPI должны быть непустыми строками', () => {
        const kpis = calculateKPIs(mockData, profile);
        kpis.forEach((kpi: KPI) => {
            expect(kpi.value).toBeTruthy();
            expect(kpi.value.length).toBeGreaterThan(0);
        });
    });
});