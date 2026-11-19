// Strategy course: the "why" behind good moves. Each lesson mixes short explanations with things to DO on the board.
// Validated by tests/content.test.mjs; every id here is referenced by the road in js/ladder.js (tests/ladder.test.mjs).
export const STRATEGY_PARTS = ['Think like a player', 'Pawns, files and squares', 'Plans and conversion'];

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const q = (ask, options, correct, why, fen) => ({ t: 'quiz', fen, ask, options, correct, why });
const say = (title, text, fen = START, extra = {}) => ({ t: 'say', title, text, fen, ...extra });

export const STRATEGY = [
  {
    id: 'candidate-moves', part: 0, name: 'Candidate moves: how to choose a move', icon: '🧭', level: 'Beginner', time: '6 min',
    summary: 'A repeatable routine so you stop playing the first move you see.',
    steps: [
      say('The first move you see is rarely the best', 'Strong players do not search every move. They list **2-3 candidate moves**, test each against the opponent\'s best reply, then choose.\nThe routine: **(1) What is my opponent threatening? (2) List forcing moves: checks, captures, threats. (3) For each candidate ask "what is their best answer?" (4) Play the move that still works after that answer.**'),
      { t: 'move', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4', ask: 'Run the routine. You have a check that wins on the spot. Find it.', answer: ['f3f7'], right: 'Qxf7# is checkmate: the bishop on c4 protects the queen, and the king has no escape.', hint: 'Checks first. Which square next to the king is attacked twice and defended once?', why: 'Because you looked at checks BEFORE quiet moves, you found a mate in one. Always start with forcing moves.' },
      q('You find a good-looking capture. What is the next step?', ['Play it immediately', 'Check what your opponent can do in reply', 'Look for another capture'], 1, 'A move is only as good as the opponent\'s best answer to it. Always check their reply before you press the button.'),
    ],
    takeaways: ['List 2-3 candidates, not just one.', 'Forcing moves first: checks, captures, threats.', 'Test each candidate against their best reply.'],
    practice: { label: 'Practice puzzles', href: '#/train/puzzles' },
  },
  {
    id: 'piece-activity', part: 0, name: 'Piece activity: put every piece to work', icon: '⚡', level: 'Beginner', time: '6 min',
    summary: 'Active pieces control squares and make threats; passive pieces just sit.',
    steps: [
      say('Why activity matters', 'A piece is **active** when it controls many squares and can reach the action quickly. A piece is **passive** when it is blocked by its own pawns or stuck on the edge.\nA simple rule: **knights belong near the centre, bishops on open diagonals, rooks on open files.** Before each move ask: **"Which of my pieces is doing the least?"** and improve that one.'),
      { t: 'move', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 4', ask: 'Your bishop on f1 is asleep. Wake it up on its best diagonal.', answer: ['f1c4', 'f1b5'], right: 'Both Bc4 and Bb5 put the bishop on an active diagonal where it eyes the centre and the enemy king.', hint: 'Open a diagonal for the bishop towards the opponent\'s side.', why: 'Developing a piece to an active square is worth more than a pawn move because it adds a new attacker.' },
      q('Which piece is the most passive?', ['A knight on e5 in the centre', 'A knight on a1 in the corner', 'A bishop on an open diagonal'], 1, 'A knight on the edge attacks fewer squares. "A knight on the rim is dim."'),
    ],
    takeaways: ['Ask "which piece is doing the least?"', 'Knights to the centre, rooks to open files.', 'Activity beats a small material gain in the opening.'],
    practice: { label: 'Play with Coach', href: '#/coach-play' },
  },
  {
    id: 'pawn-structure', part: 1, name: 'Pawn structure: strengths and weaknesses', icon: '🧱', level: 'Intermediate', time: '7 min',
    summary: 'Pawns cannot move backwards, so their weaknesses last the whole game.',
    steps: [
      say('Pawns are the skeleton', 'Every other piece can retreat. **Pawns cannot.** So pawn weaknesses are permanent targets.\nThe common ones: **isolated** pawn (no friendly pawn on the neighbouring files), **doubled** pawns (two on one file) and **backward** pawns (cannot advance safely and cannot be protected by another pawn).'),
      { t: 'tap', fen: '4k3/pp3ppp/8/3p4/8/8/PP3PPP/4K3 w - - 0 1', ask: 'Tap Black\'s isolated pawn.', answer: 'd5', right: 'The d5 pawn has no pawns on the c or e files to protect it, so only pieces can defend it.', hint: 'Look for a pawn with no pawn friends on either side.', why: 'An isolated pawn must be guarded by pieces, which ties them down. That is why you attack it.' },
      q('Which is generally a weakness?', ['A pawn chain', 'Doubled isolated pawns', 'A pawn in the centre defended by another pawn'], 1, 'Doubled and isolated pawns cannot defend each other and are hard to protect.'),
      say('Strong structures', 'A **pawn chain** (diagonal pawns protecting each other) and a **healthy centre** are strengths. Break a chain at its **base**, the pawn that holds everything up.'),
    ],
    takeaways: ['Pawn weaknesses are permanent: attack them.', 'Isolated, doubled and backward pawns are targets.', 'Protected pawn chains are strong.'],
  },
  {
    id: 'open-files', part: 1, name: 'Open files and the rook', icon: '🛣️', level: 'Intermediate', time: '6 min',
    summary: 'Rooks need open lines. Learn to claim them and invade.',
    steps: [
      say('Rooks love open lines', 'An **open file** has no pawns. A **half-open file** has only the enemy\'s pawn. Rooks are weak behind their own pawns and monsters on open files.\nPlan: **put a rook on the open file, double rooks, then invade the 7th rank** where pawns are easy targets.'),
      { t: 'tap', fen: '6k1/pp3ppp/8/8/8/8/PP3PPP/R5K1 w - - 0 1', ask: 'Tap any square on the open d-file.', answer: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'], right: 'Right. The c, d and e files have no pawns, so they are open.', hint: 'Which files have no pawns on them at all?' },
      { t: 'move', fen: '6k1/pp3ppp/8/8/8/8/PP3PPP/R5K1 w - - 0 1', ask: 'Put the rook on an open file.', answer: ['a1c1', 'a1d1', 'a1e1'], right: 'A rook on an open file controls the whole file and can invade.', hint: 'Slide the rook to the c, d or e file.', why: 'On an open file the rook attacks along a whole line. Behind your own pawns it does nothing.' },
    ],
    takeaways: ['Open file = no pawns; half-open = enemy pawn only.', 'Put rooks on open files, then double them.', 'The 7th rank is the invasion target.'],
  },
  {
    id: 'outposts', part: 1, name: 'Outposts and good vs bad bishops', icon: '🏰', level: 'Intermediate', time: '7 min',
    summary: 'A knight no pawn can attack is a monster. Bishops live and die by their pawns.',
    steps: [
      say('The outpost', 'An **outpost** is a square in enemy territory that **no enemy pawn can attack**, ideally protected by your own pawn. A knight there is nearly untouchable and attacks key squares.'),
      { t: 'move', fen: '4k3/pp3ppp/8/8/8/2N5/PP3PPP/4K3 w - - 0 1', ask: 'Black has no c- or e-pawn. Plant your knight on the outpost.', answer: ['c3d5'], right: 'Nd5! No black pawn can ever attack it.', hint: 'Which central square can no black pawn reach?', why: 'The knight cannot be chased away by a pawn, so it stays forever and dominates the squares around it.' },
      say('Good and bad bishops', 'A **bad bishop** is blocked by its own pawns standing on the same colour. A **good bishop** has pawns on the opposite colour. Trade your bad bishop or put your pawns on the other colour.'),
      q('Your pawns are on light squares. Which bishop is bad?', ['The light-squared bishop', 'The dark-squared bishop'], 0, 'Pawns on light squares block the light-squared bishop.'),
    ],
    takeaways: ['Outpost = square no enemy pawn can attack.', 'Knights shine on outposts.', 'Keep pawns on the colour opposite your bishop.'],
  },
  {
    id: 'king-safety', part: 1, name: 'King safety: castle and keep the shield', icon: '🏯', level: 'Intermediate', time: '6 min',
    summary: 'Most attacks win because the king is exposed. Make yours safe first.',
    steps: [
      say('Why the king needs shelter', 'In the opening and middlegame the king is a target, not a fighter. **Castle early**, keep the **pawn shield** (f, g, h) untouched and do not open lines near your king unless you are ready.'),
      { t: 'move', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 5', ask: 'Your king is in the centre and lines may open. Secure it.', answer: ['e1g1'], right: 'Castling kingside tucks the king away and brings the rook into play in one move.', hint: 'One move does two jobs: king safe, rook active.', why: 'Castling is the safest and fastest way to protect the king and connect your rooks.' },
      q('Which pawn move near your castled king is most risky?', ['Moving the g-pawn forward', 'Moving the a-pawn', 'Moving the c-pawn'], 0, 'The g-pawn is the heart of the shield; moving it creates holes for enemy pieces.'),
    ],
    takeaways: ['Castle early.', 'Keep f, g, h pawns where they are.', 'Attack when the enemy king is exposed, defend when yours is.'],
  },
  {
    id: 'trading', part: 1, name: 'When to trade pieces', icon: '🔁', level: 'Intermediate', time: '6 min',
    summary: 'Trades change the game. Learn when they help you.',
    steps: [
      say('Trade with a reason', 'Rules of thumb: **when ahead, trade pieces** (the extra material counts more). **When behind, avoid trades** and keep tension. **Trade a defender** to expose a weakness, and **trade your bad piece for their good one**.'),
      q('You are a rook up. What is the best approach?', ['Avoid all trades', 'Trade pieces and simplify', 'Attack with everything immediately'], 1, 'With extra material, fewer pieces make the advantage bigger and the opponent\'s counterplay smaller.'),
      q('Your opponent attacks your king with queen and knight. What helps?', ['Trading their attacking pieces', 'Adding more pieces to the king side', 'Pushing pawns'], 0, 'Attacks need pieces. Trade off the attackers and the danger disappears.'),
    ],
    takeaways: ['Ahead: trade. Behind: keep pieces.', 'Trade bad pieces for their good ones.', 'Trade attackers when defending.'],
  },
  {
    id: 'weak-squares', part: 1, name: 'Weak squares and holes', icon: '🕳️', level: 'Advanced', time: '6 min',
    summary: 'A square no pawn can defend is a permanent invitation for your pieces.',
    steps: [
      say('Holes', 'When a pawn moves, it stops guarding the squares it used to control. A **hole** is a square an enemy pawn can never guard again. Put a piece there and it cannot be chased away.'),
      { t: 'tap', fen: '4k3/p4ppp/1p1p4/8/8/8/PP3PPP/4K3 w - - 0 1', ask: 'Tap a square on the 6th rank that no Black pawn can ever defend.', answer: ['c6', 'a6'], right: 'The b-pawn and d-pawn have left the 7th rank, so no pawn guards c6 (or a6).', hint: 'Which pawns used to guard c6? They are no longer there.', why: 'Pawns can only guard diagonally forward. When they advance, the squares behind them become holes.' },
      q('When is a hole most valuable?', ['When your pieces can reach it', 'When it is on your own side', 'In the corner'], 0, 'A hole matters only if you can put a piece on it, ideally a knight.'),
    ],
    takeaways: ['Pawn moves create holes behind them.', 'Plant a knight on a hole.', 'Before pushing a pawn, ask what it stops guarding.'],
  },
  {
    id: 'initiative', part: 2, name: 'The initiative: keep making threats', icon: '🏃', level: 'Advanced', time: '6 min',
    summary: 'The side making threats decides the game; the other side only reacts.',
    steps: [
      say('Tempo and initiative', 'The **initiative** means your moves create threats, so the opponent must respond. Each forced reply is a move they did not spend on their own plans. Use it to **develop, attack or grab space**, and do not give it away with a quiet move unless you have a better plan.'),
      q('You have the initiative and your opponent has one safe move. What do you do?', ['Make another threat', 'Retreat to be safe', 'Wait'], 0, 'Keep the pressure. Each new threat keeps them reacting.'),
      q('When is it right to give up the initiative?', ['When you can win material safely', 'Never', 'Always when you are ahead'], 0, 'Initiative is a tool, not a goal. Cash it in for something concrete.'),
    ],
    takeaways: ['Threats force replies.', 'Keep making useful threats.', 'Convert initiative into something concrete.'],
  },
  {
    id: 'prophylaxis', part: 2, name: 'Prophylaxis: stop their plan first', icon: '🛡️', level: 'Advanced', time: '6 min',
    summary: 'Ask "what does my opponent want?" and take it away.',
    steps: [
      say('The question of champions', 'Prophylaxis means preventing the opponent\'s idea **before** it happens. Every move, ask: **"If I did nothing, what would they play?"** Often the best move improves your position and stops that plan at the same time.'),
      q('Your opponent wants to play ...Nb4 hitting your bishop. What is a prophylactic move?', ['a3, taking b4 away', 'Ignore it', 'Attack on the other side'], 0, 'a3 stops Nb4 and keeps your bishop safe at the same time.'),
      q('The best prophylactic moves are usually...', ['Moves that also improve your position', 'Pure waiting moves', 'Pawn sacrifices'], 0, 'Good prophylaxis does two jobs: it stops their plan and helps yours.'),
    ],
    takeaways: ['Ask what the opponent wants.', 'Stop it quietly before it happens.', 'Choose moves that also improve your position.'],
  },
  {
    id: 'converting', part: 2, name: 'Converting an advantage', icon: '🏆', level: 'Advanced', time: '6 min',
    summary: 'Being ahead is not winning. Learn the technique to finish the job.',
    steps: [
      say('Technique', 'To convert: **1. Stay safe** - remove counterplay. **2. Trade pieces, not pawns.** **3. Create a second weakness** to stretch the defender. **4. Do not rush.** There is no prize for finishing quickly.'),
      q('You are up a piece. Your opponent offers a rook trade. What do you do?', ['Accept: fewer pieces helps you', 'Refuse', 'Offer a draw'], 0, 'Trades turn a small edge into a decisive one.'),
      q('What is the biggest risk when converting?', ['Rushing and allowing counterplay', 'Trading queens', 'Castling'], 0, 'Most won games are lost by hurrying. Check their threats on every move.'),
    ],
    takeaways: ['Stay safe, trade pieces, be patient.', 'A second weakness stretches the defence.', 'Never stop checking their threats.'],
  },
  {
    id: 'planning', part: 2, name: 'Making a plan', icon: '🗺️', level: 'Advanced', time: '7 min',
    summary: 'A bad plan beats no plan. A simple 4-step method to find one.',
    steps: [
      say('How to find a plan', '**1. Evaluate:** who is better and why (material, king safety, activity, pawns)? **2. Find the weakness** in their position or the best square for your worst piece. **3. Choose the plan:** attack the weakness, improve the worst piece, or create a pawn break. **4. Check tactics** every move.'),
      q('Your king is safe and their king is exposed. What kind of plan?', ['Attack the king', 'Trade queens', 'Wait for mistakes'], 0, 'Attack where the opponent is weakest.'),
      q('You have no weaknesses to attack. What is a sound plan?', ['Improve your worst piece', 'Push random pawns', 'Resign'], 0, 'When nothing is forced, improve your worst piece. It always adds value.'),
    ],
    takeaways: ['Evaluate, find the weakness, choose a plan, check tactics.', 'Improve your worst piece when nothing is forced.', 'Plans change as the position changes.'],
  },
];
