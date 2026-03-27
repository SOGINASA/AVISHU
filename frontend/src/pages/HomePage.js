import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import {
  GiSewingNeedle, GiSewingString, GiScissors, GiYarn,
  GiSewingMachine, GiRolledCloth, GiPencilRuler
} from 'react-icons/gi';
import {
  TbRulerMeasure, TbPackage, TbChartBar, TbUsers,
  TbArrowRight, TbArrowUpRight, TbCircleDot
} from 'react-icons/tb';
import { FabricPatternBg, StitchLine } from '../components/SewingIcons';

const STATS = [
  { v: '248', u: 'заказов', sub: 'в работе' },
  { v: '94%', u: 'выполнено', sub: 'сегодня' },
  { v: '37', u: 'операторов', sub: 'онлайн' },
  { v: '1.2т', u: 'ткани', sub: 'на складе' },
];

const FEATURES = [
  {
    icon: GiSewingMachine,
    title: 'Заказы',
    desc: 'От раскроя до упаковки — каждый этап под контролем в реальном времени',
    tag: '01',
  },
  {
    icon: GiRolledCloth,
    title: 'Материалы',
    desc: 'Учёт ткани и фурнитуры с автоматическим оповещением об остатках',
    tag: '02',
  },
  {
    icon: TbChartBar,
    title: 'Аналитика',
    desc: 'Наглядные дашборды. Видите узкие места — устраняете на следующей смене',
    tag: '03',
  },
  {
    icon: TbRulerMeasure,
    title: 'Техкарты',
    desc: 'Выкройки, нормы расхода, инструкции — всё в одной системе',
    tag: '04',
  },
];

const PROCESS = [
  { icon: GiScissors, step: 'Раскрой' },
  { icon: GiSewingNeedle, step: 'Пошив' },
  { icon: GiPencilRuler, step: 'ОТК' },
  { icon: TbPackage, step: 'Упаковка' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] } }),
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };

