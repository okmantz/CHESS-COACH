// Position and move insight for the coach: what does a move actually DO, what is the opponent threatening,
// and how healthy is a position (development, centre, king safety). Everything is derived from the board with
// chess.js — no engine needed — so it can run instantly, for every move, in lessons, reviews and live games.
import { Chess } from '../vendor/chess.js';
import { boardMap, pieceTargets, VAL, NAMES, findKing, kingInfo, moveFeatures, fileOf, rankOf, sq as mkSq } from './themes.js';
import { see } from './see.js';

const opp = (c) => (c === 'w' ? 'b' : 'w');
const CENTER = ['d4', 'e4', 'd5', 'e5'];
const nm = (t) => NAMES[t] || 'piece';
const the = (t) => `${nm(t)}`;
const HOME = { w: { n: ['b1', 'g1'], b: ['c1', 'f1'] }, b: { n: ['b8', 'g8'], b: ['c8', 'f8'] } };
export const COLOR_NAME = { w: 'White', b: 'Black' };

/** Same position with `color` to move (used to ask "what would they do if it were their turn?"). */
export function asSideToMove(fen, color) {
  const p = fen.split(' ');
  if (p[1] === color) return fen;
  p[1] = color; p[3] = '-';
  return p.join(' ');
}
function safeChess(fen) { try { return new Chess(fen); } catch (e) { return null; } }

/* ------------------------------------------------------------------ position health */

export function positionFacts(fenOrChess, color) {
  const ch = typeof fenOrChess === 'string' ? new Chess(fenOrChess) : fenOrChess;
  const map = boardMap(ch);
  let developed = 0, minors = 0;
  for (const s in map) {
    const p = map[s];
    if (p.color !== color || (p.type !== 'n' && p.type !== 'b')) continue;
    minors++;
    if (!HOME[color][p.type].includes(s)) developed++;
  }
  // pieces still at home that were never developed
  const homeLeft = HOME[color].n.filter((s) => map[s] && map[s].color === color && map[s].type === 'n').length + HOME[color].b.filter((s) => map[s] && map[s].color === color && map[s].type === 'b').length;
  const k = kingInfo(ch, color);
  const queen = Object.keys(map).find((s) => map[s].color === color && map[s].type === 'q');
  const home = color === 'w' ? 'd1' : 'd8';
  const queenOut = !!queen && queen !== home;
  const centerPawns = CENTER.filter((s) => map[s] && map[s].color === color && map[s].type === 'p');
  // rooks connected = both rooks on the same rank with nothing between them
  const rooks = Object.keys(map).filter((s) => map[s].color === color && map[s].type === 'r');
  let connected = false;
  if (rooks.length === 2 && rooks[0][1] === rooks[1][1]) {
    const [a, b] = rooks.map(fileOf).sort((x, y) => x - y);
    connected = true;
    for (let f = a + 1; f < b; f++) if (map[mkSq(f, rankOf(rooks[0]))]) connected = false;
  }
  const pawnFiles = {};
  for (const s in map) if (map[s].type === 'p') (pawnFiles[s[0]] = pawnFiles[s[0]] || []).push(map[s].color);
  const openFiles = [], semiOpen = [];
  for (const f of 'abcdefgh') {
    const here = pawnFiles[f] || [];
    if (!here.length) openFiles.push(f);
    else if (!here.includes(color) && here.includes(opp(color))) semiOpen.push(f);
  }
  return { developed, minors, homeLeft, castled: !!(k && k.castled), kingCentral: !!(k && k.central), kingSquare: k && k.square, shield: k ? k.shield : 0, queenOut, centerPawns, rooksConnected: connected, rooks: rooks.length, openFiles, semiOpen };
}

/* ------------------------------------------------------------------ what a move does */

/**
 * Structured facts about a move: what it develops, controls, attacks, defends, whether it is safe.
 * Returns null for an illegal move.
 */
