import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar, ScatterChart, Scatter, Legend
} from 'recharts';
import { FileText, Download, RotateCcw, TrendingUp, TrendingDown, Minus, Brain, Filter, X } from 'lucide-react';
import { DashboardState, DataRow } from '../../core/types';
import { loadDashboardState, clearDashboardState } from '../../services/storageService';
import { getChartData } from '../../core/chartRecommender';
import { profileDataset } from '../../core/profiler';
import { calculateKPIs } from '../../core/kpiCalculator';
import { recommendCharts } from '../../core/chartRecommender';
import { formatInsightDate } from '../../services/aiInsightService';
import { exportToMarkdown, downloadMarkdown } from '../../services/exportService';
import DataTable from '../components/DataTable';
import ThemeToggle from '../components/ThemeToggle';

export default function DashboardPage() {
    const [state, setState] = useState<DashboardState | null>(null);
    const [filterColumn, setFilterColumn] = useState<string>('');
    const [filterValue, setFilterValue] = useState<string>('');
    const filterInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const saved = loadDashboardState();
        if (!saved || saved.rawData.length === 0) {
            navigate('/');
        } else {
            setState(saved);
        }
    }, [navigate]);

    useEffect(() => {
        if (filterColumn && filterInputRef.current) {
            filterInputRef.current.focus();
        }
    }, [filterColumn]);

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

    const clearFilter = () => {
        setFilterColumn('');
        setFilterValue('');
    };

    // Получаем уникальные значения для выбранного столбца (для подсказок)
    const uniqueFilterValues = useMemo(() => {
        if (!state || !filterColumn) return [];
        const values = new Set<string>();
        state.rawData.forEach((row: DataRow) => {
            const val = String(row[filterColumn]).trim();
            if (val) values.add(val);
        });
        // Возвращаем отсортированный массив, максимум 50 значений, чтобы не перегружать DOM
        return Array.from(values).sort().slice(0, 50);
    }, [state, filterColumn]);

    const filteredData = useMemo(() => {
        if (!state || !state.rawData) return [];
        if (!filterColumn || !filterValue) return state.rawData;
        return state.rawData.filter((row: DataRow) =>
            String(row[filterColumn]).toLowerCase().includes(filterValue.toLowerCase())
        );
    }, [state?.rawData, filterColumn, filterValue]);

    const profile = useMemo(() => {
        if (filteredData.length === 0) return { totalRows: 0, totalColumns: 0, columns: [] } as any;
        return profileDataset(filteredData);
    }, [filteredData]);

    const kpis = useMemo(() => {
        if (filteredData.length === 0) return [];
        return calculateKPIs(filteredData, profile);
    }, [filteredData, profile]);

    const recommendations = useMemo(() => {
        if (filteredData.length === 0) return [];
        return recommendCharts(profile, filteredData);
    }, [profile, filteredData]);

    const availableColumns = state ? Object.keys(state.rawData[0] || {}) : [];
    const insights = state?.insights;

    if (!state) {
        return (
            <div className="app-container">
                <div className="spinner">Загрузка...</div>
            </div>
        );
    }

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
                    <ThemeToggle />
                </nav>
            </header>

            <main className="app-main">
                {/* Панель фильтров */}
                <section className="filter-section">
                    <div className="filter-group">
                        <Filter size={18} className="filter-icon" />
                        <select
                            className="filter-select"
                            value={filterColumn}
                            onChange={(e) => {
                                setFilterColumn(e.target.value);
                                setFilterValue('');
                            }}
                        >
                            <option value="">Выберите столбец для фильтрации...</option>
                            {availableColumns.map(col => (
                                <option key={col} value={col}>{col}</option>
                            ))}
                        </select>

                        {filterColumn && (
                            <div className="filter-input-wrapper">
                                <input
                                    ref={filterInputRef}
                                    type="text"
                                    className="filter-input"
                                    list={`filter-options-${filterColumn}`}
                                    placeholder={uniqueFilterValues.length > 0 ? `Например: ${uniqueFilterValues[0]}` : 'Введите значение...'}
                                    value={filterValue}
                                    onChange={(e) => setFilterValue(e.target.value)}
                                />
                                {/* Выпадающий список с реальными значениями из данных */}
                                <datalist id={`filter-options-${filterColumn}`}>
                                    {uniqueFilterValues.map(val => (
                                        <option key={val} value={val} />
                                    ))}
                                </datalist>

                                {filterValue && (
                                    <button className="filter-clear" onClick={clearFilter} title="Очистить фильтр">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {filterValue ? (
                        <div className="filter-badge">
                            Найдено {filteredData.length} из {state.rawData.length} записей
                        </div>
                    ) : (
                        filterColumn && (
                            <div className="filter-hint">
                                Нажмите на поле или начните печатать, чтобы увидеть доступные значения
                            </div>
                        )
                    )}
                </section>

                {/* Сводка */}
                <section className="summary-section">
                    <h2>Сводка по данным {filterValue && '(отфильтровано)'}</h2>
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
                                {profile.columns.reduce((sum: number, col: any) => sum + col.uniqueCount, 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="summary-item">
                            <div className="summary-label">Пропущенных значений</div>
                            <div className="summary-value">
                                {profile.columns.reduce((sum: number, col: any) => sum + col.missingCount, 0).toLocaleString()}
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

                <div className="dashboard-two-column">
                    <div className="dashboard-left">
                        {recommendations.length > 0 && (
                            <section className="charts-section">
                                {recommendations.map(rec => {
                                    const chartData = getChartData(rec, filteredData);

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

                        <section className="data-preview-section">
                            <DataTable data={filteredData} maxRows={50} />
                        </section>
                    </div>

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
                                        <div className="insights-badge">Анализ по полному набору данных</div>
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