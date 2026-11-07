import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, ScatterChart, Scatter, Legend
} from 'recharts';
import { FileText, Download, RotateCcw, TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react';
import { DashboardState } from '../../core/types';
import { loadDashboardState, clearDashboardState } from '../../services/storageService';
import { getChartData } from '../../core/chartRecommender';
import { formatInsightDate } from '../../services/aiInsightService';
import { exportToMarkdown, downloadMarkdown } from '../../services/exportService';
import DataTable from '../../ui/components/DataTable';

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = loadDashboardState();
    if (!saved || saved.rawData.length === 0) {
      navigate('/');
    } else {
      setState(saved);
    }
  }, [navigate]);

  const handleReset = () => {
    if (window.confirm('Вы уверены, что хотите очистить все данные?')) {
      clearDashboardState();
      navigate('/');
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportMarkdown = () => {
    if (state) {
      const md = exportToMarkdown(state);
      downloadMarkdown(md, `ai-bi-report-${Date.now()}.md`);
    }
  };

  const handleViewReport = () => {
    navigate('/report');
  };

  if (!state) {
    return (
        <div className="app-container">
          <div className="spinner">Загрузка...</div>
        </div>
    );
  }

  const { profile, kpis, recommendations, insights } = state;

  return (
      <div className="app-container">
        <header className="app-header">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#2563eb"/>
              <path d="M8 20L14 14L18 18L24 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1>AI BI Dashboard</h1>
          </div>
          <nav className="app-nav">
            <button className="btn btn--ghost" onClick={handleViewReport}>
              <FileText size={16} />
              <span>View Report</span>
            </button>
            <button className="btn btn--secondary" onClick={handleExportMarkdown}>
              <Download size={16} />
              <span>Export MD</span>
            </button>
            <button className="btn btn--primary" onClick={handleExportPDF}>
              <Download size={16} />
              <span>Export PDF</span>
            </button>
            <button className="btn btn--danger" onClick={handleReset}>
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
          </nav>
        </header>

        <main className="app-main">
          {/* Сводка */}
          <section className="summary-section">
            <h2>Сводка по данным</h2>
            <div className="summary-grid">
              <div className="summary-item">
                <div className="summary-label">Всего строк</div>
                <div className="summary-value">{profile.totalRows.toLocaleString()}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Всего столбцов</div>
                <div className="summary-value">{profile.totalColumns}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Уникальных значений</div>
                <div className="summary-value">
                  {profile.columns.reduce((sum, col) => sum + col.uniqueCount, 0).toLocaleString()}
                </div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Пропущенных значений</div>
                <div className="summary-value">
                  {profile.columns.reduce((sum, col) => sum + col.missingCount, 0).toLocaleString()}
                </div>
              </div>
            </div>
          </section>

          {/* KPI */}
          {kpis.length > 0 && (
              <section className="kpi-section">
                <div className="kpi-grid">
                  {kpis.map(kpi => (
                      <div key={kpi.id} className="kpi-card">
                        <div className="kpi-card__label">{kpi.label}</div>
                        <div className="kpi-card__value">{kpi.value}</div>
                        {kpi.description && (
                            <div className="kpi-card__description">{kpi.description}</div>
                        )}
                        {kpi.trend && (
                            <div className={`kpi-card__trend kpi-card__trend--${kpi.trend}`}>
                              {kpi.trend === 'up' && <TrendingUp size={14} />}
                              {kpi.trend === 'down' && <TrendingDown size={14} />}
                              {kpi.trend === 'neutral' && <Minus size={14} />}
                              <span>{kpi.trendValue || ''}</span>
                            </div>
                        )}
                      </div>
                  ))}
                </div>
              </section>
          )}

          {/* Двухколоночная раскладка */}
          <div className="dashboard-two-column">
            {/* Левая колонка: Графики + Таблица */}
            <div className="dashboard-left">
              {recommendations.length > 0 && (
                  <section className="charts-section">
                    {recommendations.map(rec => {
                      const chartData = getChartData(rec, state.rawData);

                      return (
                          <div key={rec.id} className="card chart-card">
                            <div className="card__header">
                              <h3 className="card__title">{rec.title}</h3>
                            </div>
                            <div className="card__body">
                              <p className="chart-description">{rec.description}</p>
                              <div className="chart-container-large">
                                {rec.chartType === 'line' && (
                                    <LineChart width={750} height={350} data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey={rec.xColumn} />
                                      <YAxis />
                                      <Tooltip />
                                      <Legend />
                                      <Line type="monotone" dataKey={rec.yColumn} stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                                    </LineChart>
                                )}
                                {rec.chartType === 'bar' && (
                                    <BarChart width={750} height={350} data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey={rec.xColumn} />
                                      <YAxis />
                                      <Tooltip />
                                      <Legend />
                                      <Bar dataKey={rec.yColumn} fill="#2563eb" />
                                    </BarChart>
                                )}
                                {rec.chartType === 'scatter' && (
                                    <ScatterChart width={750} height={350} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis type="number" dataKey={rec.xColumn} name={rec.xColumn} />
                                      <YAxis type="number" dataKey={rec.yColumn} name={rec.yColumn} />
                                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                      <Legend />
                                      <Scatter name={`${rec.xColumn} vs ${rec.yColumn}`} data={chartData} fill="#10b981" />
                                    </ScatterChart>
                                )}
                              </div>
                            </div>
                          </div>
                      );
                    })}
                  </section>
              )}

              {/* Таблица предпросмотра */}
              <section className="data-preview-section">
                <DataTable data={state.rawData} maxRows={50} />
              </section>
            </div>

            {/* Правая колонка: AI Insights (sticky) */}
            <div className="dashboard-right">
              {insights && (
                  <section className="insights-section sticky">
                    <div className="insights-panel">
                      <div className="insights-panel__section">
                        <div className="insights-panel__title">
                          <Brain size={18} />
                          <span>AI Insights</span>
                        </div>
                        <p>{insights.summary}</p>
                      </div>

                      {insights.trends.length > 0 && (
                          <div className="insights-panel__section">
                            <div className="insights-panel__title">
                              <TrendingUp size={18} />
                              <span>Тренды</span>
                            </div>
                            <ul className="insights-panel__list">
                              {insights.trends.map((trend, idx) => (
                                  <li key={idx} className="insights-panel__item">{trend}</li>
                              ))}
                            </ul>
                          </div>
                      )}

                      {insights.anomalies.length > 0 && (
                          <div className="insights-panel__section">
                            <div className="insights-panel__title">
                              <Brain size={18} />
                              <span>Аномалии</span>
                            </div>
                            <ul className="insights-panel__list">
                              {insights.anomalies.map((anomaly, idx) => (
                                  <li key={idx} className="insights-panel__item">{anomaly}</li>
                              ))}
                            </ul>
                          </div>
                      )}

                      {insights.recommendations.length > 0 && (
                          <div className="insights-panel__section">
                            <div className="insights-panel__title">
                              <FileText size={18} />
                              <span>Рекомендации</span>
                            </div>
                            <ul className="insights-panel__list">
                              {insights.recommendations.map((rec, idx) => (
                                  <li key={idx} className="insights-panel__item">{rec}</li>
                              ))}
                            </ul>
                          </div>
                      )}

                      <div className="insights-panel__mode">
                        <span>Режим: {insights.mode === 'gemini' ? 'Gemini AI' : 'Правила (Mock)'}</span>
                        <span>Сгенерировано: {formatInsightDate(insights.generatedAt)}</span>
                      </div>
                    </div>
                  </section>
              )}
            </div>
          </div>
        </main>
      </div>
  );
}