export function moveInsight(fen, uci) {
  const f = moveFeatures(fen, uci);
  if (!f) return null;
  const before = new Chess(fen);
  const mover = before.turn(), enemy = opp(mover);
  const mapB = boardMap(before);
  const after = new Chess(fen);
  const mv = after.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  const mapA = boardMap(after);
  const from = mv.from, to = mv.to, piece = mv.piece;
  const T = f.themes;
  const ins = { san: mv.san, piece, from, to, captured: mv.captured || null, themes: T, mover, enemy };

  const fromHome = (HOME[mover][piece] || []).includes(from);
  ins.develops = (piece === 'n' || piece === 'b') && fromHome && !(HOME[mover][piece] || []).includes(to);
  ins.centerPawn = piece === 'p' && CENTER.includes(to) && !mv.captured;
  ins.castled = T.includes('castle');

  // central squares this piece newly controls
  ins.controlsCenter = [];
  if (piece !== 'k') {
    for (const s of CENTER) {
      const was = before.attackers(s, mover).includes(from);
      const now = after.attackers(s, mover).includes(to);
      if (now && !was && s !== to) ins.controlsCenter.push(s);
    }
  }
  ins.occupiesCenter = CENTER.includes(to) && piece !== 'k';

  // enemy pieces newly attacked / own pieces newly defended by the moved piece
  const seenB = new Set(pieceTargets(mapB, from).map((t) => t.square));
  ins.attacks = []; ins.defends = [];
  for (const t of pieceTargets(mapA, to)) {
    const key = t.square;
    if (t.piece.color === enemy && t.piece.type !== 'k') {
      if (seenB.has(key) && !mv.captured) continue;
      const defended = after.attackers(key, enemy).filter((x) => x !== to).length > 0;
      if (t.piece.type === 'p' && piece !== 'p' && defended) continue;
      // would capturing it really win material once recaptures are counted? (legal captures only, x-rays included)
      let wins = false;
      try { wins = see(after.fen(), key, mover, { from: to }) > 0; } catch (e) { wins = !defended; }
      ins.attacks.push({ square: key, type: t.piece.type, undefended: !defended, wins, value: VAL[t.piece.type] });
    } else if (t.piece.color === mover && t.piece.type !== 'k' && !seenB.has(key)) ins.defends.push({ square: key, type: t.piece.type });
  }

  // is the moved piece safe where it landed? An exchange count, not a guess: attacked twice and defended once is NOT safe.
  const attackers = after.attackers(to, enemy);
  ins.attackedBy = attackers.map((a) => ({ square: a, type: mapA[a].type }));
  if (piece === 'k') ins.safe = !attackers.length;
  else {
    let lost = 0;
    try { lost = see(after.fen(), to, enemy); } catch (e) { lost = 0; }
    ins.safe = lost <= 0;
  }

  // file / rank effects: only a piece that ARRIVES on a file or rank "takes" it (a rook sliding along its own open file does not)
  if (piece === 'r' || piece === 'q') {
    const file = to[0];
    const pawnsOnFile = Object.keys(mapA).filter((s) => s[0] === file && mapA[s].type === 'p');
    const arrives = from[0] !== to[0];
    ins.openFile = arrives && pawnsOnFile.length === 0 ? file : null;
    ins.semiOpenFile = arrives && !ins.openFile && pawnsOnFile.length > 0 && !pawnsOnFile.some((s) => mapA[s].color === mover) ? file : null;
    ins.seventh = rankOf(to) === (mover === 'w' ? 6 : 1) && rankOf(from) !== rankOf(to);
  }
  // which pieces could a pawn move open lines for? (so the coach never talks about bishops and queens that are not there)
  ins.hasBishop = Object.values(mapA).some((p) => p.color === mover && p.type === 'b');
  ins.hasQueen = Object.values(mapA).some((p) => p.color === mover && p.type === 'q');
  ins.pawnEnding = Object.values(mapA).every((p) => p.type === 'k' || p.type === 'p');
  const pf0 = positionFacts(before, mover), pf1 = positionFacts(after, mover);
  ins.connectsRooks = pf1.rooksConnected && !pf0.rooksConnected;
  ins.developedBefore = pf0.developed; ins.developedAfter = pf1.developed;
  ins.queenOutEarly = piece === 'q' && pf1.queenOut && !pf0.queenOut;
  ins.movedTwice = false;

  // does the move threaten checkmate next turn?
  ins.threatensMate = false;
  if (!after.isGameOver() && !after.inCheck()) {
    const mm = safeChess(asSideToMove(after.fen(), mover));
    if (mm) for (const m of mm.moves({ verbose: true })) { mm.move(m); const mate = mm.isCheckmate(); mm.undo(); if (mate) { ins.threatensMate = true; ins.mateSquare = m.to; break; } }
  }
  ins.feats = f;
  return ins;
}

