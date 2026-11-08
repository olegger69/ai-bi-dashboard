import { DatasetProfile, KPI, AIInsight } from '../core/types';
import { AnomalyResult, TrendResult } from '../core/anomalyDetector';

export function generateMockInsights(
    profile: DatasetProfile,
    kpis: KPI[],
    anomalies: AnomalyResult[],
    trends: TrendResult[]
): AIInsight {
    const kpiSummary = kpis.length > 0
        ? kpis.map(k => `${k.label}: ${k.value}`).join(', ')
        : 'KPI не рассчитаны';

    const trendSummary = trends.length > 0
        ? trends.map(t => {
            const direction = t.direction === 'up' ? 'рост' : t.direction === 'down' ? 'снижение' : 'стабильность';
            return `${t.columnName}: наблюдается ${direction} на ${Math.abs(t.changePercent).toFixed(1)}%`;
        }).join('; ')
        : 'Явных трендов не выявлено';

    const anomalySummary = anomalies.length > 0
        ? `Обнаружено ${anomalies.length} аномалий: ${anomalies.map(a => `${a.columnName} (${a.outlierCount} выбросов)`).join(', ')}`
        : 'Статистически значимых аномалий не обнаружено';

    const recommendations = generateRecommendations(kpis, anomalies, trends);

    return {
        summary: `Датасет содержит ${profile.totalRows} записей и ${profile.totalColumns} параметров. ${kpiSummary}.`,
        trends: trends.length > 0
            ? trends.map(t => {
                const direction = t.direction === 'up' ? 'рост' : t.direction === 'down' ? 'снижение' : 'стабильность';
                return `${t.columnName}: наблюдается ${direction} на ${Math.abs(t.changePercent).toFixed(1)}%`;
            })
            : [trendSummary],
        anomalies: anomalies.length > 0
            ? anomalies.map(a => `${a.columnName}: обнаружено ${a.outlierCount} выбросов. Диапазон нормы: ${a.lowerBound.toFixed(2)} – ${a.upperBound.toFixed(2)}`)
            : [anomalySummary],
        recommendations,
        mode: 'mock',
        generatedAt: new Date().toISOString(),
    };
}

// ИСПРАВЛЕНО: добавлено '_' перед kpis, чтобы TypeScript не ругался
function generateRecommendations(
    _kpis: KPI[],
    anomalies: AnomalyResult[],
    trends: TrendResult[]
): string[] {
    const recommendations: string[] = [];

    // Рекомендации на основе трендов
    trends.forEach(t => {
        if (t.direction === 'down') {
            recommendations.push(`Проанализировать причины снижения ${t.columnName} и разработать план восстановления`);
        } else if (t.direction === 'up') {
            recommendations.push(`Масштабировать факторы роста ${t.columnName}`);
        }
    });

    // Рекомендации на основе аномалий
    if (anomalies.length > 0) {
        recommendations.push(`Исследовать ${anomalies.length} выявленных аномалий для понимания их природы`);
    }

    // Общие рекомендации
    if (recommendations.length < 2) {
        recommendations.push('Продолжать регулярный мониторинг ключевых показателей');
        recommendations.push('Сравнить текущие результаты с предыдущими периодами');
    }

    return recommendations.slice(0, 4);
}