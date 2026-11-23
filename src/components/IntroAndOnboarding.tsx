import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Sparkles, UserCheck, Volume2 } from 'lucide-react';
import { soundEngine } from '../game/audio';
import { CLASSES, STARTER_EMPTY_EQUIPPED } from '../game/data';
import { CharacterPreviewController, mountCharacterPreview } from '../game/three/CharacterPreview';
import { ClassId, EquippedMap, Gender } from '../game/types';

/* 1. INTRO PRESENTATION (6 SECONDS + ATTACHED INTRO IMAGE + VOICE) */
export const IntroPresentation: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [needsClickForVoice, setNeedsClickForVoice] = useState(false);
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    const audio = new Audio('/assets/aistudio/VOICE_20261123_165749_007_b983ba79.ogg');
    audioRef.current = audio;

    audio
      .play()
      .then(() => {
        setNeedsClickForVoice(false);
      })
      .catch(() => {
        setNeedsClickForVoice(true);
      });

    const start = performance.now();
    const iv = window.setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      const rem = Math.max(0, Math.ceil(6 - elapsed));
      setCountdown(rem);
      if (elapsed >= 6.0) {
        window.clearInterval(iv);
        audio.pause();
        onDone();
      }
    }, 100);

    return () => {
      window.clearInterval(iv);
      audio.pause();
      audioRef.current = null;
    };
  }, [onDone]);

  const handleUserActivate = () => {
    soundEngine.startBgm();
    if (needsClickForVoice && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      setNeedsClickForVoice(false);
    }
  };

  return (
    <div
      onClick={handleUserActivate}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden cursor-pointer"
    >
      <img
        src="/assets/aistudio/intro_67a00ad8.png"
        alt="Tartaros Game Presents"
        className="w-full h-full object-contain sm:object-cover"
      />

      {needsClickForVoice && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-black/85 border border-[#e0a943] text-[#fde68a] text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-2xl">
          <Volume2 className="w-4 h-4 text-[#e0a943]" />
          <span>برای پخش صدا روی صفحه لمس کنید</span>
        </div>
      )}

      <div className="absolute bottom-4 right-5 text-xs font-mono-num text-[#d6cfc2]/85 bg-black/70 px-2.5 py-1 rounded border border-white/10">
        {countdown}s
      </div>
    </div>
  );
};

