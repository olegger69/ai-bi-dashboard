import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar, ScatterChart, Scatter, Legend,
    PieChart, Pie, Cell
} from 'recharts';
import { FileText, Download, RotateCcw, TrendingUp, TrendingDown, Minus, Brain, Filter, X, Table, GitCompare } from 'lucide-react';
import { DashboardState, DataRow, DatasetProfile, KPIWithComparison, ColumnMeta, ChartRecommendation } from '../../core/types';
import { loadDashboardState, clearDashboardState } from '../../services/storageService';
import { getChartData } from '../../core/chartRecommender';
import { profileDataset } from '../../core/profiler';
import { calculateKPIs } from '../../core/kpiCalculator';
import { recommendCharts } from '../../core/chartRecommender';
import { formatInsightDate } from '../../services/aiInsightService';
import { exportToMarkdown, downloadMarkdown, exportToCSV } from '../../services/exportService';
import {
    findDateColumn,
    splitDataByPeriods,
    compareKPIs,
    getComparisonLineData
} from '../../core/periodComparison';
import { calculateCorrelationMatrix, getCorrelationColor, getCorrelationTextColor } from '../../core/correlationCalculator';
import DataTable from '../components/DataTable';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// Компонент тепловой карты корреляций
function HeatmapChart({ data, columns }: { data: DataRow[]; columns: ColumnMeta[] }) {
    const correlationMatrix = useMemo(() => calculateCorrelationMatrix(data, columns), [data, columns]);

    if (correlationMatrix.columns.length === 0) {
        return <div className="heatmap-empty">Недостаточно числовых данных для построения тепловой карты</div>;
    }

    return (
        <div className="heatmap-wrapper">
            <div className="heatmap-grid">
                <div className="heatmap-header-row">
                    <div className="heatmap-corner"></div>
                    {correlationMatrix.columns.map((col: string, idx: number) => (
                        <div key={`header-${idx}`} className="heatmap-header-cell">{col}</div>
                    ))}
                </div>

                {correlationMatrix.matrix.map((row: number[], i: number) => (
                    <div key={`row-${i}`} className="heatmap-row">
                        <div className="heatmap-row-label">{correlationMatrix.columns[i]}</div>
                        {row.map((value: number, j: number) => (
                            <div
                                key={`cell-${i}-${j}`}
                                className="heatmap-cell"
                                style={{
                                    backgroundColor: getCorrelationColor(value),
                                    color: getCorrelationTextColor(value)
                                }}
                                title={`${correlationMatrix.columns[i]} vs ${correlationMatrix.columns[j]}: ${value.toFixed(2)}`}
                            >
                                {value.toFixed(2)}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div className="heatmap-legend">
                <span className="heatmap-legend-label">-1.0</span>
                <div className="heatmap-legend-gradient"></div>
                <span className="heatmap-legend-label">+1.0</span>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { t } = useTranslation();
    const [state, setState] = useState<DashboardState | null>(null);
    const [filterColumn, setFilterColumn] = useState<string>('');
    const [filterValue, setFilterValue] = useState<string>('');
    const [comparisonMode, setComparisonMode] = useState<boolean>(false);
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
        if (window.confirm(t('confirmReset'))) {
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

    const handleExportCSV = () => {
        exportToCSV(filteredData, `filtered_data_${Date.now()}.csv`);
    };

    const handleViewReport = () => {
        navigate('/report');
    };

    const toggleComparisonMode = () => {
        setComparisonMode(!comparisonMode);
    };

    const clearFilter = () => {
        setFilterColumn('');
        setFilterValue('');
    };

    const filteredData = useMemo(() => {
        if (!state || !state.rawData) return [];
        if (!filterColumn || !filterValue) return state.rawData;
        return state.rawData.filter((row: DataRow) =>
            String(row[filterColumn]).toLowerCase().includes(filterValue.toLowerCase())
        );
    }, [state?.rawData, filterColumn, filterValue]);

    const profile = useMemo((): DatasetProfile => {
        if (filteredData.length === 0) return { totalRows: 0, totalColumns: 0, columns: [] } as DatasetProfile;
        return profileDataset(filteredData);
    }, [filteredData]);

    const kpis = useMemo(() => {
        if (filteredData.length === 0) return [];
        return calculateKPIs(filteredData, profile);
    }, [filteredData, profile]);

    // ИСПОЛЬЗУЕМ findDateColumn, splitDataByPeriods, compareKPIs
    const kpisWithComparison = useMemo(() => {
        if (!comparisonMode || filteredData.length === 0) return kpis;

        const dateColumn = findDateColumn(filteredData);
        const { firstPeriod, secondPeriod } = splitDataByPeriods(filteredData, dateColumn);
        const numericColumns = profile.columns.filter((c: ColumnMeta) => c.type === 'number').map((c: ColumnMeta) => c.name);

        return compareKPIs(kpis, firstPeriod, secondPeriod, numericColumns);
    }, [comparisonMode, filteredData, profile, kpis]);

    const recommendations = useMemo(() => {
        if (filteredData.length === 0) return [];
        return recommendCharts(profile, filteredData);
    }, [profile, filteredData]);

    const availableColumns = state ? Object.keys(state.rawData[0] || {}) : [];
    const insights = state?.insights;

    // ИСПОЛЬЗУЕМ getComparisonLineData
    const comparisonLineData = useMemo(() => {
        if (!comparisonMode) return null;
        const dateCol = findDateColumn(filteredData);
        if (!dateCol) return null;
        const numericCols = profile.columns.filter((c: ColumnMeta) => c.type === 'number').map((c: ColumnMeta) => c.name);
        if (numericCols.length === 0) return null;
        return getComparisonLineData(filteredData, dateCol, numericCols[0]);
    }, [comparisonMode, filteredData, profile]);

    if (!state) {
        return (
            <div className="app-container">
                <div className="spinner">{t('loading')}</div>
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
                    <h1>{t('appName')}</h1>
                </div>
                <nav className="app-nav">
                    <button
                        className={`btn ${comparisonMode ? 'btn--primary' : 'btn--ghost'}`}
                        onClick={toggleComparisonMode}
                        title={t('comparePeriods')}
                    >
                        <GitCompare size={16} />
                        <span>{comparisonMode ? t('comparisonOn') : t('comparePeriods')}</span>
                    </button>
                    <button className="btn btn--ghost" onClick={handleViewReport}>
                        <FileText size={16} />
                        <span>{t('viewReport')}</span>
                    </button>
                    <button className="btn btn--secondary" onClick={handleExportCSV}>
                        <Table size={16} />
                        <span>{t('exportCSV')}</span>
                    </button>
                    <button className="btn btn--secondary" onClick={handleExportMarkdown}>
                        <Download size={16} />
                        <span>{t('exportMD')}</span>
                    </button>
                    <button className="btn btn--primary" onClick={handleExportPDF}>
                        <Download size={16} />
                        <span>{t('exportPDF')}</span>
                    </button>
                    <button className="btn btn--danger" onClick={handleReset}>
                        <RotateCcw size={16} />
                        <span>{t('reset')}</span>
                    </button>
                    <LanguageToggle />
                    <ThemeToggle />
                </nav>
            </header>

            <main className="app-main">
                <section className="filter-section">
                    <div className="filter-group">
                        <Filter size={18} className="filter-icon" />
                        <select
                            className="filter-select"
                            value={filterColumn}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                setFilterColumn(e.target.value);
                                setFilterValue('');
                            }}
                        >
                            <option value="">{t('filterSelect')}</option>
                            {availableColumns.map((col: string) => (
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
                                    placeholder={`${t('filterHint')}: ${filteredData.length > 0 ? String(filteredData[0]?.[filterColumn] ?? '') : ''}`}
                                    value={filterValue}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterValue(e.target.value)}
                                />
                                <datalist id={`filter-options-${filterColumn}`}>
                                    {Array.from(new Set(filteredData.map((r: DataRow) => String(r[filterColumn] ?? '')))).slice(0, 50).map((val: string) => (
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
                            {t('found')} {filteredData.length} {t('of')} {state.rawData.length} {t('records')}
                        </div>
                    ) : (
                        filterColumn && <div className="filter-hint">{t('filterHint')}</div>
                    )}
                </section>

                <section className="summary-section">
                    <h2>
                        {t('summaryTitle')}
                        {filterValue && ` ${t('filtered')}`}
                        {comparisonMode && ` ${t('comparisonLabel')}`}
                    </h2>
                    <div className="summary-grid">
                        <div className="summary-item">
                            <div className="summary-label">{t('totalRows')}</div>
                            <div className="summary-value">{profile.totalRows.toLocaleString()}</div>
                        </div>
                        <div className="summary-item">
                            <div className="summary-label">{t('totalColumns')}</div>
                            <div className="summary-value">{profile.totalColumns}</div>
                        </div>
                        <div className="summary-item">
                            <div className="summary-label">{t('uniqueValues')}</div>
                            <div className="summary-value">
                                {profile.columns.reduce((sum: number, col: ColumnMeta) => sum + col.uniqueCount, 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="summary-item">
                            <div className="summary-label">{t('missingValues')}</div>
                            <div className="summary-value">
                                {profile.columns.reduce((sum: number, col: ColumnMeta) => sum + col.missingCount, 0).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </section>

                {kpisWithComparison.length > 0 && (
                    <section className="kpi-section">
                        <div className="kpi-grid">
                            {kpisWithComparison.map((kpi: KPIWithComparison) => (
                                <div key={kpi.id} className="kpi-card">
                                    <div className="kpi-card__label">{kpi.label}</div>
                                    <div className="kpi-card__value">{kpi.value}</div>
                                    {kpi.description && <div className="kpi-card__description">{kpi.description}</div>}

                                    {comparisonMode && kpi.changePercent !== undefined && (
                                        <div className={`kpi-comparison ${kpi.changePercent >= 0 ? 'kpi-comparison--up' : 'kpi-comparison--down'}`}>
                                            {kpi.changePercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            <span className="kpi-comparison__percent">
                        {kpi.changePercent >= 0 ? '+' : ''}{kpi.changePercent.toFixed(1)}%
                      </span>
                                            <span className="kpi-comparison__detail">
                        vs {kpi.previousValue}
                      </span>
                                        </div>
                                    )}

                                    {!comparisonMode && kpi.trend && (
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
                                {recommendations.map((rec: ChartRecommendation) => {
                                    const chartData = getChartData(rec, filteredData);

                                    return (
                                        <div key={rec.id} className="card chart-card">
                                            <div className="card__header">
                                                <h3 className="card__title">{rec.title}</h3>
                                            </div>
                                            <div className="card__body">
                                                <p className="chart-description">{rec.description}</p>
                                                <div className="chart-container-large">
                                                    {rec.chartType === 'line' && comparisonMode && comparisonLineData ? (
                                                        <LineChart width={750} height={350} data={comparisonLineData} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis dataKey="date" />
                                                            <YAxis />
                                                            <Tooltip />
                                                            <Legend />
                                                            <Line type="monotone" dataKey="Period 1" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                                                            <Line type="monotone" dataKey="Period 2" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                                                        </LineChart>
                                                    ) : rec.chartType === 'line' ? (
                                                        <LineChart width={750} height={350} data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis dataKey={rec.xColumn} />
                                                            <YAxis />
                                                            <Tooltip />
                                                            <Legend />
                                                            <Line type="monotone" dataKey={rec.yColumn} stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                                                        </LineChart>
                                                    ) : null}

                                                    {rec.chartType === 'bar' && (
                                                        <BarChart width={750} height={350} data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis dataKey="name" />
                                                            <YAxis />
                                                            <Tooltip />
                                                            <Legend />
                                                            <Bar dataKey="value" fill="#2563eb" />
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
                                                    {rec.chartType === 'pie' && (
                                                        <PieChart width={750} height={350}>
                                                            <Pie
                                                                data={chartData}
                                                                cx="50%"
                                                                cy="50%"
                                                                labelLine={true}
                                                                label={({ name, percent }: { name: string; percent: number }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                                outerRadius={120}
                                                                fill="#8884d8"
                                                                dataKey="value"
                                                            >
                                                                {chartData.map((_: unknown, index: number) => (
                                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip />
                                                            <Legend />
                                                        </PieChart>
                                                    )}
                                                    {rec.chartType === 'heatmap' && (
                                                        <HeatmapChart data={filteredData} columns={profile.columns} />
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
                                            <span>{t('aiInsights')}</span>
                                        </div>
                                        <p>{insights.summary}</p>
                                        <div className="insights-badge">{t('fullDataAnalysis')}</div>
                                    </div>
                                    {insights.trends.length > 0 && (
                                        <div className="insights-panel__section">
                                            <div className="insights-panel__title"><TrendingUp size={18} /><span>{t('trends')}</span></div>
                                            <ul className="insights-panel__list">{insights.trends.map((trend: string, idx: number) => <li key={idx} className="insights-panel__item">{trend}</li>)}</ul>
                                        </div>
                                    )}
                                    {insights.anomalies.length > 0 && (
                                        <div className="insights-panel__section">
                                            <div className="insights-panel__title"><Brain size={18} /><span>{t('anomalies')}</span></div>
                                            <ul className="insights-panel__list">{insights.anomalies.map((anomaly: string, idx: number) => <li key={idx} className="insights-panel__item">{anomaly}</li>)}</ul>
                                        </div>
                                    )}
                                    {insights.recommendations.length > 0 && (
                                        <div className="insights-panel__section">
                                            <div className="insights-panel__title"><FileText size={18} /><span>{t('recommendations')}</span></div>
                                            <ul className="insights-panel__list">{insights.recommendations.map((rec: string, idx: number) => <li key={idx} className="insights-panel__item">{rec}</li>)}</ul>
                                        </div>
                                    )}
                                    <div className="insights-panel__mode">
                                        <span>{t('mode')}: {(insights.mode === 'groq' || insights.mode === 'openrouter') ? t('aiMode') : t('mockMode')}</span>
                                        <span>{t('generated')}: {formatInsightDate(insights.generatedAt)}</span>
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