// "How to Play Chess": an interactive beginner course. Every lesson is a list of steps run by js/learn/lesson.js.
// Step kinds: say | tap | squares | move | quiz | sandbox. Positions are validated by tests/content.test.mjs.

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const BASICS_PARTS = ['Part 1 · Meet the pieces', 'Part 2 · The rules of the game', 'Part 3 · The three golden rules', 'Part 4 · Playing your first games'];

export const BASICS = [
  /* ------------------------------------------------------------ Part 1 */
  {
    id: 'board', part: 0, name: 'The board and the army', icon: '♟', level: 'Start here', time: '4 min',
    summary: 'Ranks, files, squares and how the pieces start.',
    steps: [
      { t: 'say', title: 'Welcome to chess', fen: START, text: 'Hi, I am your coach. Chess is a game for two players on an **8×8 board** of 64 squares. One side plays **White**, the other **Black**. White always moves first, and then you take turns, one move each.\nEach side starts with 16 pieces. Let me show you how they line up.' },
      { t: 'say', title: 'Files, ranks and squares', fen: START, hl: ['a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'], text: 'The columns are called **files** and are named with the letters **a to h** along the bottom. The rows are called **ranks** and are numbered **1 to 8** up the side. Every square has a name made of its file and rank — the highlighted square on the left is **a1**.\nYou will see these letters and numbers around every board in this app. They are how we talk about moves.' },
      { t: 'tap', title: 'Try it: find a square', fen: START, ask: 'Tap the square e2.', answer: 'e2', right: 'Yes — file e, rank 2. That is where White\'s king-side pawn starts.', hint: 'Find the letter e along the bottom, then go up to the number 2.' },
      { t: 'tap', fen: START, ask: 'Tap the square g8.', answer: 'g8', right: 'Right: g8 is where Black\'s king-side knight starts.', hint: 'g is the second-to-last file; 8 is Black\'s back rank at the top.' },
      { t: 'say', title: 'The setup', fen: START, hl: ['a1', 'h1', 'a8', 'h8'], text: 'Set the board so that each player has a **light square in their right-hand corner**. A good memory trick: "light on the right".\nOn the back rank the pieces go: **rook, knight, bishop, queen, king, bishop, knight, rook**. In front of them stand **eight pawns**.\n**The queen goes on her own colour**: the white queen on a light square (d1), the black queen on a dark square (d8).' },
      { t: 'quiz', fen: START, ask: 'What colour is the square in the bottom-right corner (h1) from White\'s side?', options: ['Dark', 'Light'], correct: 1, why: 'Light on the right! If you ever sit down to a board with a dark square there, it has been turned the wrong way.' },
      { t: 'tap', fen: START, ask: 'Tap the white queen.', answer: 'd1', right: 'The white queen starts on d1 — on a light square. "Queen on her colour".', hint: 'The queen is next to the king, on the left from White\'s side.' },
      { t: 'say', title: 'The goal of the game', fen: START, text: 'The goal is to **checkmate** the enemy king: attack it so that it cannot escape. You never actually capture the king. We will learn how that works soon.\nFirst, let us meet the pieces one at a time. Each one moves differently.' },
    ],
    takeaways: ['Files are a–h, ranks are 1–8, and every square has a name like e4.', 'Light square on the right; queen on her own colour.', 'The goal is checkmate, not capturing the king.'],
  },
  {
    id: 'rook', part: 0, name: 'The rook', icon: '♜', level: 'Beginner', time: '4 min',
    summary: 'Straight lines along ranks and files.',
    steps: [
      { t: 'say', title: 'The rook moves in straight lines', fen: '4k3/8/8/8/3R4/8/8/4K3 w - - 0 1', arrows: ['d4d8:g', 'd4d1:g', 'd4a4:g', 'd4h4:g'], text: 'The **rook** moves any number of squares **in a straight line: forwards, backwards or sideways**. Never diagonally. It cannot jump over other pieces.\nA rook is worth about **5 points**, so it is a major piece.' },
      { t: 'squares', fen: '4k3/8/8/8/3R4/8/8/4K3 w - - 0 1', piece: 'd4', ask: 'Tap every square the rook on d4 can move to. (There are 14.)', right: 'Perfect — 7 along the d-file and 7 along the 4th rank, always 14 from an open board.', hint: 'Think of a plus sign (+) centred on the rook.' },
      { t: 'move', title: 'Capturing', fen: '4k3/8/8/3p4/3R4/8/8/4K3 w - - 0 1', ask: 'Pieces capture by moving onto an enemy piece and removing it. Capture the black pawn with your rook.', answer: ['d4d5'], right: 'Rxd5 — the "x" in chess notation means "captures". The rook takes the pawn.', hint: 'The pawn is directly in front of the rook.' },
      { t: 'say', title: 'Rooks love open lines', fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', arrows: ['a1a8:g'], text: 'Rooks are clumsy early on, because their own pawns block them. They become powerful when files are **open** (no pawns). That is why we will learn to "connect" them and put them on open files later.' },
    ],
    takeaways: ['Rooks move straight, never diagonally.', 'Worth about 5 points.', 'They need open files and ranks.'],
  },
  {
    id: 'bishop', part: 0, name: 'The bishop', icon: '♝', level: 'Beginner', time: '4 min',
    summary: 'Diagonals, and why each bishop stays on one colour.',
    steps: [
      { t: 'say', title: 'The bishop moves diagonally', fen: '4k3/8/8/8/3B4/8/8/4K3 w - - 0 1', arrows: ['d4a7:g', 'd4g7:g', 'd4a1:g', 'd4h8:g', 'd4g1:g'], text: 'The **bishop** moves any number of squares **diagonally**. It also cannot jump.\nBecause it always moves diagonally, a bishop **stays on the same colour of square for the whole game**. You start with one "light-squared" and one "dark-squared" bishop.\nA bishop is worth about **3 points**.' },
      { t: 'squares', fen: '4k3/8/8/8/3B4/8/8/4K3 w - - 0 1', piece: 'd4', ask: 'Tap every square the bishop on d4 can reach. (There are 13.)', right: 'Great. Notice every square you tapped is the same colour as the bishop\'s square.', hint: 'Think of an X shape centred on the bishop. Go until you run off the board.' },
      { t: 'move', fen: '4k3/6p1/8/8/3B4/8/8/4K3 w - - 0 1', ask: 'Capture the pawn on g7 with your bishop.', answer: ['d4g7'], right: 'Bxg7. The path d4–e5–f6–g7 was clear, so the bishop could slide all the way.', hint: 'Follow the long diagonal up and to the right.' },
      { t: 'quiz', fen: '4k3/8/8/8/3B4/8/8/4K3 w - - 0 1', ask: 'Your bishop is on a dark square. Can it ever land on a light square?', options: ['Yes, after a few moves', 'No — never', 'Only when it captures'], correct: 1, why: 'Never. A bishop is locked to its colour. That is why having both bishops is valuable: together they cover every square.' },
    ],
    takeaways: ['Bishops move diagonally and never change square colour.', 'Worth about 3 points.', 'The pair of bishops covers both colours.'],
  },
  {
    id: 'queen', part: 0, name: 'The queen', icon: '♛', level: 'Beginner', time: '3 min',
    summary: 'The strongest piece: rook plus bishop.',
    steps: [
      { t: 'say', title: 'The most powerful piece', fen: '4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1', arrows: ['d4d8:g', 'd4d1:g', 'd4a4:g', 'd4h4:g', 'd4a7:g', 'd4g7:g', 'd4a1:g', 'd4g1:g'], text: 'The **queen** combines the rook and the bishop: she moves any number of squares **in a straight line or diagonally**. She is worth about **9 points**.\nBecause she is so strong, you should not bring her out too early or risk her for a small gain. A queen that gets attacked by a knight or pawn has to run away.' },
      { t: 'move', fen: '4k3/8/8/8/3Q4/8/5r2/4K3 w - - 0 1', ask: 'The black rook on f2 is not protected. Capture it with your queen.', answer: ['d4f2'], right: 'Qxf2 — the queen travels diagonally d4–e3–f2. A free rook is a big win (5 points for nothing).', hint: 'Which diagonal leads from d4 to the rook?' },
      { t: 'sandbox', fen: '4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1', ask: 'Move the queen around the board in different directions to feel her range.', goal: 'Try straight moves and diagonal moves. Notice how many squares she controls from the centre compared with the corner.' },
    ],
    takeaways: ['Queen = rook + bishop.', 'Worth about 9 points.', 'Do not expose the queen early.'],
  },
  {
    id: 'knight', part: 0, name: 'The knight', icon: '♞', level: 'Beginner', time: '5 min',
    summary: 'The L-shaped jumper.',
    steps: [
      { t: 'say', title: 'The knight jumps', fen: '4k3/8/8/8/3N4/8/8/4K3 w - - 0 1', arrows: ['d4b3:g', 'd4b5:g', 'd4c2:g', 'd4c6:g', 'd4e2:g', 'd4e6:g', 'd4f3:g', 'd4f5:g'], text: 'The **knight** is the tricky one. It moves in an **L-shape**: two squares in one direction and then one square sideways (or one then two). It is the only piece that can **jump over** other pieces.\nA knight is worth about **3 points**, like a bishop.' },
      { t: 'squares', fen: '4k3/8/8/8/3N4/8/8/4K3 w - - 0 1', piece: 'd4', ask: 'Tap all 8 squares the knight on d4 can jump to.', right: 'All eight! From the centre a knight reaches 8 squares.', hint: 'Two squares up/down/left/right, then one square to the side. Try each direction.' },
      { t: 'move', fen: '4k3/8/4p3/8/3N4/8/8/4K3 w - - 0 1', ask: 'Capture the pawn on e6 with your knight.', answer: ['d4e6'], right: 'Nxe6. Remember: knights are written with N (K is for the king).', hint: 'Two squares up and one to the right.' },
      { t: 'say', title: 'Centre vs. corner', fen: '4k3/8/8/8/8/8/8/N3K3 w - - 0 1', arrows: ['a1b3:r', 'a1c2:r'], text: 'Look at this knight on a1: it only has **2** moves. A knight in the centre has **8**. That is the origin of the old saying **"a knight on the rim is dim"**. Try to place your knights near the centre.' },
    ],
    takeaways: ['Knights move in an L and can jump.', 'Worth about 3 points; best in the centre.', 'Notation: N for knight, K for king.'],
  },
  {
    id: 'pawn', part: 0, name: 'The pawn', icon: '♙', level: 'Beginner', time: '6 min',
    summary: 'Forward moves, captures, en passant and promotion.',
    steps: [
      { t: 'say', title: 'Pawns are special', fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', arrows: ['e2e3:g', 'e2e4:g'], text: 'The **pawn** is worth **1 point**, but it is the soul of chess. Pawns are unusual because:\n• They move **forward** one square (never backwards).\n• From their **starting square** they may move **two** squares.\n• They **capture diagonally** — different from how they move!' },
      { t: 'squares', fen: '4k3/8/8/8/8/3p1p2/4P3/4K3 w - - 0 1', piece: 'e2', ask: 'Tap every square the white pawn on e2 can move to — including captures.', right: 'e3 and e4 are forward moves; d3 and f3 are diagonal captures. A pawn cannot capture straight ahead.', hint: 'Two forward squares from its starting square, plus the diagonals where an enemy stands.' },
      { t: 'say', title: 'A pawn is blocked by anything in front', fen: '4k3/8/8/8/4p3/4P3/8/4K3 w - - 0 1', text: 'If a piece stands directly in front of a pawn, it is **blocked**: it cannot move or capture forward. Here the two pawns face each other and neither can move.' },
      { t: 'move', title: 'En passant', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', ask: 'Black has just played d7–d5, jumping past your pawn. Capture it "in passing": play exd6.', answer: ['e5d6'], right: 'This special capture is called **en passant** ("in passing"). When an enemy pawn jumps two squares and lands beside your pawn, you may capture it as if it had moved only one — but only on your very next move.', hint: 'Move your pawn diagonally to the square the black pawn jumped over (d6).' },
      { t: 'move', title: 'Promotion', fen: '8/4P3/8/8/8/8/k7/4K3 w - - 0 1', ask: 'When a pawn reaches the far side it **promotes** to a queen, rook, bishop or knight. Push the pawn to e8!', answer: ['e7e8q'], right: 'A new queen! Almost always choose the queen. Pawns are weak alone, but a pawn that reaches the last rank becomes the strongest piece. That is why pawn endgames are exciting.', hint: 'The pawn is one step from the end.' },
    ],
    takeaways: ['Pawns move forward, capture diagonally.', 'Two squares from the start; blocked by any piece ahead.', 'En passant and promotion are special pawn rules.'],
  },
  {
    id: 'king', part: 0, name: 'The king and check', icon: '♚', level: 'Beginner', time: '5 min',
    summary: 'One step at a time — and the most important piece.',
    steps: [
      { t: 'say', title: 'The king moves one square', fen: '4k3/8/8/8/3K4/8/8/8 w - - 0 1', arrows: ['d4d5:g', 'd4d3:g', 'd4c4:g', 'd4e4:g', 'd4c5:g', 'd4e5:g', 'd4c3:g', 'd4e3:g'], text: 'The **king** moves **one square in any direction**. He is the most important piece — if you lose him you lose the game — but he is not strong in the early game, so we keep him tucked away safely.\nTwo rules: a king can **never move into check**, and **two kings can never stand next to each other**.' },
      { t: 'say', title: 'What is check?', fen: '4k3/8/8/8/8/8/4q3/4K3 w - - 0 1', arrows: ['e2e1:r'], text: 'When a piece attacks the enemy king, we say the king is in **check**. Here the black queen attacks the white king. You **must** deal with a check immediately. There are exactly three ways:\n1. **Move the king** to a safe square.\n2. **Block** the attack with another piece (not possible against a knight or adjacent piece).\n3. **Capture** the attacker.' },
      { t: 'move', fen: '4k3/8/8/8/8/8/4q3/4K3 w - - 0 1', ask: 'Your king is in check from the queen. The queen is unprotected. Capture it!', answer: ['e1e2'], right: 'Kxe2 — the king captured the attacker. A king can capture, as long as the piece is not protected.', hint: 'The queen is right next to your king.' },
      { t: 'move', fen: '4k3/8/8/8/8/8/8/r3K3 w - - 0 1', ask: 'The black rook gives check along the first rank. Move your king to a safe square.', answer: ['e1d2', 'e1e2', 'e1f2'], right: 'Right — squares d1 and f1 are still on the rook\'s line, so they are not safe. Always check which squares are attacked before you move the king.', wrong: { e1d1: 'd1 is still attacked by the rook along the first rank.', e1f1: 'f1 is still attacked by the rook along the first rank.' }, hint: 'Step off the first rank.' },
    ],
    takeaways: ['The king moves one square and can never move into check.', 'Answer a check by moving, blocking or capturing.', 'Keep your king safe early.'],
  },

  /* ------------------------------------------------------------ Part 2 */
  {
    id: 'checkmate', part: 1, name: 'Checkmate, stalemate and draws', icon: '🏁', level: 'Beginner', time: '6 min',
    summary: 'How games end.',
    steps: [
      { t: 'say', title: 'Checkmate: the game is over', fen: '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1', text: 'If a king is in check and has **no way** to escape (cannot move, block or capture), that is **checkmate** and the game ends. The side that delivered it wins.\nLook at this black king: his own pawns cover his escape squares. A rook can deliver mate on the back rank — called a **back-rank mate**.' },
      { t: 'move', fen: '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1', ask: 'Deliver checkmate in one move.', answer: ['a1a8'], right: 'Ra8# — the "#" sign means checkmate. The king cannot move (f8, g7... are all covered or blocked) and nothing can block or capture the rook.', hint: 'Check the king along the 8th rank.' },
      { t: 'say', title: 'Stalemate: a draw', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', text: 'If a player is **not** in check but has **no legal move**, it is **stalemate** — and the game is a **draw**. Here Black has no moves: every square the king could go to is attacked, but the king is not in check.\nWhen you are winning, always make sure your opponent has a legal move, or you throw away the win!' },
      { t: 'quiz', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', ask: 'In the position above (Black to move) what is the result?', options: ['Checkmate — White wins', 'Stalemate — a draw', 'Black can play on'], correct: 1, why: 'The black king is not attacked, and every move is illegal. That is stalemate, so the game is drawn.' },
      { t: 'say', title: 'Other ways a game ends', text: 'A game can also end:\n• **Resignation** — a player gives up.\n• **Draw by agreement**.\n• **Threefold repetition** — the same position occurs three times.\n• **Fifty-move rule** — 50 moves with no capture or pawn move.\n• **Insufficient material** — for example king vs king, where nobody can mate.', fen: START },
    ],
    takeaways: ['Checkmate = check with no escape.', 'Stalemate = no legal moves but not in check — a draw.', 'Games can also end by resignation or other kinds of draw.'],
  },
  {
    id: 'castling', part: 1, name: 'Castling', icon: '🏰', level: 'Beginner', time: '4 min',
    summary: 'The only move where two pieces move at once.',
    steps: [
      { t: 'say', title: 'Move your king to safety', fen: 'r3k2r/pppq1ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 1', hl: ['e1', 'h1'], text: '**Castling** is a special move that does two good things at once: it tucks your **king into safety**, and it brings a **rook** into the game. You move the king **two squares towards a rook**, and the rook jumps to the other side of the king.\nCastling towards the h-file is **kingside** (written O-O); towards the a-file is **queenside** (O-O-O).' },
      { t: 'move', fen: 'r3k2r/pppq1ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 1', ask: 'The squares between your king and the h1-rook are empty. Castle kingside by dragging the king two squares: e1 to g1.', answer: ['e1g1'], right: 'O-O — king on g1, rook on f1. The king is tucked behind three pawns and the rook is ready for action.', hint: 'Move the king two squares to the right.' },
      { t: 'say', title: 'The castling rules', fen: START, text: 'You may castle only if:\n• **Neither** the king nor that rook has moved before.\n• **No pieces** stand between them.\n• The king is **not in check**, does not pass **through** an attacked square and does not land on one.\nCastling is one of the most important things to do early. It is the second golden rule in action, which we will see soon.' },
      { t: 'quiz', fen: START, ask: 'Which of these stops you from castling?', options: ['You have already moved your king once', 'Your queen is still on her starting square', 'Your opponent has castled'], correct: 0, why: 'Once the king has moved, castling is gone for good — even if the king walks back. A queen on d1 only matters if she stands between king and rook.' },
    ],
    takeaways: ['Castling moves the king two squares and the rook jumps over.', 'It needs unmoved pieces, an empty path and no attacked squares.', 'Do it early.'],
  },
  {
    id: 'notation', part: 1, name: 'Reading chess notation', icon: '✍️', level: 'Beginner', time: '4 min',
    summary: 'How moves are written.',
    steps: [
      { t: 'say', title: 'The language of chess', fen: START, text: 'Chess moves are written with a short code, called **algebraic notation**:\n• **K** king, **Q** queen, **R** rook, **B** bishop, **N** knight. Pawns have no letter.\n• Then the **destination square**: **Nf3** means "knight to f3".\n• **x** means capture: **Bxc6**. Pawn captures start with the file: **exd5**.\n• **+** is check, **#** is checkmate, **O-O** is castling.\nYou will see this in the coach comments and the analysis.' },
      { t: 'tap', fen: START, ask: '"e4" is the most popular first move. Tap the square e4.', answer: 'e4', right: 'Correct — the king pawn goes to e4 in 1.e4.', hint: 'File e, rank 4.' },
      { t: 'move', fen: START, ask: 'Play the move written 1.Nf3 — which piece goes where?', answer: ['g1f3'], right: 'Nf3: the g1 knight jumps out to f3, where it eyes the centre.', hint: 'Only the g1 knight can reach f3.' },
      { t: 'move', fen: START, ask: 'Play 1.d4.', answer: ['d2d4'], right: 'd4 — the queen pawn takes two steps and claims central space.', hint: 'A pawn move: from d2 to d4.' },
    ],
    takeaways: ['Letters K Q R B N for pieces; pawns have none.', 'x = capture, + = check, # = mate, O-O = castle.', 'Moves name the destination square.'],
  },
  {
    id: 'values', part: 1, name: 'What are the pieces worth?', icon: '⚖️', level: 'Beginner', time: '4 min',
    summary: 'Piece values and why trading matters.',
    steps: [
      { t: 'say', title: 'Count the material', fen: START, text: 'Strong players use a simple point scale to decide whether a trade is good:\n**Pawn = 1 · Knight = 3 · Bishop = 3 · Rook = 5 · Queen = 9**\nThe king is priceless (it cannot be traded).\nBefore capturing, add up what you win and what you lose.' },
      { t: 'quiz', fen: START, ask: 'Your knight (3) captures a pawn (1) and then gets captured. Was that a good trade?', options: ['Yes, a pawn is a pawn', 'No — you gave 3 points for 1'], correct: 1, why: 'Knight for pawn loses two points of material. Always count: what do I win, what can I lose?' },
      { t: 'quiz', fen: START, ask: 'Is it good to trade your rook (5) for the enemy bishop (3) and knight (3)?', options: ['Yes — you win 1 point', 'No — you lose 2 points', 'Equal'], correct: 0, why: 'You give 5 points and receive 6. Two minor pieces are usually worth a little more than a rook, so on points this trade favours you.' },
      { t: 'say', title: 'A useful rule', fen: START, text: 'When you are **ahead**, trade pieces — each trade makes your lead bigger relatively. When you are **behind**, avoid trades and look for tactics.\nAlso: material is not everything. A king under attack or a passed pawn can outweigh a piece. But as a beginner, simply not losing material is the biggest improvement you can make.' },
    ],
    takeaways: ['1-3-3-5-9.', 'Count before every capture.', 'Trade when ahead; keep tension when behind.'],
  },

  /* ------------------------------------------------------------ Part 3 */
  {
    id: 'golden-center', part: 2, name: 'Golden rule 1: control the centre', icon: '🎯', level: 'Beginner', time: '5 min',
    summary: 'Why d4, e4, d5, e5 matter and how to claim them.',
    steps: [
      { t: 'say', title: 'The four most important squares', fen: START, hl: ['d4', 'e4', 'd5', 'e5'], text: 'There are three golden rules for the opening. The first is: **control the centre**.\nThe centre is the four squares **d4, e4, d5 and e5**. Pieces in or near the centre reach **both sides of the board** quickly, so they can attack and defend wherever it matters.' },
      { t: 'say', title: 'A knight on the rim', fen: '4k3/8/8/8/8/8/8/N3K3 w - - 0 1', arrows: ['a1b3:r', 'a1c2:r'], text: 'A knight in the corner has only **2** moves.' },
      { t: 'say', title: '...versus the centre', fen: '4k3/8/8/8/3N4/8/8/4K3 w - - 0 1', arrows: ['d4b3:g', 'd4b5:g', 'd4c2:g', 'd4c6:g', 'd4e2:g', 'd4e6:g', 'd4f3:g', 'd4f5:g'], text: 'In the centre the same knight has **8** moves. Central pieces are simply stronger.' },
      { t: 'tap', fen: START, ask: 'Tap one of the four central squares.', answer: ['d4', 'e4', 'd5', 'e5'], right: 'Right: d4, e4, d5, e5.', hint: 'The middle of the board, where the files d and e cross ranks 4 and 5.' },
      { t: 'move', title: 'Claim the centre with a pawn', fen: START, ask: 'You are White and it is move one. Play a pawn to the centre.', answer: ['e2e4', 'd2d4'], right: 'A central pawn takes space and **controls** key squares: e4 attacks d5 and f5, so enemy pieces cannot easily land there. It also opens lines for your queen and bishop.', wrong: { a2a3: 'This does not fight for the centre. Use the pawns on the d and e files.', h2h3: 'That is a slow edge move — use your first move for the centre.', g2g4: 'It grabs space on the wing, but weakens your king. Prefer a central pawn.' }, hint: 'The e-pawn or the d-pawn go two squares.' },
      { t: 'say', title: 'Control, not just occupy', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', arrows: ['f3e5:g', 'f3d4:g', 'e4d5:g', 'e4f5:g'], text: 'You do not need pieces **on** the centre squares — you can **control** them from a distance. Here White\'s pawn on e4 and knight on f3 both attack central squares. Pawns are great for this because enemy pieces cannot easily trade for them.' },
    ],
    takeaways: ['The centre is d4, e4, d5, e5.', 'Central pieces control more squares.', 'Start with a central pawn: 1.e4 or 1.d4.'],
    practice: { label: 'Practice: play a guided game', href: '#/coach-play' },
  },
  {
    id: 'golden-develop', part: 2, name: 'Golden rule 2: develop your pieces', icon: '🚀', level: 'Beginner', time: '6 min',
    summary: 'Get the knights and bishops into the game — and castle.',
    steps: [
      { t: 'say', title: 'Wake up the army', fen: START, hl: ['b1', 'c1', 'f1', 'g1'], text: 'The second golden rule: **develop your pieces**. "Developing" means moving your **knights and bishops** off the back rank to squares where they do something. Every move in the opening should either claim the centre or bring a piece out.\nA piece that has not moved is a piece that is not playing. If you attack with three pieces and your opponent defends with six, you will lose.' },
      { t: 'move', title: 'Which move develops?', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', ask: 'Both sides have played a centre pawn. Develop a piece to a good square.', answer: ['g1f3', 'b1c3', 'f1c4', 'f1b5'], right: 'A good developing move: it brings a new piece out **and** does something useful in the centre.', wrong: { d1h5: 'The queen comes out too soon. Black can chase her with ...Nc6 and ...Nf6, gaining tempo (free moves). Develop knights and bishops first.', a2a3: 'A pawn move on the edge develops nothing. Use your opening moves to bring pieces out.', h2h3: 'It develops nothing. Bring a piece out.' }, hint: 'Knights go out first, bishops second. The queen waits.' },
      { t: 'move', title: 'A model opening', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', ask: 'Play along: Knight out, bishop out, castle. Start with Nf3, attacking e5.', line: ['g1f3', 'b8c6', 'f1c4', 'f8c5', 'e1g1'], right: 'The knight hits the e5 pawn and develops.', after: 'That is the Italian Game: knight, bishop, castle. Three moves, three pieces developed, and your king is safe.', wrong: { d1h5: 'Not yet — the queen should come out later.' }, hint: 'First Nf3, then Bc4, then castle.' },
      { t: 'say', title: 'Avoid these opening mistakes', fen: START, text: '• **Moving the same piece twice** without a reason.\n• **Bringing the queen out early** — she gets chased.\n• **Too many pawn moves** — each pawn move is a move not developing.\n• **Forgetting to castle** — an uncastled king is a target.\n• **Grabbing pawns** while your pieces are asleep.' },
      { t: 'quiz', fen: START, ask: 'Which opening move is the least useful?', options: ['1.e4', '1.Nf3', '1.a3', '1.d4'], correct: 2, why: '1.a3 neither controls the centre nor develops a piece. The other three all fight for the centre.', wrongWhy: { 0: 'e4 is a classical central pawn move.', 1: 'Nf3 develops a knight and eyes the centre.', 3: 'd4 grabs central space.' } },
    ],
    takeaways: ['Develop knights and bishops early; bring the queen out later.', 'Do not move the same piece twice without a reason.', 'Castle to keep your king safe.'],
    practice: { label: 'Practice: play a guided game', href: '#/coach-play' },
  },
  {
    id: 'golden-rooks', part: 2, name: 'Golden rule 3: connect your rooks', icon: '🔗', level: 'Beginner', time: '5 min',
    summary: 'Clear the back rank so the rooks protect each other.',
    steps: [
      { t: 'say', title: 'What does "connected" mean?', fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1', hl: ['a1', 'f1'], text: 'The third golden rule: **connect your rooks**. Two rooks are connected when **nothing stands between them on the back rank**, so they defend each other and can swing across the board together.\nIt is the sign that your development is finished — all the minor pieces and the queen are out of the way. Here White has castled but the rooks (a1 and f1) are **not** yet connected.' },
      { t: 'squares', fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1', ask: 'Tap the two pieces that stand between White\'s rooks.', answer: ['c1', 'd1'], right: 'The bishop on c1 and the queen on d1. Both must move.', hint: 'Look along the first rank between a1 and f1.' },
      { t: 'move', fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1', ask: 'First, develop the bishop from c1 to an active square.', answer: ['c1e3', 'c1g5', 'c1d2', 'c1f4', 'c1h6'], right: 'The bishop is out. One piece to go.', hint: 'Any good diagonal for the c1 bishop will do.' },
      { t: 'move', fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NPBN2/PPP2PPP/R2Q1RK1 w - - 0 1', ask: 'Now move the queen off the first rank to connect the rooks.', answer: ['d1d2', 'd1e2'], right: 'Rooks connected! They now protect each other and can move to open files as a pair. A great sign that your opening is done.', hint: 'The queen goes up one square.' },
      { t: 'say', title: 'Why connecting matters', fen: START, text: 'When your rooks are connected:\n• They **defend each other**, so neither can be captured for free.\n• They can **double up** on a file for a strong attack.\n• It proves your minor pieces and queen are developed.\nChecklist: **centre → develop → castle → connect rooks**. When you finish it, start planning!' },
    ],
    takeaways: ['Connected rooks see each other on the back rank.', 'It is the finish line of the opening.', 'Centre, develop, castle, connect.'],
    practice: { label: 'Practice: play a guided game', href: '#/coach-play' },
  },

  /* ------------------------------------------------------------ Part 4 */
  {
    id: 'safety', part: 3, name: 'Is my move safe? The blunder check', icon: '🛡️', level: 'Beginner', time: '6 min',
    summary: 'The single habit that stops most beginner losses.',
    steps: [
      { t: 'say', title: 'The question to ask every move', fen: START, text: 'Most games below 1200 rating are decided by **blunders** — pieces left hanging. Strong players check before every move:\n**1. What did my opponent\'s last move do? What does it attack?**\n**2. After my move, can anything of mine be captured?**\n**3. Is there something I can capture for free?**\nLet us practise.' },
      { t: 'move', title: 'Free material', fen: '4k3/8/8/3n4/8/8/8/3RK3 w - - 0 1', ask: 'Look for a free capture. What does your rook attack?', answer: ['d1d5'], right: 'Rxd5 wins a whole knight — it had no protection.', hint: 'The black knight is on the same file as your rook.' },
      { t: 'quiz', title: 'Is it protected?', fen: '4k3/8/2p5/3n4/8/8/8/3RK3 w - - 0 1', ask: 'Now the knight is defended by a pawn on c6. Should White play Rxd5?', options: ['Yes — free knight', 'No — cxd5 wins the rook'], correct: 1, why: 'Rxd5 cxd5 trades a rook (5) for a knight (3). Always ask whether the piece is protected before you take it.' },
      { t: 'move', title: 'Do not hang your own piece', fen: '4k3/8/3p4/8/8/2N5/8/4K3 w - - 0 1', ask: 'Which knight move is **safe**? The black pawn on d6 doesn\'t attack anything yet. Move the knight to a square where it cannot be captured by the pawn.', answer: ['c3d5', 'c3b5', 'c3e4', 'c3a4', 'c3b1', 'c3d1', 'c3e2', 'c3a2'], right: 'Safe! The black pawn attacks c5 and e5 only.', hint: 'The pawn on d6 captures diagonally downward: c5 and e5. Avoid those squares.' },
      { t: 'say', title: 'Make it a habit', fen: START, text: 'Say it out loud (or in your head): **"What does that move threaten? What can I take? Is my move safe?"** Do this every single move for a month and your rating will jump.\nIn "Play a Game with Coach" I will pause you right before you blunder so that you build this habit.' },
    ],
    takeaways: ['Check: what did they threaten? what can I take? is my move safe?', 'Count protection before capturing.', 'Build the habit now.'],
    practice: { label: 'Practice: tactics puzzles', href: '#/train/puzzles' },
  },
  {
    id: 'first-game', part: 3, name: 'Your first complete game', icon: '🎓', level: 'Beginner', time: '8 min',
    summary: 'See a whole opening plan, then play it.',
    steps: [
      { t: 'say', title: 'A model game plan', fen: START, play: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+'], delay: 1100, text: 'Watch the first moves of a classic game — the Italian Game. See how both sides apply the golden rules: **pawn to the centre, knights out, bishops out, plan to castle**.\n1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 — and now White builds a big centre with c3 and d4.' },
      { t: 'say', title: 'Your game plan', fen: START, text: '**Moves 1–10: the opening**\n• Play a central pawn, develop knights then bishops, castle.\n• Do not hunt pawns; do not bring the queen out early.\n**Middlegame: the plan**\n• Find the weak points. Improve your worst piece.\n• Look for tactics — forks, pins, loose pieces.\n**Endgame**\n• Activate the king. Push passed pawns. Rooks to open files.\nAnd at all times: **blunder check before every move**.' },
      { t: 'quiz', fen: START, ask: 'Which sequence best follows the golden rules?', options: ['1.e4 e5 2.Qh5 Nc6 3.Qxe5+', '1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.O-O', '1.a3 a6 2.h3 h6'], correct: 1, why: 'Centre pawn, knight, bishop, castle. Option 1 would be a fine trick against a beginner, but only if Black does not defend e5 — never rely on it. Option 3 wastes the opening.', wrongWhy: { 0: 'The early queen is risky and relies on your opponent blundering.', 2: 'Edge pawn moves are slow and develop nothing.' } },
      { t: 'say', title: 'Ready to play', fen: START, text: 'You know how the pieces move, the three golden rules, and how to check for safety. The best way to improve now is to **play a game with me**: I will help you think, not just tell you the answer. When you are done, the report shows exactly what to work on next.', cta: { label: 'Play a game with Coach', href: '#/coach-play' } },
    ],
    takeaways: ['Opening: centre, develop, castle, connect.', 'Always blunder-check.', 'Play, then review: that is how you improve.'],
    practice: { label: 'Play a game with Coach', href: '#/coach-play' },
  },
];

export const basicById = (id) => BASICS.find((b) => b.id === id);
