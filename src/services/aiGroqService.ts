import Groq from 'groq-sdk';
import { DatasetProfile, KPI } from '../core/types';
import { AnomalyResult, TrendResult } from '../core/anomalyDetector';

const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true,
});

export interface GroqInsightResponse {
    summary: string;
    trends: string[];
    anomalies: string[];
    recommendations: string[];
}

export async function generateGroqInsights(
    profile: DatasetProfile,
    kpis: KPI[],
    anomalies: AnomalyResult[],
    trends: TrendResult[]
): Promise<GroqInsightResponse> {
    const prompt = buildPrompt(profile, kpis, anomalies, trends);

    try {
        const response = await groq.chat.completions.create({
            // САМАЯ СТАБИЛЬНАЯ МОДЕЛЬ: точное написание без лишних дефисов
            model: 'openai/gpt-oss-20b',
            messages: [
                {
                    role: 'system',
                    content: `Ты — опытный бизнес-аналитик и data scientist. 
                    Отвечай на русском языке, конкретно и по делу. 
                    Используй только данные из предоставленного контекста, не выдумывай цифры.
                    Формат ответа — строго валидный JSON-объект без markdown-обёрток (без \`\`\`json).`
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 1500,
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content || '{}';
        const cleanContent = content.replace(/^```json\s*|\s*```$/g, '').trim();
        return JSON.parse(cleanContent);
    } catch (error) {
        console.error('Groq API error:', error);
        throw new Error('Не удалось получить инсайты от AI. Проверьте API ключ или попробуйте позже.');
    }
}

function buildPrompt(
    profile: DatasetProfile,
    kpis: KPI[],
    anomalies: AnomalyResult[],
    trends: TrendResult[]
): string {
    const kpiText = kpis.map(k => `- ${k.label}: ${k.value}${k.description ? ' (' + k.description + ')' : ''}`).join('\n');

    const anomalyText = anomalies.length > 0
        ? anomalies.map(a => `- ${a.columnName}: обнаружено ${a.outlierCount} выбросов. Диапазон нормы: ${a.lowerBound.toFixed(2)} – ${a.upperBound.toFixed(2)}. Примеры значений: ${a.outliers.slice(0, 3).map(o => o.value).join(', ')}`).join('\n')
        : 'Статистически значимых аномалий не обнаружено.';

    const trendText = trends.length > 0
        ? trends.map(t => `- ${t.columnName}: наблюдается ${t.direction === 'up' ? 'рост' : t.direction === 'down' ? 'снижение' : 'стабильность'} на ${Math.abs(t.changePercent).toFixed(1)}%. Среднее значение изменилось с ${t.firstHalfAvg.toFixed(2)} до ${t.secondHalfAvg.toFixed(2)}.`).join('\n')
        : 'Явных трендов роста или падения не выявлено.';

    return `Проанализируй следующие бизнес-данные и сгенерируй инсайты для владельца бизнеса.

## Профиль данных
- Всего строк: ${profile.totalRows}
- Всего столбцов: ${profile.totalColumns}
- Типы столбцов: ${profile.columns.map(c => c.name + ' (' + c.type + ')').join(', ')}

## Ключевые показатели (KPI)
${kpiText}

## Обнаруженные аномалии (выбросы по методу IQR)
${anomalyText}

## Выявленные тренды (сравнение первой и второй половины данных)
${trendText}

## Задача
Верни строго JSON-объект следующей структуры (без дополнительного текста и без markdown-обёрток):
{
  "summary": "Краткое резюме (2-3 предложения) о текущем состоянии бизнеса на основе предоставленных данных.",
  "trends": ["Массив из 2-4 ключевых трендов с конкретными цифрами из данных выше."],
  "anomalies": ["Массив из 1-3 аномалий с объяснением, как это может влиять на бизнес."],
  "recommendations": ["Массив из 2-4 конкретных, выполнимых рекомендаций для улучшения показателей."]
}

Правила:
1. Пиши на русском языке.
2. Используй ТОЛЬКО реальные цифры из предоставленных данных.
3. Делай выводы конкретными и применимыми для бизнеса.
4. Рекомендации должны быть действиями, а не общими фразами.`;
}