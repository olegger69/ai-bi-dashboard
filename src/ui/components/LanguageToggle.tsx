import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'ru' ? 'en' : 'ru';
        i18n.changeLanguage(newLang);
        localStorage.setItem('language', newLang);
    };

    return (
        <button
            className="btn btn--ghost language-toggle"
            onClick={toggleLanguage}
            title={i18n.language === 'ru' ? 'Switch to English' : 'Переключить на русский'}
            style={{ marginLeft: '8px', minWidth: '40px' }}
        >
            <Globe size={18} />
            <span style={{ fontSize: '12px', fontWeight: '600', marginLeft: '4px' }}>
                {i18n.language === 'ru' ? 'RU' : 'EN'}
            </span>
        </button>
    );
}