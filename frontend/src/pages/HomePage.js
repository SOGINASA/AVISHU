import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/8">
        <div className="text-sm font-black tracking-[0.35em] uppercase">AVISHU</div>
        <div className="flex items-center gap-8">
          {user ? (
            <button onClick={() => navigate('/app')}
              className="text-xs font-semibold tracking-[0.15em] uppercase text-white/70 hover:text-white transition-colors">
              Открыть приложение →
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')}
                className="text-xs font-semibold tracking-[0.1em] uppercase text-white/50 hover:text-white transition-colors">
                Войти
              </button>
              <button onClick={() => navigate('/register')}
                className="px-6 py-3 bg-white text-black text-xs font-bold tracking-[0.15em] uppercase hover:bg-white/90 transition-colors">
                Начать
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
          ОДИН<br />ЭКРАН<br />
          <span className="text-white/25">ДЛЯ ВСЕХ</span>
        </h1>
        <div className="w-10 h-px bg-white/30 mb-10" />
        <p className="text-base text-white/55 leading-relaxed max-w-md mb-14 font-normal">
          Единое приложение для клиентов, франчайзи и производства AVISHU.
          Заказ создаётся в витрине — и в реальном времени попадает в цех.
        </p>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/register')}
            className="px-10 py-4 bg-white text-black text-xs font-bold tracking-[0.2em] uppercase hover:bg-white/90 transition-colors">
            ПОПРОБОВАТЬ
          </button>
          <button onClick={() => navigate('/login')}
            className="px-10 py-4 border border-white/25 text-xs font-semibold tracking-[0.2em] uppercase text-white/60 hover:border-white/60 hover:text-white transition-colors">
            ВОЙТИ
          </button>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section className="border-t border-white/8">
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {[
            {
              tag: 'B2C',
              role: 'КЛИЕНТ',
              desc: 'Каталог коллекции, оформление заказа и предзаказа, визуальный трекинг — от пошива до доставки.',
            },
            {
              tag: 'B2B',
              role: 'ФРАНЧАЙЗИ',
              desc: 'Дашборд метрик, очередь входящих заказов в реальном времени, управление статусами.',
            },
            {
              tag: 'ЦЕХ',
              role: 'ПРОИЗВОДСТВО',
              desc: 'Промышленный интерфейс для мастера. Очередь задач и одна большая кнопка — ЗАВЕРШИТЬ.',
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
          Сквозной процесс
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {[
            { n: '01', label: 'Клиент\nоформляет заказ' },
            { n: '02', label: 'Франчайзи\nпринимает' },
            { n: '03', label: 'Цех\nшьёт изделие' },
            { n: '04', label: 'Клиент\nполучает готово' },
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
            ГОТОВЫ НАЧАТЬ?
          </h2>
          <p className="text-sm text-white/40 font-normal">
            Регистрация занимает 30 секунд.
          </p>
        </div>
        <button onClick={() => navigate('/register')}
          className="flex-shrink-0 px-10 py-4 bg-white text-black text-xs font-bold tracking-[0.2em] uppercase hover:bg-white/90 transition-colors">
          СОЗДАТЬ АККАУНТ
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/8 px-8 py-5 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-[0.3em] uppercase text-white/25">© AVISHU 2024</span>
        <span className="text-xs font-normal text-white/20">Premium Fashion Franchise</span>
      </footer>
    </div>
  );
}
