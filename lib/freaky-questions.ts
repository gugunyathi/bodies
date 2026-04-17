export type FreakyQuestion = {
  id: string;
  question: string;
  emoji: string;
  bgGradient: string;
  points: number;
  category: 'basic' | 'spicy' | 'wild' | 'unhinged';
};

export const FREAKY_QUESTIONS: FreakyQuestion[] = [
  {
    id: 'q_dome',
    question: 'Have you ever given or received dome? 👅',
    emoji: '💦',
    bgGradient: 'from-purple-900 via-pink-900 to-red-900',
    points: 5,
    category: 'basic',
  },
  {
    id: 'q_threesome',
    question: 'Have you ever had a threesome? 🔱',
    emoji: '👥',
    bgGradient: 'from-red-900 via-orange-900 to-yellow-900',
    points: 10,
    category: 'spicy',
  },
  {
    id: 'q_rimming',
    question: 'Have you ever done rimming? 🌀',
    emoji: '🍑',
    bgGradient: 'from-pink-900 via-rose-900 to-red-900',
    points: 10,
    category: 'wild',
  },
  {
    id: 'q_ate_booty',
    question: 'Have you ever ate booty? 🍑',
    emoji: '😋',
    bgGradient: 'from-orange-900 via-red-900 to-pink-900',
    points: 10,
    category: 'wild',
  },
  {
    id: 'q_public_sex',
    question: 'Have you ever had sex in public? 🌍',
    emoji: '🚨',
    bgGradient: 'from-green-900 via-teal-900 to-cyan-900',
    points: 8,
    category: 'spicy',
  },
  {
    id: 'q_nudes',
    question: 'Have you ever sent nudes? 📸',
    emoji: '😏',
    bgGradient: 'from-indigo-900 via-purple-900 to-pink-900',
    points: 5,
    category: 'basic',
  },
  {
    id: 'q_ons',
    question: 'Have you ever had a one night stand? 🌙',
    emoji: '🎲',
    bgGradient: 'from-blue-900 via-indigo-900 to-purple-900',
    points: 6,
    category: 'basic',
  },
  {
    id: 'q_first_date',
    question: 'Have you ever done it on the first date? 🍷',
    emoji: '🤭',
    bgGradient: 'from-rose-900 via-pink-900 to-fuchsia-900',
    points: 5,
    category: 'basic',
  },
  {
    id: 'q_role_play',
    question: 'Have you ever role played in the bedroom? 🎭',
    emoji: '🎪',
    bgGradient: 'from-violet-900 via-purple-900 to-indigo-900',
    points: 6,
    category: 'spicy',
  },
  {
    id: 'q_toys',
    question: 'Have you ever used toys on yourself or a partner? 🎮',
    emoji: '🔋',
    bgGradient: 'from-teal-900 via-cyan-900 to-blue-900',
    points: 6,
    category: 'spicy',
  },
  {
    id: 'q_car_sex',
    question: 'Have you ever done it in a car? 🚗',
    emoji: '🔑',
    bgGradient: 'from-gray-900 via-zinc-900 to-slate-900',
    points: 7,
    category: 'spicy',
  },
  {
    id: 'q_same_week',
    question: 'Have you ever been with 2+ different people in the same week? 📅',
    emoji: '🗓️',
    bgGradient: 'from-amber-900 via-orange-900 to-red-900',
    points: 8,
    category: 'wild',
  },
  {
    id: 'q_plane',
    question: 'Have you ever joined the Mile High Club? ✈️',
    emoji: '🛫',
    bgGradient: 'from-sky-900 via-blue-900 to-indigo-900',
    points: 10,
    category: 'wild',
  },
  {
    id: 'q_filmed',
    question: 'Have you ever filmed yourself in the act? 🎬',
    emoji: '📹',
    bgGradient: 'from-red-900 via-rose-900 to-pink-900',
    points: 10,
    category: 'unhinged',
  },
  {
    id: 'q_stranger',
    question: 'Have you ever done it with a complete stranger? 🎲',
    emoji: '🕵️',
    bgGradient: 'from-emerald-900 via-green-900 to-teal-900',
    points: 8,
    category: 'wild',
  },
];

