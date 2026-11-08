import { DatasetProfile, ChartRecommendation, DataRow } from './types';

function aggregateData(data: DataRow[], xCol: string, yCol: string) {
    const map = new Map<string, number>();
    data.forEach(row => {
        const xVal = String(row[xCol] ?? '').trim();
        const rawY = row[yCol];
        const yVal = typeof rawY === 'number'
            ? rawY
            : parseFloat(String(rawY).replace(/[^0-9.-]+/g, '')) || 0;
        map.set(xVal, (map.get(xVal) || 0) + yVal);
    });
    return Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
}

function prepareNumericData(data: DataRow[], xCol: string, yCol: string) {
    return data.map(row => {
        const xVal = row[xCol];
        const rawY = row[yCol];
        const yVal = typeof rawY === 'number'
            ? rawY
            : parseFloat(String(rawY).replace(/[^0-9.-]+/g, '')) || 0;
        return {
            ...row,
            [xCol]: xVal,
            [yCol]: yVal,
        };
    });
}

export function getChartData(rec: ChartRecommendation, data: DataRow[]) {
    if (rec.chartType === 'pie' || rec.chartType === 'bar') {
        return aggregateData(data, rec.xColumn, rec.yColumn);
    }
    if (rec.chartType === 'line' || rec.chartType === 'scatter') {
        return prepareNumericData(data, rec.xColumn, rec.yColumn);
    }
    return data;
}

export function recommendCharts(profile: DatasetProfile, _data: DataRow[]): ChartRecommendation[] {
    const recommendations: ChartRecommendation[] = [];

    // СТРОГИЙ поиск числовых колонок — только тип 'number' И БЕЗ "date" в названии
    const numericCols = profile.columns
        .filter((c) => c.type === 'number' && !/date|дата|time|время/i.test(c.name))
        .map((c) => c.name);

    // Все нечисловые колонки
    const stringCols = profile.columns
        .filter((c) => c.type === 'category' || c.type === 'date' || c.type === 'text')
        .map((c) => c.name);

    // Ищем колонку даты — по названию ИЛИ по типу 'date'
    const dateCol = profile.columns.find(c =>
        c.type === 'date' || /date|дата|month|месяц|year|год|time|время/i.test(c.name)
    )?.name || stringCols[0];

    // Ищем категориальную колонку (не дату)
    const categoryCol = stringCols.find(c =>
        /category|категория|регион|город|name|имя/i.test(c) && c !== dateCol
    ) || stringCols.find(c => c !== dateCol) || stringCols[0];

    // 1. Линейный график (только если есть дата И числовая колонка)
    if (dateCol && numericCols.length > 0) {
        recommendations.push({
            id: 'line-1',
            chartType: 'line',
            title: 'Динамика показателей',
            description: `Изменение ${numericCols[0]} во времени (${dateCol})`,
            xColumn: dateCol,
            yColumn: numericCols[0],
        });
    }

    // 2. Столбчатая диаграмма
    if (categoryCol && numericCols.length > 0) {
        recommendations.push({
            id: 'bar-1',
            chartType: 'bar',
            title: 'Сравнение по категориям',
            description: `Суммарное значение ${numericCols[0]} в разрезе ${categoryCol}`,
            xColumn: categoryCol,
            yColumn: numericCols[0],
        });

        // 3. Круговая диаграмма
        recommendations.push({
            id: 'pie-1',
            chartType: 'pie',
            title: 'Структура и доли',
            description: `Распределение ${numericCols[0]} по категориям (${categoryCol})`,
            xColumn: categoryCol,
            yColumn: numericCols[0],
        });
    }

    // 4. Scatter plot — ТОЛЬКО если есть минимум 2 РЕАЛЬНЫХ числовых колонки (без дат)
    if (numericCols.length >= 2) {
        recommendations.push({
            id: 'scatter-1',
            chartType: 'scatter',
            title: 'Корреляция показателей',
            description: `Взаимосвязь между ${numericCols[0]} и ${numericCols[1]}`,
            xColumn: numericCols[0],
            yColumn: numericCols[1],
        });

        // 5. Heatmap
        recommendations.push({
            id: 'heatmap-1',
            chartType: 'heatmap',
            title: 'Тепловая карта корреляций',
            description: 'Взаимосвязь между всеми числовыми показателями',
            xColumn: numericCols[0],
            yColumn: numericCols[1],
        });
    }

    return recommendations.slice(0, 5);
}