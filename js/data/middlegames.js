// Middlegame scenarios: real structures from the opening courses. The learner plays `moves` moves
// against the engine with the coach scoring every move and explaining the plan.
export const MIDDLEGAMES = [
  {
    id: 'attack-king', name: 'Attack the King', icon: '🔥', level: 'Intermediate', side: 'w', moves: 10,
    fen: 'r1r3k1/ppq1ppbp/3pbnp1/8/3BP2P/2N2P2/PPPQ2P1/1K1R1B1R w - - 1 13',
    summary: 'A Yugoslav-style attack: opposite-side castling, so a pawn storm against the black king is on.',
    plan: ['Push the h-pawn (h5!) to open the h-file and create a hook.', 'Bring the rooks to the open files and the bishop to h6.', 'Keep your own king safe on b1 and watch Black\'s counterplay on the c-file.', 'Calculate every sacrifice; do not sacrifice without a concrete follow-up.'],
  },
  {
    id: 'defend-king', name: 'Defend Against an Attack', icon: '🛡️', level: 'Intermediate', side: 'b', moves: 10,
    fen: 'r1r3k1/ppq1ppbp/3pbnp1/8/3BP2P/2N2P2/PPPQ2P1/1K1R1B1R w - - 1 13',
    summary: 'The same position from Black\'s side: survive the pawn storm and counterattack.',
    plan: ['Trade off the most dangerous attackers (the bishop on d4, the knight on c3).', 'Keep the king\'s pawn shield intact; do not weaken g6/h7 unnecessarily.', 'Counterattack on the open c-file: your rooks are already there.', 'Look for tactical shots against the white king on b1.'],
  },
  {
    id: 'iqp', name: 'Isolated Queen\'s Pawn (with IQP)', icon: '♟️', level: 'Intermediate', side: 'b', moves: 10,
    fen: 'r1bq1rk1/pp2bppp/2n2n2/2pp4/3P4/2N2NP1/PP2PPBP/R1BQ1RK1 w - - 5 9',
    summary: 'A symmetrical Tarrasch structure where the d-pawn is isolated: activity versus weakness.',
    plan: ['Use your active pieces: knights on e4 and c6, bishops on the long diagonals.', 'Avoid trades; the isolated pawn becomes a weakness in the endgame.', 'Prepare the d5–d4 break when it opens lines for your pieces.', 'Keep the d5 pawn protected and avoid weakening squares in front of it.'],
  },
  {
    id: 'minority', name: 'The Minority Attack', icon: '⚔️', level: 'Advanced', side: 'w', moves: 10,
    fen: 'r1bqrnk1/pp2bppp/2p2n2/3p2B1/3P4/2NBP3/PPQ1NPPP/R4RK1 w - - 9 11',
    summary: 'A Carlsbad structure: attack the c6 pawn with your b-pawn to create a permanent weakness.',
    plan: ['Prepare b4–b5 to hit c6 and fix queenside weaknesses.', 'Or break in the center with f3 and e4 when Black is not ready.', 'Keep pieces coordinated: the bishop on d3 and the queen on c2 aim at the kingside.', 'Be patient: positional pressure builds slowly.'],
  },
  {
    id: 'outpost', name: 'A Knight on the Outpost', icon: '🏰', level: 'Intermediate', side: 'w', moves: 10,
    fen: 'r1bq1rk1/5ppp/p1np1b2/1p1Np3/4P3/N1P5/PP3PPP/R2QKB1R w KQ - 1 12',
    summary: 'A Sveshnikov-style structure: Black has a hole on d5 and a backward d-pawn; your knight loves it.',
    plan: ['Keep the knight on d5 as long as possible; trade it only for something valuable.', 'Reroute the other knight toward the center (Nc2–e3).', 'Pressure the d6 pawn and the b5 pawn together.', 'Do not rush the pawn break; improve your worst piece first.'],
  },
];
export const middlegameById = (id) => MIDDLEGAMES.find((x) => x.id === id);