/* 2. COOL LOADING SCREEN -> "CLICK ON SCREEN TO ENTER" (NO START BUTTON) */
export const CoolLoadingScreen: React.FC<{
  hasSave?: boolean;
  savedName?: string;
  onEnter: () => void;
}> = ({ hasSave, savedName, onEnter }) => {
  const [progress, setProgress] = useState(0);
  const ready = progress >= 100;

  useEffect(() => {
    const start = performance.now();
    const dur = 1800;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(100, ((now - start) / dur) * 100);
      setProgress(p);
      if (p < 100) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      onClick={() => {
        soundEngine.startBgm();
        if (ready) onEnter();
      }}
      className={`relative w-full h-full flex flex-col items-center justify-center bg-[#09080c] p-4 overflow-hidden ${
        ready ? 'cursor-pointer' : ''
      }`}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 38%, rgba(234, 88, 12, 0.28) 0%, rgba(16, 15, 22, 0.94) 55%, #070709 100%)',
        }}
      />

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-amber-400/75"
            style={{
              left: `${(i * 19 + 7) % 96}%`,
              animation: `emberRise ${3 + (i % 4)}s linear ${(i * 0.3) % 3}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <svg
          viewBox="0 0 180 220"
          className="w-24 h-28 sm:w-32 sm:h-40 drop-shadow-[0_0_26px_rgba(249,115,22,0.7)]"
        >
          <defs>
            <linearGradient id="sigilM" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#7c2d12" />
            </linearGradient>
          </defs>
          <path
            d="M90 10 L108 75 L155 55 L122 105 L155 155 L108 135 L90 210 L72 135 L25 155 L58 105 L25 55 L72 75 Z"
            fill="none"
            stroke="url(#sigilM)"
            strokeWidth="5"
          />
          <polygon points="90,32 100,105 90,188 80,105" fill="#fb923c" />
          <ellipse cx="90" cy="105" rx="22" ry="38" fill="none" stroke="#fde68a" strokeWidth="4" />
        </svg>

        <h1 className="mt-1 font-display text-3xl sm:text-5xl font-extrabold tracking-[0.28em] tartaros-gold-text">
          TARTAROS
        </h1>

        {!ready ? (
          <div className="mt-5 flex flex-col items-center">
            <div className="w-64 sm:w-96 h-3.5 rounded border border-[#c4984a]/80 bg-[#141217] p-0.5">
              <div
                className="h-full rounded-sm bg-gradient-to-r from-[#b45309] via-[#f59e0b] to-[#fef08a]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-mono-num text-[#c7b99e]">
              Loading World... {Math.round(progress)}%
            </p>
          </div>
        ) : (
          <div className="mt-6 px-6 py-2.5 rounded-lg border border-[#e0a943]/50 bg-[#17131a]/85 text-[#fde68a] text-sm sm:text-base font-semibold tracking-wide shadow-xl">
            {hasSave && savedName
              ? `روی صفحه کلیک کنید تا با اکانت ${savedName} ادامه دهید`
              : 'روی صفحه کلیک کنید تا وارد بازی شوید'}
          </div>
        )}
      </div>
    </div>
  );
};

/* 3. USERNAME INPUT (3 - 15 CHARS) */
export const UsernameScreen: React.FC<{
  onConfirm: (name: string) => void;
}> = ({ onConfirm }) => {
  const [name, setName] = useState('');
  const trimmed = name.trim();
  const valid = trimmed.length >= 3 && trimmed.length <= 15;

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#09080c] p-3">
      <div className="tartaros-panel w-full max-w-md rounded-xl p-5 text-center space-y-3">
        <h2 className="font-display text-xl sm:text-2xl font-bold tartaros-gold-text">
          ساخت حساب قهرمان
        </h2>
        <p className="text-xs sm:text-sm text-[#d6cfc2]">
          یک نام کاربری برای اکانت خود بنویسید (بین ۳ تا ۱۵ کاراکتر)
        </p>

        <input
          type="text"
          maxLength={15}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="نام کاربری..."
          className="w-full px-4 py-2.5 rounded-lg bg-[#141218] border border-[#c4984a]/60 text-center text-sm sm:text-base font-semibold text-[#fef3c7] focus:outline-none focus:border-[#fbbf24]"
        />

        <div className="text-xs font-mono-num text-[#a89f91]">{trimmed.length} / 15 کاراکتر</div>

        <button
          disabled={!valid}
          onClick={() => {
            soundEngine.startBgm();
            if (valid) onConfirm(trimmed);
          }}
          className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all cursor-pointer ${
            valid
              ? 'bg-gradient-to-b from-[#e0a943] to-[#a36c1b] text-[#120d06] hover:brightness-110'
              : 'bg-white/5 text-[#78716c] border border-white/10 cursor-not-allowed'
          }`}
        >
          تایید
        </button>
      </div>
    </div>
  );
};

