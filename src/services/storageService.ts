// Обёртка над LocalStorage для сессии
import { DashboardState } from '../core/types';

const STORAGE_KEY = 'ai-bi-dashboard-state';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB лимит для LocalStorage

// Сохраняет состояние дашборда в LocalStorage
export function saveDashboardState(state: DashboardState): boolean {
    try {
        const serialized = JSON.stringify(state);

        // Проверяем размер
        if (serialized.length > MAX_STORAGE_SIZE) {
            console.warn('Dashboard state too large for localStorage. Skipping save.');
            return false;
        }

        localStorage.setItem(STORAGE_KEY, serialized);
        return true;
    } catch (error) {
        console.error('Failed to save dashboard state:', error);
        return false;
    }
}

// Загружает состояние дашборда из LocalStorage
export function loadDashboardState(): DashboardState | null {
    try {
        const serialized = localStorage.getItem(STORAGE_KEY);
        if (!serialized) return null;

        const state = JSON.parse(serialized) as DashboardState;

        // Валидируем структуру
        if (!isValidDashboardState(state)) {
            console.warn('Invalid dashboard state in localStorage. Clearing.');
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }

        return state;
    } catch (error) {
        console.error('Failed to load dashboard state:', error);
        return null;
    }
}

// Очищает состояние дашборда
export function clearDashboardState(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear dashboard state:', error);
    }
}

// Проверяет, есть ли сохранённое состояние
export function hasDashboardState(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
}

// Валидирует структуру DashboardState
function isValidDashboardState(state: any): state is DashboardState {
    return (
        typeof state === 'object' &&
        state !== null &&
        Array.isArray(state.rawData) &&
        typeof state.profile === 'object' &&
        Array.isArray(state.kpis) &&
        Array.isArray(state.recommendations) &&
        typeof state.lastUpdated === 'string'
    );
}

// Создаёт новое состояние дашборда
export function createDashboardState(): DashboardState {
    return {
        rawData: [],
        profile: {
            totalRows: 0,
            totalColumns: 0,
            columns: [],
        },
        kpis: [],
        recommendations: [],
        insights: null,
        lastUpdated: new Date().toISOString(),
    };
}

// Проверяет размер данных в LocalStorage
export function getStorageUsage(): { used: number; available: number; percentage: number } {
    let total = 0;
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += localStorage[key].length * 2; // UTF-16, 2 байта на символ
        }
    }

    const available = MAX_STORAGE_SIZE;
    const percentage = (total / available) * 100;

    return { used: total, available, percentage };
}
