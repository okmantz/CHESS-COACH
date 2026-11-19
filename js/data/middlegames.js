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
  {
    id: 'catalan-diagonal', name: 'Catalan: Neutralise the Long Diagonal', icon: '📐', level: 'Advanced', side: 'b', moves: 10,
    fen: 'rn1q1rk1/1bp1bppp/p3pn2/1p6/3P4/5NP1/PPQBPPBP/RN3RK1 b - - 3 10',
    summary: 'White\'s bishop on g2 presses along the long diagonal. Black has an extra queenside pawn and must stay solid.',
    plan: ['Trade or block the g2 bishop with ...Be4 or ...c5 at the right moment.', 'Use the queenside majority carefully; do not overextend with ...b4.', 'Develop the knight to d7 and complete with ...Rc8.', 'Watch for tactics on the long diagonal and the e5/c6 squares.'],
  },
  {
    id: 'nimzo-centre', name: 'Nimzo: The Central Tension', icon: '🎯', level: 'Advanced', side: 'w', moves: 10,
    fen: 'r1b2rk1/ppq2ppp/2n2n2/2p1p3/3P4/P1PBPN2/5PPP/R1BQ1RK1 w - - 0 12',
    summary: 'Both sides have central pawns and White has doubled c-pawns. The fight revolves around d4/e5 and piece activity.',
    plan: ['Resolve the tension at the right moment (dxe5 or dxc5) to open lines for the bishops.', 'Use the Bd3 and the queen toward the black king; Ne5 is a key square.', 'Do not allow ...e4 to chase the knight and cramp you.', 'Improve the worst piece first (usually the c1 bishop).'],
  },
  {
    id: 'dragon-race', name: 'Dragon: Race of the Castles', icon: '🐉', level: 'Advanced', side: 'w', moves: 10,
    fen: '2rq1rk1/pp1bppb1/3p1np1/4n2p/3NP2P/1BN1BP2/PPPQ2P1/2KR3R w - - 0 13',
    summary: 'Opposite-side castling: both kings are under fire. Speed and accuracy decide.',
    plan: ['Keep your king safe (b1/a2) while you attack with g4 and h-file ideas.', 'Calculate every sacrifice: the dragon bishop on g7 is dangerous.', 'Trade the black knight on e5 or the dark-squared bishop if you can.', 'Use forcing moves; do not give Black time to open the c-file.'],
  },
  {
    id: 'gruenfeld-centre', name: 'Grünfeld: Pressure on the Centre', icon: '🔥', level: 'Advanced', side: 'w', moves: 10,
    fen: 'rn3rk1/pp2ppbp/6p1/8/3PP1b1/5N2/q2BBPPP/1R1Q1RK1 w - - 2 13',
    summary: 'White has a big centre but Black\'s pieces are active and the b-pawn is a target. Accurate piece play wins.',
    plan: ['Use the bishop on d2 and the rook on b1 to attack the queen and the b-file.', 'Keep the centre protected; do not drop the d4 pawn.', 'Trade pieces to make the centre an asset.', 'Look for the e5 push when it comes with tempo.'],
  },
  {
    id: 'petroff-initiative', name: 'Petroff: Keep the Initiative', icon: '🧊', level: 'Intermediate', side: 'w', moves: 10,
    fen: 'r2q1rk1/ppp1bppp/8/3p1b2/1nPPn3/2N2N2/PP2BPPP/R1BQ1RK1 w - - 5 11',
    summary: 'A symmetrical Petroff where Black\'s knights are active. Keep an eye on the b4 knight and c2.',
    plan: ['Protect c2 and prepare a3 to kick the knight.', 'Exchange the active black pieces when you can do so without weakening your structure.', 'Use the d-file and the central pawns to claim an edge.', 'Do not rush the c-pawn: keep the position stable.'],
  },
  {
    id: 'english-reversed', name: 'English: Reversed Sicilian', icon: '🇬🇧', level: 'Intermediate', side: 'b', moves: 10,
    fen: 'r1bq1rk1/ppp1bppp/1nn5/4p3/8/P1NP1NP1/1P2PPBP/R1BQ1RK1 b - - 0 9',
    summary: 'White has an extra tempo in a Reversed Sicilian. Black must find an active plan quickly.',
    plan: ['Develop the bishop with ...Be6 and plan ...f5 or ...d5.', 'Use the space on the queenside: ...a5 and ...a4 are good tempo moves.', 'Watch the long diagonal and the d5 square.', 'Keep the pieces coordinated; avoid weaknesses on d5.'],
  },
];
export const middlegameById = (id) => MIDDLEGAMES.find((x) => x.id === id);
