// Endgame lessons. Each lesson is a concrete position the learner plays out against the engine with the coach's help.
// goal: 'win'  -> success = checkmate, or a queened pawn with a decisive evaluation
//       'draw' -> success = draw by rule, or the learner holds the evaluation for `holdMoves` moves
// `side` is the side the learner plays (the side to move in `fen` unless the coach should move first).

export const ENDGAMES = [
  {
    id: 'kq-mate', cat: 'Checkmate patterns', name: 'King + Queen vs King', icon: '♛', level: 'Beginner', goal: 'win', side: 'w',
    fen: '4k3/8/8/8/8/8/8/Q3K3 w - - 0 1',
    summary: 'The most basic mate. The queen takes away squares, the king arrives to deliver or support the final blow.',
    ideas: [
      'Use the queen a knight\'s move away from the enemy king: it takes squares away without allowing stalemate.',
      'Shrink the box. Each queen move should reduce the area the enemy king can use.',
      'Only when the enemy king is on the edge, bring your own king close (opposition).',
      'Always check for stalemate before you move: the defender must have a legal move.',
    ],
    hint: 'Cut off the king with the queen from a knight\'s distance, then walk your king up.',
  },
  {
    id: 'kr-mate', cat: 'Checkmate patterns', name: 'King + Rook vs King', icon: '♜', level: 'Beginner', goal: 'win', side: 'w',
    fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1',
    summary: 'The box method: shrink the rectangle the enemy king lives in until it is mated on the edge.',
    ideas: [
      'Draw an imaginary box with the rook and shrink it every time the opposing king allows it.',
      'Bring your king up to take the opposition, then make a rook check to push the enemy king back.',
      'Keep the rook at a safe distance from the enemy king (a long side away) so it cannot be attacked.',
      'Mate happens on the edge: king facing king (opposition), rook delivers the final check.',
    ],
    hint: 'Use a waiting rook move when the kings are in opposition and it is the opponent\'s turn.',
  },
  {
    id: 'two-rooks', cat: 'Checkmate patterns', name: 'Two Rooks: the Ladder', icon: '🪜', level: 'Beginner', goal: 'win', side: 'w',
    fen: '8/4k3/8/8/8/8/R7/1R2K3 w - - 0 1',
    summary: 'Two rooks alternate checks and push the king to the edge rank by rank.',
    ideas: [
      'Each rook checks along a rank; the other rook cuts off the next rank. They leapfrog like a ladder.',
      'Keep the rooks on different ranks and out of reach of the king.',
      'Never put both rooks on the same file or rank as the enemy king without protection.',
    ],
    hint: 'Check with one rook, then slide the other rook past it to cut off the next rank.',
  },
  {
    id: 'key-squares', cat: 'Pawn endings', name: 'King & Pawn: Key Squares', icon: '👑', level: 'Beginner', goal: 'win', side: 'w',
    fen: '8/2k5/8/8/2K1P3/8/8/8 w - - 0 1',
    summary: 'A king in front of its pawn wins when it reaches a key square. Here only one move keeps the win.',
    ideas: [
      'For a pawn on the 4th rank, the key squares are the three squares two ranks ahead of it.',
      'If your king reaches a key square, the pawn promotes whoever is to move.',
      'The only winning move here is Kc5!: it heads for the key squares and wins the opposition battle.',
      'The wrong move (like Kd5? ) lets the defender take the opposition and draw.',
    ],
    hint: 'Don\'t push the pawn yet: get the king to a key square in front of it.',
  },
  {
    id: 'opp-hold', cat: 'Pawn endings', name: 'Opposition: Hold the Draw', icon: '⚖️', level: 'Intermediate', goal: 'draw', side: 'b', holdMoves: 8,
    fen: '8/8/8/8/5K2/2P5/4k3/8 b - - 0 1',
    summary: 'You are the defender. Take the correct square and the pawn cannot advance safely.',
    ideas: [
      'Stay in front of the pawn or on the key squares around it; being cut off loses.',
      'Only one king move saves the game here: Kd3! — it attacks the pawn and forces matters.',
      'If you step to the wrong side (like Kd2?) White gains the tempo and wins.',
    ],
    hint: 'Attack the pawn: your king should go to d3.',
  },
  {
    id: 'rook-pawn', cat: 'Pawn endings', name: 'The Rook-Pawn Draw', icon: '🧱', level: 'Intermediate', goal: 'draw', side: 'b', holdMoves: 8,
    fen: '1k6/8/1K6/P7/8/8/8/8 b - - 0 1',
    summary: 'A rook pawn (a- or h-file) usually cannot win if the defending king reaches the corner.',
    ideas: [
      'The edge removes the attacker\'s squares: the defender gets stalemate tricks.',
      'Keep your king in front of the pawn, in the corner area, and never let it be driven away.',
      'Typical trick: pawn on a7, king on a8, white king on b6: stalemate!',
    ],
    hint: 'Keep your king in the corner area (a8 or b8) and avoid being driven out.',
  },
  {
    id: 'lucena', cat: 'Rook endings', name: 'Lucena Position', icon: '🌉', level: 'Advanced', goal: 'win', side: 'w',
    fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
    summary: 'The most important winning technique in rook endings: building a bridge to shelter your king.',
    ideas: [
      'The pawn is on the 7th rank with your king in front of it, but the enemy king cuts off the exit.',
      'Step 1: cut the defending king off along a file with Rd1+ or Rc4.',
      'Step 2: build a bridge — put the rook on the 4th rank to shield your king from checks.',
      'Step 3: walk the king out to the side; the rook interposes against checks.',
    ],
    hint: 'First cut the black king off along the d-file with the rook.',
  },
  {
    id: 'philidor', cat: 'Rook endings', name: 'Philidor Position', icon: '🛡️', level: 'Advanced', goal: 'draw', side: 'b', holdMoves: 12,
    fen: '4k3/8/r7/3PK3/8/8/8/7R b - - 0 1',
    summary: 'The most important drawing technique: keep the rook on the 6th rank until the pawn moves, then check from behind.',
    ideas: [
      'Keep your rook on the 3rd rank (as Black, the 6th) so the attacking king cannot advance.',
      'Keep your king in front of the pawn on the back rank.',
      'When the pawn advances to the 6th, drop the rook behind it and give endless checks.',
    ],
    hint: 'Do not let the white king past the 6th rank. Keep your rook on the 6th rank.',
  },
  {
    id: 'convert-rook', cat: 'Convert winning positions', name: 'Convert: Rook vs Pawns', icon: '🏁', level: 'Intermediate', goal: 'win', side: 'w',
    fen: '8/5pk1/6p1/8/8/5K2/6P1/R7 w - - 0 1',
    summary: 'You are a rook up. Technique: activate the king, win the pawns, and promote safely.',
    ideas: [
      'Keep the king active — bring it toward the pawns, not away.',
      'Use the rook from the side or from behind; avoid being checked from behind.',
      'Trade the last pair of pawns only when the resulting ending is trivially won.',
    ],
    hint: 'Bring the king forward while the rook cuts the enemy king off.',
  },
  {
    id: 'square-rule', cat: 'Pawn endings', name: 'The Rule of the Square', icon: '⬜', level: 'Beginner', goal: 'win', side: 'w',
    fen: '8/8/8/8/k4P2/8/8/6K1 w - - 0 1',
    summary: 'Can the king catch the runaway pawn? Learn to count squares instead of guessing.',
    ideas: [
      'Draw a square from the pawn to the promotion rank: if the enemy king can step into it, he catches the pawn.',
      'Push the pawn when the king is outside the square; use your king to escort it when he is not.',
      'Keep your own king close to the pawn so a promoted queen is protected and the enemy king cannot stop you.',
      'On the second rank a pawn may move two squares, which makes the square bigger.',
    ],
    hint: 'Check whether the black king can step into the square before you push.',
  },
  {
    id: 'bishop-hold', cat: 'Minor-piece endings', name: 'Same-Colour Bishops: Hold the Draw', icon: '♝', level: 'Intermediate', goal: 'draw', holdMoves: 12, side: 'w',
    fen: '8/8/4k3/5p2/4b3/3B4/3K4/8 w - - 0 1',
    summary: 'Bishops of the same colour: defend actively and keep the bishop on the long diagonal.',
    ideas: [
      'Keep your bishop active — attack the pawn rather than passively defending.',
      'Place the king in front of the passed pawn and keep the bishop on a diagonal the enemy bishop cannot attack.',
      'Do not trade into a lost pawn ending; check the king race before every trade.',
      'Use the king: in endgames it is a strong piece.',
    ],
    hint: 'Keep your bishop on the same diagonal as the enemy bishop to offer a trade whenever the pawn endgame is drawn.',
  },
  {
    id: 'knight-hold', cat: 'Minor-piece endings', name: 'Knight Endings: Stay Active', icon: '♞', level: 'Intermediate', goal: 'draw', holdMoves: 12, side: 'w',
    fen: '8/8/3k4/8/8/2NK4/8/7n w - - 0 1',
    summary: 'Knights are short-range pieces: centralise yours and keep the king close.',
    ideas: [
      'A centralised knight can reach almost any square in a few moves; a knight on the rim is nearly useless.',
      'Move the king to the centre and keep it close to your knight.',
      'Be careful of knight forks and of leaving the knight where it can be trapped on the edge.',
      'Count tempo: a knight needs two moves to change square colour twice.',
    ],
    hint: 'Centralise the knight to e4 or d4 and bring the king forward.',
  },
];

export const ENDGAME_CATS = ['Checkmate patterns', 'Pawn endings', 'Minor-piece endings', 'Rook endings', 'Convert winning positions'];
export const endgameById = (id) => ENDGAMES.find((x) => x.id === id);
