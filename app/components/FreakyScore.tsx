"use client";

import { useState, useEffect } from "react";
import {
  getSpiritCelebrity,
  getFreakyTierLabel,
  MAX_FREAKY_SCORE,
  type SpiritCelebrity,
} from "../../lib/freaky-questions";

// ─── Floating Score Bubble ────────────────────────────────────────────────────

type FreakyScoreProps = {
  score: number;
  totalAnswered: number;
  totalQuestions: number;
  onShowResult: () => void;
};

export function FreakyScoreBubble({ score, totalAnswered, totalQuestions, onShowResult }: FreakyScoreProps) {
  const [pulse, setPulse] = useState(false);
  const [mounted, setMounted] = useState(false);
  const tier = getFreakyTierLabel(score, MAX_FREAKY_SCORE);
  const pct = Math.round((score / MAX_FREAKY_SCORE) * 100);

  useEffect(() => { setMounted(true); }, []);

  // Pulse animation on score change
  useEffect(() => {
    if (totalAnswered === 0) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 600);
    return () => clearTimeout(t);
  }, [score, totalAnswered]);

  if (!mounted || totalAnswered === 0) return null;

  return (
    <button
      onClick={onShowResult}
      className={`
        fixed top-[60px] left-3 z-30
        flex items-center gap-1.5
        bg-black/75 backdrop-blur-md border border-orange-500/40
        rounded-2xl pl-1.5 pr-3 py-1.5 shadow-lg
        transition-all duration-300 hover:scale-105 active:scale-95
        ${pulse ? "scale-110 border-orange-400 shadow-orange-400/50" : ""}
      `}
      style={{
        boxShadow: `0 0 16px rgba(249, 115, 22, ${0.25 + pct * 0.003})`,
      }}
      title="Freaky Score – tap to reveal"
    >
      {/* Animated flame */}
      <span
        className="text-xl leading-none animate-bounce"
        style={{ animationDuration: "1.4s", filter: "drop-shadow(0 0 6px #f97316)" }}
      >
        🔥
      </span>

      {/* Score */}
      <div className="flex flex-col items-start leading-none">
        <span className="text-[9px] text-orange-300 font-bold uppercase tracking-widest">
          Freaky
        </span>
        <span
          className={`text-lg font-black ${tier.color} tabular-nums`}
          style={{ textShadow: "0 0 8px currentColor", lineHeight: 1 }}
        >
          {score}
        </span>
      </div>

      {/* Tier emoji */}
      <span className="text-sm leading-none">{tier.emoji}</span>
    </button>
  );
}

// ─── Spirit Celebrity Result Modal ───────────────────────────────────────────

type SpiritCelebModalProps = {
  score: number;
  totalAnswered: number;
  answers: Record<string, boolean>;
  onClose: () => void;
  onSaveToProfile: (celebrity: SpiritCelebrity) => void;
};

const TIER_BG: Record<string, string> = {
  vanilla: "from-blue-950 via-indigo-950 to-slate-950",
  curious: "from-pink-950 via-rose-950 to-slate-950",
  adventurous: "from-purple-950 via-fuchsia-950 to-pink-950",
  spicy: "from-orange-950 via-red-950 to-pink-950",
  wild: "from-red-950 via-rose-950 to-orange-950",
  unhinged: "from-pink-950 via-purple-950 to-rose-950",
};

export function SpiritCelebModal({ score, totalAnswered, answers, onClose, onSaveToProfile }: SpiritCelebModalProps) {
  const [revealed, setRevealed] = useState(false);
  const spirit = getSpiritCelebrity(score, MAX_FREAKY_SCORE);
  const tier = getFreakyTierLabel(score, MAX_FREAKY_SCORE);
  const pct = Math.round((score / MAX_FREAKY_SCORE) * 100);
  const yesCount = Object.values(answers).filter(Boolean).length;

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br ${TIER_BG[spirit.tier] || "from-gray-950 to-black"}
          border border-white/10 transition-all duration-500
          ${revealed ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
        `}
      >
        {/* Header glow strip */}
        <div className={`h-1 w-full bg-gradient-to-r ${spirit.color}`} />

        <div className="p-6">
          {/* Close */}
          <button
            onClick={onClose}
            className="float-right text-white/40 hover:text-white/80 text-2xl leading-none -mt-1 -mr-1"
          >
            ×
          </button>

          {/* Title */}
          <div className="text-center mb-5">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Your Freaky Score is</p>
            <div className="flex items-center justify-center gap-2">
              <span className={`text-5xl font-black ${tier.color}`} style={{ textShadow: "0 0 20px currentColor" }}>
                {score}
              </span>
              <span className="text-3xl">{tier.emoji}</span>
            </div>
            <p className={`text-lg font-bold ${tier.color} mt-1`}>{tier.label}</p>

            {/* Bar */}
            <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${spirit.color} transition-all duration-1000`}
                style={{ width: revealed ? `${pct}%` : "0%" }}
              />
            </div>
            <p className="text-white/30 text-xs mt-1">
              {yesCount} YES · {totalAnswered - yesCount} NOPE out of {totalAnswered} answered
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/10 mb-5" />

          {/* Spirit celebrity */}
          <div className="text-center mb-5">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Your Spirit Celebrity is</p>

            {/* Celebrity avatar placeholder (emoji-based) */}
            <div
              className={`w-24 h-24 rounded-full mx-auto mb-3 flex items-center justify-center text-5xl
                bg-gradient-to-br ${spirit.color} shadow-2xl border-4 border-white/20`}
              style={{ boxShadow: `0 0 30px rgba(236,72,153,0.4)` }}
            >
              {spirit.emoji}
            </div>

            <h2 className={`text-2xl font-black ${tier.color} mb-1`}>{spirit.name}</h2>
            <p className="text-white/70 text-sm font-semibold mb-2">{spirit.title}</p>
            <p className="text-white/50 text-sm leading-relaxed px-2">{spirit.description}</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onSaveToProfile(spirit)}
              className={`w-full py-3 rounded-2xl font-bold text-white bg-gradient-to-r ${spirit.color}
                hover:opacity-90 active:scale-95 transition-all shadow-lg`}
            >
              ✨ Add to My Profile
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl font-bold text-white/60 bg-white/5 hover:bg-white/10
                border border-white/10 active:scale-95 transition-all"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Spirit Badge (shown on user's profile) ──────────────────────────

type SpiritBadgeProps = {
  celebrity: SpiritCelebrity;
  score: number;
  onRemove?: () => void;
};

export function SpiritBadge({ celebrity, score, onRemove }: SpiritBadgeProps) {
  const tier = getFreakyTierLabel(score, MAX_FREAKY_SCORE);

  return (
    <div
      className={`relative flex items-center gap-3 bg-gradient-to-r ${celebrity.color}/20
        border border-white/20 rounded-2xl p-3 backdrop-blur-sm`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-xl
          bg-gradient-to-br ${celebrity.color} flex-shrink-0`}
      >
        {celebrity.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/50 text-[10px] uppercase tracking-widest">Spirit Celebrity</p>
        <p className={`font-bold text-sm ${tier.color} truncate`}>{celebrity.name}</p>
        <p className="text-white/40 text-xs">{celebrity.title}</p>
      </div>
      <div className="flex flex-col items-end flex-shrink-0">
        <span className={`text-lg font-black ${tier.color} leading-none`}>{score}</span>
        <span className="text-white/30 text-[9px]">freaky pts</span>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-1 right-1 text-white/30 hover:text-white/70 text-xs leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
}
