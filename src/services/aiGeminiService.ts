// Интеграция с Google Gemini API
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DatasetProfile, AIInsight, KPI } from '../core/types';
import { AnomalyResult, TrendResult } from '../core/anomalyDetector';
import { getDatasetSummary } from '../core/profiler';

// Главная функция: генерирует инсайты через Google Gemini API
export async function generateGeminiInsights(
    profile: DatasetProfile,
    kpis: KPI[],
    anomalies: AnomalyResult[],
    trends: TrendResult[],
    apiKey: string
): Promise<AIInsight> {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Используем gemini-1.5-flash как оптимальный по скорости и качеству для таких задач
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const summary = getDatasetSummary(profile);

    // Формируем контекст для промпта
    const context = {
        dataset: {
            totalRows: summary.totalRows,
            totalColumns: summary.totalColumns,
            missingValues: summary.totalMissingValues,
            missingPercentage: summary.missingPercentage,
        },
        kpis: kpis.map(k => ({ label: k.label, value: k.value, trend: k.trend })),
        trends: trends.map(t => ({
            column: t.columnName,
            direction: t.direction,
            changePercent: t.changePercent,
        })),
        anomalies: anomalies.map(a => ({
            column: a.columnName,
            outlierCount: a.outlierCount,
            maxOutlier: Math.max(...a.outliers.map(o => o.value)),
        })),
    };

    const prompt = `
Ты — старший аналитик данных. Проанализируй следующие метрики бизнес-датасета и сгенерируй структурированный отчет в формате строгого JSON.
Не добавляй никаких пояснений вне JSON, никаких markdown-оберток (вроде \`\`\`json). Только валидный JSON объект.

Входные данные:
${JSON.stringify(context, null, 2)}

Требования к ответу (строго следуй этой схеме):
{
  "summary": "Краткий обзор датасета на 2-3 предложения на русском языке, упоминающий ключевые KPI и общее качество данных.",
  "trends": [
    "Конкретный вывод о тренде на русском языке (например, 'Выручка показывает устойчивый рост на X%')."
  ],
  "anomalies": [
    "Конкретный вывод об аномалиях на русском языке (например, 'Обнаружено X выбросов в колонке Y, требующих проверки')."
  ],
  "recommendations": [
    "Конкретная бизнес-рекомендация на русском языке, основанная на данных (например, 'Проанализировать причины падения в категории Z')."
  ]
}

Правила:
1. Массивы trends, anomalies и recommendations должны содержать от 1 до 3 пунктов каждый.
2. Если значимых трендов или аномалий нет, напиши об этом честно (например, "Значимых аномалий не обнаружено").
3. Используй деловой, профессиональный стиль русского языка.
4. Ссылки на конкретные цифры из входных данных обязательны.
`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Очищаем ответ от возможных markdown-оберток, если модель всё же их добавила
        const cleanJson = responseText
            .replace(/^```json\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        const parsed = JSON.parse(cleanJson) as AIInsight;

        return {
            summary: parsed.summary || 'Анализ завершен.',
            trends: parsed.trends || [],
            anomalies: parsed.anomalies || [],
            recommendations: parsed.recommendations || [],
            mode: 'gemini',
            generatedAt: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Gemini API error:', error);
        // Пробрасываем ошибку дальше, чтобы aiInsightService.ts мог переключиться на mock-режим
        throw new Error('Failed to generate insights via Gemini API');
    }
}
