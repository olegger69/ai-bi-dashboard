// Статистическое обнаружение аномалий (IQR)
import { DataRow, ColumnMeta } from './types';

// Результат обнаружения аномалий
export interface AnomalyResult {
    columnName: string;
    outlierCount: number;
    outliers: {
        rowIndex: number;
        value: number;
        reason: 'low' | 'high';
    }[];
    q1: number;
    q3: number;
    iqr: number;
    lowerBound: number;
    upperBound: number;
    mean: number;
    median: number;
}

// Результат анализа тренда
export interface TrendResult {
    columnName: string;
    direction: 'up' | 'down' | 'stable';
    changePercent: number;
    firstHalfAvg: number;
    secondHalfAvg: number;
}

// Вычисляет перцентиль из отсортированного массива
function percentile(sortedValues: number[], p: number): number {
    const index = (p / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
        return sortedValues[lower];
    }

    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

// Вычисляет среднее значение
function calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Вычисляет медиану
function calculateMedian(sortedValues: number[]): number {
    if (sortedValues.length === 0) return 0;
    const mid = Math.floor(sortedValues.length / 2);

    if (sortedValues.length % 2 === 0) {
        return (sortedValues[mid - 1] + sortedValues[mid]) / 2;
    }
    return sortedValues[mid];
}

// Извлекает числовые значения из колонки
function extractNumericValues(
    data: DataRow[],
    columnName: string
): number[] {
    return data
        .map(row => {
            const value = row[columnName];
            if (value === null || value === undefined) return null;
            if (typeof value === 'number') return isNaN(value) ? null : value;

            const str = String(value)
                .replace(/[$€£₽,\s]/g, '')
                .replace(',', '.')
                .trim();

            const num = parseFloat(str);
            return isNaN(num) ? null : num;
        })
        .filter((v): v is number => v !== null);
}

// Главная функция: обнаруживает аномалии в числовой колонке через IQR
export function detectAnomalies(
    data: DataRow[],
    column: ColumnMeta
): AnomalyResult | null {
    // ИСПРАВЛЕНО: 'numeric' заменено на 'number'
    if (column.type !== 'number') return null;

    const values = extractNumericValues(data, column.name);
    if (values.length === 0) return null;

    // Сортируем для вычисления перцентилей
    const sortedValues = [...values].sort((a, b) => a - b);

    // Вычисляем Q1, Q3, IQR
    const q1 = percentile(sortedValues, 25);
    const q3 = percentile(sortedValues, 75);
    const iqr = q3 - q1;

    // Границы для выбросов
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    // Находим выбросы
    const outliers: AnomalyResult['outliers'] = [];
    values.forEach((value, rowIndex) => {
        if (value < lowerBound) {
            outliers.push({ rowIndex, value, reason: 'low' });
        } else if (value > upperBound) {
            outliers.push({ rowIndex, value, reason: 'high' });
        }
    });

    const mean = calculateMean(values);
    const median = calculateMedian(sortedValues);

    return {
        columnName: column.name,
        outlierCount: outliers.length,
        outliers,
        q1,
        q3,
        iqr,
        lowerBound,
        upperBound,
        mean,
        median,
    };
}

// Анализирует тренд числовой колонки (сравнение первой и второй половины)
export function detectTrend(
    data: DataRow[],
    column: ColumnMeta
): TrendResult | null {
    // ИСПРАВЛЕНО: 'numeric' заменено на 'number'
    if (column.type !== 'number' || data.length < 4) return null;

    const values = extractNumericValues(data, column.name);
    if (values.length < 4) return null;

    const midpoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midpoint);
    const secondHalf = values.slice(midpoint);

    const firstHalfAvg = calculateMean(firstHalf);
    const secondHalfAvg = calculateMean(secondHalf);

    if (firstHalfAvg === 0) {
        return {
            columnName: column.name,
            direction: 'stable',
            changePercent: 0,
            firstHalfAvg,
            secondHalfAvg,
        };
    }

    const changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    let direction: TrendResult['direction'] = 'stable';
    if (changePercent > 5) direction = 'up';
    else if (changePercent < -5) direction = 'down';

    return {
        columnName: column.name,
        direction,
        changePercent,
        firstHalfAvg,
        secondHalfAvg,
    };
}

// Анализирует все числовые колонки и возвращает сводку
export function analyzeAllColumns(
    data: DataRow[],
    columns: ColumnMeta[]
): {
    anomalies: AnomalyResult[];
    trends: TrendResult[];
} {
    const anomalies: AnomalyResult[] = [];
    const trends: TrendResult[] = [];

    for (const column of columns) {
        if (column.type === 'number') {
            const anomaly = detectAnomalies(data, column);
            if (anomaly && anomaly.outlierCount > 0) {
                anomalies.push(anomaly);
            }

            const trend = detectTrend(data, column);
            if (trend) {
                trends.push(trend);
            }
        }
    }

    return { anomalies, trends };
}