import { DatasetProfile, AIInsight, KPI } from '../core/types';
import { AnomalyResult, TrendResult } from '../core/anomalyDetector';
import { getDatasetSummary } from '../core/profiler';

// Главная функция: генерирует инсайты на основе правил
export function generateMockInsights(
    profile: DatasetProfile,
    kpis: KPI[],
    anomalies: AnomalyResult[],
    trends: TrendResult[]
): AIInsight {
    const summary = generateSummary(profile, kpis);
    const trendInsights = generateTrendInsights(trends);
    // Используем profile.totalRows вместо data.length
    const anomalyInsights = generateAnomalyInsights(anomalies, profile.totalRows);
    const recommendations = generateRecommendations(trends, anomalies, kpis);

    return {
        summary,
        trends: trendInsights,
        anomalies: anomalyInsights,
        recommendations,
        mode: 'mock',
        generatedAt: new Date().toISOString(),
    };
}

// Генерирует сводку по датасету
function generateSummary(
    profile: DatasetProfile,
    kpis: KPI[]
): string {
    const summary = getDatasetSummary(profile);
    const revenueKpi = kpis.find(k => k.id === 'total_revenue');
    const profitKpi = kpis.find(k => k.id === 'total_profit');

    let text = `Набор данных содержит ${summary.totalRows} записей по ${summary.totalColumns} параметрам. `;

    if (revenueKpi) {
        text += `Общая выручка составляет ${revenueKpi.value}. `;
    }

    if (profitKpi) {
        text += `Общая прибыль: ${profitKpi.value}. `;
    }

    if (summary.totalMissingValues > 0) {
        text += `Обнаружено ${summary.totalMissingValues} пропущенных значений (${summary.missingPercentage}%). `;
    }

    text += 'Распределение показывает стабильную динамику с ключевыми точками роста.';

    return text;
}

// Генерирует инсайты о трендах
function generateTrendInsights(trends: TrendResult[]): string[] {
    const insights: string[] = [];

    for (const trend of trends) {
        const direction = trend.direction === 'up' ? 'рост'
            : trend.direction === 'down' ? 'снижение'
                : 'стабильность';

        insights.push(
            `${trend.columnName}: наблюдается ${direction} на ${Math.abs(trend.changePercent).toFixed(1)}% ` +
            `(среднее: ${trend.firstHalfAvg.toFixed(2)} → ${trend.secondHalfAvg.toFixed(2)})`
        );
    }

    if (insights.length === 0) {
        insights.push('Значимых трендов не обнаружено. Данные распределены равномерно.');
    }

    return insights;
}

// Генерирует инсайты об аномалиях
function generateAnomalyInsights(anomalies: AnomalyResult[], totalRows: number): string[] {
    const insights: string[] = [];

    for (const anomaly of anomalies) {
        const percentage = ((anomaly.outlierCount / totalRows) * 100).toFixed(1);
        const highOutliers = anomaly.outliers.filter(o => o.reason === 'high');
        const lowOutliers = anomaly.outliers.filter(o => o.reason === 'low');

        let text = `${anomaly.columnName}: обнаружено ${anomaly.outlierCount} выбросов (${percentage}% данных). `;

        if (highOutliers.length > 0) {
            const maxVal = Math.max(...highOutliers.map(o => o.value));
            text += `Высоких значений: ${highOutliers.length} (макс. ${maxVal.toFixed(2)}). `;
        }

        if (lowOutliers.length > 0) {
            text += `Низких значений: ${lowOutliers.length}.`;
        }

        insights.push(text);
    }

    if (insights.length === 0) {
        insights.push('Статистически значимых аномалий не обнаружено.');
    }

    return insights;
}

// Генерирует рекомендации
function generateRecommendations(
    trends: TrendResult[],
    anomalies: AnomalyResult[],
    kpis: KPI[]
): string[] {
    const recommendations: string[] = [];

    const decliningTrend = trends.find(t => t.direction === 'down');
    if (decliningTrend) {
        recommendations.push(
            `Проанализировать причины снижения ${decliningTrend.columnName} (падение на ${Math.abs(decliningTrend.changePercent).toFixed(1)}%).`
        );
    }

    const growingTrend = trends.find(t => t.direction === 'up');
    if (growingTrend) {
        recommendations.push(
            `Масштабировать факторы роста ${growingTrend.columnName} (рост на ${growingTrend.changePercent.toFixed(1)}%).`
        );
    }

    if (anomalies.length > 0) {
        const maxAnomaly = anomalies.reduce((max, a) => a.outlierCount > max.outlierCount ? a : max);
        recommendations.push(
            `Исследовать ${maxAnomaly.outlierCount} выбросов в колонке ${maxAnomaly.columnName} для выявления причин.`
        );
    }

    const profitMargin = kpis.find(k => k.id === 'profit_margin');
    if (profitMargin && profitMargin.trend === 'down') {
        recommendations.push('Оптимизировать расходы для повышения маржинальности.');
    }

    if (recommendations.length === 0) {
        recommendations.push('Продолжать мониторинг ключевых показателей.');
    }

    return recommendations;
}