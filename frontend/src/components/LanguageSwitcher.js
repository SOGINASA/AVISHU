import { useTranslation } from 'react-i18next';
import { setCurrentLanguage } from '../i18n';

export default function LanguageSwitcher({ variant = 'floating', className = '' }) {
  const { i18n, t } = useTranslation();
  const lang = i18n.language?.startsWith('kk') ? 'kk' : 'ru';
  const containerClass =
    variant === 'inline'
      ? `flex rounded-md border border-white/15 overflow-hidden bg-black/70 ${className}`
      : `fixed top-4 right-4 z-[100] flex rounded-md border border-white/15 overflow-hidden bg-black/70 backdrop-blur-md ${className}`;

  return (
    <div className={containerClass}>
      <button
        type="button"
        onClick={() => setCurrentLanguage('ru')}
        className={`px-3 py-1.5 text-[10px] font-bold tracking-wider transition-colors ${lang === 'ru' ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}
      >
        {t('lang.ru')}
      </button>
      <button
        type="button"
        onClick={() => setCurrentLanguage('kk')}
        className={`px-3 py-1.5 text-[10px] font-bold tracking-wider transition-colors ${lang === 'kk' ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}
      >
        {t('lang.kk')}
      </button>
    </div>
  );
}
