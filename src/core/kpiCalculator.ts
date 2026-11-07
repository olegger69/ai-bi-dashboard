// Расчёт KPI строго из реальных данных
import { DataRow, KPI, ColumnMeta, DatasetProfile } from './types';
import { getColumnsByType } from './profiler';

// Ключевые слова для автоопределения KPI-колонок (регистронезависимо)
const REVENUE_KEYWORDS = ['sales', 'revenue', 'amount', 'total', 'price', 'сумма', 'выручка', 'продажи'];
const PROFIT_KEYWORDS = ['profit', 'margin', 'прибыль', 'доход'];
const QUANTITY_KEYWORDS = ['quantity', 'count', 'units', 'количество', 'штук'];
const DISCOUNT_KEYWORDS = ['discount', 'скидка'];

// Нормализует имя колонки для сравнения
function normalizeColumnName(name: string): string {
    return name.toLowerCase().trim().replace(/[_\-\s]+/g, ' ');
}

// Проверяет, содержит ли имя колонки ключевое слово
function matchesKeyword(columnName: string, keywords: string[]): boolean {
    const normalized = normalizeColumnName(columnName);
    return keywords.some(keyword => normalized.includes(keyword));
}

// Находит первую числовую колонку, подходящую под ключевые слова
function findKpiColumn(
    profile: DatasetProfile,
    keywords: string[]
): ColumnMeta | null {
    const numericColumns = getColumnsByType(profile, 'numeric');

    // Сначала ищем точное совпадение
    for (const column of numericColumns) {
        if (matchesKeyword(column.name, keywords)) {
            return column;
        }
    }

    return null;
}

// Извлекает числовое значение из строки (обрабатывает запятые, пробелы, валюты)
function extractNumericValue(value: string | number | null): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return isNaN(value) ? null : value;

    const str = String(value)
        .replace(/[$€£₽,\s]/g, '') // Удаляем валюты, запятые, пробелы
        .replace(',', '.')         // Заменяем запятую на точку (европейский формат)
        .trim();

    const num = parseFloat(str);
    return isNaN(num) ? null : num;
}

// Форматирует число для отображения (например, 33800 → "$33.8K")
export function formatCurrency(value: number): string {
    if (Math.abs(value) >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(value) >= 1_000) {
        return `$${(value / 1_000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
}

// Форматирует процент
export function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
}

// Главная функция: рассчитывает KPI из реальных данных
export function calculateKPIs(
    data: DataRow[],
    profile: DatasetProfile
): KPI[] {
    if (data.length === 0) return [];

    const kpis: KPI[] = [];

    // Ищем KPI-колонки
    const revenueColumn = findKpiColumn(profile, REVENUE_KEYWORDS);
    const profitColumn = findKpiColumn(profile, PROFIT_KEYWORDS);
    const quantityColumn = findKpiColumn(profile, QUANTITY_KEYWORDS);
    const discountColumn = findKpiColumn(profile, DISCOUNT_KEYWORDS);

    // === Total Revenue (Total Sales) ===
    if (revenueColumn) {
        const totalRevenue = data.reduce((sum, row) => {
            const value = extractNumericValue(row[revenueColumn.name]);
            return sum + (value ?? 0);
        }, 0);

        const avgRevenue = totalRevenue / data.length;

        kpis.push({
            id: 'total_revenue',
            label: 'Total Revenue',
            value: formatCurrency(totalRevenue),
            description: `Mean transaction value: ${formatCurrency(avgRevenue)}`,
        });

        kpis.push({
            id: 'avg_order_value',
            label: 'Avg Order Value',
            value: formatCurrency(avgRevenue),
        });
    }

    // === Total Profit ===
    if (profitColumn) {
        const totalProfit = data.reduce((sum, row) => {
            const value = extractNumericValue(row[profitColumn.name]);
            return sum + (value ?? 0);
        }, 0);

        kpis.push({
            id: 'total_profit',
            label: 'Total Profit',
            value: formatCurrency(totalProfit),
        });

        // Profit Margin (если есть и revenue, и profit)
        if (revenueColumn) {
            const totalRevenue = data.reduce((sum, row) => {
                const value = extractNumericValue(row[revenueColumn.name]);
                return sum + (value ?? 0);
            }, 0);

            const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

            kpis.push({
                id: 'profit_margin',
                label: 'Profit Margin',
                value: formatPercentage(profitMargin),
                trend: profitMargin > 20 ? 'up' : profitMargin > 10 ? 'neutral' : 'down',
            });
        }
    }

    // === Total Quantity ===
    if (quantityColumn) {
        const totalQuantity = data.reduce((sum, row) => {
            const value = extractNumericValue(row[quantityColumn.name]);
            return sum + (value ?? 0);
        }, 0);

        kpis.push({
            id: 'total_quantity',
            label: 'Total Quantity Sold',
            value: totalQuantity.toLocaleString(),
        });
    }

    // === Average Discount Rate ===
    if (discountColumn) {
        const discountValues = data
            .map(row => extractNumericValue(row[discountColumn.name]))
            .filter((v): v is number => v !== null);

        if (discountValues.length > 0) {
            const avgDiscount = discountValues.reduce((sum, v) => sum + v, 0) / discountValues.length;

            kpis.push({
                id: 'avg_discount',
                label: 'Average Discount Rate',
                value: formatPercentage(avgDiscount),
                description: 'Promotional activity indicator',
            });
        }
    }

    // === Total Transactions (всегда показываем) ===
    kpis.push({
        id: 'total_transactions',
        label: 'Total Transactions',
        value: data.length.toLocaleString(),
    });

    return kpis;
}

// Определяет тренд KPI (упрощённо: сравнивает первую и вторую половину данных)
export function calculateKpiTrend(
    data: DataRow[],
    columnName: string
): 'up' | 'down' | 'neutral' {
    if (data.length < 2) return 'neutral';

    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint);
    const secondHalf = data.slice(midpoint);

    const avgFirst = firstHalf.reduce((sum, row) => {
        const value = extractNumericValue(row[columnName]);
        return sum + (value ?? 0);
    }, 0) / firstHalf.length;

    const avgSecond = secondHalf.reduce((sum, row) => {
        const value = extractNumericValue(row[columnName]);
        return sum + (value ?? 0);
    }, 0) / secondHalf.length;

    if (avgFirst === 0) return 'neutral';

    const change = (avgSecond - avgFirst) / avgFirst;

    if (change > 0.05) return 'up';
    if (change < -0.05) return 'down';
    return 'neutral';
}