/** Plain-English sentences describing what a move accomplishes (most important first). */
export function narrateInsight(ins, { phase = 'middlegame', max = 4 } = {}) {
  if (!ins) return [];
  const out = [];
  const T = ins.themes;
  const P = nm(ins.piece);
  if (T.includes('mate')) out.push('It delivers checkmate.');
  else if (T.includes('castle')) out.push('Castling tucks the king behind its pawns and brings the rook toward the centre — two jobs in one move.');
  if (ins.captured && !T.includes('mate')) {
    const free = T.includes('freePiece');
    out.push(`It captures the ${nm(ins.captured)} on ${ins.to}${free ? ', which was not protected, so it is a clean gain' : T.includes('winsExchange') ? ', winning more than it risks' : ''}.`);
  }
  if (ins.develops) out.push(`It develops the ${P}: a new piece joins the game instead of sitting on its starting square.`);
  if (ins.centerPawn && !ins.pawnEnding) {
    const opens = [ins.hasBishop ? 'bishop' : null, ins.hasQueen ? 'queen' : null].filter(Boolean);
    out.push(`The pawn stakes a claim in the centre${ins.controlsCenter.length ? ` and controls ${ins.controlsCenter.join(' and ')}` : ''}${opens.length ? `, which also opens lines for your ${opens.join(' and ')}` : ''}.`);
  } else if (ins.controlsCenter.length && !ins.pawnEnding) out.push(`It eyes the central square${ins.controlsCenter.length > 1 ? 's' : ''} ${ins.controlsCenter.join(' and ')} — pieces that influence the centre work harder.`);
  if (ins.occupiesCenter && !ins.centerPawn && ins.piece !== 'p') out.push(`The ${P} lands in the centre, where it reaches the most squares.`);
  if (T.includes('check') && !T.includes('mate')) out.push('It gives check, so the opponent must answer it right away — you keep the initiative.');
  if (T.includes('fork') && ins.feats && ins.feats.info.targets && ins.feats.info.targets.length) out.push(`It forks ${ins.feats.info.targets.map((t) => `the ${nm(t.type)} on ${t.square}`).join(' and ')} — they cannot both be saved.`);
  else if (T.includes('pin') && ins.feats && ins.feats.info.pin) out.push(`It pins the piece on ${ins.feats.info.pin.pinned} to the more valuable piece behind it on ${ins.feats.info.pin.behind}.`);
  else if (T.includes('skewer') && ins.feats && ins.feats.info.skewer) out.push(`It skewers: the piece on ${ins.feats.info.skewer.front} must move and the one behind it on ${ins.feats.info.skewer.behind} is exposed.`);
  else if (T.includes('discovered') && ins.feats && ins.feats.info.discovered) out.push(`Moving this piece uncovers an attack by the piece on ${ins.feats.info.discovered.slider} against ${ins.feats.info.discovered.target}.`);
  else if (ins.attacks.length) {
    const a = ins.attacks.slice().sort((x, y) => (y.wins - x.wins) || (y.value - x.value))[0];
    out.push(`It attacks the ${nm(a.type)} on ${a.square}${a.undefended ? ' — and nothing is protecting it' : a.wins ? ' — and taking it would win material even after the recapture' : ''}.`);
  }
  if (ins.threatensMate && !T.includes('mate') && !T.includes('check')) out.push(`It creates a real threat: checkmate on ${ins.mateSquare} next move.`);
  if (ins.openFile) out.push(`The ${P} takes the open ${ins.openFile}-file, with no pawns to block it.`);
  else if (ins.semiOpenFile) out.push(`The ${P} takes the half-open ${ins.semiOpenFile}-file, pressing on the enemy pawn there.`);
  if (ins.seventh) out.push('A rook or queen on the seventh rank eats pawns and pins the enemy king to the back rank.');
  if (ins.connectsRooks) out.push('The rooks are now connected: they protect each other and can swing to any file.');
  if (ins.defends.length && out.length < 3) { const d = ins.defends[0]; out.push(`It ${out.length ? 'also ' : ''}protects the ${nm(d.type)} on ${d.square}.`); }
  if (ins.queenOutEarly && phase === 'opening') out.push('The queen leaves home early — it can be harassed by minor pieces, so keep developing instead.');
  if (!ins.safe && !T.includes('mate') && !ins.captured) out.push(`Be careful: the ${P} can be captured on ${ins.to}.`);
  if (!out.length) {
    if (ins.pawnEnding && ins.piece === 'p') out.push('A pawn move in a pawn ending: only pawns and kings are left, so every push changes who wins the race to queen.');
    else if (ins.pawnEnding && ins.piece === 'k') out.push('A king move in a pawn ending: the king is the most important piece here, so where it stands decides the game.');
    else if (ins.piece === 'p') out.push('A pawn move: it gains space and changes which squares and diagonals are open.');
    else if (ins.piece === 'k') out.push('A king move — in the endgame the king is a fighting piece, so activating it matters.');
    else out.push(`It improves the ${P}: more active squares, better coordination with the rest of the army.`);
  }
  return out.slice(0, max);
}

/* ------------------------------------------------------------------ threats */

/**
 * What can the OTHER side do to `victim` right now? We hand the move to the attacker and list their dangerous options:
 * mates, wins of material, forks/pins/skewers, checks.
 * @returns {{kind:string, san:string, text:string, squares:string[], severity:number}[]} most severe first
 */
