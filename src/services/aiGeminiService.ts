import { DatasetProfile, KPI } from '../core/types';
import { AnomalyResult, TrendResult } from '../core/anomalyDetector';

export interface GeminiInsightResponse {
    summary: string;
    trends: string[];
    anomalies: string[];
    recommendations: string[];
}

export async function generateGeminiInsights(
    profile: DatasetProfile,
    kpis: KPI[],
    anomalies: AnomalyResult[],
    trends: TrendResult[]
): Promise<GeminiInsightResponse> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        return getFallbackResponse(profile, kpis, anomalies, trends);
    }

    const prompt = buildPrompt(profile, kpis, anomalies, trends);

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 1500,
                    },
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanText = text.replace(/^```json\s*|\s*```$/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error('Gemini API error:', error);
        return getFallbackResponse(profile, kpis, anomalies, trends);
    }
}

function getFallbackResponse(
    profile: DatasetProfile,
    kpis: KPI[],
    anomalies: AnomalyResult[],
    trends: TrendResult[]
): GeminiInsightResponse {
    const kpiText = kpis.length > 0
        ? kpis.map(k => `- ${k.label}: ${k.value}`).join('\n')
        : 'KPI не рассчитаны';

    const anomalyText = anomalies.length > 0
        ? anomalies.map(a => `- ${a.columnName}: ${a.outlierCount} выбросов`).join('\n')
        : 'Аномалий не обнаружено';

    const trendText = trends.length > 0
        ? trends.map(t => `- ${t.columnName}: ${t.direction}`).join('\n')
        : 'Трендов не выявлено';

    return {
        summary: `Датасет содержит ${profile.totalRows} строк и ${profile.totalColumns} столбцов. Основные показатели:\n${kpiText}`,
        trends: [trendText],
        anomalies: [anomalyText],
        recommendations: ['Продолжайте мониторинг ключевых показателей', 'Проанализируйте выявленные аномалии'],
    };
}

function buildPrompt(
    profile: DatasetProfile,
    kpis: KPI[],
    anomalies: AnomalyResult[],
    trends: TrendResult[]
): string {
    const kpiText = kpis.length > 0
        ? kpis.map(k => `- ${k.label}: ${k.value}`).join('\n')
        : 'KPI не рассчитаны';

    const anomalyText = anomalies.length > 0
        ? anomalies.map(a => `- ${a.columnName}: ${a.outlierCount} выбросов`).join('\n')
        : 'Аномалий не обнаружено';

    const trendText = trends.length > 0
        ? trends.map(t => `- ${t.columnName}: ${t.direction}`).join('\n')
        : 'Трендов не выявлено';

    return `Проанализируй бизнес-данные и верни JSON:
- Строк: ${profile.totalRows}
- Столбцов: ${profile.totalColumns}
- KPI:
${kpiText}
- Аномалии:
${anomalyText}
- Тренды:
${trendText}

Верни JSON: {"summary":"...","trends":[],"anomalies":[],"recommendations":[]}`;
}