/* 4. GENDER SELECTION (MALE / FEMALE -> GREEN SELECT BUTTON) */
export const GenderScreen: React.FC<{
  onSelectGender: (gender: Gender) => void;
}> = ({ onSelectGender }) => {
  const [chosen, setChosen] = useState<Gender | null>(null);

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#09080c] p-3">
      <div className="tartaros-panel w-full max-w-xl rounded-xl p-5 text-center space-y-4">
        <h2 className="font-display text-xl sm:text-2xl font-bold tartaros-gold-text">
          انتخاب جنسیت
        </h2>
        <p className="text-xs sm:text-sm text-[#d6cfc2]">چه جنسیتی برای بازی انتخاب می‌کنید؟</p>

        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'male' as Gender, label: 'مرد', sub: 'Male Champion' },
            { id: 'female' as Gender, label: 'زن', sub: 'Female Champion' },
          ].map((g) => (
            <button
              key={g.id}
              onClick={() => setChosen(g.id)}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                chosen === g.id
                  ? 'border-[#e0a943] bg-[#e0a943]/15 shadow-[0_0_24px_rgba(224,169,67,0.28)]'
                  : 'border-white/15 bg-[#15131a] hover:border-[#c4984a]/60'
              }`}
            >
              <UserCheck
                className={`w-8 h-8 ${chosen === g.id ? 'text-[#fde68a]' : 'text-[#a89f91]'}`}
              />
              <span className="font-display text-lg sm:text-xl font-bold text-[#f3ead8]">
                {g.label}
              </span>
              <span className="text-xs text-[#a89f91]">{g.sub}</span>
            </button>
          ))}
        </div>

        {chosen && (
          <button
            onClick={() => onSelectGender(chosen)}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <Check className="w-5 h-5" />
            <span>انتخاب</span>
          </button>
        )}
      </div>
    </div>
  );
};

/* 5. INTERACTIVE 3D CLASS SELECTION (COMPACT HORIZONTAL FOR MOBILE) */
export const ClassSelectionScreen: React.FC<{
  gender: Gender;
  onConfirmClass: (classId: ClassId) => void;
}> = ({ gender, onConfirmClass }) => {
  const [index, setIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const currentClass = CLASSES[index];

  const mountRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<CharacterPreviewController | null>(null);

  const showcaseEquipped = (cId: ClassId): EquippedMap => {
    const cDef = CLASSES.find((c) => c.id === cId)!;
    return {
      ...STARTER_EMPTY_EQUIPPED,
      weapon: cDef.starterWeaponId,
      armor:
        cId === 'knight'
          ? 'astarot_steel_cuirass'
          : cId === 'necromancer'
          ? 'obsidian_tartaros_plate'
          : 'leather_brigandine',
      cloak:
        cId === 'archer'
          ? 'traveler_mantle'
          : cId === 'necromancer'
          ? 'shadow_dragon_cloak'
          : cId === 'knight'
          ? 'crimson_royal_cape'
          : null,
    };
  };

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const ctrl = mountCharacterPreview(
      el,
      gender,
      currentClass.id,
      showcaseEquipped(currentClass.id)
    );
    previewRef.current = ctrl;
    return () => {
      ctrl.dispose();
      previewRef.current = null;
    };
  }, []);

  useEffect(() => {
    previewRef.current?.updateHero(gender, currentClass.id, showcaseEquipped(currentClass.id));
  }, [gender, currentClass.id]);

  return (
    <div className="relative w-full h-full bg-[#09080c] flex flex-col p-2.5 sm:p-3 overflow-hidden">
      <div className="flex items-center justify-between px-2 pb-1.5 border-b border-[#c4984a]/30 shrink-0">
        <div className="min-w-0">
          <h2 className="font-display text-sm sm:text-xl font-bold tartaros-gold-text truncate">
            {currentClass.persianName} · {currentClass.name}
          </h2>
          <p className="text-[11px] text-[#c7b99e] truncate">{currentClass.description}</p>
        </div>
        <div className="text-xs font-mono-num text-[#fde68a] shrink-0">
          {index + 1}/{CLASSES.length} · {gender === 'male' ? 'مرد' : 'زن'}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-2.5 py-2 overflow-hidden min-h-0">
        {/* Left: All 6 Class Skills */}
        <div className="col-span-4 tartaros-panel rounded-xl p-2 overflow-y-auto custom-scrollbar">
          <h3 className="font-display text-[11px] sm:text-xs font-bold text-[#e0a943] mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>مهارت‌های {currentClass.persianName}</span>
          </h3>
          <div className="space-y-1">
            {currentClass.skills.map((sk) => (
              <div
                key={sk.id}
                className="p-1.5 rounded-lg bg-[#15131a] border border-white/10 flex flex-col gap-0.5"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-[#fde68a] truncate">
                    {sk.persianName}
                  </span>
                  <span className="font-mono-num text-[9px] px-1 py-0.5 rounded bg-black/60 text-[#7dd3fc] shrink-0">
                    Lv.{sk.unlockLevel}
                  </span>
                </div>
                <p className="text-[10px] text-[#c7b99e] leading-tight">{sk.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Center: 3D Rotatable Hero */}
        <div className="col-span-5 relative rounded-xl border border-[#c4984a]/40 bg-[#0d0c10] overflow-hidden">
          <div ref={mountRef} className="w-full h-full" />
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] text-[#d6cfc2]/80 bg-black/70 px-2.5 py-0.5 rounded pointer-events-none whitespace-nowrap">
            کاراکتر را بچرخانید
          </div>
        </div>

        {/* Right: Starting Stats */}
        <div className="col-span-3 tartaros-panel rounded-xl p-2.5 flex flex-col justify-between overflow-y-auto custom-scrollbar">
          <div>
            <h3 className="font-display text-[11px] sm:text-xs font-bold text-[#e0a943] mb-2">
              آمار اولیه
            </h3>
            <div className="space-y-2 text-[11px]">
              {[
                { label: 'HP', val: currentClass.baseHp, bar: currentClass.baseHp / 280, color: 'bg-red-500' },
                { label: 'MP', val: currentClass.baseMp, bar: currentClass.baseMp / 170, color: 'bg-sky-500' },
                { label: 'ATK', val: currentClass.baseAtk, bar: currentClass.baseAtk / 26, color: 'bg-amber-500' },
                { label: 'DEF', val: currentClass.baseDef, bar: currentClass.baseDef / 20, color: 'bg-slate-400' },
                { label: 'SPD', val: currentClass.baseSpd, bar: currentClass.baseSpd / 16, color: 'bg-emerald-500' },
              ].map((st) => (
                <div key={st.label} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#c7b99e]">{st.label}</span>
                    <span className="font-mono-num font-bold text-[#fde68a]">{st.val}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/70 overflow-hidden">
                    <div
                      className={`h-full ${st.color}`}
                      style={{ width: `${Math.min(100, st.bar * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-[#a89f91] pt-1.5 border-t border-white/10 leading-snug">
            اسپان اولیه بدون تجهیزات پوشیدنی در شهر آستاروت
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-center gap-3 pt-0.5 shrink-0">
        {index > 0 && (
          <button
            onClick={() => setIndex((i) => i - 1)}
            className="px-5 py-1.5 rounded-lg border border-[#c4984a]/60 bg-[#17141c] text-[#f3ead8] font-bold text-xs sm:text-sm flex items-center gap-1 hover:bg-white/10 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>قبلی</span>
          </button>
        )}

        <button
          onClick={() => setConfirmOpen(true)}
          className="px-8 py-1.5 rounded-lg bg-gradient-to-b from-[#22c55e] to-[#15803d] text-white font-bold text-xs sm:text-sm shadow-lg hover:brightness-110 cursor-pointer"
        >
          انتخاب {currentClass.persianName}
        </button>

        {index < CLASSES.length - 1 && (
          <button
            onClick={() => setIndex((i) => i + 1)}
            className="px-5 py-1.5 rounded-lg border border-[#c4984a]/60 bg-[#17141c] text-[#f3ead8] font-bold text-xs sm:text-sm flex items-center gap-1 hover:bg-white/10 cursor-pointer"
          >
            <span>بعدی</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="tartaros-panel max-w-sm w-full rounded-xl p-5 text-center space-y-4">
            <h3 className="font-display text-lg font-bold text-[#fde68a]">تایید انتخاب کلاس</h3>
            <p className="text-sm text-[#ece3d3]">
              آیا از انتخاب کلاس <strong className="text-[#fbbf24]">{currentClass.persianName}</strong> مطمئن هستید؟
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2 rounded-lg bg-white/10 border border-white/15 text-[#d6cfc2] font-bold text-sm cursor-pointer"
              >
                خیر
              </button>
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  soundEngine.startBgm();
                  onConfirmClass(currentClass.id);
                }}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm cursor-pointer"
              >
                بله
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