export function threatsAgainst(fen, victim, { limit = 4 } = {}) {
  const attacker = opp(victim);
  const base = safeChess(fen);
  if (!base) return [];
  // if the victim is in check they must resolve that first
  if (base.turn() === victim && base.inCheck()) {
    const ks = findKing(boardMap(base), victim);
    const att = base.attackers(ks, attacker);
    return [{ kind: 'check', san: '', text: `Your king is in check from the ${att.map((a) => nm(boardMap(base)[a].type) + ' on ' + a).join(' and ')}. You must deal with that first.`, squares: att, severity: 100 }];
  }
  const ch = safeChess(asSideToMove(fen, attacker));
  if (!ch) return [];
  const map = boardMap(ch);
  const out = [];
  for (const m of ch.moves({ verbose: true })) {
    const f = moveFeatures(ch.fen(), m.from + m.to + (m.promotion || ''));
    if (!f) continue;
    const T = f.themes;
    const valCap = m.captured ? VAL[m.captured] : 0;
    if (T.includes('mate')) { out.push({ kind: 'mate', san: m.san, uci: m.from + m.to + (m.promotion || ''), text: `${m.san} would be checkmate.`, squares: [m.to], severity: 100 }); continue; }
    // a capture is a threat only if it nets material after every recapture (pins, x-rays and the king's limits included)
    const net = m.captured && !m.flags.includes('e') ? seeSafe(ch.fen(), m.to, attacker, m.from) : 0;
    if (m.captured && net > 0) {
      const defended = ch.attackers(m.to, victim).length > 0;
      const what = m.captured === 'p' ? 'pawn' : nm(m.captured);
      out.push({ kind: 'material', san: m.san, uci: m.from + m.to + (m.promotion || ''), text: `${m.san} would win your ${what} on ${m.to}${defended ? ' (the recapture would not make up for it)' : ' (it is not protected)'}.`, squares: [m.to], severity: (m.captured === 'p' ? 28 : 50) + net * 4 + valCap });
    } else if (T.includes('fork') && f.info.targets && f.info.targets.length >= 2) {
      out.push({ kind: 'fork', san: m.san, uci: m.from + m.to + (m.promotion || ''), text: `${m.san} would fork ${f.info.targets.map((t) => `your ${nm(t.type)} on ${t.square}`).join(' and ')}.`, squares: f.info.targets.map((t) => t.square), severity: 60 });
    } else if ((T.includes('pin') || T.includes('skewer')) && (f.info.pin || f.info.skewer)) {
      const sqs = f.info.pin ? [f.info.pin.pinned, f.info.pin.behind] : [f.info.skewer.front, f.info.skewer.behind];
      out.push({ kind: 'pin', san: m.san, uci: m.from + m.to + (m.promotion || ''), text: `${m.san} would ${f.info.pin ? 'pin' : 'skewer'} your pieces on ${sqs.join(' and ')}.`, squares: sqs, severity: 35 });
    } else if (T.includes('discovered')) {
      out.push({ kind: 'discovered', san: m.san, uci: m.from + m.to + (m.promotion || ''), text: `${m.san} would uncover an attack with a second piece.`, squares: [m.to], severity: 30 });
    }
  }
  // de-duplicate by san and keep the worst few
  const seen = new Set();
  return out.sort((a, b) => b.severity - a.severity).filter((t) => (seen.has(t.san) ? false : (seen.add(t.san), true))).slice(0, limit);
}

function seeSafe(fen, square, by, from) {
  try { return see(fen, square, by, from ? { from } : {}); } catch (e) { return 0; }
}

/**
 * Your own pieces that the opponent could win by capturing — decided by a full exchange count (defenders, x-rays, pins), not by
 * "is it attacked and unprotected". A defended piece attacked twice IS listed; a defended piece attacked only by a bigger piece is NOT.
 */
export function hangingPieces(fen, color) {
  const ch = safeChess(fen);
  if (!ch) return [];
  const map = boardMap(ch);
  const res = [];
  for (const s in map) {
    const p = map[s];
    if (p.color !== color || p.type === 'k') continue;
    const att = ch.attackers(s, opp(color));
    if (!att.length) continue;
    const gain = seeSafe(fen, s, opp(color));
    if (gain <= 0) continue;
    const def = ch.attackers(s, color).filter((x) => x !== s);
    res.push({ square: s, type: p.type, undefended: !def.length, attackers: att, gain });
  }
  return res.sort((a, b) => VAL[b.type] - VAL[a.type] || b.gain - a.gain);
}

/** Enemy pieces that YOU could win right now (undefended or attacked by something cheaper). */
export function targetsFor(fen, color) {
  return hangingPieces(fen, opp(color));
}

/** Shorthand for the pre-move checklist: a few focused, non-answer questions about the position. */
export function describeSquareList(sqs) { return sqs.length === 1 ? sqs[0] : sqs.slice(0, -1).join(', ') + ' and ' + sqs[sqs.length - 1]; }
