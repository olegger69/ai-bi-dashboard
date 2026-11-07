// Основные типы данных для AI BI Dashboard

// Типы данных в колонках CSV
export type ColumnType = 'numeric' | 'categorical' | 'date' | 'text' | 'unknown';

// Одна строка данных из CSV (ключ - имя колонки, значение - строковое представление)
export type DataRow = Record<string, string | number | null>;

// Метаданные одной колонки после профилирования
export interface ColumnMeta {
  name: string;
  type: ColumnType;
  missingCount: number;
  uniqueCount: number;
  // Дополнительные статистические данные для числовых колонок
  min?: number;
  max?: number;
  mean?: number;
  // Топ-значения для категориальных колонок
  topValues?: { value: string; count: number }[];
}

// Полный профиль набора данных
export interface DatasetProfile {
  totalRows: number;
  totalColumns: number;
  columns: ColumnMeta[];
}

// KPI для отображения на дашборде и в отчете
export interface KPI {
  id: string;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  description?: string;
}

// Рекомендация по типу графика
export interface ChartRecommendation {
  id: string;
  chartType: 'line' | 'bar' | 'scatter';
  title: string;
  xColumn: string;
  yColumn: string;
  description: string;
}

// Результаты анализа ИИ (или мок-режима)
export interface AIInsight {
  summary: string;
  trends: string[];
  anomalies: string[];
  recommendations: string[];
  mode: 'mock' | 'gemini'; // Указывает, какой режим сгенерировал вывод
  generatedAt: string;
}

// Полное состояние сессии дашборда (для сохранения в LocalStorage)
export interface DashboardState {
  rawData: DataRow[];
  profile: DatasetProfile;
  kpis: KPI[];
  recommendations: ChartRecommendation[];
  insights: AIInsight | null;
  lastUpdated: string;
}