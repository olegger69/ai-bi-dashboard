import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { parseCSV, validateCSVFile } from '../../core/csvParser';
import { profileDataset } from '../../core/profiler';
import { calculateKPIs } from '../../core/kpiCalculator';
import { recommendCharts } from '../../core/chartRecommender';
import { analyzeAllColumns } from '../../core/anomalyDetector';
import { generateInsights } from '../../services/aiInsightService';
import { saveDashboardState } from '../../services/storageService';
import { DataRow } from '../../core/types';
import DataTable from '../components/DataTable';
import ThemeToggle from '../components/ThemeToggle';

export default function LandingPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<DataRow[] | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Шаг 1: Выбор файла и быстрый парсинг для предпросмотра
  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);

    const validation = validateCSVFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Ошибка валидации файла');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);

    try {
      const { data } = await parseCSV(file);
      if (data.length === 0) {
        throw new Error('Файл пуст или не содержит корректных данных');
      }

      // Показываем предпросмотр
      setPreviewData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Произошла неизвестная ошибка при чтении файла';
      setError(message);
      setPreviewData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Шаг 2: Глубокий анализ и переход на дашборд
  const handleAnalyze = useCallback(async () => {
    if (!previewData) return;

    setIsLoading(true);
    setError(null);

    try {
      const profile = profileDataset(previewData);
      const kpis = calculateKPIs(previewData, profile);
      const recommendations = recommendCharts(profile, previewData);
      const { anomalies, trends } = analyzeAllColumns(previewData, profile.columns);
      const insights = await generateInsights(profile, kpis, anomalies, trends);

      const dashboardState = {
        rawData: previewData,
        profile,
        kpis,
        recommendations,
        insights,
        lastUpdated: new Date().toISOString(),
      };

      const saved = saveDashboardState(dashboardState);
      if (!saved) {
        console.warn('Не удалось сохранить данные в LocalStorage (возможно, превышен лимит).');
      }

      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка при анализе данных';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [previewData, navigate]);

  const handleReset = () => {
    setPreviewData(null);
    setFileName('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Обработчики Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
      <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="app-header" style={{
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-bg-tertiary)'
        }}>
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#2563eb"/>
              <path d="M8 20L14 14L18 18L24 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 style={{ fontSize: '20px', margin: 0 }}>AI BI Dashboard</h1>
          </div>
          <ThemeToggle />
        </header>

        <main className="app-main" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '32px'
        }}>
          {/* Если данные ещё не выбраны, показываем зону загрузки */}
          {!previewData && (
              <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
                <div className="card__header">
                  <h2 className="card__title">Загрузка данных</h2>
                </div>
                <div className="card__body">
                  <p style={{ marginBottom: '24px', color: 'var(--color-text-secondary)' }}>
                    Загрузите CSV-файл с вашими данными. Система покажет предпросмотр,
                    а затем автоматически проанализирует их и построит отчёт.
                  </p>

                  <div
                      className={`upload-zone ${isDragging ? 'upload-zone--active' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={triggerFileInput}
                      style={{ cursor: isLoading ? 'default' : 'pointer' }}
                  >
                    {isLoading ? (
                        <>
                          <Loader2 className="upload-zone__icon spinner" />
                          <div className="upload-zone__title">Чтение файла...</div>
                        </>
                    ) : (
                        <>
                          <Upload className="upload-zone__icon" />
                          <div className="upload-zone__title">Перетащите CSV-файл сюда</div>
                          <div className="upload-zone__description">
                            или нажмите, чтобы выбрать файл с компьютера
                          </div>
                          <div className="upload-zone__hint">
                            Поддерживаются файлы .csv и .txt (макс. 10MB)
                          </div>
                        </>
                    )}
                  </div>

                  <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileInput}
                      style={{ display: 'none' }}
                      disabled={isLoading}
                  />

                  {error && (
                      <div className="form-error" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '16px',
                        padding: '12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 'var(--radius-md)'
                      }}>
                        <AlertCircle size={16} />
                        <span>{error}</span>
                      </div>
                  )}
                </div>
              </div>
          )}

          {/* Если данные загружены, показываем предпросмотр и кнопку анализа */}
          {previewData && (
              <div style={{ width: '100%', maxWidth: '1200px' }}>
                <div className="card" style={{ marginBottom: '24px' }}>
                  <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
                      <div>
                        <h2 className="card__title" style={{ margin: 0 }}>Файл успешно загружен</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                          {fileName} • {previewData.length} строк
                        </p>
                      </div>
                    </div>
                    <button className="btn btn--ghost" onClick={handleReset}>
                      Загрузить другой файл
                    </button>
                  </div>
                </div>

                <div className="data-preview-section" style={{ marginBottom: '24px' }}>
                  <DataTable data={previewData} maxRows={50} />
                </div>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                  <button className="btn btn--ghost" onClick={handleReset}>
                    Отмена
                  </button>
                  <button
                      className="btn btn--primary btn--lg"
                      onClick={handleAnalyze}
                      disabled={isLoading}
                  >
                    {isLoading ? (
                        <>
                          <Loader2 className="spinner spinner--sm" />
                          <span>Анализ данных и генерация отчёта...</span>
                        </>
                    ) : (
                        <>
                          <FileText size={18} />
                          <span>Проанализировать и перейти к дашборду</span>
                        </>
                    )}
                  </button>
                </div>

                {error && (
                    <div className="form-error" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '16px',
                      justifyContent: 'center',
                      padding: '12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: 'var(--radius-md)'
                    }}>
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                )}
              </div>
          )}
        </main>
      </div>
  );
}