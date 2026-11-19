import test from 'node:test';
import assert from 'node:assert/strict';
import { see } from '../js/see.js';
import { hangingPieces, targetsFor, threatsAgainst, moveInsight } from '../js/insight.js';

test('undefended piece is simply won', () => {
  // white rook takes undefended black knight on d5
  assert.equal(see('4k3/8/8/3n4/8/8/8/3RK3 w - - 0 1', 'd5', 'w'), 3);
});

test('a defended pawn is not worth a queen', () => {
  // black pawn d5 defended by pawn e6; the queen would lose herself for a pawn
  assert.ok(see('4k3/8/4p3/3p4/8/8/8/3QK3 w - - 0 1', 'd5', 'w') < 0);
});

test('attacked twice, defended once: the exchange still wins material', () => {
  // black knight d5 defended once (pawn c6 ... no: bishop e6), attacked by two white rooks stacked on the d-file? use pieces
  // white: Rd1, Rd2 (x-ray), black: Nd5 defended by Be6.  RxN BxR RxB  => white wins N+B for R = +1
  const fen = '4k3/8/4b3/3n4/8/8/3R4/3RK3 w - - 0 1';
  assert.equal(see(fen, 'd5', 'w'), 1);
});

test('x-ray defender is counted', () => {
  // black rook d8 behind black rook d5? target is Rd5 defended by Rd8; white Rd1 + Rd2: R x R, R x R, R x R => win a rook for a rook... net +5 -5 +5 = 5? white wins: RxR(5), RxR(5 lost), RxR(5)  => +5
  const fen = '3rk3/8/8/3r4/8/8/3R4/3RK3 w - - 0 1';
  assert.equal(see(fen, 'd5', 'w'), 5);
});

test('a pinned attacker cannot start the capture', () => {
  // white knight d4 is pinned to the king by the black rook d8; it "attacks" the black pawn on e6 but cannot capture
  const fen = '3rk3/8/4p3/8/3N4/8/8/3K4 w - - 0 1';
  assert.equal(see(fen, 'e6', 'w'), 0);
  // the pawn on e6 is therefore not a target for white
  assert.deepEqual(targetsFor(fen, 'w').map((x) => x.square), []);
});

test('the king cannot recapture into another attacker', () => {
  // bishop g2 takes the pawn on d5; the black king on e6 would "recapture", but the queen on d1 then takes the king,
  // so the king cannot - the pawn is simply lost
  assert.equal(see('8/8/4k3/3p4/8/8/6B1/3QK3 w - - 0 1', 'd5', 'w'), 1);
});

test('hangingPieces uses real exchanges', () => {
  // black to move; black knight on d5 is attacked by a rook and defended by a pawn: defended, but pawn takes rook? no.
  // knight d5 (3) attacked by Rd1 (5), defended by pawn e6: RxN, pxR  => white loses 2, so the knight is NOT hanging
  assert.deepEqual(hangingPieces('4k3/8/4p3/3n4/8/8/8/3RK3 b - - 0 1', 'b').map((x) => x.square), []);
  // the same knight attacked by a rook AND a bishop, defended once: it is hanging
  const hang = hangingPieces('4k3/8/4p3/3n4/8/8/6B1/3RK3 b - - 0 1', 'b').map((x) => x.square);
  assert.deepEqual(hang, ['d5']);
});

test('threatsAgainst reports material threats only when they truly win something', () => {
  const quiet = threatsAgainst('4k3/8/4p3/3n4/8/8/8/3RK3 b - - 0 1', 'b').filter((t) => t.kind === 'material');
  assert.deepEqual(quiet, []);
  const real = threatsAgainst('4k3/8/8/3n4/8/8/8/3RK3 w - - 0 1', 'b').filter((t) => t.kind === 'material');
  assert.equal(real.length, 1);
  assert.match(real[0].text, /Rxd5/);
});

test('moveInsight: a piece landing where the exchange loses is unsafe, a defended one is safe', () => {
  // Nf3xe5 is recaptured by the d6 pawn and nothing protects the knight: unsafe
  const unsafe = moveInsight('rnbqkbnr/ppp2ppp/3p4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3', 'f3e5');
  assert.equal(unsafe.safe, false);
  // Nb1-c3 (attacked by nothing) is safe
  const safe = moveInsight('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'b1c3');
  assert.equal(safe.safe, true);
});
