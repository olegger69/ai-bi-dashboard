import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, ScatterChart, Scatter, Legend
} from 'recharts';
import { ArrowLeft, Printer, Brain, TrendingUp, FileText, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { DashboardState } from '../../core/types';
import { loadDashboardState } from '../../services/storageService';
import { getChartData } from '../../core/chartRecommender';
import { formatInsightDate } from '../../services/aiInsightService';
import ThemeToggle from '../components/ThemeToggle';

interface ReportSettings {
  showKPIs: boolean;
  showCharts: boolean;
  showInsights: boolean;
  showTrends: boolean;
  showAnomalies: boolean;
  showRecommendations: boolean;
  selectedKPIs: string[];
  paperSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  scale: number;
  showHeaders: boolean;
}

export default function ReportPage() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [settings, setSettings] = useState<ReportSettings>({
    showKPIs: true,
    showCharts: true,
    showInsights: true,
    showTrends: true,
    showAnomalies: true,
    showRecommendations: true,
    selectedKPIs: [],
    paperSize: 'A4',
    orientation: 'portrait',
    scale: 100,
    showHeaders: false,
  });
  const [isMoreSettingsOpen, setIsMoreSettingsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = loadDashboardState();
    if (!saved || saved.rawData.length === 0) {
      navigate('/');
    } else {
      setState(saved);
      setSettings(prev => ({
        ...prev,
        selectedKPIs: saved.kpis.map(k => k.id),
      }));
    }
  }, [navigate]);

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleKPI = (kpiId: string) => {
    setSettings(prev => {
      const newSelected = prev.selectedKPIs.includes(kpiId)
          ? prev.selectedKPIs.filter(id => id !== kpiId)
          : [...prev.selectedKPIs, kpiId];
      return { ...prev, selectedKPIs: newSelected };
    });
  };

  const toggleSection = (section: keyof ReportSettings) => {
    setSettings(prev => ({ ...prev, [section]: !prev[section] }));
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

  const filteredKPIs = kpis.filter(kpi => settings.selectedKPIs.includes(kpi.id));

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
            <ThemeToggle />
          </nav>
        </header>

        <main className="app-main report-layout">
          <div className="report-content">
            <div
                className={`report-page ${settings.orientation === 'landscape' ? 'report-landscape' : ''}`}
                style={{
                  transform: settings.scale !== 100 ? `scale(${settings.scale / 100})` : 'none',
                  transformOrigin: 'top left',
                  width: settings.scale !== 100 ? `${10000 / settings.scale}%` : '100%',
                }}
            >
              {settings.showHeaders && (
                  <div className="report-header-custom visible">
                    <div className="report-header-logo">
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <rect width="32" height="32" rx="8" fill="#2563eb"/>
                        <path d="M8 20L14 14L18 18L24 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="report-header-info">
                      <div className="report-header-title">Executive Intelligence Report</div>
                      <div className="report-header-date">{reportDate}</div>
                    </div>
                  </div>
              )}

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

              {settings.showKPIs && filteredKPIs.length > 0 && (
                  <section className="report-section">
                    <h2 className="report-section-title">Key Performance Indicators</h2>
                    <div className="report-kpi-grid">
                      {filteredKPIs.map(kpi => (
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

              {settings.showCharts && recommendations.length > 0 && (
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

              {settings.showInsights && insights && (
                  <section className="report-section">
                    <h2 className="report-section-title">AI Analysis & Insights</h2>

                    <div className="report-insight-block">
                      <div className="report-insight-header">
                        <Brain size={20} />
                        <h3>Executive Summary</h3>
                      </div>
                      <p className="report-insight-text">{insights.summary}</p>
                    </div>

                    {settings.showTrends && insights.trends.length > 0 && (
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

                    {settings.showAnomalies && insights.anomalies.length > 0 && (
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

                    {settings.showRecommendations && insights.recommendations.length > 0 && (
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
          </div>

          <aside className="report-sidebar no-print">
            <div className="sidebar-title">
              <Printer size={18} />
              <h3>Print</h3>
            </div>

            <div className="sidebar-settings">
              <div className="setting-row">
                <div className="setting-label">
                  <div>Destination</div>
                  <div className="setting-label-sub">Куда сохранить</div>
                </div>
                <select className="setting-select" defaultValue="pdf">
                  <option value="pdf">🖨️ Save as PDF</option>
                </select>
              </div>

              <div className="setting-row">
                <div className="setting-label">
                  <div>Pages</div>
                  <div className="setting-label-sub">Какие страницы</div>
                </div>
                <select className="setting-select" defaultValue="all">
                  <option value="all">All</option>
                </select>
              </div>

              <div className="setting-row">
                <div className="setting-label">
                  <div>Layout</div>
                  <div className="setting-label-sub">Ориентация листа</div>
                </div>
                <select
                    className="setting-select"
                    value={settings.orientation}
                    onChange={(e) => setSettings({...settings, orientation: e.target.value as 'portrait' | 'landscape'})}
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>

              <div className="more-settings">
                <button
                    className="more-settings-toggle"
                    onClick={() => setIsMoreSettingsOpen(!isMoreSettingsOpen)}
                >
                  <span>More settings</span>
                  {isMoreSettingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isMoreSettingsOpen && (
                    <div className="more-settings-content">
                      <div className="setting-row">
                        <div className="setting-label">
                          <div>Paper size</div>
                          <div className="setting-label-sub">Размер бумаги</div>
                        </div>
                        <select
                            className="setting-select"
                            value={settings.paperSize}
                            onChange={(e) => setSettings({...settings, paperSize: e.target.value as 'A4' | 'Letter' | 'Legal'})}
                        >
                          <option value="A4">A4</option>
                          <option value="Letter">Letter</option>
                          <option value="Legal">Legal</option>
                        </select>
                      </div>

                      <div className="setting-row">
                        <div className="setting-label">
                          <div>Pages per sheet</div>
                          <div className="setting-label-sub">Страниц на листе</div>
                        </div>
                        <select className="setting-select" defaultValue="1">
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="4">4</option>
                        </select>
                      </div>

                      <div className="setting-row">
                        <div className="setting-label">
                          <div>Margins</div>
                          <div className="setting-label-sub">Поля</div>
                        </div>
                        <select className="setting-select" defaultValue="default">
                          <option value="default">Default</option>
                          <option value="none">None</option>
                          <option value="minimum">Minimum</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>

                      <div className="setting-row">
                        <div className="setting-label">
                          <div>Scale</div>
                          <div className="setting-label-sub">Масштаб</div>
                        </div>
                        <select
                            className="setting-select"
                            value={settings.scale}
                            onChange={(e) => setSettings({...settings, scale: Number(e.target.value)})}
                        >
                          <option value={100}>Default</option>
                          <option value={75}>75%</option>
                          <option value={50}>50%</option>
                          <option value={25}>25%</option>
                          <option value={150}>Custom</option>
                        </select>
                      </div>
                    </div>
                )}
              </div>

              <div className="setting-row options-row">
                <div className="setting-label">
                  <div>Options</div>
                  <div className="setting-label-sub">Дополнительно</div>
                </div>
                <label className="checkbox-label">
                  <input
                      type="checkbox"
                      checked={settings.showHeaders}
                      onChange={(e) => setSettings({...settings, showHeaders: e.target.checked})}
                  />
                  <span>Headers and footers</span>
                </label>
              </div>
            </div>

            <div className="sidebar-section">
              <h4>Содержание отчёта</h4>
              <label className="sidebar-checkbox">
                <input
                    type="checkbox"
                    checked={settings.showKPIs}
                    onChange={() => toggleSection('showKPIs')}
                />
                <span>KPI показатели</span>
              </label>
              <label className="sidebar-checkbox">
                <input
                    type="checkbox"
                    checked={settings.showCharts}
                    onChange={() => toggleSection('showCharts')}
                />
                <span>Графики</span>
              </label>
              <label className="sidebar-checkbox">
                <input
                    type="checkbox"
                    checked={settings.showInsights}
                    onChange={() => toggleSection('showInsights')}
                />
                <span>AI Insights</span>
              </label>
            </div>

            {settings.showKPIs && kpis.length > 0 && (
                <div className="sidebar-section">
                  <h4>Выбор KPI</h4>
                  {kpis.map(kpi => (
                      <label key={kpi.id} className="sidebar-checkbox">
                        <input
                            type="checkbox"
                            checked={settings.selectedKPIs.includes(kpi.id)}
                            onChange={() => toggleKPI(kpi.id)}
                        />
                        <span>{kpi.label}</span>
                      </label>
                  ))}
                </div>
            )}

            <button className="btn btn--primary btn--full" onClick={handlePrint}>
              <Printer size={16} />
              <span>Сохранить как PDF</span>
            </button>
          </aside>
        </main>
      </div>
  );
}