export default function HomePage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const [activeFeature, setActiveFeature] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#18120a] text-[#eddcba] overflow-x-hidden selection:bg-amber-700/40">

      {/* NAV */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 backdrop-blur-md bg-[#18120a]/80 border-b border-white/[0.05]"
      >
        <div className="flex items-center gap-2.5">
          <GiYarn className="text-amber-500 text-xl" />
          <span className="text-sm font-black tracking-[0.2em] uppercase text-amber-400">ShveAI</span>
        </div>

        <div className="hidden md:flex items-center gap-7 text-[13px] text-stone-500">
          {['Возможности', 'О системе', 'Контакты'].map(l => (
            <motion.a
              key={l}
              href="#"
              className="hover:text-amber-400 transition-colors duration-200"
              whileHover={{ y: -1 }}
            >
              {l}
            </motion.a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/login')}
            className="px-4 py-2 text-[13px] text-stone-400 hover:text-amber-400 transition-colors"
          >
            Войти
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/register')}
            className="px-4 py-2 text-[13px] bg-amber-600/90 text-[#18120a] rounded-lg font-semibold hover:bg-amber-500 transition-colors"
          >
            Начать
          </motion.button>
        </div>
      </motion.nav>

      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 overflow-hidden">
        <FabricPatternBg />

        {/* Floating background icons */}
        {[
          { Icon: GiYarn, x: '8%', y: '20%', size: 56, rot: 15, delay: 0 },
          { Icon: GiYarn, x: '85%', y: '15%', size: 40, rot: -10, delay: 0.3 },
          { Icon: GiScissors, x: '6%', y: '68%', size: 48, rot: 20, delay: 0.15 },
          { Icon: GiSewingString, x: '88%', y: '65%', size: 38, rot: -15, delay: 0.45 },
          { Icon: GiSewingNeedle, x: '78%', y: '40%', size: 32, rot: 30, delay: 0.2 },
        ].map(({ Icon, x, y, size, rot, delay }, i) => (
          <motion.div
            key={i}
            className="absolute text-amber-900/20 pointer-events-none hidden lg:block"
            style={{ left: x, top: y }}
            initial={{ opacity: 0, scale: 0.5, rotate: rot - 10 }}
            animate={{ opacity: 1, scale: 1, rotate: rot }}
            transition={{ duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: delay + 1 }}
            >
              <Icon size={size} />
            </motion.div>
          </motion.div>
        ))}

        <motion.div
          className="relative z-10 text-center max-w-4xl mx-auto"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp} custom={0}>
            <div className="inline-flex items-center gap-2 mb-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tick}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.35 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-800/40 bg-amber-950/30 text-amber-500 text-[11px] tracking-[0.15em] uppercase"
                >
                  <TbCircleDot className="animate-pulse" />
                  {['Производство в реальном времени', 'Учёт материалов', 'Аналитика цеха'][tick % 3]}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-[clamp(3rem,8vw,6.5rem)] font-black leading-[0.92] tracking-[-0.03em] mb-8"
          >
            <span className="block text-[#eddcba]">Швейное</span>
            <span className="block italic text-amber-400/90" style={{ fontStyle: 'italic' }}>
              производство
            </span>
            <span className="block text-[#eddcba]">под контролем</span>
          </motion.h1>

          <motion.div variants={fadeUp} custom={2}>
            <StitchLine className="text-amber-800/30 justify-center mb-8" />
          </motion.div>

          <motion.p
            variants={fadeUp}
            custom={3}
            className="text-stone-500 text-[17px] max-w-xl mx-auto leading-relaxed mb-12"
          >
            Платформа для управления заказами, материалами и сотрудниками.
            Сделано для тех, кто шьёт.
          </motion.p>

          <motion.div variants={fadeUp} custom={4} className="flex flex-col sm:flex-row gap-3 justify-center">
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/register')}
              className="group flex items-center justify-center gap-2 px-7 py-3.5 bg-amber-600 text-[#18120a] font-bold rounded-xl hover:bg-amber-500 transition-colors shadow-[0_8px_32px_-8px_rgba(180,120,40,0.5)] text-[15px]"
            >
              Попробовать
              <TbArrowRight className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2 px-7 py-3.5 border border-[#3a2a15] text-stone-400 rounded-xl hover:border-amber-700/50 hover:text-[#eddcba] transition-all text-[15px]"
            >
              Войти в систему
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-stone-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-px h-8 bg-gradient-to-b from-amber-800/40 to-transparent"
          />
          <span className="text-[10px] tracking-widest uppercase font-mono opacity-50">scroll</span>
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#18120a] to-transparent pointer-events-none" />
      </section>

      {/* STATS */}
      <section className="px-6 py-16">
        <motion.div
          className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {STATS.map((s, i) => (
            <motion.div
              key={s.u}
              variants={fadeUp}
              custom={i}
              className="bg-[#1f1610] border border-[#2e2010] rounded-2xl p-6 text-center group hover:border-amber-800/50 transition-colors duration-300"
            >
              <div className="text-[2.2rem] font-black text-amber-400 leading-none tabular-nums">{s.v}</div>
              <div className="text-[11px] text-amber-700 mt-1 mb-1.5 font-mono uppercase tracking-wider">{s.u}</div>
              <div className="text-[11px] text-stone-600 uppercase tracking-widest">{s.sub}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* PROCESS BAR */}
      <div className="max-w-4xl mx-auto px-6 mb-16">
        <motion.div
          className="flex items-center justify-between bg-[#1f1610] border border-[#2e2010] rounded-2xl px-8 py-5 overflow-hidden relative"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-700/30 to-transparent" />
          <span className="text-[11px] text-stone-600 uppercase tracking-widest font-mono mr-6 hidden sm:block">Этапы</span>
          {PROCESS.map(({ icon: Icon, step }, i) => (
            <div key={step} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Icon className="text-amber-600/70 text-lg flex-shrink-0" />
                <span className="text-[13px] text-stone-400">{step}</span>
              </div>
              {i < PROCESS.length - 1 && (
                <div className="w-8 sm:w-16 flex gap-1 mx-1">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="flex-1 h-px bg-amber-900/40" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </motion.div>
      </div>

      {/* FEATURES */}
      <section id="features" className="px-6 py-10 mb-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-[11px] text-amber-700 uppercase tracking-widest font-mono mb-3">// возможности</div>
            <h2 className="text-3xl md:text-4xl font-black text-[#eddcba] tracking-tight">
              Всё что нужно цеху
            </h2>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 gap-3"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
          >
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i}
                onHoverStart={() => setActiveFeature(i)}
                onHoverEnd={() => setActiveFeature(null)}
                className="relative bg-[#1f1610] border border-[#2e2010] rounded-2xl p-7 overflow-hidden cursor-default group"
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
              >
                <motion.div
                  className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-600 to-transparent"
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={activeFeature === i ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-amber-950/60 border border-amber-800/20 flex items-center justify-center">
                    <f.icon className="text-amber-500 text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[15px] font-bold text-[#eddcba]">{f.title}</h3>
                      <span className="text-[11px] text-stone-700 font-mono">{f.tag}</span>
                    </div>
                    <p className="text-stone-500 text-[13px] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
                <motion.div
                  className="absolute bottom-5 right-5 text-amber-700"
                  initial={{ opacity: 0, x: -4 }}
                  animate={activeFeature === i ? { opacity: 1, x: 0 } : { opacity: 0, x: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <TbArrowUpRight size={16} />
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 mb-6">
        <motion.div
          className="max-w-4xl mx-auto relative bg-[#1f1610] border border-[#2e2010] rounded-3xl p-10 md:p-16 overflow-hidden text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <FabricPatternBg />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-amber-600/40 to-transparent" />

          <div className="relative z-10">
            <div className="flex justify-center gap-4 mb-8 text-amber-800/40">
              <GiYarn size={32} />
              <GiSewingNeedle size={32} />
              <GiSewingString size={32} />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-[#eddcba] mb-4 tracking-tight">
              Начните сегодня
            </h2>
            <p className="text-stone-500 text-[15px] mb-8 max-w-md mx-auto leading-relaxed">
              Настройка занимает 10 минут. Первый месяц — бесплатно.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/register')}
                className="group flex items-center justify-center gap-2 px-8 py-3.5 bg-amber-600 text-[#18120a] font-bold rounded-xl hover:bg-amber-500 transition-colors shadow-[0_8px_32px_-8px_rgba(180,120,40,0.5)] text-[15px]"
              >
                Создать аккаунт
                <TbArrowRight className="group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#2e2010] px-8 py-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-amber-500">
            <GiYarn className="text-lg" />
            <span className="font-black tracking-[0.2em] text-[13px] uppercase">ShveAI</span>
          </div>
          <StitchLine className="text-stone-800 hidden md:flex" />
          <div className="text-stone-700 text-[12px] font-mono">
            Оптимизация швейного производства · 2024
          </div>
        </div>
      </footer>
    </div>
  );
}
