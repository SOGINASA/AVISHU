import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GiYarn, GiSewingNeedle, GiScissors } from 'react-icons/gi';
import { TbArrowLeft, TbArrowRight, TbEye, TbEyeOff, TbCheck } from 'react-icons/tb';
import { FabricPatternBg, StitchLine } from '../components/SewingIcons';

const ROLES = [
  { id: 'operator', label: 'Оператор', icon: GiSewingNeedle, desc: 'Выполнение заданий' },
  { id: 'master', label: 'Мастер цеха', icon: GiScissors, desc: 'Управление бригадой' },
  { id: 'manager', label: 'Менеджер', icon: GiYarn, desc: 'Контроль производства' },
];

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: (dir) => ({ x: dir > 0 ? -40 : 40, opacity: 0, transition: { duration: 0.25 } }),
};

const passStrength = (p) => {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
};
const strengthLabel = ['', 'Слабый', 'Средний', 'Хороший', 'Надёжный'];
const strengthColor = ['', '#7f1d1d', '#92400e', '#78350f', '#14532d'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [focused, setFocused] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: '', factory: '' });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const strength = passStrength(form.password);

  const next = (e) => {
    e.preventDefault();
    setDir(1);
    setStep(2);
  };
  const back = () => {
    setDir(-1);
    setStep(1);
  };
  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/');
    }, 1400);
  };

  const inputWrap = (field) =>
    `relative border rounded-xl transition-colors duration-200 ${
      focused === field ? 'border-amber-600/70 bg-amber-950/15' : 'border-[#2e2010] bg-[#1f1610]'
    }`;
  const inputClass = 'w-full bg-transparent px-4 py-3.5 text-[#eddcba] placeholder-stone-700 outline-none text-[14px] rounded-xl';

  return (
    <div className="min-h-screen bg-[#18120a] text-[#eddcba] flex overflow-hidden">

      {/* LEFT PANEL */}
      <motion.div
        className="hidden lg:flex lg:w-[42%] relative flex-col justify-between p-12 bg-[#141009] overflow-hidden"
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <FabricPatternBg />
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-amber-900/20 to-transparent" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(#c8a96e 1px, transparent 1px), linear-gradient(90deg, #c8a96e 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <motion.button
          onClick={() => navigate('/')}
          className="relative z-10 flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors w-fit"
          whileHover={{ x: -2 }}
        >
          <TbArrowLeft size={16} className="text-stone-600" />
          <GiYarn className="text-lg" />
          <span className="font-black tracking-[0.2em] text-[13px] uppercase">ShveAI</span>
        </motion.button>

        <div className="relative z-10">
          <div className="text-[11px] text-amber-700 uppercase tracking-[0.2em] font-mono mb-5">// регистрация</div>
          <h2 className="text-[2.4rem] font-black leading-[1.05] tracking-tight mb-6 text-[#eddcba]">
            Присоединяйтесь<br />
            <span className="italic text-amber-400/90">к команде</span>
          </h2>
          <StitchLine className="text-amber-800/30 mb-8" />

          {/* Step indicators */}
          <div className="space-y-5">
            {[
              { n: 1, label: 'Личные данные', sub: 'Имя, email, пароль' },
              { n: 2, label: 'Роль и цех', sub: 'Ваша должность' },
            ].map(({ n, label, sub }) => (
              <motion.div
                key={n}
                className="flex items-center gap-4"
                animate={{ opacity: step >= n ? 1 : 0.35 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[12px] font-bold flex-shrink-0 transition-colors duration-300 ${
                    step > n
                      ? 'border-amber-500 bg-amber-500 text-[#18120a]'
                      : step === n
                      ? 'border-amber-500 text-amber-400'
                      : 'border-[#2e2010] text-stone-600'
                  }`}
                  animate={step === n ? { scale: [1, 1.08, 1] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  {step > n ? <TbCheck size={14} /> : n}
                </motion.div>
                <div>
                  <div className={`text-[13px] font-semibold transition-colors duration-300 ${step >= n ? 'text-[#eddcba]' : 'text-stone-600'}`}>
                    {label}
                  </div>
                  <div className="text-[11px] text-stone-600">{sub}</div>
                </div>
                {step === n && (
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-auto"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-stone-700 text-[11px] font-mono">
          Данные защищены · GDPR
        </div>
      </motion.div>

      {/* RIGHT PANEL */}
      <motion.div
        className="flex-1 flex flex-col justify-center items-center px-6 py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        {/* Mobile logo */}
        <motion.button
          onClick={() => navigate('/')}
          className="flex lg:hidden items-center gap-2 text-amber-500 mb-10"
        >
          <GiYarn />
          <span className="font-black tracking-[0.2em] text-[13px] uppercase">ShveAI</span>
        </motion.button>

        <div className="w-full max-w-[400px]">

          {/* Header */}
          <motion.div
            className="mb-7"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-5">
              <div className="flex-1 h-1 rounded-full bg-[#2e2010] overflow-hidden">
                <motion.div
                  className="h-full bg-amber-600 rounded-full"
                  animate={{ width: step === 1 ? '50%' : '100%' }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="text-[11px] text-stone-600 font-mono flex-shrink-0">{step}/2</span>
            </div>

            <h1 className="text-[1.85rem] font-black text-[#eddcba] mb-1.5 tracking-tight">
              {step === 1 ? 'Создать аккаунт' : 'Ваша роль'}
            </h1>
            <p className="text-stone-500 text-[13px]">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="text-amber-500 hover:text-amber-400 transition-colors underline underline-offset-2">
                Войти
              </Link>
            </p>
          </motion.div>

          {/* FORM STEPS */}
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={dir}>
              {step === 1 && (
                <motion.form
                  key="step1"
                  custom={dir}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  onSubmit={next}
                  className="space-y-4"
                >
                  {/* Name */}
                  <div>
                    <label className="block text-[11px] text-stone-500 uppercase tracking-[0.15em] mb-2 font-mono">Полное имя</label>
                    <motion.div
                      className={inputWrap('name')}
                      animate={focused === 'name' ? { scale: 1.01 } : { scale: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => set('name', e.target.value)}
                        onFocus={() => setFocused('name')}
                        onBlur={() => setFocused('')}
                        placeholder="Иванова Елена"
                        className={inputClass}
                        required
                      />
                    </motion.div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[11px] text-stone-500 uppercase tracking-[0.15em] mb-2 font-mono">Email</label>
                    <motion.div
                      className={inputWrap('email')}
                      animate={focused === 'email' ? { scale: 1.01 } : { scale: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 text-[13px] font-mono">@</span>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => set('email', e.target.value)}
                        onFocus={() => setFocused('email')}
                        onBlur={() => setFocused('')}
                        placeholder="ivanova@factory.ru"
                        className={`${inputClass} pl-9`}
                        required
                      />
                    </motion.div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[11px] text-stone-500 uppercase tracking-[0.15em] mb-2 font-mono">Пароль</label>
                    <motion.div
                      className={inputWrap('password')}
                      animate={focused === 'password' ? { scale: 1.01 } : { scale: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => set('password', e.target.value)}
                        onFocus={() => setFocused('password')}
                        onBlur={() => setFocused('')}
                        placeholder="Минимум 8 символов"
                        className={`${inputClass} pr-12`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-400 transition-colors"
                      >
                        {showPass ? <TbEyeOff size={16} /> : <TbEye size={16} />}
                      </button>
                    </motion.div>

                    {/* Strength */}
                    <AnimatePresence>
                      {form.password && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 overflow-hidden"
                        >
                          <div className="flex gap-1 mb-1">
                            {[1, 2, 3, 4].map(i => (
                              <motion.div
                                key={i}
                                className="flex-1 h-0.5 rounded-full"
                                animate={{ backgroundColor: strength >= i ? strengthColor[strength] : '#2e2010' }}
                                transition={{ duration: 0.3 }}
                              />
                            ))}
                          </div>
                          <div className="text-[11px] font-mono" style={{ color: strengthColor[strength] }}>
                            {strengthLabel[strength]}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Confirm */}
                  <div>
                    <label className="block text-[11px] text-stone-500 uppercase tracking-[0.15em] mb-2 font-mono">Повторите пароль</label>
                    <motion.div
                      className={`${inputWrap('confirm')} ${form.confirm && form.confirm !== form.password ? '!border-red-900' : ''}`}
                      animate={focused === 'confirm' ? { scale: 1.01 } : { scale: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <input
                        type="password"
                        value={form.confirm}
                        onChange={e => set('confirm', e.target.value)}
                        onFocus={() => setFocused('confirm')}
                        onBlur={() => setFocused('')}
                        placeholder="••••••••"
                        className={`${inputClass} pr-10`}
                        required
                      />
                      <AnimatePresence>
                        {form.confirm && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px]"
                          >
                            {form.confirm === form.password
                              ? <TbCheck className="text-green-600" size={15} />
                              : <span className="text-red-800">✗</span>
                            }
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>

                  <StitchLine className="text-[#2e2010] pt-1" />

                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    className="group w-full py-3.5 bg-amber-600 text-[#18120a] font-bold rounded-xl hover:bg-amber-500 transition-colors shadow-[0_8px_24px_-6px_rgba(180,120,40,0.4)] text-[15px] flex items-center justify-center gap-2"
                  >
                    Далее
                    <TbArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </motion.form>
              )}

              {step === 2 && (
                <motion.form
                  key="step2"
                  custom={dir}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  onSubmit={submit}
                  className="space-y-5"
                >
                  {/* Role */}
                  <div>
                    <label className="block text-[11px] text-stone-500 uppercase tracking-[0.15em] mb-3 font-mono">Ваша роль</label>
                    <div className="space-y-2">
                      {ROLES.map((r) => (
                        <motion.button
                          key={r.id}
                          type="button"
                          onClick={() => set('role', r.id)}
                          whileHover={{ scale: 1.01, x: 2 }}
                          whileTap={{ scale: 0.99 }}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-colors duration-200 ${
                            form.role === r.id
                              ? 'border-amber-600/60 bg-amber-950/25'
                              : 'border-[#2e2010] bg-[#1f1610] hover:border-amber-900/50'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                            form.role === r.id ? 'bg-amber-600/20' : 'bg-[#2e2010]'
                          }`}>
                            <r.icon className={`text-lg transition-colors duration-200 ${form.role === r.id ? 'text-amber-400' : 'text-stone-600'}`} />
                          </div>
                          <div className="flex-1">
                            <div className={`text-[14px] font-semibold transition-colors duration-200 ${form.role === r.id ? 'text-amber-400' : 'text-[#eddcba]'}`}>
                              {r.label}
                            </div>
                            <div className="text-[12px] text-stone-600">{r.desc}</div>
                          </div>
                          <motion.div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
                              form.role === r.id ? 'border-amber-500' : 'border-[#3a2a15]'
                            }`}
                            animate={form.role === r.id ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 0.2 }}
                          >
                            {form.role === r.id && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                          </motion.div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Factory */}
                  <div>
                    <label className="block text-[11px] text-stone-500 uppercase tracking-[0.15em] mb-2 font-mono">Предприятие</label>
                    <motion.div
                      className={inputWrap('factory')}
                      animate={focused === 'factory' ? { scale: 1.01 } : { scale: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <input
                        type="text"
                        value={form.factory}
                        onChange={e => set('factory', e.target.value)}
                        onFocus={() => setFocused('factory')}
                        onBlur={() => setFocused('')}
                        placeholder="ООО «ТекстильПром»"
                        className={inputClass}
                      />
                    </motion.div>
                  </div>

                  {/* Terms */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="accent-amber-600 mt-0.5 flex-shrink-0" required />
                    <span className="text-stone-500 text-[13px] leading-relaxed">
                      Принимаю{' '}
                      <span className="text-amber-700 underline underline-offset-2 cursor-pointer hover:text-amber-500 transition-colors">
                        условия использования
                      </span>
                    </span>
                  </label>

                  <StitchLine className="text-[#2e2010]" />

                  <div className="flex gap-2">
                    <motion.button
                      type="button"
                      onClick={back}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="px-5 py-3.5 border border-[#2e2010] text-stone-500 rounded-xl hover:border-amber-800/40 hover:text-[#eddcba] transition-all text-[14px] flex items-center gap-1.5"
                    >
                      <TbArrowLeft size={15} />
                      Назад
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex-1 py-3.5 bg-amber-600 text-[#18120a] font-bold rounded-xl hover:bg-amber-500 transition-colors shadow-[0_8px_24px_-6px_rgba(180,120,40,0.4)] text-[15px] flex items-center justify-center gap-2 overflow-hidden"
                    >
                      <AnimatePresence mode="wait">
                        {loading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex gap-1"
                          >
                            {[0, 1, 2].map(i => (
                              <motion.div
                                key={i}
                                className="w-1.5 h-1.5 bg-[#18120a] rounded-full"
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 0.6, delay: i * 0.12, repeat: Infinity }}
                              />
                            ))}
                          </motion.div>
                        ) : (
                          <motion.span
                            key="text"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2"
                          >
                            <TbCheck size={16} />
                            Создать аккаунт
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-8 pt-5 border-t border-[#2e2010] flex items-center justify-between text-stone-700 text-[11px] font-mono">
            <span>© ShveAI 2024</span>
            <div className="flex gap-1">
              {[1, 2].map(n => (
                <motion.div
                  key={n}
                  className="h-1 rounded-full bg-[#2e2010] overflow-hidden"
                  animate={{ width: step >= n ? 16 : 6 }}
                  transition={{ duration: 0.3 }}
                >
                  {step >= n && <div className="w-full h-full bg-amber-700/60 rounded-full" />}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
