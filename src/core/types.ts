// Тип для одной строки данных из CSV
export interface DataRow {
  [key: string]: string | number | null;
}

// Метаданные одного столбца
export interface ColumnMeta {
  name: string;
  type: 'number' | 'category' | 'date' | 'text';
  uniqueCount: number;
  missingCount: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  topValues?: Array<{ value: string; count: number }>;
}

// Полный профиль датасета
export interface DatasetProfile {
  totalRows: number;
  totalColumns: number;
  columns: ColumnMeta[];
}

// KPI показатель
export interface KPI {
  id: string;
  label: string;
  value: string;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

// KPI с сравнением периодов
export interface KPIWithComparison extends KPI {
  previousValue?: string;
  changePercent?: number;
  changeAbsolute?: number;
}

// AI инсайт
export interface AIInsight {
  summary: string;
  trends: string[];
  anomalies: string[];
  recommendations: string[];
  mode: 'mock' | 'groq' | 'gemini' | 'openrouter';
  generatedAt: string;
}

// Рекомендация графика
export interface ChartRecommendation {
  id: string;
  chartType: 'line' | 'bar' | 'scatter' | 'pie' | 'heatmap';
  title: string;
  description: string;
  xColumn: string;
  yColumn: string;
}

// Состояние дашборда
export interface DashboardState {
  rawData: DataRow[];
  profile: DatasetProfile;
  kpis: KPI[];
  recommendations: ChartRecommendation[];
  insights: AIInsight;
  lastUpdated: string;
}