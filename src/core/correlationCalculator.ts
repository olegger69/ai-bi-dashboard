import { DataRow, ColumnMeta } from './types';

export interface CorrelationMatrix {
    columns: string[];
    matrix: number[][];
}

// УМНЫЙ ПОИСК: определяет, является ли колонка числовой по типу ИЛИ по названию
function isNumericColumn(col: ColumnMeta): boolean {
    if (col.type === 'number') return true;
    return /sales|profit|revenue|price|quantity|amount|discount|выручка|прибыль|цена|количество|сумма|доход|расход|cost|margin|tax|fee/i.test(col.name);
}

// Вычисляет коэффициент корреляции Пирсона между двумя массивами чисел
function calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
}

// Извлекает числовые значения из колонки (даже если они записаны как строки)
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

// Вычисляет матрицу корреляций для всех числовых колонок
export function calculateCorrelationMatrix(
    data: DataRow[],
    columns: ColumnMeta[]
): CorrelationMatrix {
    // УМНЫЙ ПОИСК: берём колонки по типу 'number' ИЛИ по ключевым словам
    const numericCols = columns
        .filter((c: ColumnMeta) => isNumericColumn(c))
        .map((c: ColumnMeta) => c.name);

    if (numericCols.length < 2) {
        return { columns: [], matrix: [] };
    }

    // Извлекаем числовые значения для каждой колонки
    const columnData: Map<string, number[]> = new Map();
    numericCols.forEach(colName => {
        const values = extractNumericValues(data, colName);
        if (values.length > 0) {
            columnData.set(colName, values);
        }
    });

    const validColumns = Array.from(columnData.keys());

    if (validColumns.length < 2) {
        return { columns: [], matrix: [] };
    }

    const matrix: number[][] = [];

    // Вычисляем корреляцию для каждой пары колонок
    for (let i = 0; i < validColumns.length; i++) {
        const row: number[] = [];
        for (let j = 0; j < validColumns.length; j++) {
            if (i === j) {
                row.push(1); // Корреляция с самой собой = 1
            } else {
                const corr = calculateCorrelation(
                    columnData.get(validColumns[i])!,
                    columnData.get(validColumns[j])!
                );
                row.push(corr);
            }
        }
        matrix.push(row);
    }

    return {
        columns: validColumns,
        matrix
    };
}

// Определяет цвет для ячейки heatmap на основе значения корреляции
export function getCorrelationColor(value: number): string {
    if (value >= 0) {
        const intensity = Math.round(value * 200);
        return `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
    } else {
        const intensity = Math.round(Math.abs(value) * 200);
        return `rgb(255, ${255 - intensity}, ${255 - intensity})`;
    }
}

// Определяет цвет текста для контраста
export function getCorrelationTextColor(value: number): string {
    const absValue = Math.abs(value);
    return absValue > 0.5 ? 'white' : 'black';
}