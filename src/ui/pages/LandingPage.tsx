import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import { DataRow, DatasetProfile, KPI, AIInsight, ChartRecommendation, DashboardState } from '../../core/types';
import { profileDataset } from '../../core/profiler';
import { calculateKPIs } from '../../core/kpiCalculator';
import { recommendCharts } from '../../core/chartRecommender';
import { analyzeAllColumns } from '../../core/anomalyDetector';
import { generateInsights } from '../../services/aiInsightService';
import { saveDashboardState, loadDashboardState } from '../../services/storageService';
import ThemeToggle from '../components/ThemeToggle';

export default function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [fileName, setFileName] = useState<string>('');
  const [rawData, setRawData] = useState<DataRow[]>([]);
  const [previewData, setPreviewData] = useState<DataRow[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<string>('');

  // Проверяем, есть ли уже сохранённые данные
  useEffect(() => {
    const saved: DashboardState | null = loadDashboardState();
    if (saved && saved.rawData && saved.rawData.length > 0) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleFile = (file: File) => {
    setError('');
    setFileName(file.name);
    setIsProcessing(true);
    setProgress(t('processing'));

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`Ошибка парсинга: ${results.errors[0].message}`);
          setIsProcessing(false);
          return;
        }

        const data = results.data as DataRow[];
        if (data.length === 0) {
          setError('Файл пуст или не содержит данных');
          setIsProcessing(false);
          return;
        }

        setRawData(data);
        setPreviewData(data.slice(0, 30));
        setIsProcessing(false);
      },
      error: (err) => {
        setError(`Ошибка чтения файла: ${err.message}`);
        setIsProcessing(false);
      },
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      handleFile(file);
    } else {
      setError('Пожалуйста, загрузите файл .csv или .txt');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleAnalyze = async () => {
    if (rawData.length === 0) return;

    setIsAnalyzing(true);
    setProgress(t('analyzing'));

    try {
      // 1. Профилирование
      const profile: DatasetProfile = profileDataset(rawData);

      // 2. KPI
      const kpis: KPI[] = calculateKPIs(rawData, profile);

      // 3. Рекомендации графиков
      const recommendations: ChartRecommendation[] = recommendCharts(profile, rawData);

      // 4. Анализ аномалий и трендов
      const analysis = analyzeAllColumns(rawData, profile.columns);

      // 5. AI инсайты
      const insights: AIInsight = await generateInsights(
          profile,
          kpis,
          analysis.anomalies,
          analysis.trends
      );

      // 6. Сохраняем состояние
      const state: DashboardState = {
        rawData,
        profile,
        kpis,
        recommendations,
        insights,
        lastUpdated: new Date().toISOString(),
      };

      saveDashboardState(state);
      navigate('/dashboard');
    } catch (err) {
      setError(`Ошибка анализа: ${err instanceof Error ? err.message : String(err)}`);
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFileName('');
    setRawData([]);
    setPreviewData([]);
    setError('');
    setProgress('');
  };

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
            <ThemeToggle />
          </nav>
        </header>

        <main className="app-main landing-main">
          <div className="upload-section">
            <div className="upload-header">
              <Upload size={48} className="upload-icon" />
              <h2>{t('uploadTitle')}</h2>
              <p>{t('uploadDescription')}</p>
            </div>

            {!fileName ? (
                <div
                    className={`upload-dropzone ${isDragging ? 'upload-dropzone--active' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                  <div className="upload-dropzone__content">
                    <FileText size={48} className="upload-dropzone__icon" />
                    <p className="upload-dropzone__title">{t('dragDrop')}</p>
                    <p className="upload-dropzone__subtitle">{t('dragDropDescription')}</p>
                    <p className="upload-dropzone__hint">{t('dragDropHint')}</p>
                    <label className="btn btn--primary upload-dropzone__button">
                      {t('selectFile')}
                      <input
                          type="file"
                          accept=".csv,.txt"
                          onChange={handleFileInput}
                          className="upload-dropzone__input"
                      />
                    </label>
                  </div>
                </div>
            ) : (
                <div className="upload-file-info">
                  <div className="upload-file-info__header">
                    <CheckCircle size={24} className="upload-file-info__icon" />
                    <div>
                      <h3>{fileName}</h3>
                      <p>{rawData.length} {t('rows')}</p>
                    </div>
                  </div>

                  {error && (
                      <div className="upload-error">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                      </div>
                  )}

                  {isProcessing && (
                      <div className="upload-progress">
                        <Loader2 size={20} className="upload-progress__spinner" />
                        <span>{progress}</span>
                      </div>
                  )}

                  {previewData.length > 0 && !isProcessing && (
                      <div className="upload-preview">
                        <h4>Dataset Preview (First 30 Rows)</h4>
                        <div className="upload-preview__table-wrapper">
                          <table className="upload-preview__table">
                            <thead>
                            <tr>
                              {Object.keys(previewData[0]).map(col => (
                                  <th key={col}>{col}</th>
                              ))}
                            </tr>
                            </thead>
                            <tbody>
                            {previewData.map((row, idx) => (
                                <tr key={idx}>
                                  {Object.values(row).map((val, colIdx) => (
                                      <td key={colIdx}>{String(val ?? '')}</td>
                                  ))}
                                </tr>
                            ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                  )}

                  <div className="upload-actions">
                    <button className="btn btn--secondary" onClick={handleReset}>
                      {t('uploadAnother')}
                    </button>
                    <button
                        className="btn btn--primary"
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || rawData.length === 0}
                    >
                      {isAnalyzing ? (
                          <>
                            <Loader2 size={16} className="btn__spinner" />
                            <span>{progress}</span>
                          </>
                      ) : (
                          t('analyzeButton')
                      )}
                    </button>
                  </div>
                </div>
            )}
          </div>
        </main>
      </div>
  );
}