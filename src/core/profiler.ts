import { DataRow, DatasetProfile, ColumnMeta } from './types';
import { detectColumnTypes } from './typeDetector';

// Главная функция: создаёт полный профиль датасета
export function profileDataset(data: DataRow[]): DatasetProfile {
    if (data.length === 0) {
        return {
            totalRows: 0,
            totalColumns: 0,
            columns: [],
        };
    }

    // Определяем типы всех колонок
    const columns = detectColumnTypes(data);

    return {
        totalRows: data.length,
        totalColumns: columns.length,
        columns,
    };
}

// Подсчитывает общее количество пропущенных значений во всём датасете
export function countTotalMissingValues(profile: DatasetProfile): number {
    return profile.columns.reduce((total, column) => total + column.missingCount, 0);
}

// Подсчитывает общее количество уникальных значений во всём датасете
export function countTotalUniqueValues(profile: DatasetProfile): number {
    return profile.columns.reduce((total, column) => total + column.uniqueCount, 0);
}

// Получает сводную статистику для отображения на дашборде
export interface DatasetSummary {
    totalRows: number;
    totalColumns: number;
    totalUniqueValues: number;
    totalMissingValues: number;
    missingPercentage: number;
}

export function getDatasetSummary(profile: DatasetProfile): DatasetSummary {
    const totalMissing = countTotalMissingValues(profile);
    const totalUnique = countTotalUniqueValues(profile);
    const totalCells = profile.totalRows * profile.totalColumns;
    const missingPercentage = totalCells > 0
        ? (totalMissing / totalCells) * 100
        : 0;

    return {
        totalRows: profile.totalRows,
        totalColumns: profile.totalColumns,
        totalUniqueValues: totalUnique,
        totalMissingValues: totalMissing,
        missingPercentage: Math.round(missingPercentage * 100) / 100,
    };
}

// Находит колонки определённого типа
export function getColumnsByType(
    profile: DatasetProfile,
    type: ColumnMeta['type']
): ColumnMeta[] {
    return profile.columns.filter(column => column.type === type);
}

// Проверяет, есть ли в датасете колонки нужного типа
export function hasColumnType(
    profile: DatasetProfile,
    type: ColumnMeta['type']
): boolean {
    return profile.columns.some(column => column.type === type);
}
