import { ColumnMeta, ColumnType, DataRow } from './types';

// Максимальное количество строк для анализа типа (оптимизация производительности)
const MAX_SAMPLE_ROWS = 200;

// Порог уникальности для категориального типа
// Если уникальных значений меньше этого порога ИЛИ меньше 5% от общего числа строк — считаем категориальным
const CATEGORICAL_UNIQUE_THRESHOLD = 20;
const CATEGORICAL_PERCENTAGE_THRESHOLD = 0.05;

// Регулярные выражения для распознавания дат
const DATE_PATTERNS = [
    /^\d{4}-\d{2}-\d{2}$/,                    // YYYY-MM-DD (ISO)
    /^\d{2}\.\d{2}\.\d{4}$/,                  // DD.MM.YYYY
    /^\d{2}\/\d{2}\/\d{4}$/,                  // MM/DD/YYYY или DD/MM/YYYY
    /^\d{4}\/\d{2}\/\d{2}$/,                  // YYYY/MM/DD
    /^\d{2}-\d{2}-\d{4}$/,                    // DD-MM-YYYY
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,   // ISO 8601 с временем
    /^\d{2}\.\d{2}\.\d{2}$/,                  // YY.MM.DD
];

// Проверяет, является ли значение числом
function isNumeric(value: string | number | null): boolean {
    if (value === null || value === undefined || value === '') return false;
    if (typeof value === 'number') return !isNaN(value);
    const str = String(value).trim();
    if (str === '') return false;
    // Разрешаем числа с точкой, запятой (как десятичный разделитель), минусом
    const normalized = str.replace(',', '.');
    return !isNaN(Number(normalized)) && isFinite(Number(normalized));
}

// Проверяет, является ли значение датой
function isDate(value: string | number | null): boolean {
    if (value === null || value === undefined) return false;
    const str = String(value).trim();
    if (str === '') return false;

    // Сначала проверяем по паттернам
    for (const pattern of DATE_PATTERNS) {
        if (pattern.test(str)) {
            const date = new Date(str);
            return !isNaN(date.getTime());
        }
    }

    // Пробуем распарсить как дату (для форматов вроде "Jan 1, 2024")
    const date = new Date(str);
    return !isNaN(date.getTime()) && str.length >= 6;
}

// Определяет тип одной колонки на основе выборки данных
function detectColumnType(
    values: (string | number | null)[],
    totalRows: number
): ColumnType {
    // Фильтруем пустые значения
    const nonEmptyValues = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');

    if (nonEmptyValues.length === 0) return 'unknown';

    // Проверяем, все ли значения числовые
    const numericCount = nonEmptyValues.filter(v => isNumeric(v)).length;
    if (numericCount === nonEmptyValues.length) {
        return 'numeric';
    }

    // Проверяем, все ли значения даты
    const dateCount = nonEmptyValues.filter(v => isDate(v)).length;
    if (dateCount === nonEmptyValues.length && dateCount > 0) {
        return 'date';
    }

    // Проверяем категориальность по количеству уникальных значений
    const uniqueValues = new Set(nonEmptyValues.map(v => String(v).trim().toLowerCase()));
    const uniqueCount = uniqueValues.size;

    if (
        uniqueCount <= CATEGORICAL_UNIQUE_THRESHOLD ||
        uniqueCount / totalRows <= CATEGORICAL_PERCENTAGE_THRESHOLD
    ) {
        return 'categorical';
    }

    // Всё остальное — текст
    return 'text';
}

// Подсчитывает пропущенные значения в колонке
function countMissing(values: (string | number | null)[]): number {
    return values.filter(v => v === null || v === undefined || String(v).trim() === '').length;
}

// Получает топ-N значений для категориальных колонок
function getTopValues(
    values: (string | number | null)[],
    n: number = 5
): { value: string; count: number }[] {
    const frequency = new Map<string, number>();

    for (const value of values) {
        if (value !== null && value !== undefined && String(value).trim() !== '') {
            const normalized = String(value).trim();
            frequency.set(normalized, (frequency.get(normalized) || 0) + 1);
        }
    }

    return Array.from(frequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([value, count]) => ({ value, count }));
}

// Вычисляет базовую статистику для числовой колонки
function getNumericStats(values: (string | number | null)[]): {
    min: number;
    max: number;
    mean: number;
} | null {
    const numericValues = values
        .filter(v => isNumeric(v))
        .map(v => {
            const str = String(v).replace(',', '.');
            return Number(str);
        });

    if (numericValues.length === 0) return null;

    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const mean = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;

    return { min, max, mean };
}

// Главная функция: профилирует все колонки датасета
export function detectColumnTypes(data: DataRow[]): ColumnMeta[] {
    if (data.length === 0) return [];

    // Получаем имена всех колонок из первой строки
    const columnNames = Object.keys(data[0]);

    // Берем выборку для анализа (первые MAX_SAMPLE_ROWS строк)
    const sampleData = data.slice(0, MAX_SAMPLE_ROWS);

    return columnNames.map(columnName => {
        // Извлекаем все значения колонки
        const values = sampleData.map(row => row[columnName] ?? null);

        // Определяем тип
        const type = detectColumnType(values, data.length);

        // Считаем пропуски
        const missingCount = countMissing(values);

        // Считаем уникальные значения
        const uniqueValues = new Set(
            values.filter(v => v !== null && v !== undefined && String(v).trim() !== '')
                .map(v => String(v).trim().toLowerCase())
        );
        const uniqueCount = uniqueValues.size;

        // Формируем метаданные
        const meta: ColumnMeta = {
            name: columnName,
            type,
            missingCount,
            uniqueCount,
        };

        // Добавляем специфичную статистику в зависимости от типа
        if (type === 'numeric') {
            const stats = getNumericStats(values);
            if (stats) {
                meta.min = stats.min;
                meta.max = stats.max;
                meta.mean = stats.mean;
            }
        } else if (type === 'categorical') {
            meta.topValues = getTopValues(values, 5);
        }

        return meta;
    });
}

// Вспомогательная функция: проверяет, является ли колонка числовой
export function isNumericColumn(column: ColumnMeta): boolean {
    return column.type === 'numeric';
}

// Вспомогательная функция: проверяет, является ли колонка датой
export function isDateColumn(column: ColumnMeta): boolean {
    return column.type === 'date';
}

// Вспомогательная функция: проверяет, является ли колонка категориальной
export function isCategoricalColumn(column: ColumnMeta): boolean {
    return column.type === 'categorical';
}
