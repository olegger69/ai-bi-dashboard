import Papa from 'papaparse';
import { DataRow } from './types';

// Интерфейс результата парсинга
export interface ParseResult {
    data: DataRow[];
    errors: Papa.ParseError[];
    meta: Papa.ParseMeta;
}

// Парсит CSV-файл и возвращает массив строк
export function parseCSV(file: File): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true, // Первая строка — заголовки колонок
            skipEmptyLines: true, // Пропускать пустые строки
            dynamicTyping: false, // Не конвертировать автоматически (мы сами определим типы)
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.warn('CSV parse warnings:', results.errors);
                }
                resolve({
                    data: results.data as DataRow[],
                    errors: results.errors,
                    meta: results.meta,
                });
            },
            error: (error) => {
                reject(new Error(`CSV parse error: ${error.message}`));
            },
        });
    });
}

// Парсит CSV-строку (для тестирования)
export function parseCSVString(csvString: string): ParseResult {
    const results = Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
    });

    return {
        data: results.data as DataRow[],
        errors: results.errors,
        meta: results.meta,
    };
}

// Валидирует файл перед парсингом
export function validateCSVFile(file: File): { valid: boolean; error?: string } {
    // Проверка расширения
    const validExtensions = ['.csv', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
        return {
            valid: false,
            error: `Неподдерживаемый формат файла. Используйте CSV или TXT.`,
        };
    }

    // Проверка размера (максимум 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `Файл слишком большой. Максимальный размер: 10MB.`,
        };
    }

    return { valid: true };
}