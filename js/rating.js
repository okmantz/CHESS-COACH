// Elo rating vs. the 10 computer levels, with fast-moving provisional ratings at the start.
export const START_RATING = 600;
export const PROVISIONAL_GAMES = 10;

export function kFactor(games) {
  if (games < 5) return 64;
  if (games < PROVISIONAL_GAMES) return 48;
  if (games < 25) return 32;
  if (games < 60) return 24;
  return 16;
}

export const expectedScore = (r, opp) => 1 / (1 + Math.pow(10, (opp - r) / 400));

/** score: 1 win, 0.5 draw, 0 loss. */
export function updateRating(r, gamesPlayed, oppElo, score) {
  const k = kFactor(gamesPlayed);
  const e = expectedScore(r, oppElo);
  const next = Math.max(100, r + k * (score - e));
  return { rating: next, delta: next - r, expected: e, k };
}

// Rank titles line up with the ten opponents on the 600 -> 2600 ladder.
export const RANKS = [
  { min: 0, name: 'Newcomer', color: '#9aa0a6' },
  { min: 600, name: 'Beginner', color: '#34d399' },
  { min: 800, name: 'Novice', color: '#38bdf8' },
  { min: 1000, name: 'Amateur', color: '#818cf8' },
  { min: 1200, name: 'Casual', color: '#f87171' },
  { min: 1400, name: 'Intermediate', color: '#c084fc' },
  { min: 1600, name: 'Advanced', color: '#60a5fa' },
  { min: 1800, name: 'Expert', color: '#fbbf24' },
  { min: 2000, name: 'Master', color: '#4ade80' },
  { min: 2200, name: 'Candidate Master', color: '#cbd5e1' },
  { min: 2600, name: 'Grandmaster', color: '#f5c451' },
];

export function rankOf(r) {
  let cur = RANKS[0];
  for (const x of RANKS) if (r >= x.min) cur = x;
  const i = RANKS.indexOf(cur);
  const next = RANKS[i + 1] || null;
  return { ...cur, next, progress: next ? (r - cur.min) / (next.min - cur.min) : 1 };
}
