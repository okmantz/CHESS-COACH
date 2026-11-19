// The coach: turns engine numbers into explanations, mistake tags and training recommendations.
// It is rule-based (engine evals + tactic/positional detectors), not a language model, so every
// sentence is grounded in something that was actually found in the position.
import { Chess } from '../vendor/chess.js';
import { moveFeatures, playLine, VAL, NAMES, kingInfo, phaseOf, nonPawnMaterial, material, boardMap } from './themes.js';
import { fmtEval, povWin, CLASSES } from './evalmath.js';
import { moveInsight, narrateInsight, positionFacts, hangingPieces, threatsAgainst } from './insight.js';

/* ------------------------------------------------------------------ taxonomy */

export const TAGS = {
  'hung-piece': {
    label: 'Leaving pieces unprotected',
    consider: [
      'Before you move, ask: what did my opponent\'s last move attack or threaten?',
      'After choosing a move, check that every piece you own is defended or safe.',
      'Run a "blunder check": list your opponent\'s captures and checks in the resulting position.',
    ],
    tasks: [{ kind: 'puzzles', theme: 'hangingPiece', n: 6 }, { kind: 'mistakes', tag: 'hung-piece', n: 5 }],
  },
  'bad-sacrifice': {
    label: 'Unsound sacrifices',
    consider: [
      'Check whether the sacrifice is forced — does your opponent have to accept it?',
      'Calculate your opponent\'s best defensive response, not only the one you hope for.',
      'Count the material you give up and what you get back.',
      'Look for a concrete continuation (check, capture or direct threat) before sacrificing.',
    ],
    tasks: [{ kind: 'puzzles', theme: 'sacrifice', n: 5 }, { kind: 'lesson', track: 'middlegames', id: 'attack-king' }, { kind: 'mistakes', tag: 'bad-sacrifice', n: 4 }],
  },
  'missed-mate': {
    label: 'Missing checkmates',
    consider: [
      'Look at every check first — then every capture and every threat (checks, captures, threats).',
      'Count the enemy king\'s escape squares; boxed-in kings are mating targets.',
      'When the king looks trapped, calculate forcing lines all the way to the end.',
    ],
    tasks: [{ kind: 'puzzles', theme: 'mateIn2', n: 6 }, { kind: 'puzzles', theme: 'mateIn1', n: 6 }],
  },
  'allowed-mate': {
    label: 'Allowing checkmate',
    consider: [
      'Before each move, look at the opponent\'s checks — every one of them.',
      'Count your own king\'s escape squares and keep a flight square (luft) on the back rank.',
      'Don\'t move the pieces that guard your king unless it is concretely safe.',
    ],
    tasks: [{ kind: 'puzzles', theme: 'defensive', n: 6 }, { kind: 'puzzles', theme: 'backRank', n: 5 }, { kind: 'lesson', track: 'middlegames', id: 'defend-king' }],
  },
  'missed-fork': {
    label: 'Missing forks',
    consider: [
      'Scan for squares where a knight, pawn or queen would attack two targets at once.',
      'A check is the perfect fork partner — the king must answer and the second target falls.',
      'Ask which enemy pieces are undefended or lined up on knight-jump squares.',
    ],
    tasks: [{ kind: 'puzzles', theme: 'fork', n: 8 }],
  },
  'missed-pin': {
    label: 'Missing pins',
    consider: ['Look for enemy pieces that stand in front of a king or queen on a line.', 'Bishops and rooks create pins — check every open diagonal, file and rank.', 'A pinned piece can\'t defend properly: attack it again.'],
    tasks: [{ kind: 'puzzles', theme: 'pin', n: 8 }],
  },
  'missed-skewer': {
    label: 'Missing skewers',
    consider: ['A skewer attacks a valuable piece with a less valuable piece lined up behind it.', 'Look for checks along ranks, files and diagonals that win the piece behind the king.'],
    tasks: [{ kind: 'puzzles', theme: 'skewer', n: 6 }],
  },
  'missed-discovered': {
    label: 'Missing discovered attacks',
    consider: ['Look for your own pieces that block a bishop, rook or queen\'s line.', 'Moving the blocker with a threat of its own creates two attacks at once.', 'Discovered checks are especially powerful — the moved piece can capture freely.'],
    tasks: [{ kind: 'puzzles', theme: 'discovered', n: 6 }],
  },
  'missed-capture': {
    label: 'Missing free material',
    consider: ['Each move, scan every enemy piece: is it undefended or attacked by a cheaper piece?', 'Captures that win material beat quiet moves — check them first.'],
    tasks: [{ kind: 'puzzles', theme: 'hangingPiece', n: 8 }],
  },
  'allowed-tactic': {
    label: 'Allowing tactics',
    consider: ['Before you commit, look at what your move leaves behind — what became undefended?', 'Check the opponent\'s forcing replies: checks, captures, threats.', 'Don\'t just look at where your piece goes — look at what it stops guarding.'],
    tasks: [{ kind: 'puzzles', theme: 'defensive', n: 6 }, { kind: 'mistakes', tag: 'allowed-tactic', n: 5 }],
  },
  'king-safety': {
    label: 'King safety',
    consider: ['Pawns in front of the king are its shield; every pawn move there creates a permanent weakness.', 'Castle early, and keep pieces near the king while the queens are on.', 'Before attacking, ask whether your own king is safe.'],
    tasks: [{ kind: 'lesson', track: 'middlegames', id: 'defend-king' }, { kind: 'lesson', track: 'openings', id: 'principles' }, { kind: 'puzzles', theme: 'defensive', n: 5 }],
  },
  'opening-principles': {
    label: 'Opening principles',
    consider: ['Fight for the center with pawns and pieces.', 'Develop knights and bishops before moving anything twice.', 'Castle early and connect your rooks.', 'Don\'t bring the queen out early — it just becomes a target.'],
    tasks: [{ kind: 'lesson', track: 'openings', id: 'principles' }, { kind: 'lesson', track: 'openings', id: 'italian' }, { kind: 'mistakes', tag: 'opening-principles', n: 5 }],
  },
  'endgame-technique': {
    label: 'Endgame technique',
    consider: ['Activate your king — in the endgame it is a strong piece.', 'Count pawn races move by move and learn the opposition.', 'Rooks belong behind passed pawns and on open files.'],
    tasks: [{ kind: 'lesson', track: 'endgames', id: 'key-squares' }, { kind: 'lesson', track: 'endgames', id: 'lucena' }, { kind: 'lesson', track: 'endgames', id: 'philidor' }],
  },
  conversion: {
    label: 'Converting winning positions',
    consider: ['When you\'re ahead, trade pieces (not pawns) and reduce counterplay.', 'Ask what your opponent wants to do before you pick your plan.', 'Don\'t rush: avoid unnecessary complications while winning.'],
    tasks: [{ kind: 'lesson', track: 'endgames', id: 'convert-rook' }, { kind: 'lesson', track: 'endgames', id: 'lucena' }, { kind: 'mistakes', tag: 'conversion', n: 4 }],
  },
  defense: {
    label: 'Defending worse positions',
    consider: ['In bad positions, look for the most resilient move, not the most active one.', 'Trade your opponent\'s most dangerous attacker.', 'Set small problems: keep the position closed and keep your king safe.'],
    tasks: [{ kind: 'puzzles', theme: 'defensive', n: 8 }, { kind: 'lesson', track: 'endgames', id: 'philidor' }],
  },
  positional: {
    label: 'Positional judgement',
    consider: ['Improve your worst-placed piece.', 'Look for outposts, open files and weak squares before pushing pawns.', 'Compare candidate moves by asking what each one changes about piece activity.'],
    tasks: [{ kind: 'lesson', track: 'middlegames', id: 'outpost' }, { kind: 'lesson', track: 'middlegames', id: 'iqp' }, { kind: 'mistakes', tag: 'positional', n: 5 }],
  },
};

