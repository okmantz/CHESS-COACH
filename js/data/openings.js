// Opening courses. Each line is written as SAN with optional {coach comment} after a move.
// Lines are merged into a tree: at the learner's side there is exactly ONE repertoire move per position,
// at the opponent's side every different reply becomes a variation the learner drills.
// (The test suite validates legality and the one-move-per-position rule.)

import { MORE_OPENINGS } from './openings2.js';

const BASE_OPENINGS = [
  {
    id: 'principles', name: 'Opening Principles', side: 'w', level: 'Start here', icon: '🧭',
    tagline: 'The ideas behind every good opening, shown in a model game.',
    ideas: ['Fight for the center with pawns (e4/d4) and pieces.', 'Develop knights and bishops quickly — each move should bring a new piece into play.', 'Castle early: the king is safer and your rook joins the game.', 'Do not move the same piece twice or bring the queen out early without a reason.', 'Connect your rooks and activate them on central files.'],
    lines: [
      { name: 'Model game: classical development', moves: 'e4{Principle 1 — control the center. This pawn also opens lines for the queen and the f1 bishop.} e5 Nf3{Principle 2 — develop with a threat. The knight attacks e5 and heads toward the center.} Nc6 Bc4{The bishop eyes f7, the weakest square near the black king, and prepares castling.} Bc5 c3{Prepare d4 to build a big pawn center.} Nf6 d3{A calm, solid choice that supports e4 and frees the c1 bishop.} d6 O-O{Principle 3 — castle. The king is safe and the rook is brought toward the center.} O-O Re1{Principle 4 — connect and activate the rooks. This one defends e4.} a6 Nbd2{Bring the last minor piece into the game before starting a plan.} Ba7 Nf1{Reroute the knight toward g3 where it supports a kingside plan.}' },
      { name: 'If Black develops the other knight first', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6{Black counterattacks e4. Develop rather than panic.} d3{Solid: e4 is protected and your pieces stay flexible.} Bc5 c3 d6 O-O O-O Re1' },
      { name: 'If Black plays ...d6 (Philidor setup)', moves: 'e4 e5 Nf3 d6{Black defends e5 passively. You keep the space advantage.} d4{Strike in the center before Black is ready.} Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O' },
    ],
  },
  {
    id: 'italian', name: 'Italian Game', side: 'w', level: 'Beginner', icon: '🏛️',
    tagline: 'Natural development, a clear plan and tricky traps for the opponent.',
    ideas: ['Place the bishop on c4 aiming at f7.', 'Build the pawn center with c3 and d3 (or d4 when it is safe).', 'Castle kingside and bring the rook to e1.', 'Re-route the knight via d2–f1–g3 and play on the kingside.'],
    lines: [
      { name: 'Giuoco Pianissimo — main line', moves: 'e4{Claim the center and open lines for the queen and bishop.} e5 Nf3{Develop with tempo: e5 is attacked.} Nc6 Bc4{The bishop eyes f7, Black\'s weakest point at this stage.} Bc5 c3{Prepares d4 to build a classical pawn center.} Nf6 d3{The quiet Italian: a solid center, a free c1 bishop and no early tension.} d6 O-O{Castle early: your king is safe and the rook joins the game.} O-O Re1{Supports e4 and prepares the plan with Nbd2–f1.} a6 Bb3{Keeps the bishop on the a2–g8 diagonal, away from ...b5 hits.} Ba7 h3{Stops ...Bg4 pinning the knight and gives the bishop on c1 a retreat.} h6 Nbd2{Develop the last knight, heading to f1 and g3.}' },
      { name: 'Black delays ...Nf6 with ...a6', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 a6 O-O d6 Bb3 Ba7 Re1 O-O Nbd2' },
      { name: 'Black plays ...d6 before ...Nf6', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 d6{Black develops modestly.} d3{Same plan: solid center, then castle.} Nf6 O-O O-O Re1' },
      { name: 'Two Knights Defense — the Knight Attack', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5{The Knight Attack: you threaten Nxf7 and put immediate pressure on Black.} d5{The only good reply — Black counters in the center.} exd5 Na5{The main line: Black kicks the bishop and gives back the pawn later.} Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6 d4 exd3 Nxd3' },
      { name: 'Trap: the Fried Liver Attack', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5{Black takes with the knight — greedy and dangerous.} Nxf7{The Fried Liver! You give a knight to drag the king into the open.} Kxf7 Qf3+{Check with a double attack on f7 and the knight on d5.} Ke6{The king has to run to e6; Kg8 loses a piece to Bxd5+.} Nc3{Pile onto d5 and bring a piece into the game.} Ncb4 Qe4 c6 a3 Na6 d4' },
    ],
  },
  {
    id: 'ruy-lopez', name: 'Ruy Lopez', side: 'w', level: 'Intermediate', icon: '🎯',
    tagline: 'The classic: slow pressure on the e5 pawn with long-term pluses.',
    ideas: ['Pin down the c6 knight to undermine the defense of e5.', 'Keep the bishop with Ba4 — retreat instead of trading.', 'Build a center with c3 and d4 once your pieces are ready.', 'In the Berlin, aim for a simple structure endgame with a healthy extra pawn island.'],
    lines: [
      { name: 'Closed Ruy Lopez', moves: 'e4 e5 Nf3 Nc6 Bb5{The Ruy Lopez: you attack the knight that defends e5.} a6 Ba4{Retreat — keep the bishop pair potential and the pressure on c6.} Nf6 O-O{Castle first. If ...Nxe4 White has the Re1 trick and d4.} Be7 Re1{Defends e4 so the knight can no longer capture it.} b5 Bb3 d6 c3{Makes room for the bishop and prepares d4.} O-O h3{A key waiting move preventing ...Bg4. This is the heart of the Closed Ruy.} Na5 Bc2 c5 d4 Qc7 Nbd2' },
      { name: 'Berlin Defense', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4{Strike in the center, the knight on e4 is a bit loose.} Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8' },
      { name: 'Open Ruy Lopez', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4{Black grabs the pawn; White gets a lead in development.} d4 b5 Bb3 d5 dxe5 Be6 c3 Bc5 Nbd2 O-O Bc2 Bf5' },
      { name: 'Schliemann Defense', moves: 'e4 e5 Nf3 Nc6 Bb5 f5{The sharp Schliemann: Black counterattacks at once.} Nc3 fxe4 Nxe4 d5 Nxe5 dxe4 Nxc6 Qg5 Qe2 Nf6' },
    ],
  },
  {
    id: 'london', name: 'London System', side: 'w', level: 'Beginner', icon: '🏙️',
    tagline: 'A solid system that works against almost anything with the same setup.',
    ideas: ['Develop the bishop to f4 BEFORE playing e3.', 'Pawns on d4, e3, c3; knights on f3 and d2 (or b3).', 'Retreat the bishop to g3 if Black attacks it with ...Bd6.', 'Aim for a later e4 break or a kingside attack.'],
    lines: [
      { name: 'Main line vs the ...d5 / ...Nf6 setup', moves: 'd4{Take space and open the c1 bishop.} d5 Nf3 Nf6 Bf4{The London bishop — out before e3 locks it in.} e6 e3{Solidly supports d4 and frees the f1 bishop.} Bd6 Bg3{Preserves the strong bishop; if ...Bxg3, hxg3 opens the h-file for your rook.} O-O Nbd2{Develop and prepare e4.} c5 c3{Solid support for d4.} Nc6 Bd3 b6 Qe2' },
      { name: 'Black plays ...c5 with ...Qb6', moves: 'd4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 c3 Qb6 Qb3 c4 Qxb6 axb6 Nbd2 Bf5' },
      { name: 'King\'s Indian setup', moves: 'd4 Nf6 Nf3 g6 Bf4 Bg7 e3 O-O h3{A useful move: the bishop gets a retreat square on h2.} d6 Be2 Nbd7 O-O' },
    ],
  },
  {
    id: 'queens-gambit', name: 'Queen\'s Gambit', side: 'w', level: 'Intermediate', icon: '♛',
    tagline: 'The most classical opening: fight for the center with the c-pawn.',
    ideas: ['Offer the c-pawn to deflect Black\'s d-pawn.', 'Pin the knight on f6 with Bg5 to increase pressure on d5.', 'Complete development with e3, Nf3 and Bd3 before any big decisions.', 'After ...dxc4 recapture quickly and use your central pawn majority.'],
    lines: [
      { name: 'Queen\'s Gambit Declined — Orthodox', moves: 'd4 d5 c4{The Queen\'s Gambit: you challenge the d5 pawn.} e6 Nc3 Nf6 Bg5{Pins the knight, adding pressure on d5.} Be7 e3 O-O Nf3 Nbd7 Rc1{Prepares to meet ...c6 and ...dxc4 comfortably.} c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3 Rxc3 e5' },
      { name: 'Queen\'s Gambit Accepted', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7' },
      { name: 'Slav Defense', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4{Stops ...b5 and holds on to the c4 pawn.} Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6 e4' },
    ],
  },
  {
    id: 'sicilian', name: 'Sicilian Defense (Najdorf)', side: 'b', level: 'Intermediate', icon: '🗡️',
    tagline: 'The fighting reply to 1.e4: unbalanced positions and real winning chances.',
    ideas: ['Trade the c-pawn for White\'s d-pawn to get a central majority.', 'Play ...d6, ...Nf6 and ...a6 to control b5 and prepare ...e5 or ...e6.', 'Castle kingside and counterattack on the queenside with ...b5.', 'Never leave the king in the center when the position opens.'],
    lines: [
      { name: 'Najdorf vs the English Attack (6.Be3)', moves: 'e4 c5{The Sicilian: you fight for the center from the side.} Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6{The Najdorf: stops Nb5 and Bb5 and prepares ...b5.} Be3 e5{Kick the knight away and take control of the center.} Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7 g4 b5' },
      { name: 'Najdorf vs 6.Bg5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6{The classical choice: solid and flexible.} f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 b5' },
      { name: 'Najdorf vs 6.Be2', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6' },
      { name: 'Alapin (2.c3)', moves: 'e4 c5 c3 Nf6{The best reply: hit e4 and force White to decide.} e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 Bc4 Nb6 Bb3 dxe5 Nxe5 Nxe5 dxe5 Qxd1+ Kxd1' },
      { name: 'Moscow Variation (3.Bb5+)', moves: 'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7 c4 Nc6 Nc3 Nf6 O-O g6 d4 cxd4 Nxd4 Bg7' },
    ],
  },
  {
    id: 'french', name: 'French Defense', side: 'b', level: 'Beginner', icon: '🥖',
    tagline: 'Rock-solid and counterpunching: attack White\'s pawn chain at its base.',
    ideas: ['Play ...e6 and ...d5 to challenge the center.', 'Attack the base of the chain with ...c5 and ...f6.', 'The c8 bishop is the "problem piece" — find a good plan for it.', 'Keep your king safe; counterplay on the queenside is your trump.'],
    lines: [
      { name: 'Advance Variation (3.e5)', moves: 'e4 e6 d4 d5 e5 c5{Attack the base of the pawn chain at d4.} c3 Nc6 Nf3 Qb6 a3 c4 Nbd2 Na5 Be2 Bd7' },
      { name: 'Winawer (3.Nc3 Bb4)', moves: 'e4 e6 d4 d5 Nc3 Bb4{The Winawer: a pin and an invitation to a sharp fight.} e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7 Qxg7 Rg8 Qxh7 cxd4 Ne2 Nbc6' },
      { name: 'Winawer: Exchange (4.exd5)', moves: 'e4 e6 d4 d5 Nc3 Bb4 exd5 exd5 Bd3 Nc6 Ne2 Nge7 O-O Bf5' },
      { name: 'Exchange Variation', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O Bg5 Bg4' },
      { name: 'Tarrasch Variation (3.Nd2)', moves: 'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2 cxd4 cxd4 f6' },
    ],
  },
  {
    id: 'caro-kann', name: 'Caro-Kann Defense', side: 'b', level: 'Beginner', icon: '🛡️',
    tagline: 'Very solid and strategic: a healthy pawn structure and a good light-squared bishop.',
    ideas: ['Play ...c6 and ...d5 to hit e4 without blocking the c8 bishop.', 'Develop the c8 bishop outside the pawn chain (...Bf5) before ...e6.', 'Trade a pair of pieces to ease the position, then use the sound structure.', 'Be ready to answer the Advance with ...Bf5 and ...e6.'],
    lines: [
      { name: 'Classical Variation', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5{The key idea: develop the bishop BEFORE locking it in with ...e6.} Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bd2 Ngf6 O-O-O Be7' },
      { name: 'Advance Variation', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 cxd4 Nxd4 Ne7' },
      { name: 'Exchange Variation', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6' },
      { name: 'Panov Attack', moves: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Bb4 cxd5 Nxd5 Bd2 Nc6 Bd3 O-O O-O Nf6' },
    ],
  },
  {
    id: 'scandinavian', name: 'Scandinavian Defense', side: 'b', level: 'Beginner', icon: '❄️',
    tagline: 'Challenge e4 immediately and keep things simple.',
    ideas: ['Capture the pawn back with the queen and then move her out of the way smartly.', 'Retreat the queen to a5 where it is safe from Nc3, and keep developing.', 'Play ...Nf6, ...c6, ...Bf5 and ...e6 to build a solid shell.', 'Do not be afraid of the early queen — just avoid wasting time with it.'],
    lines: [
      { name: 'Main line: 3.Nc3 Qa5', moves: 'e4 d5{Challenge the e4 pawn immediately.} exd5 Qxd5 Nc3 Qa5{The queen retreats to a safe square and pins down the c3 knight.} d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Qe2 Bb4' },
      { name: '3.Nf3 setup', moves: 'e4 d5 exd5 Qxd5 Nf3 Bg4 Be2 Nc6 O-O O-O-O' },
    ],
  },
  {
    id: 'qgd', name: 'Queen\'s Gambit Declined', side: 'b', level: 'Intermediate', icon: '🧱',
    tagline: 'Meet 1.d4 d5 2.c4 with a rock-solid, classical setup.',
    ideas: ['Support the d5 pawn with ...e6 and keep the center solid.', 'Develop with ...Nf6, ...Be7 and castle kingside early.', 'Free the c8 bishop with ...dxc4 and ...c5 or ...c6/...b6 at the right time.', 'Trade a pair of minor pieces to relieve the cramped position.'],
    lines: [
      { name: 'Orthodox Defense', moves: 'd4 d5 c4 e6{Declining the gambit: support d5 and keep a solid center.} Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3 Rxc3 e5' },
      { name: 'Exchange Variation', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 c6 Bd3 Nbd7 Qc2 O-O Nf3 Re8' },
      { name: 'London System setup', moves: 'd4 d5 Nf3 Nf6 Bf4 e6 e3 Bd6 Bg3 O-O Bd3 Bxg3 hxg3 c5' },
    ],
  },
  {
    id: 'kings-indian', name: 'King\'s Indian Defense', side: 'b', level: 'Advanced', icon: '🐘',
    tagline: 'Let White take the center, then strike it with ...e5 and attack the king.',
    ideas: ['Fianchetto the bishop and castle quickly.', 'Break with ...e5 (or ...c5) at the right moment.', 'Against closed centers, push ...f5 and attack the white king.', 'Be aware of White\'s queenside space — keep your own counterplay going.'],
    lines: [
      { name: 'Classical Variation', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 Be3 f5' },
      { name: 'Four Pawns Attack', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 c5 d5 e6 Be2 exd5 cxd5 Bg4' },
      { name: 'Fianchetto Variation', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nbd7 O-O e5 e4 c6 h3 Qb6' },
    ],
  },
];

export const OPENINGS = [...BASE_OPENINGS, ...MORE_OPENINGS];

/** Typical plans after finishing a line, keyed "courseId:lineIndex" (falls back to the course ideas). */
export const PLANS = {
  'principles:0': 'You now have a healthy center, both knights and a bishop developed, the king castled and a rook on the e-file. From here: improve your worst piece, keep the center protected, and look for a pawn break with d4 or f4 only when every piece is ready.',
  'italian:0': 'Typical plans: reroute the knight d2–f1–g3, play for d4 when it is tactically safe, and use the bishop on b3 to keep pressure on f7. Black\'s main counterplay is ...d5 or ...b5 — watch for those breaks.',
  'ruy-lopez:0': 'Typical plans: the Re1/Nf1–g3 maneuver, a timely d4 to open the center, or Nd2–f1 with kingside play. Keep the pressure on e5; do not hurry to take on c6.',
  'london:0': 'Typical plans: Ne5 to occupy the strong central outpost, queenside pawn expansion with c4 or an e4 break, and keep the bishop on the b1–h7 diagonal after Bd3.',
  'queens-gambit:0': 'Typical plans: a minority attack with b4–b5 against the c6 pawn, pressure on the c-file, or e4 to open the center once your pieces are ready.',
  'sicilian:0': 'Typical plans for Black: counterattack with ...b5 and ...Rc8, or break with ...d5 when White\'s king has gone queenside. Keep your king safe and watch for the Bxb5 sacrifices.',
  'french:0': 'Typical plans for Black: pressure the d4 pawn with ...Qb6 and ...c4, and later push ...f6 to break the chain. The bad bishop on c8 should be rerouted to b5 or a4.',
  'caro-kann:0': 'Typical plans for Black: finish development (...Ngf6, ...Be7, ...O-O), trade pieces and use the healthy pawn structure. Break with ...c5 to challenge the center.',
  'scandinavian:0': 'Typical plans for Black: finish development quickly, castle, and use the c-file and the light-squared bishop. Aim for ...c5 or ...e5 at the right moment.',
  'qgd:0': 'Typical plans for Black: exchange pieces, free the position with ...e5 or ...c5, and avoid long-term weaknesses. The position is solid and gives few chances for early tactics.',
  'kings-indian:0': 'Typical plans for Black: ...f5 and a kingside pawn storm when the center is locked, or ...c6 and ...exd4 when White plays d5 too early.',
};

/* ---------------------------------------------------------------- parsing + tree */

/** "e4{note} e5 Nf3" -> [{san, note}] */
export function parseLine(str) {
  const out = [];
  let i = 0;
  const n = str.length;
  while (i < n) {
    while (i < n && /\s/.test(str[i])) i++;
    if (i >= n) break;
    let j = i;
    while (j < n && !/\s/.test(str[j]) && str[j] !== '{') j++;
    const san = str.slice(i, j);
    i = j;
    let note = '';
    while (i < n && /\s/.test(str[i])) i++;
    if (str[i] === '{') { const k = str.indexOf('}', i); note = str.slice(i + 1, k).trim(); i = k + 1; }
    if (san) out.push({ san, note });
  }
  return out;
}

/** Build a merged move tree for a course. Node: {san, note, ply, children[], lineIds[]} */
export function buildTree(course) {
  const root = { san: null, note: '', ply: 0, children: [], lineIds: [], parent: null };
  course.lines.forEach((line, li) => {
    let node = root;
    root.lineIds.includes(li) || root.lineIds.push(li);
    parseLine(line.moves).forEach((mv, idx) => {
      let child = node.children.find((c) => c.san === mv.san);
      if (!child) { child = { san: mv.san, note: mv.note, ply: idx + 1, children: [], lineIds: [], parent: node }; node.children.push(child); }
      else if (!child.note && mv.note) child.note = mv.note;
      if (!child.lineIds.includes(li)) child.lineIds.push(li);
      node = child;
    });
  });
  return root;
}

/** The learner's moves are the plies where it is `side`'s turn: ply odd = white. */
export const isLearnerPly = (course, ply) => (ply % 2 === 1) === (course.side === 'w');

export function courseById(id) { return OPENINGS.find((c) => c.id === id); }
