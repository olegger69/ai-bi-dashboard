import { DashboardState } from '../core/types';

const STORAGE_KEY = 'dashboard_state';

export function saveDashboardState(state: DashboardState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Failed to save dashboard state:', error);
    }
}

export function loadDashboardState(): DashboardState | null {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return null;
        return JSON.parse(saved);
    } catch (error) {
        console.error('Failed to load dashboard state:', error);
        return null;
    }
}

export function clearDashboardState(): void {
    localStorage.removeItem(STORAGE_KEY);
}