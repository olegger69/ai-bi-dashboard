import { DataRow, DatasetProfile, KPI } from './types';

// Форматирует число в читаемый вид
function formatNumber(num: number): string {
    if (Math.abs(num) >= 1000000) {
        return `$${(num / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(num) >= 1000) {
        return `$${(num / 1000).toFixed(1)}K`;
    }
    return `$${num.toFixed(2)}`;
}

// Извлекает числовые значения из колонки
function extractNumericValues(data: DataRow[], columnName: string): number[] {
    return data
        .map(row => {
            const value = row[columnName];
            if (value === null || value === undefined) return null;
            if (typeof value === 'number') return isNaN(value) ? null : value;

            const str = String(value)
                .replace(/[$€£₽,\s]/g, '')
                .replace(',', '.')
                .replace(/%/g, '')
                .trim();

            const num = parseFloat(str);
            return isNaN(num) ? null : num;
        })
        .filter((v): v is number => v !== null);
}

// Вычисляет KPI для датасета
export function calculateKPIs(data: DataRow[], profile: DatasetProfile): KPI[] {
    if (data.length === 0) return [];

    const kpis: KPI[] = [];
    const numericColumns = profile.columns.filter(c => c.type === 'number');

    // Ищем колонки по ключевым словам
    const salesCol = numericColumns.find(c =>
        /sales|revenue|выручка|доход|сумма/i.test(c.name)
    );
    const profitCol = numericColumns.find(c =>
        /profit|прибыль/i.test(c.name)
    );
    const quantityCol = numericColumns.find(c =>
        /quantity|количество|qty/i.test(c.name)
    );
    const discountCol = numericColumns.find(c =>
        /discount|скидк/i.test(c.name)
    );

    // Total Revenue
    if (salesCol) {
        const values = extractNumericValues(data, salesCol.name);
        const total = values.reduce((sum, val) => sum + val, 0);
        kpis.push({
            id: 'total-revenue',
            label: 'TOTAL REVENUE',
            value: formatNumber(total),
            description: `Mean transaction value: ${formatNumber(total / data.length)}`
        });
    }

    // Total Profit
    if (profitCol) {
        const values = extractNumericValues(data, profitCol.name);
        const total = values.reduce((sum, val) => sum + val, 0);
        kpis.push({
            id: 'total-profit',
            label: 'TOTAL PROFIT',
            value: formatNumber(total)
        });
    }

    // Avg Order Value
    if (salesCol) {
        const values = extractNumericValues(data, salesCol.name);
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        kpis.push({
            id: 'avg-order-value',
            label: 'AVG ORDER VALUE',
            value: formatNumber(avg)
        });
    }

    // Profit Margin
    if (salesCol && profitCol) {
        const salesValues = extractNumericValues(data, salesCol.name);
        const profitValues = extractNumericValues(data, profitCol.name);
        const totalSales = salesValues.reduce((sum, val) => sum + val, 0);
        const totalProfit = profitValues.reduce((sum, val) => sum + val, 0);
        const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
        kpis.push({
            id: 'profit-margin',
            label: 'PROFIT MARGIN',
            value: `${margin.toFixed(1)}%`
        });
    }

    // Total Quantity Sold
    if (quantityCol) {
        const values = extractNumericValues(data, quantityCol.name);
        const total = values.reduce((sum, val) => sum + val, 0);
        kpis.push({
            id: 'total-quantity',
            label: 'TOTAL QUANTITY SOLD',
            value: total.toLocaleString()
        });
    }

    // Average Discount Rate
    if (discountCol) {
        const values = extractNumericValues(data, discountCol.name);
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        kpis.push({
            id: 'avg-discount',
            label: 'AVERAGE DISCOUNT RATE',
            value: `${(avg * 100).toFixed(1)}%`
        });
    }

    // Total Transactions
    kpis.push({
        id: 'total-transactions',
        label: 'TOTAL TRANSACTIONS',
        value: data.length.toLocaleString()
    });

    return kpis;
}