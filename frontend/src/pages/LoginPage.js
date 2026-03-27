import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GiYarn, GiSewingNeedle, GiScissors, GiSewingString } from 'react-icons/gi';
import { TbArrowLeft, TbEye, TbEyeOff, TbArrowRight } from 'react-icons/tb';
import { FabricPatternBg, StitchLine } from '../components/SewingIcons';

const float = (delay = 0) => ({
  animate: { y: [0, -10, 0] },
  transition: { duration: 5, delay, repeat: Infinity, ease: 'easeInOut' },
});

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#18120a] text-[#eddcba] flex overflow-hidden">

      {/* LEFT PANEL */}
      <motion.div
        className="hidden lg:flex lg:w-[46%] relative flex-col justify-between p-12 bg-[#141009] overflow-hidden"
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <FabricPatternBg />
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-amber-900/20 to-transparent" />

        {/* Floating icons */}
        <motion.div className="absolute top-20 right-12 text-amber-900/20" {...float(0)}>
          <GiYarn size={72} />
        </motion.div>
        <motion.div className="absolute bottom-28 right-20 text-stone-800/40" {...float(1.5)}>
          <GiScissors size={52} />
        </motion.div>
        <motion.div className="absolute top-1/2 right-6 text-amber-900/15" {...float(0.8)}>
          <GiSewingString size={38} />
        </motion.div>

        {/* Logo */}
        <motion.button
          onClick={() => navigate('/')}
          className="relative z-10 flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors w-fit"
          whileHover={{ x: -2 }}
        >
          <TbArrowLeft size={16} className="text-stone-600" />
          <GiYarn className="text-lg" />
          <span className="font-black tracking-[0.2em] text-[13px] uppercase">ShveAI</span>
        </motion.button>

        {/* Content */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="text-[11px] text-amber-700 uppercase tracking-[0.2em] font-mono mb-5">// добро пожаловать</div>
            <h2 className="text-[2.6rem] font-black leading-[1.05] tracking-tight mb-6 text-[#eddcba]">
              Точность —<br />
              <span className="italic text-amber-400/90">как стежок</span><br />
              в изделии
            </h2>
            <StitchLine className="text-amber-800/30 mb-6" />
            <p className="text-stone-500 text-[13px] leading-relaxed max-w-xs">
              Войдите, чтобы получить доступ к заказам,
              материалам и аналитике вашего цеха.
            </p>
          </motion.div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 text-stone-700 text-[11px] font-mono">
          Безопасное соединение · TLS 1.3
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
          whileHover={{ scale: 1.02 }}
        >
          <GiYarn className="text-lg" />
          <span className="font-black tracking-[0.2em] text-[13px] uppercase">ShveAI</span>
        </motion.button>

        <div className="w-full max-w-[380px]">
          <motion.div
            className="mb-9"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-[1.9rem] font-black text-[#eddcba] mb-2 tracking-tight">Вход в систему</h1>
            <p className="text-stone-500 text-[13px]">
              Нет аккаунта?{' '}
              <Link to="/register" className="text-amber-500 hover:text-amber-400 transition-colors underline underline-offset-2">
                Зарегистрироваться
              </Link>
            </p>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Email */}
            <div>
              <label className="block text-[11px] text-stone-500 uppercase tracking-[0.15em] mb-2 font-mono">
                Email
              </label>
              <motion.div
                className={`relative border rounded-xl transition-colors duration-200 ${
                  focused === 'email' ? 'border-amber-600/70 bg-amber-950/15' : 'border-[#2e2010] bg-[#1f1610]'
                }`}
                animate={focused === 'email' ? { scale: 1.01 } : { scale: 1 }}
                transition={{ duration: 0.15 }}
              >
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 text-[13px] font-mono">@</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused('')}
                  placeholder="operator@factory.ru"
                  className="w-full bg-transparent pl-9 pr-4 py-3.5 text-[#eddcba] placeholder-stone-700 outline-none text-[14px] rounded-xl"
                  required
                />
              </motion.div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-[11px] text-stone-500 uppercase tracking-[0.15em] font-mono">Пароль</label>
                <button type="button" className="text-[11px] text-amber-800 hover:text-amber-600 transition-colors">
                  Забыли?
                </button>
              </div>
              <motion.div
                className={`relative border rounded-xl transition-colors duration-200 ${
                  focused === 'password' ? 'border-amber-600/70 bg-amber-950/15' : 'border-[#2e2010] bg-[#1f1610]'
                }`}
                animate={focused === 'password' ? { scale: 1.01 } : { scale: 1 }}
                transition={{ duration: 0.15 }}
              >
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused('')}
                  placeholder="••••••••"
                  className="w-full bg-transparent px-4 py-3.5 pr-12 text-[#eddcba] placeholder-stone-700 outline-none text-[14px] rounded-xl"
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
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" className="accent-amber-600 w-3.5 h-3.5" />
              <span className="text-stone-500 text-[13px]">Запомнить меня</span>
            </label>

            <StitchLine className="text-[#2e2010] pt-2" />

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="group w-full relative py-3.5 bg-amber-600 text-[#18120a] font-bold rounded-xl hover:bg-amber-500 transition-colors shadow-[0_8px_24px_-6px_rgba(180,120,40,0.45)] text-[15px] overflow-hidden"
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <motion.div
                      className="flex gap-1"
                    >
                      {[0,1,2].map(i => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 bg-[#18120a] rounded-full"
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 0.6, delay: i * 0.12, repeat: Infinity }}
                        />
                      ))}
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.span
                    key="text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2"
                  >
                    Войти
                    <TbArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <div className="flex items-center gap-3 text-stone-700">
              <div className="flex-1 h-px bg-[#2e2010]" />
              <span className="text-[11px] font-mono">или</span>
              <div className="flex-1 h-px bg-[#2e2010]" />
            </div>

            <motion.button
              type="button"
              onClick={() => navigate('/')}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 border border-[#2e2010] text-stone-500 rounded-xl hover:border-amber-800/40 hover:text-[#eddcba] transition-all text-[13px]"
            >
              Демо-режим
            </motion.button>
          </motion.form>

          <div className="mt-8 pt-5 border-t border-[#2e2010] flex items-center justify-between text-stone-700 text-[11px] font-mono">
            <span>© ShveAI 2024</span>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-amber-700' : 'bg-[#2e2010]'}`} />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
