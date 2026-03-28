import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/8">
        <div className="text-sm font-black tracking-[0.35em] uppercase">AVISHU</div>
        <div className="flex items-center gap-8">
          {user ? (
            <button onClick={() => navigate('/app')}
              className="text-xs font-semibold tracking-[0.15em] uppercase text-white/70 hover:text-white transition-colors">
              {t('home.openApp')}
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')}
                className="text-xs font-semibold tracking-[0.1em] uppercase text-white/50 hover:text-white transition-colors">
                {t('home.login')}
              </button>
              <button onClick={() => navigate('/register')}
                className="px-6 py-3 bg-white text-black text-xs font-bold tracking-[0.15em] uppercase hover:bg-white/90 transition-colors">
                {t('home.start')}
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="px-8 pt-24 pb-28">
        <p className="text-xs font-semibold tracking-[0.4em] uppercase text-white/40 mb-10">
          Franchise Management Superapp
        </p>
        <h1 className="text-[clamp(52px,8vw,96px)] font-black uppercase leading-[0.95] tracking-tight mb-10">
          {t('home.headlineTop')}<br />{t('home.headlineMiddle')}<br />
          <span className="text-white/25">{t('home.headlineBottom')}</span>
        </h1>
        <div className="w-10 h-px bg-white/30 mb-10" />
        <p className="text-base text-white/55 leading-relaxed max-w-md mb-14 font-normal">
          {t('home.heroBody')}
        </p>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/register')}
            className="px-10 py-4 bg-white text-black text-xs font-bold tracking-[0.2em] uppercase hover:bg-white/90 transition-colors">
            {t('home.try')}
          </button>
          <button onClick={() => navigate('/login')}
            className="px-10 py-4 border border-white/25 text-xs font-semibold tracking-[0.2em] uppercase text-white/60 hover:border-white/60 hover:text-white transition-colors">
            {t('home.login')}
          </button>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section className="border-t border-white/8">
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {[
            {
              tag: 'B2C',
              role: t('home.roles.client'),
              desc: t('home.roles.clientDesc'),
            },
            {
              tag: 'B2B',
              role: t('home.roles.franchisee'),
              desc: t('home.roles.franchiseeDesc'),
            },
            {
              tag: 'ЦЕХ',
              role: t('home.roles.production'),
              desc: t('home.roles.productionDesc'),
            },
          ].map((r, i) => (
            <div key={r.role}
              className={`px-8 py-12 ${i < 2 ? 'sm:border-r border-white/8' : ''} border-b border-white/8`}>
              <span className="inline-block text-[10px] font-semibold tracking-[0.35em] uppercase text-white/35 border border-white/15 px-2.5 py-1 mb-7">
                {r.tag}
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">{r.role}</h3>
              <p className="text-sm text-white/45 leading-relaxed font-normal">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section className="px-8 py-20 border-b border-white/8">
        <p className="text-[10px] font-semibold tracking-[0.45em] uppercase text-white/30 mb-14">
          {t('home.processTitle')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {[
            { n: '01', label: t('home.steps.s1') },
            { n: '02', label: t('home.steps.s2') },
            { n: '03', label: t('home.steps.s3') },
            { n: '04', label: t('home.steps.s4') },
          ].map((step) => (
            <div key={step.n}>
              <div className="text-xs font-black text-white/20 mb-3 tracking-widest">{step.n}</div>
              <div className="text-sm font-bold uppercase tracking-[0.1em] leading-snug whitespace-pre-line">
                {step.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-8 py-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tight mb-3">
            {t('home.ctaTitle')}
          </h2>
          <p className="text-sm text-white/40 font-normal">
            {t('home.ctaBody')}
          </p>
        </div>
        <button onClick={() => navigate('/register')}
          className="flex-shrink-0 px-10 py-4 bg-white text-black text-xs font-bold tracking-[0.2em] uppercase hover:bg-white/90 transition-colors">
          {t('home.ctaButton')}
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/8 px-8 py-5 flex items-center justify-between gap-4">
        <span className="text-xs font-semibold tracking-[0.3em] uppercase text-white/25">© AVISHU 2024</span>
        <div className="flex items-center gap-4">
          <span className="text-xs font-normal text-white/20">{t('home.footer')}</span>
          <LanguageSwitcher variant="inline" />
        </div>
      </footer>
    </div>
  );
}
