import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, ScatterChart, Scatter, Legend
} from 'recharts';
import { ArrowLeft, Printer, Brain, TrendingUp, FileText, AlertCircle } from 'lucide-react';
import { DashboardState } from '../../core/types';
import { loadDashboardState } from '../../services/storageService';
import { getChartData } from '../../core/chartRecommender';
import { formatInsightDate } from '../../services/aiInsightService';

export default function ReportPage() {
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

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handlePrint = () => {
    window.print();
  };

  if (!state) {
    return (
        <div className="app-container">
          <div className="spinner">Загрузка...</div>
        </div>
    );
  }

  const { profile, kpis, recommendations, insights } = state;
  const reportDate = new Date().toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
      <div className="app-container">
        <header className="app-header no-print">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#2563eb"/>
              <path d="M8 20L14 14L18 18L24 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1>AI BI Dashboard</h1>
          </div>
          <nav className="app-nav">
            <button className="btn btn--ghost" onClick={handleBack}>
              <ArrowLeft size={16} />
              <span>Назад к дашборду</span>
            </button>
            <button className="btn btn--primary" onClick={handlePrint}>
              <Printer size={16} />
              <span>Печать / PDF</span>
            </button>
          </nav>
        </header>

        <main className="app-main">
          <div className="report-page">
            <div className="report-header">
              <div className="report-logo">
                <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="8" fill="#2563eb"/>
                  <path d="M8 20L14 14L18 18L24 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="report-title">Executive Intelligence Report</h1>
              <p className="report-date">{reportDate}</p>
              <div className="report-meta">
                <span>Всего записей: {profile.totalRows.toLocaleString()}</span>
                <span>•</span>
                <span>Параметров: {profile.totalColumns}</span>
              </div>
            </div>

            {kpis.length > 0 && (
                <section className="report-section">
                  <h2 className="report-section-title">Key Performance Indicators</h2>
                  <div className="report-kpi-grid">
                    {kpis.map(kpi => (
                        <div key={kpi.id} className="report-kpi-card">
                          <div className="report-kpi-label">{kpi.label}</div>
                          <div className="report-kpi-value">{kpi.value}</div>
                          {kpi.description && (
                              <div className="report-kpi-desc">{kpi.description}</div>
                          )}
                        </div>
                    ))}
                  </div>
                </section>
            )}

            {recommendations.length > 0 && (
                <section className="report-section">
                  <h2 className="report-section-title">Data Visualization</h2>
                  {recommendations.map(rec => {
                    const chartData = getChartData(rec, state.rawData);

                    return (
                        <div key={rec.id} className="report-chart-wrapper">
                          <h3 className="report-chart-title">{rec.title}</h3>
                          <p className="report-chart-desc">{rec.description}</p>
                          <div className="report-chart-container">
                            {rec.chartType === 'line' && (
                                <LineChart width={700} height={300} data={chartData} margin={{ top: 10, right: 30, bottom: 5, left: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey={rec.xColumn} />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Line type="monotone" dataKey={rec.yColumn} stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            )}
                            {rec.chartType === 'bar' && (
                                <BarChart width={700} height={300} data={chartData} margin={{ top: 10, right: 30, bottom: 5, left: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey={rec.xColumn} />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Bar dataKey={rec.yColumn} fill="#2563eb" />
                                </BarChart>
                            )}
                            {rec.chartType === 'scatter' && (
                                <ScatterChart width={700} height={300} margin={{ top: 10, right: 30, bottom: 5, left: 0 }}>
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
                    );
                  })}
                </section>
            )}

            {insights && (
                <section className="report-section">
                  <h2 className="report-section-title">AI Analysis & Insights</h2>

                  <div className="report-insight-block">
                    <div className="report-insight-header">
                      <Brain size={20} />
                      <h3>Executive Summary</h3>
                    </div>
                    <p className="report-insight-text">{insights.summary}</p>
                  </div>

                  {insights.trends.length > 0 && (
                      <div className="report-insight-block">
                        <div className="report-insight-header">
                          <TrendingUp size={20} />
                          <h3>Trends</h3>
                        </div>
                        <ul className="report-insight-list">
                          {insights.trends.map((trend, idx) => (
                              <li key={idx}>{trend}</li>
                          ))}
                        </ul>
                      </div>
                  )}

                  {insights.anomalies.length > 0 && (
                      <div className="report-insight-block">
                        <div className="report-insight-header">
                          <AlertCircle size={20} />
                          <h3>Anomalies</h3>
                        </div>
                        <ul className="report-insight-list">
                          {insights.anomalies.map((anomaly, idx) => (
                              <li key={idx}>{anomaly}</li>
                          ))}
                        </ul>
                      </div>
                  )}

                  {insights.recommendations.length > 0 && (
                      <div className="report-insight-block">
                        <div className="report-insight-header">
                          <FileText size={20} />
                          <h3>Critical Recommendations</h3>
                        </div>
                        <ul className="report-insight-list">
                          {insights.recommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                  )}

                  <div className="report-insight-footer">
                    <span>Generated by {insights.mode === 'gemini' ? 'Gemini AI' : 'AI Rules Engine'}</span>
                    <span>{formatInsightDate(insights.generatedAt)}</span>
                  </div>
                </section>
            )}

            <footer className="report-footer">
              <p>Confidential — Business Intelligence Report • {new Date().getFullYear()}</p>
              <p>Built with Antigravity AI</p>
            </footer>
          </div>
        </main>
      </div>
  );
}