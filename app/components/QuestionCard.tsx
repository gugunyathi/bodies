"use client";

import { useState, useRef, useEffect } from "react";
import { type FreakyQuestion } from "../../lib/freaky-questions";

type QuestionCardProps = {
  question: FreakyQuestion;
  onAnswer: (questionId: string, answer: boolean) => void;
  isActive: boolean;
  zIndex?: number;
  style?: React.CSSProperties;
};

export function QuestionCard({ question, onAnswer, isActive, zIndex = 1, style }: QuestionCardProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [animateDirection, setAnimateDirection] = useState<"left" | "right" | null>(null);
  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 80;

  const triggerAnswer = (answer: boolean) => {
    if (isAnimatingOut) return;
    setIsAnimatingOut(true);
    setAnimateDirection(answer ? "right" : "left");
    setTimeout(() => {
      onAnswer(question.id, answer);
    }, 350);
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isActive) return;
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isActive || !isDragging) return;
    const dx = e.touches[0].clientX - startXRef.current;
    setDragX(dx);
  };

  const handleTouchEnd = () => {
    if (!isActive || !isDragging) return;
    setIsDragging(false);
    if (dragX > SWIPE_THRESHOLD) {
      triggerAnswer(true);
    } else if (dragX < -SWIPE_THRESHOLD) {
      triggerAnswer(false);
    } else {
      setDragX(0);
    }
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isActive) return;
    startXRef.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isActive || !isDragging) return;
    const dx = e.clientX - startXRef.current;
    setDragX(dx);
  };

  const handleMouseUp = () => {
    if (!isActive || !isDragging) return;
    setIsDragging(false);
    if (dragX > SWIPE_THRESHOLD) {
      triggerAnswer(true);
    } else if (dragX < -SWIPE_THRESHOLD) {
      triggerAnswer(false);
    } else {
      setDragX(0);
    }
  };

  // Keyboard support
  useEffect(() => {
    if (!isActive) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") triggerAnswer(true);
      if (e.key === "ArrowLeft") triggerAnswer(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isActive, isAnimatingOut]);

  // Derived visual state
  const rotation = isAnimatingOut
    ? animateDirection === "right"
      ? 20
      : -20
    : dragX * 0.08;

  const translateX = isAnimatingOut
    ? animateDirection === "right"
      ? 600
      : -600
    : dragX;

  const opacity = isAnimatingOut ? 0 : 1;

  const showYes = dragX > 20 || (isAnimatingOut && animateDirection === "right");
  const showNo = dragX < -20 || (isAnimatingOut && animateDirection === "left");

  const yesOpacity = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 select-none cursor-grab active:cursor-grabbing"
      style={{
        transform: `translateX(${translateX}px) rotate(${rotation}deg)`,
        transition: isDragging ? "none" : "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.35s ease",
        opacity,
        zIndex,
        ...style,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Card body */}
      <div
        className={`relative w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br ${question.bgGradient} border border-white/10`}
      >
        {/* Neon glow effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {['💫', '✨', '⚡', '💥', '🌟'].map((star, i) => (
            <span
              key={i}
              className="absolute text-2xl animate-pulse opacity-20"
              style={{
                top: `${10 + i * 18}%`,
                left: `${5 + i * 19}%`,
                animationDelay: `${i * 0.4}s`,
              }}
            >
              {star}
            </span>
          ))}
        </div>

        {/* Freaky badge */}
        <div className="absolute top-4 left-4 z-10">
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm border border-pink-500/50 rounded-full px-3 py-1">
            <span className="text-pink-400 text-xs font-bold tracking-widest uppercase">Freaky Check</span>
            <span className="text-xs">🔞</span>
          </div>
        </div>

        {/* Category badge */}
        <div className="absolute top-4 right-4 z-10">
          <div
            className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wide
            ${question.category === 'basic' ? 'bg-blue-500/30 text-blue-300 border border-blue-500/40' : ''}
            ${question.category === 'spicy' ? 'bg-orange-500/30 text-orange-300 border border-orange-500/40' : ''}
            ${question.category === 'wild' ? 'bg-red-500/30 text-red-300 border border-red-500/40' : ''}
            ${question.category === 'unhinged' ? 'bg-pink-500/30 text-pink-300 border border-pink-500/40' : ''}
          `}
          >
            {question.category === 'basic' && '🌶️ Mild'}
            {question.category === 'spicy' && '🔥 Spicy'}
            {question.category === 'wild' && '🐆 Wild'}
            {question.category === 'unhinged' && '💀 Unhinged'}
          </div>
        </div>

        {/* Main emoji */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="text-[120px] leading-none select-none pointer-events-none"
            style={{ filter: 'drop-shadow(0 0 30px rgba(255,100,150,0.5))' }}
          >
            {question.emoji}
          </div>
        </div>

        {/* Question text */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <div className="bg-black/60 backdrop-blur-md rounded-2xl p-5 border border-white/10">
            <p className="text-white text-xl font-bold leading-tight text-center mb-4">
              {question.question}
            </p>

            {/* Swipe hint buttons */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => isActive && triggerAnswer(false)}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 rounded-xl py-3 transition-all active:scale-95"
              >
                <span className="text-2xl">👈</span>
                <span className="text-red-300 font-bold text-lg">NOPE</span>
              </button>

              <div className="text-white/30 text-xs text-center">
                <div>swipe</div>
              </div>

              <button
                onClick={() => isActive && triggerAnswer(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-green-500/20 hover:bg-green-500/40 border border-green-500/40 rounded-xl py-3 transition-all active:scale-95"
              >
                <span className="text-green-300 font-bold text-lg">YESSS</span>
                <span className="text-2xl">👉</span>
              </button>
            </div>
          </div>
        </div>

        {/* YES indicator overlay */}
        {showYes && (
          <div
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            style={{ opacity: yesOpacity }}
          >
            <div className="border-4 border-green-400 rounded-2xl px-8 py-4 rotate-[-15deg] bg-green-400/20 backdrop-blur-sm">
              <span className="text-green-300 text-5xl font-black tracking-wider drop-shadow-lg">YESSS 🎉</span>
            </div>
          </div>
        )}

        {/* NO indicator overlay */}
        {showNo && (
          <div
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            style={{ opacity: yesOpacity }}
          >
            <div className="border-4 border-red-400 rounded-2xl px-8 py-4 rotate-[15deg] bg-red-400/20 backdrop-blur-sm">
              <span className="text-red-300 text-5xl font-black tracking-wider drop-shadow-lg">NOPE 🙅</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
