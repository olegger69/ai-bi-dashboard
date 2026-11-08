import { DataRow, KPI, KPIWithComparison } from './types';

// Определяем, есть ли в данных колонка с датой
export function findDateColumn(data: DataRow[]): string | null {
    const firstRow = data[0];
    if (!firstRow) return null;

    // Ищем колонки с названиями, похожими на дату
    const dateLikeColumns = Object.keys(firstRow).filter(key =>
        /date|дата|month|месяц|year|год|time|время/i.test(key)
    );

    return dateLikeColumns.length > 0 ? dateLikeColumns[0] : null;
}

// Разделяем данные на два периода (первая половина vs вторая половина)
export function splitDataByPeriods(data: DataRow[], dateColumn: string | null): {
    firstPeriod: DataRow[];
    secondPeriod: DataRow[];
} {
    if (!dateColumn) {
        // Если нет колонки даты, просто делим пополам
        const midPoint = Math.floor(data.length / 2);
        return {
            firstPeriod: data.slice(0, midPoint),
            secondPeriod: data.slice(midPoint)
        };
    }

    // Сортируем по дате
    const sortedData = [...data].sort((a, b) => {
        const dateA = new Date(String(a[dateColumn]));
        const dateB = new Date(String(b[dateColumn]));
        return dateA.getTime() - dateB.getTime();
    });

    const midPoint = Math.floor(sortedData.length / 2);
    return {
        firstPeriod: sortedData.slice(0, midPoint),
        secondPeriod: sortedData.slice(midPoint)
    };
}

// Сравниваем KPI между периодами
export function compareKPIs(
    currentKPIs: KPI[],
    firstPeriodData: DataRow[],
    secondPeriodData: DataRow[],
    numericColumns: string[]
): KPIWithComparison[] {
    return currentKPIs.map(kpi => {
        const kpiWithComparison: KPIWithComparison = { ...kpi };

        // Находим числовую колонку, соответствующую этому KPI
        const relatedColumn = numericColumns.find(col =>
            kpi.label.toLowerCase().includes(col.toLowerCase()) ||
            col.toLowerCase().includes(kpi.label.toLowerCase())
        );

        if (relatedColumn) {
            // Считаем среднее значение для первого периода
            const firstPeriodAvg = calculateAverage(firstPeriodData, relatedColumn);
            // Считаем среднее значение для второго периода
            const secondPeriodAvg = calculateAverage(secondPeriodData, relatedColumn);

            if (firstPeriodAvg !== null && secondPeriodAvg !== null) {
                const changeAbsolute = secondPeriodAvg - firstPeriodAvg;
                const changePercent = firstPeriodAvg !== 0
                    ? ((secondPeriodAvg - firstPeriodAvg) / Math.abs(firstPeriodAvg)) * 100
                    : 0;

                kpiWithComparison.previousValue = formatValue(firstPeriodAvg);
                kpiWithComparison.changeAbsolute = changeAbsolute;
                kpiWithComparison.changePercent = changePercent;
            }
        }

        return kpiWithComparison;
    });
}

// Вычисляет среднее значение по колонке
function calculateAverage(data: DataRow[], column: string): number | null {
    if (data.length === 0) return null;

    const values = data
        .map(row => {
            const val = row[column];
            if (val === null || val === undefined) return null;
            if (typeof val === 'number') return val;
            return parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
        })
        .filter((v): v is number => v !== null && !isNaN(v));

    if (values.length === 0) return null;

    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
}

// Форматирует числовое значение
function formatValue(value: number): string {
    if (Math.abs(value) >= 1000) {
        return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
}

// Получаем данные для сравнения на линейном графике
export function getComparisonLineData(
    data: DataRow[],
    dateColumn: string | null,
    valueColumn: string
) {
    if (!dateColumn) {
        // Если нет даты, используем индекс
        return data.map((row, index) => ({
            index: index + 1,
            value: parseFloat(String(row[valueColumn]).replace(/[^0-9.-]+/g, '')) || 0,
            period: index < data.length / 2 ? 'Period 1' : 'Period 2'
        }));
    }

    // Группируем по датам
    const grouped = new Map<string, { period1: number; period2: number }>();
    const sortedData = [...data].sort((a, b) => {
        const dateA = new Date(String(a[dateColumn]));
        const dateB = new Date(String(b[dateColumn]));
        return dateA.getTime() - dateB.getTime();
    });

    const midPoint = Math.floor(sortedData.length / 2);

    sortedData.forEach((row, index) => {
        const date = String(row[dateColumn]);
        const value = parseFloat(String(row[valueColumn]).replace(/[^0-9.-]+/g, '')) || 0;

        if (!grouped.has(date)) {
            grouped.set(date, { period1: 0, period2: 0 });
        }

        const entry = grouped.get(date)!;
        if (index < midPoint) {
            entry.period1 += value;
        } else {
            entry.period2 += value;
        }
    });

    return Array.from(grouped.entries()).map(([date, values]) => ({
        date,
        'Period 1': values.period1,
        'Period 2': values.period2
    }));
}