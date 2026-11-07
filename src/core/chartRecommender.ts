import { DataRow, DatasetProfile, ChartRecommendation } from './types';
import { getColumnsByType } from './profiler';

// Интерфейс для агрегированных данных графика
export interface ChartDataPoint {
    [key: string]: string | number;
}

// Главная функция: рекомендует графики на основе профиля данных
export function recommendCharts(
    profile: DatasetProfile,
    _data: DataRow[]
): ChartRecommendation[] {
    const recommendations: ChartRecommendation[] = [];
    let chartIndex = 0;

    const numericColumns = getColumnsByType(profile, 'numeric');
    const categoricalColumns = getColumnsByType(profile, 'categorical');
    const dateColumns = getColumnsByType(profile, 'date');

    // 1. Линейный график: дата + число (Sales over Time)
    if (dateColumns.length > 0 && numericColumns.length > 0) {
        const dateColumn = dateColumns[0];
        const valueColumn = numericColumns[0];

        recommendations.push({
            id: `chart_${chartIndex++}`,
            chartType: 'line',
            title: `${valueColumn.name} over Time`,
            xColumn: dateColumn.name,
            yColumn: valueColumn.name,
            description: `Trend analysis of ${valueColumn.name} based on ${dateColumn.name}`,
        });
    }

    // 2. Столбчатый график: категория + число (Sales by Category)
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
        const categoryColumn = categoricalColumns[0];
        const valueColumn = numericColumns[0];

        recommendations.push({
            id: `chart_${chartIndex++}`,
            chartType: 'bar',
            title: `${valueColumn.name} by ${categoryColumn.name}`,
            xColumn: categoryColumn.name,
            yColumn: valueColumn.name,
            description: `Comparison of ${valueColumn.name} across different categories of ${categoryColumn.name}`,
        });
    }

    // 3. Scatter plot: два числа (Sales vs Profit)
    if (numericColumns.length >= 2) {
        const xColumn = numericColumns[0];
        const yColumn = numericColumns[1];

        recommendations.push({
            id: `chart_${chartIndex++}`,
            chartType: 'scatter',
            title: `${xColumn.name} vs ${yColumn.name}`,
            xColumn: xColumn.name,
            yColumn: yColumn.name,
            description: `Correlation between ${xColumn.name} and ${yColumn.name}`,
        });
    }

    return recommendations;
}

// Агрегация данных для столбчатого графика (SUM по категориям)
export function aggregateByCategory(
    data: DataRow[],
    categoryColumn: string,
    valueColumn: string
): ChartDataPoint[] {
    const aggregated = new Map<string, number>();

    for (const row of data) {
        const category = String(row[categoryColumn] ?? 'Unknown').trim();
        const value = extractNumericValue(row[valueColumn]);

        if (value !== null) {
            const current = aggregated.get(category) || 0;
            aggregated.set(category, current + value);
        }
    }

    return Array.from(aggregated.entries())
        .map(([category, total]) => ({
            [categoryColumn]: category,
            [valueColumn]: total,
        }))
        .sort((a, b) => (b[valueColumn] as number) - (a[valueColumn] as number));
}

// Подготовка данных для линейного графика (временной ряд)
export function prepareTimeSeriesData(
    data: DataRow[],
    dateColumn: string,
    valueColumn: string
): ChartDataPoint[] {
    const grouped = new Map<string, number>();

    for (const row of data) {
        const date = String(row[dateColumn] ?? '').trim();
        const value = extractNumericValue(row[valueColumn]);

        if (date && value !== null) {
            const current = grouped.get(date) || 0;
            grouped.set(date, current + value);
        }
    }

    return Array.from(grouped.entries())
        .map(([date, total]) => ({
            [dateColumn]: date,
            [valueColumn]: total,
        }))
        .sort((a, b) => {
            const dateA = new Date(String(a[dateColumn]));
            const dateB = new Date(String(b[dateColumn]));
            return dateA.getTime() - dateB.getTime();
        });
}

// Подготовка данных для scatter-графика
export function prepareScatterData(
    data: DataRow[],
    xColumn: string,
    yColumn: string
): ChartDataPoint[] {
    const result: ChartDataPoint[] = [];

    for (const row of data) {
        const x = extractNumericValue(row[xColumn]);
        const y = extractNumericValue(row[yColumn]);

        if (x !== null && y !== null) {
            result.push({
                [xColumn]: x,
                [yColumn]: y,
            });
        }
    }

    return result;
}

// Извлекает числовое значение из строки
function extractNumericValue(value: string | number | null): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return isNaN(value) ? null : value;

    const str = String(value)
        .replace(/[$€£₽,\s]/g, '')
        .replace(',', '.')
        .trim();

    const num = parseFloat(str);
    return isNaN(num) ? null : num;
}

// Получает данные для конкретного графика на основе рекомендации
export function getChartData(
    recommendation: ChartRecommendation,
    data: DataRow[]
): ChartDataPoint[] {
    switch (recommendation.chartType) {
        case 'line':
            return prepareTimeSeriesData(data, recommendation.xColumn, recommendation.yColumn);
        case 'bar':
            return aggregateByCategory(data, recommendation.xColumn, recommendation.yColumn);
        case 'scatter':
            return prepareScatterData(data, recommendation.xColumn, recommendation.yColumn);
        default:
            return [];
    }
}