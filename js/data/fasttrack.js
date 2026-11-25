// Middlegame Fast-Track: six short, hands-on lessons that give a player a repeatable way to think once the opening is over.
// Every position is validated by tests/fasttrack.test.mjs (legal FENs, legal answers).
const q = (ask, options, correct, why, fen) => ({ t: 'quiz', fen, ask, options, correct, why });
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const ITAL = 'r1bq1rk1/1pp2ppp/p1np1n2/2b1p3/4P3/1BPP1N2/PP3PPP/RNBQ1RK1 w - - 0 8';
const RIM = 'r1bqk2r/ppp1bppp/2n1pn2/3p4/3P4/N1P1PN2/PP3PPP/R1BQKB1R w KQkq - 0 8';
const CARLS = 'r1bqrnk1/pp2bppp/2p2n2/3p2B1/3P4/2NBP3/PPQ1NPPP/R4RK1 w - - 9 11';
const OPP = 'r1r3k1/ppq1ppbp/3pbnp1/8/3BP2P/2N2P2/PPQ3P1/1K1R1B1R w - - 1 13';
const QGW = 'rnbqkb1r/ppp2ppp/4pn2/3p4/3P4/4PN2/PPP2PPP/RNBQKB1R w KQkq - 0 4';
const QGB = 'rnbqkb1r/ppp2ppp/4pn2/3p4/3P4/3BPN2/PPP2PPP/RNBQK2R b KQkq - 1 4';
const OUT = 'r1bq1rk1/5ppp/p1np1b2/1p1Np3/4P3/N1P5/PP3PPP/R2QKB1R w KQ - 1 12';

