import { DataRow, ColumnMeta } from './types';

// Определяет тип колонки на основе данных
export function detectColumnType(data: DataRow[], columnName: string): 'number' | 'category' | 'date' | 'text' {
    const values = data
        .map(row => row[columnName])
        .filter(v => v !== null && v !== undefined && v !== '');

    if (values.length === 0) return 'text';

    // Проверяем, является ли колонка числовой
    const numericCount = values.filter(v => {
        if (typeof v === 'number') return !isNaN(v);
        const str = String(v).replace(/[$€£₽,\s%]/g, '').replace(',', '.').trim();
        return !isNaN(parseFloat(str));
    }).length;

    if (numericCount / values.length > 0.8) return 'number';

    // Проверяем, является ли колонка датой
    const dateCount = values.filter(v => {
        const str = String(v).trim();
        const date = new Date(str);
        return !isNaN(date.getTime()) && str.length >= 8;
    }).length;

    if (dateCount / values.length > 0.8) return 'date';

    // Проверяем, является ли колонка категориальной (мало уникальных значений)
    const uniqueValues = new Set(values.map(v => String(v)));
    if (uniqueValues.size <= 20 && uniqueValues.size / values.length < 0.5) return 'category';

    return 'text';
}

// Создаёт метаданные колонки
export function createColumnMeta(data: DataRow[], columnName: string): ColumnMeta {
    const values = data
        .map(row => row[columnName])
        .filter(v => v !== null && v !== undefined && v !== '');

    const type = detectColumnType(data, columnName);
    const uniqueValues = new Set(values.map(v => String(v)));
    const missingCount = data.length - values.length;

    const meta: ColumnMeta = {
        name: columnName,
        type,
        uniqueCount: uniqueValues.size,
        missingCount,
    };

    // Для числовых колонок добавляем статистику
    if (type === 'number') {
        const numericValues = values
            .map(v => {
                if (typeof v === 'number') return v;
                const str = String(v).replace(/[$€£₽,\s%]/g, '').replace(',', '.').trim();
                return parseFloat(str);
            })
            .filter(v => !isNaN(v));

        if (numericValues.length > 0) {
            meta.min = Math.min(...numericValues);
            meta.max = Math.max(...numericValues);
            meta.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;

            const sorted = [...numericValues].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            meta.median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

            const variance = numericValues.reduce((sum, val) => sum + Math.pow(val - meta.mean!, 2), 0) / numericValues.length;
            meta.stdDev = Math.sqrt(variance);
        }
    }

    // Для категориальных колонок добавляем топ значений
    if (type === 'category' || type === 'text') {
        const valueCounts = new Map<string, number>();
        values.forEach(v => {
            const str = String(v);
            valueCounts.set(str, (valueCounts.get(str) || 0) + 1);
        });

        const topValues = Array.from(valueCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([value, count]) => ({ value, count }));

        meta.topValues = topValues;
    }

    return meta;
}