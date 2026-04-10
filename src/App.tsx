import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// --- Audio Setup ---
let audioCtx: AudioContext | null = null;

const initAudio = async () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
};

const playSlap = () => {
  if (!audioCtx) return;
  const bufferSize = audioCtx.sampleRate * 0.1;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 1000 + Math.random() * 1000; // Randomize pitch slightly
  
  const noiseGain = audioCtx.createGain();
  const t = audioCtx.currentTime;
  noiseGain.gain.setValueAtTime(1.5, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
  
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);
  
  noise.start(t);
};

const getHitText = (bossName: string) => {
  const templates = [
    `[NAME] 扣血 9999!`,
    `暴击 [NAME]!`,
    `[NAME] 持有的股票跌停!`,
    `[NAME] 你的福报来了!`,
    `[NAME] 吃我一记!`,
    `[NAME] 闭上你的臭嘴!`,
    `[NAME] 你被我优化了!`,
    `[NAME] 幼儿园毕业啦!`,
    `[NAME] 弱智的你看不清现实吗!`,
    `[NAME] 偷税漏税接受社会主义毒打!`,
    `打爆 [NAME] 的狗头!`,
    `[NAME] 公司的人都被你吓跑了，你自己干活吧!`,
    `[NAME] 扣你存款!`
  ];
  return templates[Math.floor(Math.random() * templates.length)].replace(/\[NAME\]/g, bossName);
};

const speakInsult = (text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.3;
    utterance.pitch = 1.2 + Math.random() * 0.6;
    window.speechSynthesis.speak(utterance);
  }
};

// --- Weapon Data ---
const SlipperIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className || "w-12 h-12"} xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(-20 50 50)">
      <path d="M35 15 C 35 5, 65 5, 65 15 L 75 70 C 75 95, 25 95, 25 70 Z" fill="#ef4444" stroke="#7f1d1d" strokeWidth="4" />
      <path d="M32 45 Q 50 20 68 45" fill="none" stroke="#fef08a" strokeWidth="6" strokeLinecap="round" />
      <path d="M50 32 L 50 55" fill="none" stroke="#fef08a" strokeWidth="6" strokeLinecap="round" />
      <circle cx="50" cy="55" r="4" fill="#fef08a" />
    </g>
  </svg>
);

const WEAPONS = [
  { id: 'slipper', icon: <SlipperIcon className="w-[1em] h-[1em] inline-block" />, name: '祖传拖鞋', idleAnim: { rotate: -10, scale: 1 }, hitAnim: { rotate: -70, scale: 0.9, x: -30, y: 30 } },
  { id: 'punch', icon: '🥊', name: '重拳出击', idleAnim: { rotate: 0, scale: 1 }, hitAnim: { scale: 1.5, x: 30, y: -30 } },
  { id: 'kick', icon: '🥾', name: '无影脚', idleAnim: { rotate: 90, scale: 1 }, hitAnim: { rotate: 0, scale: 1.6, x: 50, y: -50 } },
  { id: 'hammer', icon: '🔨', name: '八十！', idleAnim: { rotate: 10, scale: 1 }, hitAnim: { rotate: -90, scale: 1.3, x: -40, y: 40 } },
  { id: 'keyboard', icon: '⌨️', name: '物理输出', idleAnim: { rotate: 0, scale: 1 }, hitAnim: { rotate: 15, scale: 0.8, y: 50 } },
  { id: 'fish', icon: '🐟', name: '咸鱼突刺', idleAnim: { rotate: -45, scale: 1 }, hitAnim: { rotate: 45, scale: 1.2, x: 40, y: -20 } },
];

// --- Components ---

const WeaponCursor = ({ isHitting, weapon }: { isHitting: boolean, weapon: typeof WEAPONS[0] }) => {
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-50 text-7xl drop-shadow-2xl origin-bottom-right"
      animate={{
        x: mousePos.x - 40 + (isHitting && weapon.hitAnim.x ? weapon.hitAnim.x : 0),
        y: mousePos.y - 60 + (isHitting && weapon.hitAnim.y ? weapon.hitAnim.y : 0),
        rotate: isHitting ? weapon.hitAnim.rotate : weapon.idleAnim.rotate,
        scale: isHitting ? weapon.hitAnim.scale : weapon.idleAnim.scale,
      }}
      transition={{ type: 'spring', stiffness: 800, damping: 25, mass: 0.5 }}
    >
      {weapon.icon}
    </motion.div>
  );
};

