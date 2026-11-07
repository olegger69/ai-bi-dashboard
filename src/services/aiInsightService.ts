import { DatasetProfile, AIInsight, KPI } from '../core/types';
import { AnomalyResult, TrendResult } from '../core/anomalyDetector';
import { generateMockInsights } from './aiMockService';
import { generateGeminiInsights } from './aiGeminiService';

// Типы режимов AI
export type AIMode = 'mock' | 'gemini';

// Интерфейс для конфигурации AI-сервиса
export interface AIConfig {
    mode: AIMode;
    apiKey?: string;
}

// Получает текущий режим из переменных окружения
export function getAIConfig(): AIConfig {
    const mode = (import.meta.env.VITE_AI_MODE as AIMode) || 'mock';
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    return { mode, apiKey };
}

// Проверяет, доступен ли Gemini API
export function isGeminiAvailable(): boolean {
    const config = getAIConfig();
    return config.mode === 'gemini' && !!config.apiKey;
}

// Главная функция: генерирует AI-инсайты
export async function generateInsights(
    profile: DatasetProfile,
    kpis: KPI[],
    anomalies: AnomalyResult[],
    trends: TrendResult[]
): Promise<AIInsight> {
    const config = getAIConfig();

    try {
        if (config.mode === 'gemini' && config.apiKey) {
            console.log('Generating insights using Gemini API...');
            return await generateGeminiInsights(
                profile,
                kpis,
                anomalies,
                trends,
                config.apiKey
            );
        }

        console.log('Generating insights using mock mode (rules-based)...');
        return generateMockInsights(profile, kpis, anomalies, trends);
    } catch (error) {
        console.error('AI insight generation failed, falling back to mock:', error);
        return generateMockInsights(profile, kpis, anomalies, trends);
    }
}

// Форматирует дату для отображения
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

// Создаёт пустой инсайт (для начального состояния)
export function createEmptyInsight(): AIInsight {
    return {
        summary: '',
        trends: [],
        anomalies: [],
        recommendations: [],
        mode: 'mock',
        generatedAt: new Date().toISOString(),
    };
}