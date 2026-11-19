import { moveFeatures, loosePieces, phaseOf } from '../js/themes.js';
import { Chess } from '../vendor/chess.js';
let fail=0;
function t(name, fen, uci, expectAll=[], expectNone=[]) {
  const f = moveFeatures(fen, uci);
  const th = f ? f.themes : null;
  const ok = f && expectAll.every(x=>th.includes(x)) && expectNone.every(x=>!th.includes(x));
  if(!ok) fail++;
  console.log(ok?'PASS':'FAIL', name, th);
}
// Knight fork on king and queen: Nc7+ fork
t('royal fork','r1bqkbnr/pp1ppppp/8/3N4/8/8/PPPPPPPP/R1BQKBNR w KQkq - 0 1','d5c7',[],[]); 
t('fork Nc7+ (K e8,R a8)','r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1','d5c7',['fork','check']);
t('back rank mate','6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1','a1a8',['mate','backRank']);
t('smothered','6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1','g5f7',[],[]);
t('pin Bg5 Nf6/Qd8','rnbqkb1r/pppp1ppp/4pn2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 3','c1g5',['pin']);
t('skewer Ra5+','8/8/8/2k3r1/8/8/8/R6K w - - 0 1','a1a5',['skewer','check']);
t('discovered check','4k3/8/8/8/8/4N3/4R3/4K3 w - - 0 1','e3c4',[],[]);
t('discovered attack real','4k3/8/8/8/8/8/4N3/4R1K1 w - - 0 1','e2c3',['discovered','discoveredCheck']);
t('free piece capture','4k3/8/8/3n4/8/8/8/3QK3 w - - 0 1','d1d5',['capture','freePiece']);
t('castle','r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1','e1g1',['castle']);
t('greek gift sac','r1bq1rk1/pppn1ppp/4pn2/3p4/1bPP4/2N1PN2/PP3PPP/R1BQKB1R w KQ - 0 1','f1d3',[],[]);
t('Bxh7+ sac','r1bq1rk1/ppp2ppp/2n1pn2/3p4/3P4/2NBPN2/PPP2PPP/R1BQ1RK1 w - - 0 1','d3h7',['capture','check']);
t('promotion','8/4P1k1/8/8/8/8/8/4K3 w - - 0 1','e7e8q',['promotion']);
console.log('phase', phaseOf(new Chess()), phaseOf('r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1'), phaseOf('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1'));
console.log('loose', JSON.stringify(loosePieces(new Chess('4k3/8/8/3n4/8/8/8/3QK3 w - - 0 1'),'b')));
process.exit(fail?1:0);
