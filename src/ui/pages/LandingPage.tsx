import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { parseCSV, validateCSVFile } from '../../core/csvParser';
import { profileDataset } from '../../core/profiler';
import { calculateKPIs } from '../../core/kpiCalculator';
import { recommendCharts } from '../../core/chartRecommender';
import { analyzeAllColumns } from '../../core/anomalyDetector';
import { generateInsights } from '../../services/aiInsightService';
import { saveDashboardState } from '../../services/storageService';

export default function LandingPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Обработка выбранного файла
  const processFile = useCallback(async (file: File) => {
    setError(null);

    // 1. Валидация
    const validation = validateCSVFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Ошибка валидации файла');
      return;
    }

    setIsLoading(true);

    try {
      // 2. Парсинг CSV
      const { data } = await parseCSV(file);
      if (data.length === 0) {
        throw new Error('Файл пуст или не содержит корректных данных');
      }

      // 3. Профилирование и анализ
      const profile = profileDataset(data);
      const kpis = calculateKPIs(data, profile);
      const recommendations = recommendCharts(profile, data);
      const { anomalies, trends } = analyzeAllColumns(data, profile.columns);

      // 4. Генерация AI-инсайтов (mock или gemini)
      const insights = await generateInsights(profile, kpis, anomalies, trends);

      // 5. Сохранение состояния в LocalStorage
      const dashboardState = {
        rawData: data,
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

      // 6. Переход на дашборд
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Произошла неизвестная ошибка при обработке файла';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

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
      processFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
      <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Шапка */}
        <header className="app-header" style={{
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--color-bg-tertiary)'
        }}>
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#2563eb"/>
              <path d="M8 20L14 14L18 18L24 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 style={{ fontSize: '20px', margin: 0 }}>AI BI Dashboard</h1>
          </div>
        </header>

        {/* Основной контент */}
        <main className="app-main" style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px'
        }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
            <div className="card__header">
              <h2 className="card__title">Загрузка данных</h2>
            </div>
            <div className="card__body">
              <p style={{ marginBottom: '24px', color: 'var(--color-text-secondary)' }}>
                Загрузите CSV-файл с вашими данными. Система автоматически проанализирует их,
                построит графики и сгенерирует отчёт с помощью ИИ.
              </p>

              {/* Зона Drag & Drop */}
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
                      <div className="upload-zone__title">Обработка данных...</div>
                      <div className="upload-zone__description">
                        Парсинг, профилирование и генерация инсайтов
                      </div>
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

              {/* Скрытый инпут для выбора файла */}
              <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileInput}
                  style={{ display: 'none' }}
                  disabled={isLoading}
              />

              {/* Отображение ошибок */}
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

              {/* Кнопка выбора файла (альтернатива drag & drop) */}
              {!isLoading && (
                  <div style={{ textAlign: 'center', marginTop: '24px' }}>
                    <button
                        className="btn btn--primary btn--lg"
                        onClick={triggerFileInput}
                    >
                      <FileText size={18} />
                      Выбрать CSV-файл
                    </button>
                  </div>
              )}
            </div>
          </div>
        </main>
      </div>
  );
}