export const TAG_ORDER = Object.keys(TAGS);

/** One memorable sentence per mistake type, shown at the end of a coach note. */
export const PRINCIPLES = {
  'hung-piece': 'Loose pieces drop off: before every move, check that each of your pieces is protected or not attacked.',
  'bad-sacrifice': 'A sacrifice needs a forced follow-up. If you cannot calculate the continuation to the end, do not give the material.',
  'missed-mate': 'Checks, captures, threats — look at every check first, because a forced mate beats everything else.',
  'allowed-mate': 'Before you move, look at every check your opponent has in the new position, especially near your king.',
  'missed-fork': 'Look for squares where one piece attacks two targets. Knights and queens are the usual forkers.',
  'missed-pin': 'A pinned piece cannot defend. Attack it again and it falls.',
  'missed-skewer': 'Check along lines: a valuable piece forced to move exposes the one behind it.',
  'missed-discovered': 'Moving a blocker with a threat of its own creates two attacks at once.',
  'missed-capture': 'Free material first: scan the enemy pieces for ones that are loose or attacked by something cheaper.',
  'allowed-tactic': 'Ask what your move leaves behind: a piece that stops guarding something is often the real cost.',
  'king-safety': 'Pawns in front of the king are its shield. Every pawn move there is permanent.',
  'opening-principles': 'Control the centre, develop your pieces, castle, and connect your rooks — in that order of priority.',
  'endgame-technique': 'In the endgame the king is a fighting piece and every tempo counts.',
  conversion: 'When you are winning: trade pieces, avoid complications, and ask what your opponent wants before you act.',
  defense: 'When worse, look for the most resilient move, not the most ambitious one.',
  positional: 'Improve your worst piece, then look for the plan. Quiet moves decide most games.',
};

