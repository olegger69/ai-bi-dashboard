import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../core/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
      <button
          className="btn btn--ghost theme-toggle"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'}
          style={{ marginLeft: '8px' }}
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>
  );
}