const PaperEffigy = ({ name, isHit, combo, onHit }: { name: string, isHit: boolean, combo: number, onHit: (e: React.PointerEvent) => void }) => {
  // Calculate body color based on combo
  let bodyColor = '#fef08a'; // Default yellow
  if (combo > 20) bodyColor = '#991b1b'; // Deep red
  else if (combo > 10) bodyColor = '#ef4444'; // Red
  else if (combo > 0) bodyColor = '#fca5a5'; // Light red

  return (
    <motion.div
      onPointerDown={onHit}
      style={{ touchAction: 'none' }} // Prevent scrolling when tapping on mobile
      animate={isHit ? { 
        x: [0, -25, 25, -15, 15, 0], 
        y: [0, -15, 15, -10, 10, 0],
        scale: [1, 0.85, 1.05, 1],
        rotate: [0, -12, 12, -6, 6, 0],
      } : {
        x: 0, y: 0, scale: 1, rotate: 0
      }}
      transition={{ duration: isHit ? 0.4 : 0.2 }}
      className="relative inline-block cursor-none select-none"
    >
      {/* Invisible hit area to make clicking easier */}
      <div className="absolute inset-0 z-10" />
      
      <svg viewBox="0 0 200 400" className="w-64 h-[32rem] drop-shadow-2xl">
        {/* Body */}
        <motion.path animate={{ fill: bodyColor }} transition={{ duration: 0.5 }} d="M50 100 C50 50, 150 50, 150 100 C150 120, 130 140, 100 140 C70 140, 50 120, 50 100 Z" stroke="#1f2937" strokeWidth="4"/>
        <motion.rect animate={{ fill: bodyColor }} transition={{ duration: 0.5 }} x="80" y="140" width="40" height="150" stroke="#1f2937" strokeWidth="4"/>
        {/* Arms */}
        <path d="M40 160 L160 160" stroke="#1f2937" strokeWidth="20" strokeLinecap="round"/>
        <motion.path animate={{ stroke: bodyColor }} transition={{ duration: 0.5 }} d="M40 160 L160 160" strokeWidth="12" strokeLinecap="round"/>
        {/* Legs */}
        <path d="M80 290 L60 380 M120 290 L140 380" stroke="#1f2937" strokeWidth="20" strokeLinecap="round"/>
        <motion.path animate={{ stroke: bodyColor }} transition={{ duration: 0.5 }} d="M80 290 L60 380 M120 290 L140 380" strokeWidth="12" strokeLinecap="round"/>
        
        {/* Face */}
        {isHit ? (
          <>
            <path d="M70 85 L85 95 L70 105" stroke="#1f2937" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M130 85 L115 95 L130 105" stroke="#1f2937" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M80 120 Q90 110 100 120 T120 120" stroke="#1f2937" strokeWidth="4" fill="none" strokeLinecap="round"/>
          </>
        ) : combo > 10 ? (
          <>
            <path d="M70 85 L90 105 M90 85 L70 105" stroke="#1f2937" strokeWidth="4" strokeLinecap="round"/>
            <path d="M110 85 L130 105 M130 85 L110 105" stroke="#1f2937" strokeWidth="4" strokeLinecap="round"/>
            <ellipse cx="100" cy="120" rx="10" ry="15" fill="#1f2937"/>
          </>
        ) : (
          <>
            <circle cx="80" cy="90" r="6" fill="#1f2937"/>
            <circle cx="120" cy="90" r="6" fill="#1f2937"/>
            <path d="M80 110 Q100 130 120 110" stroke="#1f2937" strokeWidth="4" fill="none" strokeLinecap="round"/>
          </>
        )}
        
        {/* Angry marks and Bandage if combo > 0 */}
        <AnimatePresence>
          {combo > 0 && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <path d="M130 60 L150 50 M140 70 L160 60" stroke="#ef4444" strokeWidth="6" strokeLinecap="round"/>
              <path d="M60 70 L90 100 M90 70 L60 100" stroke="#1f2937" strokeWidth="3" strokeLinecap="round"/>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
      
      {/* Name Tag */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-16">
        <div className="bg-white border-4 border-gray-900 px-3 py-4 flex flex-col items-center justify-center shadow-inner transform -rotate-2">
          {name.split('').slice(0, 4).map((char, i) => (
            <span key={i} className="text-4xl font-black text-gray-900 leading-none my-1">{char}</span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [bossName, setBossName] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [hits, setHits] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isHit, setIsHit] = useState(false);
  const [selectedWeaponIdx, setSelectedWeaponIdx] = useState(0);
  
  const [floatingTexts, setFloatingTexts] = useState<{id: number, text: string, x: number, y: number}[]>([]);
  const [particles, setParticles] = useState<{id: number, x: number, y: number, vx: number, vy: number, icon: React.ReactNode, rotation: number}[]>([]);
  
  const textIdRef = useRef(0);
  const particleIdRef = useRef(0);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bossName.trim()) {
      await initAudio();
      setIsStarted(true);
    }
  };

  const handleHit = async (e: React.PointerEvent) => {
    await initAudio();
    playSlap();
    
    const text = getHitText(bossName);
    speakInsult(text); // 移除 50% 的随机限制，确保每次都有声音反馈
    
    setHits(h => h + 1);
    setCombo(c => c + 1);
    setIsHit(true);
    
    if (hitTimeoutRef.current) clearTimeout(hitTimeoutRef.current);
    hitTimeoutRef.current = setTimeout(() => setIsHit(false), 150);

    // Reset combo after 2 seconds of inactivity
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    comboTimeoutRef.current = setTimeout(() => setCombo(0), 2000);

    const x = e.clientX;
    const y = e.clientY;
    
    // Add floating text
    const id = textIdRef.current++;
    setFloatingTexts(prev => {
      const next = [...prev, { id, text, x, y }];
      return next.length > 20 ? next.slice(next.length - 20) : next; // 防止内存泄漏
    });
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 1000);

    // Add particles
    const newParticles = Array.from({length: 5}).map((_, i) => ({
      id: particleIdRef.current++,
      x, y,
      vx: (Math.random() - 0.5) * 600,
      vy: (Math.random() - 0.5) * 600 - 200,
      icon: ['💥', '💢', '💦', '🩸', '✨', WEAPONS[selectedWeaponIdx].icon][Math.floor(Math.random() * 6)],
      rotation: Math.random() * 360
    }));
    setParticles(prev => {
      const next = [...prev, ...newParticles];
      return next.length > 50 ? next.slice(next.length - 50) : next; // 防止内存泄漏
    });
    setTimeout(() => {
      const idsToRemove = new Set(newParticles.map(p => p.id));
      setParticles(prev => prev.filter(p => !idsToRemove.has(p.id)));
    }, 800);
  };

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-slate-200 flex flex-col items-center justify-center p-4 font-sans selection:bg-slate-800 selection:text-slate-100">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white border-8 border-slate-800 p-8 shadow-[16px_16px_0px_0px_#1e293b] max-w-md w-full"
        >
          <h1 className="text-6xl font-black mb-6 text-center tracking-tighter transform -rotate-2 text-slate-800">在线打小人</h1>
          <p className="text-slate-600 mb-8 text-center font-bold text-xl">输入老板/仇人的名字，尽情发泄吧！</p>
          
          <form onSubmit={handleStart} className="flex flex-col gap-6">
            <input
              type="text"
              value={bossName}
              onChange={(e) => setBossName(e.target.value)}
              placeholder="输入名字 (如: 王总)"
              maxLength={4}
              className="border-4 border-slate-800 p-4 text-3xl font-black focus:outline-none focus:ring-4 focus:ring-red-500 text-center bg-slate-50 text-slate-800"
              required
            />
            <button 
              type="submit"
              className="bg-red-500 text-white border-4 border-slate-800 p-4 text-3xl font-black hover:bg-red-600 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#1e293b] transition-all active:translate-y-1 active:shadow-none cursor-pointer"
            >
              开始发泄 💥
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const currentWeapon = WEAPONS[selectedWeaponIdx];

  return (
    <div className={`min-h-screen overflow-hidden flex flex-col cursor-none select-none relative transition-colors duration-150 ${isHit ? 'bg-slate-700' : 'bg-slate-800'}`}>
      <WeaponCursor isHitting={isHit} weapon={currentWeapon} />
      
      {/* Header Stats */}
      <div className="absolute top-8 left-8 bg-slate-900 border-4 border-slate-600 p-4 shadow-[8px_8px_0px_0px_#0f172a] z-10 flex flex-col gap-2 rounded-lg">
        <h2 className="text-2xl font-black text-slate-100">发泄次数: <span className="text-red-400">{hits}</span></h2>
        {combo > 1 && (
          <motion.div 
            key={combo}
            initial={{ scale: 1.5, opacity: 0, x: -20 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            className="text-3xl font-black text-yellow-400"
            style={{ textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000' }}
          >
            {combo} COMBO! 🔥
          </motion.div>
        )}
      </div>

      <div className="absolute top-8 right-8 z-10 flex flex-col gap-4 items-end">
        <button 
          onClick={() => setIsStarted(false)}
          className="bg-slate-900 text-slate-100 border-4 border-slate-600 px-6 py-3 font-black text-xl hover:bg-slate-800 active:translate-y-1 shadow-[6px_6px_0px_0px_#0f172a] active:shadow-none transition-all cursor-none rounded-lg"
        >
          换个人打
        </button>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex items-center justify-center relative z-20">
        <PaperEffigy name={bossName} isHit={isHit} combo={combo} onHit={handleHit} />
      </div>

      {/* Weapon Selector */}
      <div className="w-full bg-slate-900 border-t-4 border-slate-700 p-6 z-10 flex gap-4 overflow-x-auto justify-center shadow-[0_-8px_20px_rgba(0,0,0,0.3)]">
        {WEAPONS.map((w, idx) => (
          <button
            key={w.id}
            onClick={() => setSelectedWeaponIdx(idx)}
            className={`flex flex-col items-center justify-center p-4 border-4 min-w-[90px] rounded-xl transition-all cursor-none ${
              selectedWeaponIdx === idx 
                ? 'bg-yellow-400 border-yellow-600 shadow-inner translate-y-1 text-slate-900' 
                : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1'
            }`}
          >
            <span className="text-5xl mb-3 flex items-center justify-center h-12 w-12">{w.icon}</span>
            <span className="font-black text-sm whitespace-nowrap">{w.name}</span>
          </button>
        ))}
      </div>

      {/* Floating Texts Container */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        <AnimatePresence>
          {floatingTexts.map(ft => (
            <motion.div
              key={ft.id}
              initial={{ opacity: 1, y: ft.y, x: ft.x, scale: 0.5, rotate: Math.random() * 40 - 20 }}
              animate={{ opacity: 0, y: ft.y - 200, scale: 2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute text-5xl font-black text-yellow-300 drop-shadow-2xl whitespace-nowrap"
              style={{ 
                textShadow: '4px 4px 0 #000, -4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 8px 8px 0 rgba(0,0,0,0.6)',
                WebkitTextStroke: '2px black'
              }}
            >
              {ft.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Particles Container */}
      <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ x: p.x, y: p.y, opacity: 1, scale: 1, rotate: p.rotation }}
            animate={{ 
              x: p.x + p.vx, 
              y: p.y + p.vy + 200, // Add gravity effect
              opacity: 0, 
              scale: 0.5, 
              rotate: p.rotation + 180 
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute text-4xl"
          >
            {p.icon}
          </motion.div>
        ))}
      </div>
      
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none opacity-5 flex flex-wrap justify-around items-center overflow-hidden z-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="text-9xl font-black transform rotate-45 m-8 text-slate-900">💢</div>
        ))}
      </div>
    </div>
  );
}

