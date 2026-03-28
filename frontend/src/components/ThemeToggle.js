import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentTheme, toggleTheme } from '../theme';

export default function ThemeToggle({ variant = 'inline', className = '' }) {
  const { t } = useTranslation();
  const [theme, setTheme] = useState(getCurrentTheme());
  const containerClass =
    variant === 'inline'
      ? `flex items-center ${className}`
      : `fixed top-4 right-4 z-[100] flex items-center ${className}`;

  const handleToggle = () => {
    const nextTheme = toggleTheme();
    setTheme(nextTheme);
  };

  return (
    <div className={containerClass}>
      <button
        type="button"
        onClick={handleToggle}
        className={`group relative flex h-10 w-[96px] items-center overflow-hidden rounded-[18px] border transition-all duration-300 ${
          theme === 'light'
            ? 'border-amber-300/35 bg-[linear-gradient(135deg,rgba(255,248,231,0.98),rgba(247,228,194,0.96)_55%,rgba(226,188,124,0.78))] shadow-[0_14px_30px_rgba(215,180,120,0.22)] hover:border-amber-400/55'
            : 'border-white/12 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(24,24,27,0.92)_55%,rgba(245,158,11,0.18))] shadow-[0_14px_30px_rgba(0,0,0,0.22)] hover:border-white/25'
        }`}
        title={theme === 'light' ? t('theme.dark') : t('theme.light')}
        aria-label={theme === 'light' ? t('theme.dark') : t('theme.light')}
      >
        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[12px] transition-colors ${theme === 'light' ? 'text-stone-500' : 'text-white/70'}`}>
          ☾
        </span>
        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[12px] transition-colors ${theme === 'light' ? 'text-amber-700' : 'text-amber-200/80'}`}>
          ☀
        </span>
        <span
          className={`absolute top-1 flex h-8 w-[42px] items-center justify-center rounded-[14px] text-[12px] transition-all duration-300 ${
            theme === 'light'
              ? 'translate-x-[48px] bg-[linear-gradient(180deg,#fff8dd,#f2dec2)] text-stone-900 shadow-[0_10px_20px_rgba(255,227,163,0.42)]'
              : 'translate-x-[6px] bg-white/10 text-white shadow-[0_10px_20px_rgba(0,0,0,0.28)] backdrop-blur-sm'
          }`}
        >
          {theme === 'light' ? '☀' : '☾'}
        </span>
      </button>
    </div>
  );
}
