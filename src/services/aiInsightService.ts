import { DatasetProfile, KPI, AIInsight } from '../core/types';
import { AnomalyResult, TrendResult } from '../core/anomalyDetector';
import { generateMockInsights } from './aiMockService';
import { generateGroqInsights } from './aiGroqService';

export async function generateInsights(
    profile: DatasetProfile,
    kpis: KPI[],
    anomalies: AnomalyResult[],
    trends: TrendResult[]
): Promise<AIInsight> {
    const mode = (import.meta.env.VITE_AI_MODE as 'mock' | 'groq' | 'gemini') || 'mock';

    try {
        if (mode === 'groq') {
            const result = await generateGroqInsights(profile, kpis, anomalies, trends);
            return {
                summary: result.summary,
                trends: result.trends,
                anomalies: result.anomalies,
                recommendations: result.recommendations,
                mode: 'groq',
                generatedAt: new Date().toISOString(),
            };
        }

        return generateMockInsights(profile, kpis, anomalies, trends);
    } catch (error) {
        console.warn('AI service failed, falling back to mock:', error);
        return generateMockInsights(profile, kpis, anomalies, trends);
    }
}

export function formatInsightDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}