/** Human text for a training task. */
export function taskLabel(t) {
  const th = THEME_LABELS[t.theme] || t.theme;
  if (t.kind === 'puzzles') return `Solve ${t.n || 5} ${th} puzzles`;
  if (t.kind === 'mistakes') return `Replay ${t.n || 5} of your own ${TAGS[t.tag] ? TAGS[t.tag].label.toLowerCase() : ''} mistakes`;
  if (t.kind === 'lesson') return `Study: ${LESSON_TITLES[t.track + ':' + t.id] || t.id}`;
  return 'Practice';
}
export const THEME_LABELS = {
  fork: 'fork', pin: 'pin', skewer: 'skewer', discovered: 'discovered-attack', mateIn1: 'mate-in-1', mateIn2: 'mate-in-2', mateIn3: 'mate-in-3',
  backRank: 'back-rank', hangingPiece: 'win-the-piece', defensive: 'defensive', sacrifice: 'sacrifice', promotion: 'promotion', mate: 'checkmate',
};
// filled in lazily by the lesson data modules (id -> title) so recommendations can name them
export const LESSON_TITLES = {};

/* ------------------------------------------------------------------ helpers */

const opp = (c) => (c === 'w' ? 'b' : 'w');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pn = (t) => NAMES[t] || 'piece';
const art = (t) => (t === 'n' ? 'knight' : pn(t));

export function povEval(e, color) {
  if (!e) return { cp: 0 };
  if (e.mate != null) return { mate: color === 'w' ? e.mate : -e.mate };
  return { cp: color === 'w' ? e.cp : -e.cp };
}