export const FASTTRACK = [
  {
    id: 'method', part: 0, name: 'The 3-question method', icon: '🧭', level: 'Beginner', time: '6 min',
    summary: 'Three questions to ask on every move once the opening is over, so you always know what to do.',
    steps: [
      { t: 'say', title: 'Why the middlegame feels hard', fen: START, text: 'In the opening you follow ideas you learned. In the middlegame nobody tells you the next move, so most players just react or shuffle.\n**The fix is a routine.** Ask the same three questions every move and a plan appears.' },
      { t: 'say', title: 'Question 1: what changed?', fen: START, text: 'Look at your opponent\'s **last move**. What does it attack? What does it threaten next? What did it leave unprotected?\nThis one question stops most blunders and often shows you a free tactic.' },
      { t: 'say', title: 'Question 2: which is my worst piece?', fen: START, text: 'Find your piece that does the least (usually a knight on the edge, a bishop stuck behind its own pawns, or a rook on a closed file) and **improve it**. A well-placed worst piece is the cheapest way to get an edge.' },
      { t: 'say', title: 'Question 3: what does the pawn structure say?', fen: START, text: 'Pawns decide where the play is. Look for **targets** (isolated, backward or doubled pawns), **open files** to use, a **pawn break** to prepare, and which **side of the board** has more space. That is your plan.' },
      q('You are not sure what to do. What do you do first?', ['Make any safe developing move', 'Ask what the opponent\'s last move threatens', 'Trade queens'], 1, 'Question 1 always comes first. Threats and loose pieces matter more than plans.', START),
      q('Which piece should you improve first?', ['The queen, it is the strongest', 'The piece that does the least', 'The piece closest to the enemy king'], 1, 'Improving your worst piece adds the most activity per move.', START),
      { t: 'say', title: 'The routine', fen: START, text: '**1. What changed?  2. Worst piece?  3. Pawn structure plan?**\nThen pick the move that does the job, and run a quick blunder check (checks, captures, threats) before you play it. The Coach now shows you this "plan check" on every move in Analyze.' },
    ],
  },
  {
    id: 'worst-piece', part: 0, name: 'Find and fix your worst piece', icon: '🐴', level: 'Beginner', time: '7 min',
    summary: 'Spot the piece doing nothing and bring it into the game.',
    steps: [
      { t: 'say', title: 'The lazy piece', fen: ITAL, text: 'White has played a normal opening, but one piece has not joined in. Great players ask "which piece is worst?" almost every move.' },
      { t: 'tap', title: 'Find it', fen: ITAL, ask: 'Tap White\'s worst-placed piece.', answer: 'b1', right: 'The knight on b1 has not moved: it does nothing there.', hint: 'Which piece is still on its starting square?', why: 'Pieces on their start squares control few squares. Developing them is free activity.' },
      { t: 'move', title: 'Fix it', fen: ITAL, ask: 'Bring that knight into the game.', answer: ['b1d2'], right: 'Nbd2 heads for f1 and g3, or b3. It joins the fight next to the other pieces.', hint: 'Which square lets the knight see the centre without blocking a pawn?', why: 'The d2 square keeps the c1 bishop\'s file open for later and supports e4.' },
      { t: 'tap', title: 'A different problem', fen: RIM, ask: 'Tap White\'s worst-placed piece.', answer: 'a3', right: 'A knight on the rim attacks only a few squares.', hint: 'Look at the edge of the board.', why: '"A knight on the rim is dim": from a3 it controls 4 squares; from e5 or d4 it controls 8.' },
      { t: 'move', title: 'Reroute it', fen: RIM, ask: 'Reroute the knight toward the centre.', answer: ['a3c2'], right: 'Nc2 goes on to b4, d4 or e1. It is a two-move journey but worth it.', hint: 'Which square lets it see b4 and d4?', why: 'If the best square takes two moves, go anyway. A good piece is worth a tempo.' },
      q('Your bishop is blocked by its own pawns. Which is usually right?', ['Leave it, bishops are fine', 'Move the pawns off its colour or reroute it', 'Trade it for any knight'], 1, 'A "bad bishop" improves when you free its diagonals or find it a new one.', START),
      { t: 'say', title: 'Remember', fen: START, text: '**Every move, find the worst piece.** If nothing is urgent, improve it. You will see the Coach say "your worst piece is the …" in your game reviews.' },
    ],
  },
  {
    id: 'read-structure', part: 1, name: 'Read the pawn structure', icon: '🧱', level: 'Intermediate', time: '8 min',
    summary: 'Know which plan fits which pawn structure: minority attack, pawn storm, targets and files.',
    steps: [
      { t: 'say', title: 'Pawns tell you the plan', fen: CARLS, text: 'Pieces move, pawns mostly stay. The pawns decide **where** your pieces belong. Learn five common structures and you will always have a plan.' },
      q('White vs a Carlsbad structure (pawn on c6 and d5, White d4 and e3): what is the classic plan?', ['Push the h-pawn to attack the king', 'The minority attack: b4-b5 to create a weakness on c6', 'Trade all the rooks'], 1, 'With fewer pawns on the queenside, White pushes them forward to create a target. That is the minority attack.', CARLS),
      q('Kings are castled on opposite sides. What does the attacker usually do?', ['Push the pawns in front of the enemy king and open files', 'Trade queens', 'Wait for the opponent to attack'], 0, 'Opposite castling is a race. Pawn storms open lines at the enemy king, so speed counts more than neat structure.', OPP),
      { t: 'tap', title: 'Find the target', fen: '4k3/pp3ppp/8/3p4/8/8/PP3PPP/4K3 w - - 0 1', ask: 'Tap Black\'s isolated pawn: the structure\'s target.', answer: 'd5', right: 'The d5 pawn has no neighbours: it needs a piece to defend it all game.', hint: 'Which pawn has no friends on the files beside it?', why: 'Block it, then attack it with pieces. A defender that has to guard it cannot do anything else.' },
      { t: 'tap', title: 'Use the open file', fen: '6k1/pp3ppp/8/8/8/8/PP3PPP/R5K1 w - - 0 1', ask: 'Tap a square on the open file where the rook should go.', answer: ['c1', 'd1', 'e1'], right: 'Rooks belong on open files. From there they pressure the 7th rank.', hint: 'Which files have no pawns at all?', why: 'A rook behind its own pawns is a rook doing nothing. Put it where the lines are.' },
      q('The centre is completely closed (locked pawns). Where is the play?', ['In the centre', 'On the wings, with pawn breaks', 'There is none'], 1, 'Closed centre means wing play: push pawns on the side where you have more space.', START),
      { t: 'say', title: 'Cheat sheet', fen: START, text: '**Isolated pawn:** blockade it, attack it.\n**Pawn majority:** make a passed pawn.\n**Carlsbad:** minority attack.\n**Opposite castling:** storm the king.\n**Closed centre:** play on the wings.\n**Open file:** double rooks and invade the 7th.' },
    ],
  },
  {
    id: 'pawn-breaks', part: 1, name: 'Pawn breaks: how to open the position', icon: '💥', level: 'Intermediate', time: '7 min',
    summary: 'A break challenges the enemy pawns on your terms. Find the right one at the right time.',
    steps: [
      { t: 'say', title: 'What is a break?', fen: QGW, text: 'A **pawn break** is a pawn move that attacks an enemy pawn to open the position. When your pieces are ready, a break turns your better setup into real advantage.' },
      { t: 'move', title: 'White\'s break', fen: QGW, ask: 'White is developed. Strike at the centre with the standard queenside break.', answer: ['c2c4'], right: 'c4 challenges d5. It is the main idea in the Queen\'s Gambit structure.', hint: 'Which pawn can attack the d5 pawn?', why: 'A break works when your pieces are ready to use the open lines. White has developed first, so c4 is well prepared.' },
      { t: 'move', title: 'Black\'s break', fen: QGB, ask: 'Black wants freedom. Play the equalising pawn break.', answer: ['c7c5'], right: 'c5 attacks the d4 pawn and frees Black\'s game.', hint: 'The same idea from the other side: a c-pawn move.', why: 'Cramped side: break in the centre. Breaks are how you fight for space and stop being passive.' },
      q('When should you play a break?', ['As early as possible', 'When your pieces are ready to use the open lines', 'Never, keep the pawns'], 1, 'A break opens the position. If your pieces are not ready, you help your opponent.', QGW),
      q('A break that loses a pawn for nothing is useful when…', ['Never', 'It opens lines for strong pieces and gives a clear attack', 'The opponent is rated lower'], 1, 'Gambits and sacrifices are compensated by activity. If no activity follows, it is just a lost pawn.', QGB),
      { t: 'say', title: 'Common breaks', fen: START, text: '**…c5 / c4** against a d-pawn centre. **…e5 / e4** to open the centre. **f4-f5** and **g4** to attack a castled king. **b4-b5** minority attack. Learn which break belongs to your openings: the new Opening Explorer notes them.' },
    ],
  },
  {
    id: 'trades', part: 2, name: 'Outposts and smart trades', icon: '🏰', level: 'Intermediate', time: '7 min',
    summary: 'Which pieces to keep, which to trade, and how to plant a knight on a square the opponent cannot attack.',
    steps: [
      { t: 'tap', title: 'The outpost', fen: OUT, ask: 'Tap White\'s knight on an outpost (a square no enemy pawn can attack).', answer: 'd5', right: 'The knight on d5 cannot be driven away by pawns: Black has no c- or e-pawn to challenge it.', hint: 'The knight is in the centre of the board.', why: 'An outpost knight is stronger than a rook. Plant one and it dominates the whole board.' },
      { t: 'move', title: 'Bring in the reserve', fen: OUT, ask: 'White\'s other knight is on the rim. Reroute it.', answer: ['a3c2'], right: 'Nc2 heads for e3 or b4 and joins the fight.', hint: 'Which square gives the knight a path toward the centre?', why: 'Always improve your worst piece. The d5 knight is already great, now give it a friend.' },
      q('You are ahead in material. What should you do?', ['Keep all the pieces on', 'Trade pieces (not pawns)', 'Attack at all costs'], 1, 'Trading pieces when ahead reduces counterplay. Keep your pawns, remove their pieces.', START),
      q('You are cramped (less space). What should you do?', ['Trade pieces to free your game', 'Avoid all trades', 'Push every pawn'], 0, 'Fewer pieces means less crowding. Each trade frees the position for the side with less room.', START),
      q('Which trade helps you most?', ['Your active bishop for their passive knight', 'Their strong knight for your bad bishop', 'Both are equal'], 1, 'Trade your bad piece for their good one. Never trade your good piece for their bad one.', START),
      { t: 'say', title: 'Trade checklist', fen: START, text: '**Ahead?** trade pieces. **Behind or cramped?** trade your passive piece or avoid it. **Attacking?** keep your attackers. **Their best piece?** trade it.' },
    ],
  },
  {
    id: 'attack-defend', part: 2, name: 'Attack or defend? Decide in 10 seconds', icon: '⚔️', level: 'Intermediate', time: '7 min',
    summary: 'Know when an attack is real and how to defend when you are the one under fire.',
    steps: [
      { t: 'say', title: 'An attack needs three things', fen: OPP, text: 'A king attack works when you have (1) **more pieces near the enemy king**, (2) **open lines** to it, and (3) **no urgent danger** to your own king. Missing one means develop first.' },
      q('Opposite-side castling: who attacks faster?', ['The side whose pawns push first and open files', 'The side with more space', 'Nobody'], 0, 'It is a race. Every tempo wasted on a slow move gives your opponent the winning pace.', OPP),
      q('You are being attacked. Which is the best defence?', ['Counterattack with a check', 'Trade the attacker\'s best pieces, close lines near your king', 'Resign'], 1, 'Trade attackers, close the files, and only then counterattack. Pieces near the king are the attacking force.', OPP),
      q('Before sacrificing, what should you check?', ['If the sacrifice is forced and has a concrete follow-up', 'If it looks cool', 'If the opponent is lower rated'], 0, 'Sacrifices must lead to mate or major material. If you cannot calculate it, do not play it.', OPP),
      { t: 'say', title: 'The 10-second decision', fen: OPP, text: '**Can I attack?** count pieces near the king and open lines.\n**Am I attacked?** check their pawn storm and open files.\n**If neither,** go back to Questions 2 and 3: improve and plan.' },
    ],
  },
  {
 "id": "tactics-radar",
 "part": 2,
 "name": "Tactics radar: spot it before they do",
 "icon": "📡",
 "level": "Beginner",
 "time": "9 min",
 "summary": "Loose pieces, forks, pins, skewers and discovered attacks in real positions.",
 "steps": [
  {
   "t": "say",
   "title": "Why middlegames are lost",
   "fen": "r1bq1rk1/pp3ppp/2n1pn2/2bp4/8/2NP1NP1/PPP1PPBP/R1BQ1RK1 w - - 0 8",
   "text": "Most club games are decided by one tactic, not by long plans. **Before every move ask: what is loose? what are all checks, captures and threats — mine and theirs?** The puzzles below are all real positions where one move wins material."
  },
  {
   "t": "move",
   "title": "Loose piece",
   "fen": "r1b1kb1r/pp2qpp1/7p/8/3np3/2P1B3/PPQ2PPP/R3KB1R w KQkq - 0 12",
   "ask": "Something is undefended. Take it, or attack it.",
   "answer": [
    "e3d4"
   ],
   "right": "Bxd4 wins material.",
   "hint": "Look for a piece with no defender, or a move that makes two threats.",
   "why": "A piece with no defender is free material: always check what is loose."
  },
  {
   "t": "move",
   "title": "Loose piece",
   "fen": "1k1r3r/ppp1q3/2nbpn2/3p1B1p/3P1P2/2P5/PP1NQ1PP/R1B2RK1 b - - 1 16",
   "ask": "Something is undefended. Take it, or attack it.",
   "answer": [
    "e6f5"
   ],
   "right": "exf5 wins material.",
   "hint": "Look for a piece with no defender, or a move that makes two threats.",
   "why": "A piece with no defender is free material: always check what is loose."
  },
  {
   "t": "move",
   "title": "Fork",
   "fen": "r1bqkbnr/1p3ppp/p1n1p3/3p4/4P3/2N1B3/PPP2PPP/RN1QKB1R b KQkq - 1 7",
   "ask": "Find the fork.",
   "answer": [
    "d5d4"
   ],
   "right": "d4 wins material.",
   "hint": "Look for a piece with no defender, or a move that makes two threats.",
   "why": "A fork attacks two things at once; the opponent can only save one."
  },
  {
   "t": "move",
   "title": "Fork",
   "fen": "r1bqk2r/2p2pp1/p2b1n1p/np1Pp1N1/3P4/1B6/PPP2PPP/RNB1QRK1 w kq - 0 11",
   "ask": "Find the fork.",
   "answer": [
    "d4e5"
   ],
   "right": "dxe5 wins material.",
   "hint": "Look for a piece with no defender, or a move that makes two threats.",
   "why": "A fork attacks two things at once; the opponent can only save one."
  },
  {
   "t": "move",
   "title": "Pin",
   "fen": "rnb1kb1r/1p3pp1/2p1pn1p/p1P5/1P1qN3/2B5/P1Q1BPPP/R3K1NR b KQkq - 1 11",
   "ask": "Win material using the pin.",
   "answer": [
    "d4e4"
   ],
   "right": "Qxe4 wins material.",
   "hint": "Look for a piece with no defender, or a move that makes two threats.",
   "why": "A pinned piece cannot move without exposing something more valuable, so it is easy to attack."
  },
  {
   "t": "move",
   "title": "Pin",
   "fen": "r1Bq2k1/r4pp1/1pQ1pb1p/8/P2P4/5P2/3B1P1P/R1R3K1 b - - 0 25",
   "ask": "Win material using the pin.",
   "answer": [
    "f6d4"
   ],
   "right": "Bxd4 wins material.",
   "hint": "Look for a piece with no defender, or a move that makes two threats.",
   "why": "A pinned piece cannot move without exposing something more valuable, so it is easy to attack."
  },
  {
   "t": "move",
   "title": "Skewer",
   "fen": "6k1/p2r4/2b1N2B/2p5/6pK/P6P/6q1/4RR2 b - - 0 34",
   "ask": "Find the skewer.",
   "answer": [
    "g2h3"
   ],
   "right": "Qxh3+ wins material.",
   "hint": "Look for a piece with no defender, or a move that makes two threats.",
   "why": "A skewer hits the big piece first; when it moves, you win what stands behind it."
  },
  {
   "t": "move",
   "title": "Skewer",
   "fen": "1rb5/2q1Q2p/2k2P2/p4R2/2p1P3/8/1pPN2PP/qR1K4 w - - 1 37",
   "ask": "Find the skewer.",
   "answer": [
    "f5c5"
   ],
   "right": "Rc5+ wins material.",
   "hint": "Look for a piece with no defender, or a move that makes two threats.",
   "why": "A skewer hits the big piece first; when it moves, you win what stands behind it."
  },
  {
   "t": "move",
   "title": "Discovered attack",
   "fen": "r1bq3r/1pp3pp/2n1kn2/p1PpN3/3Q4/N1P1B3/PP3PPP/R3KR2 w Q - 3 13",
   "ask": "Find the discovered attack.",
   "answer": [
    "e5c6"
   ],
   "right": "Nxc6 wins material.",
   "hint": "Look for a piece with no defender, or a move that makes two threats.",
   "why": "Moving one piece uncovers an attack from another: two threats in one move."
  },
  {
   "t": "move",
   "title": "Discovered attack",
   "fen": "2k4r/prpn1pb1/1P1P2pp/3p4/3P4/4B2P/P4PPN/1R2R1K1 w - - 0 29",
   "ask": "Find the discovered attack.",
   "answer": [
    "b6c7"
   ],
   "right": "bxc7 wins material.",
   "hint": "Look for a piece with no defender, or a move that makes two threats.",
   "why": "Moving one piece uncovers an attack from another: two threats in one move."
  },
  {
   "t": "say",
   "title": "Your blunder check",
   "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
   "text": "**1. Loose pieces** (mine, theirs). **2. Their last move: what does it threaten?** **3. Checks, captures, threats — in that order.** Do this every move for a week and your middlegame results change. Then train it in the Gym.",
   "cta": {
    "label": "Open the Gym",
    "href": "#/learn/middlegames"
   }
  }
 ]
},
];
export const fastTrackById = (id) => FASTTRACK.find((x) => x.id === id);
