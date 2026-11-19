import { STRATEGY as STRATEGY_LIST } from './strategy.js';
// Tactics course. Positions are validated by tests/content.test.mjs and verified with Stockfish by scripts/verify-content.mjs.
export const TACTICS_PARTS = ['Win material', 'Attack the king', 'Think like a tactician'];

const puz = (theme, n, title, ask, maxMoves) => ({ t: 'puzzles', theme, n, title, ask, maxMoves });

export const TACTICS = [
  {
    id: 'what-is-tactics', part: 2, name: 'What is a tactic? The tactician\'s routine', icon: '🧠', level: 'Beginner', time: '5 min',
    summary: 'The three questions that find tactics: checks, captures, threats.',
    steps: [
      { t: 'say', title: 'Tactics decide games', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: 'A **tactic** is a short sequence of forcing moves that wins material or checkmates. Most games below master level are decided by a tactic: one side sees it, the other does not.\nThe good news: tactics follow **patterns**. The more patterns you recognise, the faster you spot them. This course teaches the patterns one by one.' },
      { t: 'say', title: 'Checks, captures, threats', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: 'Every move, look at your forcing moves in this order:\n**1. Checks** — can I give check? Checks force a reply.\n**2. Captures** — can I take something for free, or win a trade?\n**3. Threats** — can I create a threat that the opponent cannot meet?\nAnd then do the same for **your opponent**: what are *their* checks, captures and threats after my move? That second half is how you stop blundering.' },
      { t: 'quiz', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ask: 'Which should you look at first when searching for a tactic?', options: ['Quiet pawn moves', 'Checks, captures and threats', 'Moves that look pretty'], correct: 1, why: 'Forcing moves leave the opponent with fewer replies, so they are easy to calculate — and they are where tactics hide.' },
    ],
    takeaways: ['Tactics are short forcing sequences.', 'Look at checks, captures, threats — for both sides.', 'Patterns make tactics fast to see.'],
  },
  {
    id: 'forks', part: 0, name: 'Forks: attacking two things at once', icon: '🍴', level: 'Beginner', time: '8 min',
    summary: 'One piece attacks two targets — the opponent can only save one.',
    steps: [
      { t: 'say', title: 'The fork', fen: 'r3k3/8/4N3/8/8/8/8/4K3 w - - 0 1', arrows: ['e6c7:g'], hl: ['c7'], text: 'A **fork** is when **one piece attacks two (or more) enemy pieces at the same time**. Your opponent can only fix one problem per move, so you win the other.\nAny piece can fork, but **knights** are the most dangerous forkers because their L-shaped attack cannot be blocked and most pieces cannot attack a knight back safely. Look at this position: a knight on c7 would attack both the king and the rook.' },
      { t: 'move', fen: 'r3k3/8/4N3/8/8/8/8/4K3 w - - 0 1', ask: 'Find the fork: attack the king and the rook with your knight.', line: ['e6c7', 'e8d7', 'c7a8'], right: 'Nc7+ is a **royal fork** — a fork of the king and another piece. The king must move, and you capture the rook.', after: 'Because the king is one of the targets (check), the opponent has no time to save the other piece.', hint: 'Which square attacks e8 and a8 at the same time?', wrong: { e6g7: 'Ng7+ checks the king but does not attack the rook.' } },
      { t: 'move', title: 'Pawn forks', fen: '4k3/8/8/2n1b3/8/2PP4/8/4K3 w - - 0 1', ask: 'Pawns can fork too. Win a piece by forking the knight and the bishop.', answer: ['d3d4'], right: 'd4! The pawn attacks both c5 and e5. Neither Black piece can capture it without losing a piece, because the pawn is protected by c3. Pawn forks are cheap and powerful.', hint: 'Push a pawn so it attacks both pieces diagonally.' },
      { t: 'move', title: 'Queen forks', fen: 'r5k1/8/8/8/8/8/8/3QK3 w - - 0 1', ask: 'Queens fork along lines. Find the check that also attacks the rook on a8.', line: ['d1d5', 'g8g7', 'd5a8'], right: 'Qd5+ attacks the king on g8 and the rook on a8 along two diagonals.', hint: 'Which square is on the same diagonal as both the king and the rook?' },
      { t: 'say', title: 'Spotting forks', fen: 'r3k3/8/4N3/8/8/8/8/4K3 w - - 0 1', text: 'How to find forks:\n• Look for **undefended pieces** or pieces of higher value (king, queen, rook).\n• For each of your knights, ask "where could I land to attack two of them?"\n• **Check forks** are the strongest.\n• Defence: before you move, ask "can the enemy knight jump to a square that hits two of my pieces?"' },
      puz('fork', 4, 'Fork puzzle', 'Find the fork.'),
    ],
    takeaways: ['A fork attacks two targets with one piece.', 'Knights, pawns and queens fork most often.', 'A fork with check wins material by force.'],
    practice: { label: 'Practice fork puzzles', href: '#/train/puzzles' },
  },
  {
    id: 'pins', part: 0, name: 'Pins: the frozen piece', icon: '📌', level: 'Beginner', time: '8 min',
    summary: 'A piece that cannot move without exposing something more valuable.',
    steps: [
      { t: 'say', title: 'What is a pin?', fen: '4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1', arrows: ['f1b5:g'], text: 'A **pin** is an attack on a piece that **cannot move** because a more valuable piece stands behind it on the same line.\nIf the piece behind is the **king**, the pin is **absolute**: the pinned piece is not allowed to move at all. If it is a queen or rook, the pin is **relative**: the piece *can* move, but it would lose the one behind.' },
      { t: 'move', fen: '4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1', ask: 'Pin the knight on c6 to the king.', answer: ['f1b5'], right: 'Bb5 pins the knight: if it moves, the bishop captures the king... which is illegal for Black to allow, so the knight is frozen. Frozen pieces can be attacked again and again.', hint: 'Put the bishop on the diagonal between c6 and e8.' },
      { t: 'move', title: 'A relative pin', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 0 1', ask: 'Pin the knight on f6 to the queen on d8.', answer: ['c1g5'], right: 'Bg5 pins Nf6 to the queen. If the knight moves, Bxd8 wins the queen. The knight is also no longer a good defender of the centre.', hint: 'Which diagonal leads from c1 through f6 to d8?' },
      { t: 'say', title: 'Using pins', fen: '4k3/8/2n5/1B6/8/8/8/4K3 b - - 0 1', arrows: ['b5c6:r', 'c6e8:r'], text: 'What to do with a pin:\n• **Attack the pinned piece again** with a pawn or another piece. It cannot run away.\n• Pinned pieces cannot **defend** the squares they would normally protect.\n• Pin it to something valuable: king, queen, rook.\nDefence: **unpin** by moving the piece behind, blocking, or breaking the pin with a pawn move (like ...h6 against Bg5).' },
      puz('pin', 4, 'Pin puzzle', 'Use the pin.'),
    ],
    takeaways: ['A pinned piece cannot move without losing something bigger.', 'Absolute pin: behind it is the king.', 'Attack the pinned piece again to win it.'],
    practice: { label: 'Practice pin puzzles', href: '#/train/puzzles' },
  },
  {
    id: 'skewers', part: 0, name: 'Skewers: the pin in reverse', icon: '🍢', level: 'Beginner', time: '5 min',
    summary: 'Attack the valuable piece first; when it moves, take what is behind.',
    steps: [
      { t: 'say', title: 'What is a skewer?', fen: '4q3/8/8/4k3/8/8/8/R5K1 w - - 0 1', arrows: ['a1e1:g'], text: 'A **skewer** is a pin in reverse. You attack a **valuable** piece (often the king) that must move, and the less valuable piece behind it falls.\nHere, a rook check on e1 would force the king off the e-file — and the queen on e8 is then undefended.' },
      { t: 'move', fen: '4q3/8/8/4k3/8/8/8/R5K1 w - - 0 1', ask: 'Skewer the king and the queen.', line: ['a1e1', 'e5d5', 'e1e8'], right: 'Re1+ — the king has to move out of the line, and Rxe8 wins the queen.', hint: 'Give check along the e-file.' },
      { t: 'say', title: 'Pin or skewer?', fen: '4q3/8/8/4k3/8/8/8/R5K1 w - - 0 1', text: '**Pin**: the less valuable piece is in front and cannot move. **Skewer**: the more valuable piece is in front and must move. Both tactics use long-range pieces — **rooks, bishops and queens** — on files, ranks and diagonals.\nTip: when you see two enemy pieces on the same line, with the bigger one in front, look for a skewer.' },
    ],
    takeaways: ['Skewer: valuable piece in front, weaker piece behind.', 'Used by rooks, bishops and queens.', 'Skewers with check are the strongest.'],
    practice: { label: 'Practice skewer puzzles', href: '#/train/puzzles' },
  },
  {
    id: 'discovered', part: 0, name: 'Discovered attacks', icon: '🎭', level: 'Intermediate', time: '7 min',
    summary: 'Move one piece to reveal an attack from another — and give a second threat.',
    steps: [
      { t: 'say', title: 'Unmasking the attacker', fen: '4q1k1/8/8/8/4N3/8/8/4R1K1 w - - 0 1', arrows: ['e1e8:g'], text: 'A **discovered attack** happens when you move a piece out of the way and reveal an attack from a piece **behind** it. The moving piece can make its **own threat** at the same time, so the opponent faces two things at once.\nHere the rook on e1 is aimed at the queen, but your own knight blocks the file.' },
      { t: 'move', fen: '4q1k1/8/8/8/4N3/8/8/4R1K1 w - - 0 1', ask: 'Move the knight with check, uncovering the rook\'s attack on the queen.', line: ['e4f6', 'g8g7', 'e1e8'], right: 'Nf6+ is a **discovered attack with check**: the knight checks the king and the rook attacks the queen. Black must answer the check, so Rxe8 wins the queen.', wrong: { e4d6: 'Nd6 attacks the queen, but it is not check, so Black plays Qxe1+ first.', e4g5: 'Moving the knight with no threat lets Black capture the rook with Qxe1+.' }, hint: 'The knight has to give check from its new square.' },
      { t: 'say', title: 'Why they are so strong', fen: '4q1k1/8/8/8/4N3/8/8/4R1K1 w - - 0 1', text: 'Discovered attacks work best when:\n• the moving piece gives **check** (the opponent has no time),\n• or the moving piece attacks a **big target** itself,\n• or it captures something while revealing the attack.\nDefence: watch for your pieces lined up **behind** another piece on a file, rank or diagonal.' },
      puz('discovered', 4, 'Discovered attack puzzle', 'Find the discovered attack.'),
    ],
    takeaways: ['Move a blocker to reveal a hidden attack.', 'Discovered check wins the most.', 'The moving piece can make its own threat.'],
    practice: { label: 'Practice discovered puzzles', href: '#/train/puzzles' },
  },
  {
    id: 'remove-defender', part: 0, name: 'Removing the defender', icon: '🗡️', level: 'Intermediate', time: '5 min',
    summary: 'Eliminate the piece that protects your target.',
    steps: [
      { t: 'say', title: 'Who guards the target?', fen: '4k3/8/2p5/1B1n4/8/8/8/3RK3 w - - 0 1', arrows: ['b5c6:g', 'c6d5:r', 'd1d5:g'], text: 'Sometimes an enemy piece is protected — but only by **one** defender. If you can **capture or chase away the defender**, the target falls.\nHere the knight on d5 is defended only by the pawn on c6. Your rook already attacks the knight, so the pawn is holding everything together.' },
      { t: 'move', fen: '4k3/8/2p5/1B1n4/8/8/8/3RK3 w - - 0 1', ask: 'Eliminate the defender with a capture that also gives check.', line: ['b5c6', 'e8e7', 'd1d5'], right: 'Bxc6+ removes the defender with check. Now the knight on d5 is attacked twice and not defended — Rxd5 wins it.', hint: 'Capture the pawn on c6.' },
      { t: 'say', title: 'The pattern', fen: '4k3/8/2p5/1B1n4/8/8/8/3RK3 w - - 0 1', text: 'Whenever you want to win a piece, ask: **"What is defending it, and can I get rid of that?"** You can remove a defender by **capturing** it, **attacking** it, **pinning** it, or **deflecting** it.\nThe same question applies to your own position: if your piece has only one defender, that defender is a target.' },
    ],
    takeaways: ['Look at who protects the target.', 'Capture, chase, or pin the defender.', 'Your own lone defenders are targets too.'],
  },
  {
    id: 'hanging-pieces', part: 0, name: 'Loose pieces and free captures', icon: '🎁', level: 'Beginner', time: '6 min',
    summary: 'Spot undefended pieces — yours and theirs.',
    steps: [
      { t: 'say', title: '"Loose pieces drop off"', fen: '4k3/8/8/3n4/8/8/8/3RK3 w - - 0 1', arrows: ['d1d5:g'], text: 'A piece is **loose** (or hanging) when it is attacked and not protected enough. The most common reason beginners lose games is that they leave pieces loose — and do not notice when the opponent does.\nEach move, scan all pieces: is anything attacked? Is it defended? Can I win it with a cheaper piece?' },
      { t: 'move', fen: '4k3/8/8/3n4/8/8/8/3RK3 w - - 0 1', ask: 'Take the loose piece.', answer: ['d1d5'], right: 'Rxd5 — a free knight.' },
      puz('hangingPiece', 5, 'Spot the loose piece', 'Find the best capture or attack.', 3),
    ],
    takeaways: ['Check: attacked? defended?', 'Win loose pieces with cheaper attackers.', 'Never leave yours loose.'],
    practice: { label: 'Practice puzzles', href: '#/train/puzzles' },
  },
  {
    id: 'back-rank', part: 1, name: 'Back-rank mates', icon: '🚪', level: 'Beginner', time: '7 min',
    summary: 'The king trapped behind its own pawns.',
    steps: [
      { t: 'say', title: 'A king with no air', fen: '3r2k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1', arrows: ['d1d8:g'], text: 'The **back-rank mate** is the most common checkmate in chess. A king stuck behind its own pawns has no escape squares, so a rook or queen check on the back rank is mate.' },
      { t: 'move', fen: '3r2k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1', ask: 'Capture on d8 for checkmate.', answer: ['d1d8'], right: 'Rxd8#. The king\'s own pawns block f8... all escape squares.' },
      { t: 'move', title: 'Defending: make "luft"', fen: '3r2k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1', ask: 'Now YOUR king is the one without air. Black threatens ...Rd1#. Fix it with one move.', answer: ['h2h3', 'g2g3', 'f2f3', 'h2h4', 'g1f1'], right: 'A pawn move gives the king an escape square (called **luft**, German for "air"). The same idea saves countless games.', hint: 'Make a hole in front of your king.' },
      { t: 'say', title: 'Build the habit', fen: '3r2k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1', text: 'Early in the game, ask "does my king have an escape square?" If not, make **luft** (h3 or g3) at a quiet moment. When attacking, look at the **back rank of the opponent**: if their king is boxed in and their rook has left, a check might be mate.' },
      puz('mate', 3, 'Mate puzzle', 'Look for mate in a few moves.'),
    ],
    takeaways: ['The back rank is deadly when the king has no air.', 'Make luft with h3/g3.', 'Look for checks on the back rank.'],
    practice: { label: 'Practice mate puzzles', href: '#/train/puzzles' },
  },
  {
    id: 'mating-patterns', part: 1, name: 'Classic mating patterns', icon: '👑', level: 'Intermediate', time: '8 min',
    summary: 'Scholar\'s mate and the smothered mate.',
    steps: [
      { t: 'say', title: 'Scholar\'s mate: learn it to avoid it', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1', arrows: ['f3f7:g', 'c4f7:g'], text: 'Many beginners fall for a four-move trick: queen and bishop both target f7, the weakest point in Black\'s camp (guarded only by the king).' },
      { t: 'move', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1', ask: 'Black ignored the threat. Deliver checkmate.', answer: ['f3f7'], right: 'Qxf7#. The bishop on c4 protects the queen, so the king cannot capture. As Black, always watch f7 (and as White, f2).' },
      { t: 'say', title: 'The smothered mate', fen: '6rk/6pp/8/6N1/8/8/8/4K3 w - - 0 1', arrows: ['g5f7:g'], text: 'A **smothered mate** is a knight checkmate where the king is **surrounded by its own pieces**. It is the only piece that can give check without being blocked, which is why only knights do it.' },
      { t: 'move', fen: '6rk/6pp/8/6N1/8/8/8/4K3 w - - 0 1', ask: 'Deliver the smothered mate.', answer: ['g5f7'], right: 'Nf7#. The king cannot move — its own rook and pawns box it in — and nothing can capture the knight.' },
      puz('mate', 3, 'Mating puzzle', 'Find the mate.'),
    ],
    takeaways: ['Watch f7/f2: the weakest squares at the start.', 'Knights can mate kings that are boxed in by their own pieces.', 'Look for patterns, then calculate.'],
    practice: { label: 'Practice mate puzzles', href: '#/train/puzzles' },
  },
  {
    id: 'defensive', part: 2, name: 'Defensive tactics and counter-threats', icon: '🛟', level: 'Intermediate', time: '5 min',
    summary: 'The best defence finds the opponent\'s idea first.',
    steps: [
      { t: 'say', title: 'Ask "what does my opponent want?"', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: 'Before you play, always ask: **"If I pass, what would my opponent do?"** That is their threat. Your move must deal with it — by moving the piece, protecting it, blocking, or making a bigger threat of your own.' },
      puz('defensive', 4, 'Defend!', 'Find the move that saves the position.'),
    ],
    takeaways: ['Find the opponent\'s threat first.', 'Solve it with move, protect, block, or counter-attack.'],
    practice: { label: 'Practice puzzles', href: '#/train/puzzles' },
  },
  {
    id: 'sacrifices', part: 2, name: 'Sacrifices: giving material to win more', icon: '💎', level: 'Advanced', time: '5 min',
    summary: 'When a sacrifice works — and when it does not.',
    steps: [
      { t: 'say', title: 'Pay now, collect later', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: 'A **sacrifice** is a deliberate loss of material for a bigger gain: checkmate, a stronger position or even more material later. The rule of thumb:\n**Only sacrifice if you can calculate the follow-up to the end** — usually a mate or a clear win of material.\nA sacrifice that "looks like an attack" but does not win by force is just a blunder.' },
      puz('sacrifice', 3, 'Sacrifice puzzle', 'Find the winning sacrifice.'),
    ],
    takeaways: ['Calculate to the end before sacrificing.', 'Forcing moves make calculation easier.'],
    practice: { label: 'Practice puzzles', href: '#/train/puzzles' },
  },
];

export { STRATEGY, STRATEGY_PARTS } from './strategy.js';
export const strategyById = (id) => STRATEGY_LIST.find((t) => t.id === id);
export const tacticById = (id) => TACTICS.find((t) => t.id === id);