export const MAX_FREAKY_SCORE = FREAKY_QUESTIONS.reduce((sum, q) => sum + q.points, 0);

export type SpiritCelebrity = {
  name: string;
  title: string;
  description: string;
  emoji: string;
  image?: string;
  tier: 'vanilla' | 'curious' | 'adventurous' | 'spicy' | 'wild' | 'unhinged';
  color: string;
};

export const SPIRIT_CELEBRITIES: SpiritCelebrity[] = [
  {
    name: 'Taylor Swift',
    title: 'Pure Vanilla 🍦',
    description: 'Wholesome, innocent, probably has a strict no-shoes policy in the bedroom.',
    emoji: '🤍',
    tier: 'vanilla',
    color: 'from-blue-400 to-cyan-400',
  },
  {
    name: 'Selena Gomez',
    title: 'Secretly Curious 🌹',
    description: 'Looks innocent but there\'s definitely some curiosity happening behind closed doors.',
    emoji: '😇',
    tier: 'curious',
    color: 'from-pink-400 to-rose-400',
  },
  {
    name: 'Ariana Grande',
    title: 'Deceptively Wild 🐱',
    description: 'All smiles in public, absolutely unhinged when no one\'s watching. Respect.',
    emoji: '😈',
    tier: 'adventurous',
    color: 'from-purple-400 to-pink-400',
  },
  {
    name: 'Cardi B',
    title: 'Spicy & Unbothered 💅',
    description: 'OKURRR! You\'re out here living your best freaky life and zero apologies given.',
    emoji: '💅',
    tier: 'spicy',
    color: 'from-orange-400 to-red-400',
  },
  {
    name: 'Nicki Minaj',
    title: 'Anaconda Energy 🐍',
    description: 'Your body count and your energy both go hard. The bedroom is your throne room.',
    emoji: '👑',
    tier: 'wild',
    color: 'from-yellow-400 to-orange-400',
  },
  {
    name: 'Megan Thee Stallion',
    title: 'Hot Girl Always 🔥',
    description: 'It\'s Hot Girl Summer every single day. You are the vibe. The vibe is you.',
    emoji: '🐴',
    tier: 'wild',
    color: 'from-red-400 to-pink-500',
  },
  {
    name: 'Amber Rose',
    title: 'Fully Unfiltered 🌹',
    description: 'Zero filters, zero shame, maximum energy. You\'ve done it all and have receipts.',
    emoji: '💦',
    tier: 'unhinged',
    color: 'from-pink-500 to-purple-600',
  },
];

export function getSpiritCelebrity(score: number, maxScore: number): SpiritCelebrity {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct < 10) return SPIRIT_CELEBRITIES[0];
  if (pct < 25) return SPIRIT_CELEBRITIES[1];
  if (pct < 40) return SPIRIT_CELEBRITIES[2];
  if (pct < 55) return SPIRIT_CELEBRITIES[3];
  if (pct < 70) return SPIRIT_CELEBRITIES[4];
  if (pct < 85) return SPIRIT_CELEBRITIES[5];
  return SPIRIT_CELEBRITIES[6];
}

export function getFreakyTierLabel(score: number, maxScore: number): { label: string; emoji: string; color: string } {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct < 10) return { label: 'Vanilla', emoji: '🍦', color: 'text-blue-400' };
  if (pct < 25) return { label: 'Curious', emoji: '🌹', color: 'text-pink-400' };
  if (pct < 40) return { label: 'Adventurous', emoji: '😈', color: 'text-purple-400' };
  if (pct < 55) return { label: 'Spicy', emoji: '🌶️', color: 'text-orange-400' };
  if (pct < 70) return { label: 'Wild', emoji: '🔥', color: 'text-red-400' };
  if (pct < 85) return { label: 'Unhinged', emoji: '💦', color: 'text-rose-500' };
  return { label: 'FREAKY AF', emoji: '🫦', color: 'text-pink-600' };
}