export function sanOf(fen, uci) {
  try { const c = new Chess(fen); return c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch (e) { return uci; }
}

export function pvToSan(fen, ucis, n = 6) {
  const c = new Chess(fen);
  const out = [];
  for (const u of (ucis || []).slice(0, n)) {
    try {
      const turn = c.turn(); const no = +c.fen().split(' ')[5];
      const mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      out.push((turn === 'w' ? `${no}. ` : (out.length === 0 ? `${no}... ` : '')) + mv.san);
    } catch (e) { break; }
  }
  return out.join(' ');
}

/** Material swing (mover's perspective) once the opponent's PV has played out a few plies. */
function stableDelta(deltas) {
  if (!deltas.length) return 0;
  if (deltas.length >= 4) return deltas[3];
  if (deltas.length >= 2) return deltas[1];
  return deltas[0];
}

function targetsText(info) {
  if (!info.targets || !info.targets.length) return 'two pieces';
  return info.targets.map((t) => `${art(t.type)} on ${t.square}`).join(' and ');
}

/** Plain-English description of what a move does (used for best moves and for "why?"). */
export function describeMove(f, san) {
  if (!f) return '';
  const T = f.themes, I = f.info;
  if (T.includes('mate')) return T.includes('backRank') ? 'delivers back-rank checkmate' : T.includes('smothered') ? 'delivers a smothered mate' : 'delivers checkmate';
  if (T.includes('fork')) return `forks the ${targetsText(I)}${T.includes('check') ? ' with check' : ''}`;
  if (T.includes('skewer') && I.skewer) return `skewers the piece on ${I.skewer.front} against the one behind it on ${I.skewer.behind}`;
  if (T.includes('pin') && I.pin) return `pins the piece on ${I.pin.pinned} to the one behind it on ${I.pin.behind}`;
  if (T.includes('discoveredCheck')) return 'uncovers a discovered check';
  if (T.includes('discovered')) return `uncovers an attack on ${I.discovered.target}`;
  if (T.includes('freePiece')) return `wins a free ${pn(I.captured)}`;
  if (T.includes('winsExchange')) return `wins a ${pn(I.captured)} for a ${pn(I.piece)}`;
  if (T.includes('promotion')) return 'promotes the pawn';
  if (T.includes('castle')) return 'tucks the king to safety and brings a rook into play';
  if (T.includes('check') && T.includes('capture')) return `captures the ${pn(I.captured)} with check`;
  if (T.includes('check')) return 'gives check and keeps the initiative';
  if (T.includes('capture')) return `captures the ${pn(I.captured)}`;
  if (I.piece === 'n' || I.piece === 'b') return `develops the ${pn(I.piece)} to a more active square`;
  if (I.piece === 'p') return 'fights for space and the center';
  if (I.piece === 'r') return 'activates the rook';
  if (I.piece === 'k') return 'improves king activity';
  return 'improves the position of the queen';
}

function fmtPov(e) { return fmtEval(e); }

function lossPawns(m) {
  const pb = povEval(m.evalBefore, m.color), pa = povEval(m.evalAfter, m.color);
  if (pb.mate != null || pa.mate != null) return null;
  return (pa.cp - pb.cp) / 100;
}

function openingIssue(m, prevUcis = []) {
  const ch = new Chess(m.fenBefore);
  const piece = ch.get(m.uci.slice(0, 2));
  if (!piece) return null;
  const ply = m.ply;
  if (piece.type === 'q' && ply < 12) return 'Bringing the queen out this early lets your opponent develop with tempo by attacking it.';
  const lastMine = prevUcis.filter((_, i) => (i % 2) === (ply % 2));
  if ((piece.type === 'n' || piece.type === 'b' || piece.type === 'q') && lastMine.some((u) => u.slice(2, 4) === m.uci.slice(0, 2)) && ply < 18) return `You\'ve already moved this ${pn(piece.type)} — in the opening every move should develop a new piece.`;
  if (piece.type === 'p' && ('ah'.includes(m.uci[0])) && ply < 14) return 'Edge-pawn moves rarely help in the opening — development and the center matter more.';
  const ki = kingInfo(ch, m.color);
  if (ki && ki.central && ply >= 14 && !moveFeatures(m.fenBefore, m.uci).themes.includes('castle')) return 'Your king is still in the center — castling soon makes it safer and connects the rooks.';
  return 'The opening is about the center, development and king safety, and this move does little of the three.';
}

/* ------------------------------------------------------------------ main entry */

const SEVERITY = { inaccuracy: 'An inaccuracy — a small slip', mistake: 'A mistake — real ground given up', blunder: 'A blunder — a game-changing error' };

const pawnsText = (n) => `${Math.abs(n).toFixed(1)} pawn${Math.abs(n) === 1 ? '' : 's'}`;

/** One-line description of a best move, built from what it actually does. */
function describeBest(fen, uci, phase) {
  try {
    const ins = moveInsight(fen, uci);
    if (!ins) return { desc: '', sentences: [] };
    return { desc: describeMove(ins.feats, ins.san), sentences: narrateInsight(ins, { phase, max: 3 }), ins };
  } catch (e) { return { desc: '', sentences: [] }; }
}

/** Phase-appropriate reminder of what a position still needs. */
export function phaseAdvice(fen, color, phase) {
  try {
    const f = positionFacts(fen, color);
    if (phase === 'opening') {
      const todo = [];
      if (f.homeLeft > 0) todo.push(`develop the remaining ${f.homeLeft === 1 ? 'minor piece' : f.homeLeft + ' minor pieces'}`);
      if (!f.castled && f.kingCentral) todo.push('castle');
      if (!f.centerPawns.length) todo.push('claim a share of the centre');
      if (f.castled && !f.rooksConnected) todo.push('connect your rooks');
      return todo.length ? `Still on your opening to-do list: ${todo.join(', ')}.` : 'Your opening checklist is complete: centre, development, castling and connected rooks.';
    }
    if (phase === 'endgame') return 'Endgame reminder: activate the king, make a passed pawn, and keep your rooks active.';
    return f.openFiles.length ? `Look at the open ${f.openFiles.length > 1 ? 'files' : 'file'} (${f.openFiles.join(', ')}) — rooks belong there.` : 'Improve your worst-placed piece before you commit to a plan.';
  } catch (e) { return ''; }
}

/**
 * Explain a reviewed move. Returns {kind:'mistake'|'positive'|'good', title, headline, evalText, what, why, idea, consider, ...}
 * @param m  move record from buildReview()
 * @param ctx { feats?, prevUcis? }
 */
export function explainMove(m, ctx = {}) {
  if (['best', 'excellent', 'good', 'book'].includes(m.cls)) return explainGood(m, ctx);
  const color = m.color, enemy = opp(color);
  const moveLabel = `${m.moveNo}${color === 'w' ? '.' : '...'} ${m.san}`;
  const pb = povEval(m.evalBefore, color), pa = povEval(m.evalPlayed || m.evalAfter, color);
  const played = ctx.feats || moveFeatures(m.fenBefore, m.uci);
  const best = m.best ? moveFeatures(m.fenBefore, m.best) : null;
  const replyUci = (m.replyPv || [])[0];
  const reply = replyUci ? moveFeatures(m.fenAfter, replyUci) : null;
  const replySan = reply ? reply.san : null;
  const replyLine = playLine(m.fenAfter, m.replyPv || [], 6);
  const oppGain = stableDelta(replyLine.deltas);
  const bestLine = playLine(m.fenBefore, m.pv || [], 6);
  const bestGain = stableDelta(bestLine.deltas);
  const swing = lossPawns(m);
  const evalText = swing == null ? `${fmtPov(pb)} → ${fmtPov(pa)}` : `${swing > 0 ? '+' : '−'}${Math.abs(swing).toFixed(1)} pawns (${fmtPov(pb)} → ${fmtPov(pa)})`;
  const bestSan = m.bestSan || (m.best ? sanOf(m.fenBefore, m.best) : null);
  const bestInfo = m.best ? describeBest(m.fenBefore, m.best, m.phase) : { desc: '', sentences: [] };
  const bestDesc = bestInfo.desc;
  const bestLineSan = m.pv && m.pv.length ? pvToSan(m.fenBefore, m.pv, 6) : '';
  const replyLineSan = m.replyPv && m.replyPv.length ? pvToSan(m.fenAfter, m.replyPv, 5) : '';
  const tags = [];
  const themes = [];
  let what = '', consider = [], primary = null, label = null;
  const to = m.uci.slice(2, 4);
  const piece = played ? played.info.piece : 'p';

  const mateForMe = pb.mate != null && pb.mate > 0;
  const mateAgainstMe = pa.mate != null && pa.mate < 0;

  if (mateForMe && !(pa.mate != null && pa.mate > 0)) {
    primary = 'missed-mate'; themes.push('mate');
    what = `You had a forced checkmate in ${pb.mate} starting with ${bestSan}${bestLineSan ? ` (${bestLineSan})` : ''}. Instead, ${m.san} let it slip.`;
  } else if (mateForMe && pa.mate != null && pa.mate > 0 && m.missedMate !== true) {
    primary = 'missed-mate'; themes.push('mate');
    what = `You are still winning, but ${m.san} takes a much longer route. ${bestSan} mates in ${pb.mate}${bestLineSan ? ` (${bestLineSan})` : ''}; with ${m.san} it takes ${pa.mate}.`;
  } else if (mateAgainstMe && !(pb.mate != null && pb.mate < 0)) {
    primary = 'allowed-mate'; themes.push('mate');
    what = `${m.san} allows ${replySan ? `${replySan}` : 'a forced attack'} and checkmate in ${Math.abs(pa.mate)}. Your king ${kingExposure(m)}.`;
    if (reply && reply.themes.includes('backRank')) what = `${m.san} walks into a back-rank mate: ${replySan}. Your king had no escape square.`;
  } else if ((played.themes.includes('sacrifice') || (['n', 'b', 'r', 'q'].includes(piece) && (played.themes.includes('check') || played.themes.includes('capture')) && reply && reply.info.to === to && reply.themes.includes('capture')))
    && oppGain >= 2 && m.loss >= 10) {
    primary = 'bad-sacrifice'; themes.push('sacrifice');
    const wherekind = played.themes.includes('kingAttack') ? 'attack the king' : 'open lines and create threats';
    const kingside = to[0] >= 'e' && ((color === 'w' && +to[1] >= 5) || (color === 'b' && +to[1] <= 4));
    label = kingside && played.themes.includes('kingAttack') ? 'King-side attacking sacrifices' : 'Attacking sacrifices';
    what = `You sacrificed your ${pn(piece)} on ${to}${played.themes.includes('check') ? ' with check' : ''} to ${wherekind}, but your opponent could ${replySan ? `simply answer ${replySan}` : 'capture it'} without facing a sufficient follow-up. You gave up about ${Math.max(oppGain, 1)} point${oppGain === 1 ? '' : 's'} of material for no real attack.`;
  } else if (oppGain >= 2 && reply && reply.themes.includes('capture')) {
    const capSq = reply.info.to;
    const capPiece = reply.info.captured;
    const wasDefender = (() => { try { return new Chess(m.fenBefore).attackers(capSq, color).includes(m.uci.slice(0, 2)) && capSq !== to; } catch (e) { return false; } })();
    if (reply.themes.includes('fork') || reply.themes.includes('pin') || reply.themes.includes('skewer')) primary = 'allowed-tactic';
    else primary = 'hung-piece';
    themes.push('hangingPiece');
    if (capSq === to) what = `${m.san} puts your ${pn(piece)} on a square where it can be captured: ${replySan} wins it${oppGain >= 3 ? '' : ' for very little in return'}.`;
    else if (wasDefender) what = `Moving your ${pn(piece)} removed the protection from your ${pn(capPiece)} on ${capSq} — ${replySan} wins material.`;
    else what = `${m.san} leaves your ${pn(capPiece)} on ${capSq} en prise: ${replySan} wins it.`;
  } else if (reply && ['fork', 'pin', 'skewer', 'discovered'].some((t) => reply.themes.includes(t)) && m.loss >= 10) {
    primary = 'allowed-tactic';
    const t = ['fork', 'pin', 'skewer', 'discovered'].find((x) => reply.themes.includes(x));
    themes.push(t);
    what = `${m.san} allows ${replySan}, ${describeMove(reply, replySan)}.`;
  } else if (best && ['fork', 'pin', 'skewer', 'discovered'].some((t) => best.themes.includes(t)) && m.loss >= 8) {
    const t = ['fork', 'skewer', 'pin', 'discovered'].find((x) => best.themes.includes(x));
    primary = `missed-${t}`; themes.push(t);
    what = `There was a tactic: ${bestSan} ${bestDesc}. ${m.san} missed it${bestGain >= 2 ? `, which would have won about ${bestGain} point${bestGain === 1 ? '' : 's'} of material` : ''}.`;
  } else if (best && (best.themes.includes('freePiece') || best.themes.includes('winsExchange')) && m.loss >= 6) {
    primary = 'missed-capture'; themes.push('hangingPiece');
    what = `${bestSan} ${bestDesc}. ${m.san} let that chance go.`;
  } else if (best && best.themes.includes('mate') && m.loss >= 8) {
    primary = 'missed-mate'; themes.push('mate');
    what = `${bestSan} ${bestDesc}. ${m.san} missed the chance.`;
  } else if (kingSafetyIssue(m) && m.loss >= 8) {
    primary = 'king-safety';
    what = `${m.san} ${kingSafetyIssue(m)} The engine preferred ${bestSan}${bestDesc ? `, which ${bestDesc}` : ''}.`;
  } else if (m.phase === 'opening' && m.loss >= 5) {
    primary = 'opening-principles';
    what = `${openingIssue(m, ctx.prevUcis || [])} The engine prefers ${bestSan}${bestDesc ? `, which ${bestDesc}` : ''}.`;
  } else if (m.phase === 'endgame') {
    primary = 'endgame-technique';
    const ch = new Chess(m.fenBefore); const np = nonPawnMaterial(ch);
    let tip = 'In endgames, precision matters: ';
    if (best && best.info.piece === 'k' && piece !== 'k') tip = 'In endgames the king is an active piece — it belonged in the action here. ';
    else if (best && best.themes.includes('promotion')) tip = 'A pawn promotion was available — count the pawn races move by move. ';
    else if (np.total === 0) tip = 'In king-and-pawn endings everything is about the opposition and key squares. ';
    what = `${tip}${bestSan ? `${bestSan} ${bestDesc || 'was stronger'}.` : ''} ${m.san} gave up ${pawnsText(swing || 0)} of evaluation.`;
  } else if (pb.cp != null && povWin(m.evalBefore, color) >= 75 && povWin(m.evalPlayed || m.evalAfter, color) < 62) {
    primary = 'conversion';
    what = `You were clearly better (${fmtPov(pb)}), but ${m.san} let the advantage slip (${fmtPov(pa)}). ${bestSan ? `${bestSan} ${bestDesc || 'kept control'}.` : ''}`;
  } else if (povWin(m.evalBefore, color) <= 35) {
    primary = 'defense';
    what = `The position was already difficult (${fmtPov(pb)}), and ${m.san} made it worse (${fmtPov(pa)}). ${bestSan ? `${bestSan} ${bestDesc || 'was the toughest defense'}.` : ''}`;
  } else {
    primary = 'positional';
    what = `${m.san} gives up ${pawnsText(swing || 0)} of evaluation compared with ${bestSan || 'the best move'}${bestDesc ? `, which ${bestDesc}` : ''}. ${best && (best.themes.includes('capture') || best.themes.includes('check')) && !played.themes.includes('capture') ? 'A forcing move was available.' : 'The engine\'s choice is more active or more accurate.'}`;
  }

  tags.push(primary);
  const meta = TAGS[primary] || TAGS.positional;
  label = label || meta.label;

  /* why it matters: the opponent's best reply and where the evaluation ends up */
  const why = [];
  if (replySan && !mateAgainstMe) why.push(`Your opponent's best reply is ${replySan}${replyLineSan && replyLineSan.split(' ').length > 2 ? `, and the engine's line continues ${replyLineSan}` : ''}.`);
  if (oppGain >= 1 && !mateAgainstMe) why.push(`Played out, that costs you about ${oppGain} point${oppGain === 1 ? '' : 's'} of material.`);
  if (swing != null) why.push(`The evaluation moves from ${fmtPov(pb)} to ${fmtPov(pa)} — ${m.cls === 'blunder' ? 'enough to decide the game' : m.cls === 'mistake' ? 'a clear swing toward your opponent' : 'a small but real drift'}.`);
  else if (mateAgainstMe) why.push('Once the forced mate appears there is nothing left to defend with — this is the moment the game was lost.');

  /* the better idea */
  let idea = '';
  if (bestSan) {
    const nar = bestInfo.sentences.length ? bestInfo.sentences.slice(0, 2).join(' ') : (bestDesc ? `It ${bestDesc}.` : '');
    idea = `${bestSan} is the engine's choice. ${nar}${bestLineSan ? ` The main line runs ${bestLineSan}.` : ''} That keeps the position at ${fmtPov(pb)} for you.`;
  }

  /* what to consider: the generic checklist, plus what was actually loose after this move */
  consider = [...meta.consider];
  const loose = hangingPieces(m.fenAfter, color).filter((x) => x.type !== 'p');
  if (loose.length) consider.unshift(`Blunder check: after ${m.san}, your ${loose.slice(0, 2).map((x) => `${pn(x.type)} on ${x.square}`).join(' and ')} could be captured. Spotting that before you move is the habit to build.`);
  if (m.phase === 'opening' && primary !== 'opening-principles') consider.push(phaseAdvice(m.fenAfter, color, 'opening'));

  return {
    kind: 'mistake', title: moveLabel, evalText, headline: `${SEVERITY[m.cls] || 'A mistake'}`, what, why, idea, consider,
    principle: PRINCIPLES[primary] || PRINCIPLES.positional,
    bestSan, bestDesc, bestLineSan, replySan, replyLineSan,
    tags, themes,
    recommendation: { label, tasks: meta.tasks.map((t) => ({ ...t, label: taskLabel(t) })) },
  };
}

/** Commentary for good moves (best/excellent/good/book) and for brilliant / great ones. */
export function explainGood(m, ctx = {}) {
  const color = m.color;
  const moveLabel = `${m.moveNo}${color === 'w' ? '.' : '...'} ${m.san}`;
  const pb = povEval(m.evalBefore, color), pa = povEval(m.evalPlayed || m.evalAfter, color);
  let ins = null;
  try { ins = moveInsight(m.fenBefore, m.uci); } catch (e) { ins = null; }
  const sentences = ins ? narrateInsight(ins, { phase: m.phase, max: 3 }) : [];
  const evalText = `${fmtPov(pb)} → ${fmtPov(pa)}`;
  const label = (CLASSES[m.cls] || {}).label || 'Good';
  const bestSan = m.bestSan || (m.best ? sanOf(m.fenBefore, m.best) : null);
  const bestLineSan = m.pv && m.pv.length ? pvToSan(m.fenBefore, m.pv, 5) : '';
  const extra = [];
  const positive = m.cls === 'brilliant' || m.cls === 'great';
  let what = sentences.join(' ');
  let headline = label;

  if (m.cls === 'brilliant') {
    headline = 'Brilliant — a sound sacrifice';
    what = `You gave up material with ${m.san} and the engine confirms it works: the position stays strong for you (${fmtPov(pa)}) because of what follows${bestLineSan ? ` — ${bestLineSan}` : ''}. ${what} Sacrifices like this are rare and hard to see.`;
    extra.push('How to find these: look for forcing moves (checks, captures, threats) and calculate every reply to the end of the line.');
  } else if (m.cls === 'great') {
    headline = 'Great — the only move that works';
    what = `${m.san} was the move that held everything together; the alternatives were clearly worse. ${what}`;
    extra.push('Moves like this are found by comparing candidate moves, not by playing the first reasonable idea.');
  } else if (m.cls === 'book') {
    headline = 'Book move';
    what = `A well-known opening move${m.openingName ? ` (${m.openingName})` : ''}. ${what}`;
    extra.push('Opening theory is built from these moves — knowing the idea behind each one matters more than memorising the order.');
  } else if (m.cls === 'best') {
    headline = 'Best move';
    if (!what) what = 'The engine agrees: this is the strongest move in the position.';
  } else {
    headline = m.cls === 'excellent' ? 'Excellent — almost the engine\'s choice' : 'Good — solid and playable';
    if (bestSan && bestSan !== m.san) extra.push(`The engine's first choice was ${bestSan}${m.cpLoss >= 10 ? `, worth about ${(m.cpLoss / 100).toFixed(1)} pawns more` : ', but the difference is tiny'}. ${m.cls === 'good' ? 'Look at it afterwards and ask why it is a little better.' : ''}`.trim());
  }
  const adv = phaseAdvice(m.fenAfter, color, m.phase);
  if (adv && m.phase !== 'middlegame' && !positive) extra.push(adv);
  return { kind: positive ? 'positive' : 'good', title: moveLabel, headline, evalText, what, why: [], idea: '', extra, consider: [], tags: [], themes: ins ? ins.themes : [], recommendation: null, bestSan, bestLineSan };
}

function kingExposure(m) {
  const ch = new Chess(m.fenAfter);
  const ki = kingInfo(ch, m.color);
  if (!ki) return 'was exposed';
  if (ki.central) return 'was still in the center';
  if (ki.shield <= 1) return 'had lost most of its pawn cover';
  return 'ran out of safe squares';
}

function kingSafetyIssue(m) {
  const before = kingInfo(new Chess(m.fenBefore), m.color);
  const after = kingInfo(new Chess(m.fenAfter), m.color);
  if (!before || !after) return null;
  const np = nonPawnMaterial(new Chess(m.fenAfter));
  if (np.queens === 0 || np.total < 22) return null;
  if (after.shield < before.shield && before.castled) return 'weakens the pawns shielding your king.';
  if (before.castled && !after.castled && m.fenBefore.split(' ')[0] !== m.fenAfter.split(' ')[0] && m.uci.slice(0, 2) === before.square) return 'drags the king out of its shelter.';
  return null;
}

/* ------------------------------------------------------------------ hints */

/**
 * Three-level hint: 1 = idea, 2 = which piece, 3 = the move. Based on the engine's best move.
 */
export function makeHint(fen, bestUci, level = 1) {
  const f = moveFeatures(fen, bestUci);
  if (!f) return { text: 'Look for forcing moves first: checks, captures, threats.' };
  const san = f.san;
  const from = bestUci.slice(0, 2), to = bestUci.slice(2, 4);
  if (level >= 3) return { text: `Play ${san}. It ${describeMove(f, san)}.`, from, to };
  if (level === 2) return { text: `Look at your ${pn(f.info.piece)} on ${from}.`, from };
  const T = f.themes;
  let idea = 'Look for the move that improves your least active piece.';
  if (T.includes('mate')) idea = 'There is a checkmate on the board. Check every check.';
  else if (T.includes('fork')) idea = 'A fork is available — find the square where one piece attacks two targets.';
  else if (T.includes('pin')) idea = 'A pin is available. Look for a piece standing in front of something more valuable.';
  else if (T.includes('skewer')) idea = 'A skewer is available. Look for a check or attack along a line with a piece behind.';
  else if (T.includes('discovered')) idea = 'A discovered attack is possible. Which of your pieces is blocking a line?';
  else if (T.includes('freePiece')) idea = 'An enemy piece is unprotected. Find it.';
  else if (T.includes('capture') && VAL[f.info.captured] >= 3) idea = 'There is a capture worth considering. Check what is defended.';
  else if (T.includes('check')) idea = 'A forcing check might be strong here.';
  else if (T.includes('castle')) idea = 'Your king would like to be safer. Is castling possible?';
  else if (f.info.piece === 'n' || f.info.piece === 'b') idea = 'Develop a piece: bring a minor piece to an active square.';
  else if (f.info.piece === 'p') idea = 'Think about a pawn move to gain space or open a line.';
  return { text: idea };
}

/** Short running commentary for a *played* move during a game/practice (no engine reply needed). */
export function quickComment(fen, uci) {
  const f = moveFeatures(fen, uci);
  if (!f) return '';
  return describeMove(f, f.san);
}

/** Narration for demo play (endgames etc.). */
export function narrateMove(fenBefore, uci) {
  const f = moveFeatures(fenBefore, uci);
  if (!f) return '';
  const ch = new Chess(fenBefore);
  const mover = ch.turn();
  const T = f.themes;
  if (T.includes('mate')) return `${f.san} — checkmate!`;
  if (T.includes('promotion')) return `${f.san} — the pawn promotes.`;
  if (T.includes('check')) return `${f.san} — check, restricting the king.`;
  if (f.info.piece === 'k') {
    const map = boardMap(ch);
    const ek = Object.keys(map).find((s) => map[s].type === 'k' && map[s].color !== mover);
    if (ek) {
      const d0 = Math.max(Math.abs(ek.charCodeAt(0) - uci.charCodeAt(0)), Math.abs(+ek[1] - +uci[1]));
      const d1 = Math.max(Math.abs(ek.charCodeAt(0) - uci.charCodeAt(2)), Math.abs(+ek[1] - +uci[3]));
      if (d1 === 2 && d0 !== 2 && Math.abs(ek.charCodeAt(0) - uci.charCodeAt(2)) === 0) return `${f.san} — the king takes the opposition.`;
      if (d1 < d0) return `${f.san} — the king marches closer.`;
    }
    return `${f.san} — a king move.`;
  }
  if (f.info.piece === 'p') return `${f.san} — the pawn advances.`;
  return `${f.san} — ${describeMove(f, f.san)}.`;
}

/* ------------------------------------------------------------------ player development */

/**
 * Build the weakness profile from the saved mistakes + puzzle stats.
 * @returns [{tag,label,score,count,perGame,examples}] sorted by severity
 */
export function weaknessProfile(mistakes, games) {
  const nGames = Math.max(1, games.length);
  const counts = {};
  const now = Date.now();
  for (const m of mistakes) {
    const w = m.cls === 'blunder' ? 3 : m.cls === 'mistake' ? 2 : 1;
    // recent mistakes weigh more (half-life ~ 30 days)
    const age = Math.max(0, (now - (m.date || now)) / 86400000);
    const rec = Math.pow(0.5, age / 30);
    const c = counts[m.tag] || (counts[m.tag] = { tag: m.tag, label: (TAGS[m.tag] || {}).label || m.tag, score: 0, count: 0, blunders: 0 });
    c.score += w * (0.4 + 0.6 * rec);
    c.count++;
    if (m.cls === 'blunder') c.blunders++;
  }
  return Object.values(counts).map((c) => ({ ...c, perGame: c.count / nGames })).sort((a, b) => b.score - a.score);
}

/**
 * A personalised daily plan: tasks derived from the top weaknesses (+ puzzle theme weakness).
 */
export function buildPlan(profile, puzzleStats = {}, lessonProgress = {}, n = 4) {
  const plan = [];
  const seen = new Set();
  const push = (t, why) => { const key = JSON.stringify([t.kind, t.theme, t.tag, t.track, t.id]); if (seen.has(key)) return; seen.add(key); plan.push({ ...t, label: taskLabel(t), why, done: false }); };
  for (const w of profile.slice(0, 3)) {
    const meta = TAGS[w.tag]; if (!meta) continue;
    for (const t of meta.tasks.slice(0, 2)) push(t, `${w.count} recent ${w.label.toLowerCase()} mistake${w.count > 1 ? 's' : ''}`);
  }
  // weakest puzzle theme
  const weak = Object.entries(puzzleStats).filter(([, s]) => s.attempts >= 4).map(([k, s]) => [k, s.solved / s.attempts]).sort((a, b) => a[1] - b[1])[0];
  if (weak && weak[1] < 0.7) push({ kind: 'puzzles', theme: weak[0], n: 5 }, `You solve only ${Math.round(weak[1] * 100)}% of ${THEME_LABELS[weak[0]] || weak[0]} puzzles`);
  if (plan.length < 3) {
    push({ kind: 'puzzles', theme: 'mateIn2', n: 5 }, 'Daily tactics keep your pattern recognition sharp');
    push({ kind: 'lesson', track: 'openings', id: 'principles' }, 'Strong foundations: opening principles');
    push({ kind: 'play', n: 1 }, 'Play a rated game against the computer');
  }
  return plan.slice(0, n + 1);
}
