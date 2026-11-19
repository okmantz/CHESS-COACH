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

export const RANKS = [
  { min: 0, name: 'Novice', color: '#9aa0a6' },
  { min: 600, name: 'Beginner', color: '#8bc34a' },
  { min: 900, name: 'Casual', color: '#4fc3f7' },
  { min: 1200, name: 'Intermediate', color: '#7e9cf5' },
  { min: 1500, name: 'Club Player', color: '#b388ff' },
  { min: 1800, name: 'Advanced', color: '#ffb74d' },
  { min: 2100, name: 'Expert', color: '#ff8a65' },
  { min: 2400, name: 'Master', color: '#f06292' },
];

export function rankOf(r) {
  let cur = RANKS[0];
  for (const x of RANKS) if (r >= x.min) cur = x;
  const i = RANKS.indexOf(cur);
  const next = RANKS[i + 1] || null;
  return { ...cur, next, progress: next ? (r - cur.min) / (next.min - cur.min) : 1 };
}
