import { useTranslation } from 'react-i18next';
import { setCurrentLanguage } from '../i18n';

export default function LanguageSwitcher({ variant = 'floating', className = '' }) {
  const { i18n, t } = useTranslation();
  const lang = i18n.language?.startsWith('kk') ? 'kk' : 'ru';
  const containerClass =
    variant === 'inline'
      ? `inline-flex items-center rounded-[18px] border border-white/12 bg-black/70 p-1 shadow-[0_14px_30px_rgba(0,0,0,0.22)] backdrop-blur-md ${className}`
      : `fixed top-4 right-4 z-[100] inline-flex max-w-[calc(100vw-24px)] items-center rounded-[18px] border border-white/12 bg-black/70 p-1 shadow-[0_14px_30px_rgba(0,0,0,0.22)] backdrop-blur-md ${className}`;

  return (
    <div className={containerClass}>
      <button
        type="button"
        onClick={() => setCurrentLanguage('kk')}
        className={`w-[56px] rounded-[14px] px-0 py-2 text-[10px] font-bold tracking-[0.18em] text-center transition-colors ${lang === 'kk' ? 'bg-white text-black shadow-[0_6px_16px_rgba(255,255,255,0.18)]' : 'text-white/70 hover:text-white'}`}
      >
        {t('lang.kk')}
      </button>
      <button
        type="button"
        onClick={() => setCurrentLanguage('ru')}
        className={`w-[56px] rounded-[14px] px-0 py-2 text-[10px] font-bold tracking-[0.18em] text-center transition-colors ${lang === 'ru' ? 'bg-white text-black shadow-[0_6px_16px_rgba(255,255,255,0.18)]' : 'text-white/70 hover:text-white'}`}
      >
        {t('lang.ru')}
      </button>
    </div>
  );
}
