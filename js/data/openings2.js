// More opening courses (White: Scotch, Vienna, King's Gambit, English, Catalan, Colle, Evans; Black: Petroff, Two Knights,
// Nimzo-Indian, Slav, Pirc, Dragon, Dutch, Grünfeld, QGA). Same format as openings.js.
// `deep` is the study guide shown with each course: overview, the plans for both sides, typical mistakes and traps.

export const MORE_OPENINGS = [
  /* ---------------------------------------------------------------- WHITE */
  {
    id: 'scotch', name: 'Scotch Game', side: 'w', level: 'Beginner', icon: '🏴',
    tagline: 'Open the centre at once: 1.e4 e5 2.Nf3 Nc6 3.d4 and active pieces.',
    ideas: ['Strike with d4 before Black is ready, then recapture with the knight.', 'Use the open lines for fast development and central control.', 'Trade into simple, healthy positions or attack the exposed black structure.', 'Watch out for the early queen trade after ...Nxd4 Qxd4.'],
    deep: {
      overview: 'The Scotch trades White\'s d-pawn for Black\'s e-pawn to open the centre immediately. White gets easy development and clear plans; Black has to prove the open position is comfortable. It is an excellent choice if you like open, tactical positions without learning mountains of theory.',
      plans: ['White: develop quickly (Bc4/Be3, castle), keep the knight on d4 strong, and use the space gained in the centre.', 'Black: challenge the d4 knight with ...Bc5 or ...Nf6, then trade pieces to ease the position.'],
      mistakes: ['Retreating the d4 knight without a reason — it is strong where it is.', 'Taking on c6 too early before the position needs it.', 'Forgetting that ...Bc5 attacks the d4 knight and f2 together.'],
    },
    lines: [
      { name: 'Classical: 4...Nf6 5.Nxc6', plan: 'You have a lead in space (e5). Aim for c4/b3 and a bishop on b2, then press on the damaged pawn structure.', moves: 'e4 e5 Nf3 Nc6 d4{Open the centre immediately — this is the point of the Scotch.} exd4 Nxd4{Recapture with the knight, putting it on a dominant central square.} Nf6 Nxc6{Damage Black\'s structure before Black plays ...Nxd4.} bxc6 e5{Gain a tempo by attacking the queen\'s knight route.} Qe7 Qe2{Pins down the e5-pawn defence and prepares Nd2.} Nd5 c4{Kick the knight and take more space.} Ba6 b3{Solid: protects c4 and prepares Bb2.} g5 Bb2{Develop with a purpose — the bishop eyes g7 and the long diagonal.} Bg7 Nd2' },
      { name: 'Classical: 4...Bc5', plan: 'Develop the bishops actively; Black\'s early queen sortie can be met by c3 and a smooth Bc4 and O-O.', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3{Attacks the bishop\'s support and keeps the d4 knight protected.} Qf6 c3{Supports d4 and gives the queen a diagonal.} Nge7 Bc4{Aim at f7 and prepare to castle.} Ne5 Be2{Keeps the bishop pair and avoids the trade on c4.} Qg6 O-O' },
      { name: 'Early queen trade: 4...Nxd4', plan: 'The queen trade helps Black simplify but gives you the lead in development; play Nc3, Bd3 and castle.', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nxd4 Qxd4{Centralised queen — but beware of Black\'s ...Nf6 and ...Bc5 tempo.} d6 Bd3{Develop and prepare to castle.} Nf6 O-O Be7 Nc3 O-O Bg5' },
    ],
  },
  {
    id: 'vienna', name: 'Vienna Game', side: 'w', level: 'Intermediate', icon: '🎻',
    tagline: 'A flexible 2.Nc3 that keeps options open: f4 or Bc4.',
    ideas: ['Develop the knight to c3 before the f-pawn, keeping both Bc4 and f4 ideas available.', 'Place the bishop on c4 pressuring f7.', 'Use d3, Nf3 and a quick O-O to build a solid structure.', 'Meet ...Nxe4 with Qh5 to create immediate threats.'],
    deep: {
      overview: 'The Vienna is flexible and easy to learn: it avoids the biggest theoretical battles of 1.e4 e5 while keeping the king-side f-pawn ready for a later break. With 3.Bc4 you develop naturally and keep tactical tricks such as Qh5 in reserve.',
      plans: ['White: complete development, castle, and prepare the f4 break only when ready.', 'Black: ...Nf6 and ...Nxe4 is the critical test; ...Nc6 and ...Bc5 are solid.'],
      mistakes: ['Playing f4 before you are developed.', 'Letting Black take e4 for free without a follow-up.', 'Moving the queen twice early in the line with ...Nxe4.'],
    },
    lines: [
      { name: '3.Bc4 Nxe4 4.Qh5', plan: 'Black has an extra pawn but the king is exposed to Qxf7 ideas: stay calm and develop with Nf3 and O-O.', moves: 'e4 e5 Nc3{Develops a piece and protects e4 without blocking the c-pawn.} Nf6 Bc4{Eyeing f7 and getting ready to castle.} Nxe4{Black grabs the pawn — now the tactics begin.} Qh5{A double attack: the queen eyes f7 and e5.} Nd6 Bb3{Keeps the bishop on the key diagonal.} Be7 Nf3{Defends e5-pressure and develops.} Nc6 Nxe5 O-O Nxc6 dxc6 d3' },
      { name: '3.Bc4 Nc6 (quiet)', plan: 'A calm position: d3, Nf3, castle and play for f4 once the pieces are out.', moves: 'e4 e5 Nc3 Nf6 Bc4 Nc6 d3{Solid: opens the c1 bishop and defends e4.} Bc5 Nf3 d6 Na4{Trades off the strong bishop on c5.} Bb6 Nxb6 axb6 O-O Be6 c3' },
      { name: '3.Bc4 Nf6 4.d3 setup', plan: 'Complete development and keep a flexible pawn structure.', moves: 'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Be7 Nf3 O-O O-O d6 h3{Prevents ...Bg4 and ...Ng4 ideas.} Be6 Bb3 Qd7 Nd5' },
    ],
  },
  {
    id: 'kings-gambit', name: 'King\'s Gambit', side: 'w', level: 'Advanced', icon: '⚡',
    tagline: 'The romantic opening: sacrifice a pawn for rapid development and an attack.',
    ideas: ['Play f4 to open the f-file and deflect Black\'s e-pawn.', 'Develop quickly with Nf3 and Bc4; castle and use the f-file.', 'Do not worry about the pawn — speed is everything.', 'Be ready to defend if Black holds on to the extra pawn.'],
    deep: {
      overview: 'The King\'s Gambit trades a pawn for fast development and open lines. It gives sharp, tactical games where preparation matters. Even if you do not play it as your main opening, it teaches initiative and attacking chess.',
      plans: ['White: develop with tempo, use the f-file, and aim at f7 with Bc4.', 'Black: either hold the extra pawn (...g5) or hit back in the centre with ...d5.'],
      mistakes: ['Playing slowly: the whole point is tempo.', 'Moving the king early without a plan.', 'Moving the same piece twice — you must catch up in development.'],
    },
    lines: [
      { name: 'Accepted: 3...g5 (Kieseritzky-style)', plan: 'The h4 break destabilises Black\'s pawn chain; make sure your knight on e5 is safe and develop with Bc4.', moves: 'e4 e5 f4{The King\'s Gambit: you give a pawn to open the f-file and the centre.} exf4 Nf3{Develop and prevent ...Qh4+.} g5 h4{Attacks the g5-pawn, breaking Black\'s pawn chain.} g4 Ne5{Ignores the attack and takes the strong central post.} Nf6 Bc4{Aims at f7 and prepares castling.} d5 exd5 Bd6 d4 Nh5 O-O' },
      { name: 'Declined: 2...Bc5', plan: 'A calm line: build the centre with c3 and d4 and keep the f-pawn pressure.', moves: 'e4 e5 f4 Bc5 Nf3{Develop and keep pressure on e5.} d6 c3{Prepares d4 and gives the queen a path.} Nf6 d4 Bb6 Bd3 O-O' },
      { name: 'Falkbeer Counter-Gambit: 2...d5', plan: 'Black counters in the centre. Take on d5, keep the extra pawn if safe, and develop quickly.', moves: 'e4 e5 f4 d5 exd5 e4{Black gambits another pawn for quick development.} d3 Nf6 dxe4 Nxe4 Nf3 Bc5 Qe2' },
    ],
  },
  {
    id: 'english', name: 'English Opening', side: 'w', level: 'Intermediate', icon: '🇬🇧',
    tagline: 'Flexible, positional play from the flank: 1.c4.',
    ideas: ['Control d5 from the side and keep the centre flexible.', 'Fianchetto the king\'s bishop and castle quickly.', 'Use the Reversed Sicilian ideas: you play with an extra tempo.', 'Time d3, a3/b4 and e4 breaks according to Black\'s setup.'],
    deep: {
      overview: 'The English starts with a flank pawn to control d5 and keep options open. It often transposes into Sicilian-type positions with colours reversed. It rewards understanding over memorisation.',
      plans: ['White: fianchetto, control d5, then break with d4 or e4 at the right moment.', 'Black: set up a Reversed Sicilian with ...e5, or mirror White\'s setup with ...c5.'],
      mistakes: ['Playing too slowly — you must still fight for the centre.', 'Fianchettoing without castling.', 'Ignoring tactics on the long diagonal.'],
    },
    lines: [
      { name: 'Reversed Sicilian: 1...e5', plan: 'Control d5, castle, and aim at the c- and e-files. Your extra tempo gives you the more comfortable game.', moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3{Fianchetto: the bishop will watch the long diagonal.} d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7 d3 O-O a3' },
      { name: 'Four Knights style with ...Bb4', plan: 'Castle, then use e4 or d3 to fight for the centre while keeping the bishop on g2 healthy.', moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 Bb4 Bg2 O-O O-O e4 Ng5 Bxc3 dxc3 h6 Ne4 Nxe4 Bxe4 Re8' },
      { name: 'Symmetrical: 1...c5', plan: 'A slow manoeuvring game: develop the bishop, play d3 and aim for b4 or a rook on the c-file.', moves: 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 e6 O-O Nge7 d3 O-O' },
    ],
  },
  {
    id: 'catalan', name: 'Catalan Opening', side: 'w', level: 'Advanced', icon: '🛰️',
    tagline: 'A fianchettoed bishop pressures the queenside and the centre.',
    ideas: ['Play d4, c4 and g3 to put the bishop on the long diagonal.', 'Keep long-term pressure on c6, d5 and the queenside.', 'Open Catalan: regain the c4-pawn; Closed Catalan: build slowly with Nbd2 and e4.', 'Use the pawn on c4 and the Qc2/Rc1 manoeuvres to keep the initiative.'],
    deep: {
      overview: 'The Catalan combines the Queen\'s Gambit with a king\'s fianchetto. The bishop on g2 exerts constant pressure and even when material is level you keep a lasting initiative.',
      plans: ['White: pressure along the long diagonal, win back the c4 pawn, and keep the extra space.', 'Black: break with ...c5 or ...c6 and ...e5, and be careful about the d5 pawn.'],
      mistakes: ['Playing Nf3 too soon in lines where Qc2 is needed.', 'Losing time recapturing on c4.', 'Forgetting the Bishop on g2 is a long-range piece: open the centre to use it.'],
    },
    lines: [
      { name: 'Open Catalan: 5...O-O 6.O-O dxc4', plan: 'Regain the pawn with Qc2 and Qxc4, then use the bishop on g2 and the c-file.', moves: 'd4 Nf6 c4 e6 g3{The Catalan: the bishop will bear down the long diagonal.} d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 Qxc4 b5 Qc2 Bb7 Bd2' },
      { name: 'Closed Catalan', plan: 'Build the centre with Nbd2 and e4, then use the space advantage on the queenside.', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6 Nbd2 b6 e4 Bb7 b3' },
      { name: 'Bogo-style: 4...dxc4', plan: 'Take the pawn back with Qc2/a4 and keep the bishop on the long diagonal.', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 Qc2 b5 a4 Bb7 axb5 axb5 Rxa8 Bxa8' },
    ],
  },
  {
    id: 'colle', name: 'Colle System', side: 'w', level: 'Beginner', icon: '🏗️',
    tagline: 'A simple, reliable setup against almost everything on 1.d4.',
    ideas: ['Play d4, Nf3, e3 and Bd3 in almost every game.', 'Break open the centre with e4 (or c4) at the right time.', 'Aim your pieces at the black king: the e4 break often leads to a king-side attack.', 'Castle early and bring the queen\'s knight to d2.'],
    deep: {
      overview: 'The Colle is a system opening: the same setup against many replies. It is easy to learn and leads to healthy positions where you understand the plans. The classic attacking idea is the e4 break with piece play toward the black king.',
      plans: ['White: e3, Bd3, Nbd2, O-O, then e4 to open the position.', 'Black: strike in the centre with ...c5 and ...Nc6, or use ...e5.'],
      mistakes: ['Playing e4 before you are fully developed.', 'Letting Black play ...e5 for free.', 'Forgetting the bishop on d3 is a target for ...Nb4 or ...c5 ideas.'],
    },
    lines: [
      { name: 'Main line: ...e6 and ...c5', plan: 'After e4 you have a space advantage and open lines; look for attacking chances on the king-side.', moves: 'd4 d5 Nf3 Nf6 e3{The Colle: solid and flexible; opens the f1 bishop.} e6 Bd3 c5 c3 Nc6 Nbd2 Bd6 O-O O-O dxc5 Bxc5 e4 dxe4 Nxe4 Nxe4 Bxe4' },
      { name: 'Black plays ...Bd6 and ...b6', plan: 'A quiet fight: develop the bishop to b2, castle and use the d3-bishop against the king.', moves: 'd4 d5 Nf3 Nf6 e3 e6 Bd3 Bd6 b3 O-O Bb2 Nbd7 O-O b6 Nbd2 Bb7 Ne5' },
      { name: 'Early ...c5', plan: 'Keep the centre solid with c3, then recapture and break with e4.', moves: 'd4 d5 Nf3 Nf6 e3 c5 c3 Nc6 Bd3 e6 Nbd2 Bd6 O-O O-O dxc5 Bxc5 e4' },
    ],
  },
  {
    id: 'evans', name: 'Evans Gambit', side: 'w', level: 'Advanced', icon: '🎲',
    tagline: 'A classic gambit: b4! to grab the centre and open lines.',
    ideas: ['Offer the b-pawn to gain time against the bishop on c5.', 'Build a strong centre with c3 and d4.', 'Use the open lines and fast castling to attack f7.', 'If Black declines, simply develop and keep the centre.'],
    deep: {
      overview: 'The Evans Gambit is a famous nineteenth-century gambit that is still dangerous. White sacrifices a pawn to win time, build the centre and open lines for the bishops.',
      plans: ['White: gain tempi with c3 and d4, castle quickly, and attack the king.', 'Black: return the pawn at the right moment to neutralise the attack.'],
      mistakes: ['Not following up with c3 and d4.', 'Rushing the attack without castling.', 'Forgetting that you are a pawn down — activity must compensate.'],
    },
    lines: [
      { name: 'Accepted: 4...Bxb4', plan: 'The bishop on a5 will be bombarded by d4 and Ba3 ideas; finish development with O-O and Nc3.', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4{The Evans Gambit: gain time and a big centre.} Bxb4 c3 Ba5 d4 exd4 O-O d6 cxd4 Bb6 Nc3 Na5 Bg5 f6 Bf4' },
      { name: 'Accepted with ...Be7', plan: 'Take the centre and develop with Qxd4; keep the initiative.', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Be7 d4 Na5 Be2 exd4 Qxd4 Nf6 Bg5' },
      { name: 'Declined: 4...Bb6', plan: 'Take the space with a4 and develop quietly; you have a safe edge.', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bb6 a4 a6 Nc3 Nf6 d3 d6 Bg5 h6 Bxf6 Qxf6 Nd5 Qd8' },
    ],
  },

  /* ---------------------------------------------------------------- BLACK */
  {
    id: 'petroff', name: 'Petroff Defense', side: 'b', level: 'Intermediate', icon: '🧊',
    tagline: 'Mirror White\'s attack: counter-punch at e4 and keep it simple and solid.',
    ideas: ['Counter-attack with ...Nf6 instead of defending e5.', 'After Nxe5, play ...d6 (kick the knight) and recapture on e4.', 'Aim for a symmetrical, safe position with equal chances.', 'Develop all pieces and castle; trade when possible.'],
    deep: {
      overview: 'The Petroff is among the most solid replies to 1.e4. Black sidesteps most sharp attacking lines and leads to equal, strategic positions. It is the choice of players who want a reliable structure.',
      plans: ['Black: develop with ...Nc6, ...Be7 and ...O-O, then free the position with ...c5 or ...f5 ideas.', 'White: look for a space advantage with d4 and c4 and develop quickly.'],
      mistakes: ['Playing ...Nxe4 without checking the recapture first.', 'Taking the e4 pawn when Nxe5 has not been played.', 'Ignoring White\'s fast development after early queen trades.'],
    },
    lines: [
      { name: 'Main line: 3.Nxe5', plan: 'Play ...Bf5/...Be7 and castle; the position is symmetric and solid. Black has no problems.', moves: 'e4 e5 Nf3 Nf6{The Petroff: counter-attack rather than defend.} Nxe5 d6{Kick the knight away before taking e4.} Nf3 Nxe4 d4 d5 Bd3 Nc6{Develops and pressures d4.} O-O Be7 c4 Nb4 Be2 O-O Nc3 Bf5' },
      { name: '3.d4 Nxe4', plan: 'Trade pieces smoothly and complete development; Black\'s position is solid and easy to play.', moves: 'e4 e5 Nf3 Nf6 d4 Nxe4 Bd3 d5 Nxe5 Nd7 Nxd7 Bxd7 O-O Bd6 c4 c6 Nc3 O-O' },
      { name: 'Early queen trade', plan: 'Equal endgame-like positions: develop with ...Nc6 and castle, and aim for a draw or a small endgame edge.', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 Qe2 Qe7 d3 Nf6 Bg5 Qxe2+ Bxe2 Be7 Nc3 Nc6' },
    ],
  },
  {
    id: 'two-knights', name: 'Two Knights Defense', side: 'b', level: 'Intermediate', icon: '🐴',
    tagline: 'Meet 3.Bc4 with ...Nf6 and counterattack the e4 pawn.',
    ideas: ['Develop the knight to f6 and hit e4.', 'Answer 4.Ng5 with ...d5! — the only good reply.', 'Take Na5 after exd5 to avoid the Fried Liver.', 'In the quiet lines, complete development with ...Be7 and ...O-O.'],
    deep: {
      overview: 'The Two Knights Defense is an active reply to the Italian. It challenges White immediately but requires accurate play against 4.Ng5. If you know the ideas, you can be sharp and dangerous.',
      plans: ['Black: counter with ...d5, retreat the knight to a5, then play ...h6 and ...e4 to gain tempi.', 'White: pressure f7 and play for quick development.'],
      mistakes: ['Playing ...Nxd5 (the Fried Liver) allows a nasty attack.', 'Forgetting that after Bb5+ you must answer ...c6.', 'Moving the same piece twice in the opening.'],
    },
    lines: [
      { name: '4.Ng5 d5 5.exd5 Na5 6.Bb5+', plan: 'Return one pawn at the right moment and aim to complete development; the knight returns via ...Nxc4 or ...b5.', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6{The Two Knights: counter-attack on e4.} Ng5 d5{The only good reply — fight for the centre.} exd5 Na5{Avoid the Fried Liver (...Nxd5?). The knight gets out of danger and attacks the bishop.} Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6 d4 exd3 Nxd3 Qc7' },
      { name: '4.d3 quiet setup', plan: 'Finish development, castle and then break with ...b5/...c5 or ...d5.', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3 Na5 Bb5 a6 Ba4 b5 Bc2 c5' },
      { name: '4.Ng5 d5 5.exd5 Na5 6.d3', plan: 'Hit back with ...h6 and ...e4: Black seizes the initiative and White\'s pieces are scattered.', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 d3 h6 Nf3 e4 Qe2 Nxc4 dxc4 Bc5' },
    ],
  },
  {
    id: 'nimzo-indian', name: 'Nimzo-Indian Defense', side: 'b', level: 'Advanced', icon: '🦅',
    tagline: 'A classic against 1.d4: pin the knight and fight for e4.',
    ideas: ['Pin the c3 knight with ...Bb4 to control e4.', 'Double White\'s pawns by taking on c3 when it helps.', 'Fight for the centre with ...d5 or ...c5.', 'Castle and aim for good piece play.'],
    deep: {
      overview: 'The Nimzo-Indian is a favourite of world-class players. Black develops the bishop to b4, pinning the knight and preparing to damage White\'s structure. The resulting positions are rich in strategy.',
      plans: ['Black: control e4, trade the bishop for the knight when White\'s pawn structure will be damaged, and play ...d5 or ...c5.', 'White: gain the bishop pair, build the centre with e3 and Bd3, and play for a kingside attack.'],
      mistakes: ['Trading the bishop too early when White can recapture without damage.', 'Neglecting the centre.', 'Delaying castling.'],
    },
    lines: [
      { name: 'Rubinstein: 4.e3', plan: 'Aim for ...c5, ...d5, then trade on c3 and use the open b-file or the bishop pair\'s absence.', moves: 'd4 Nf6 c4 e6 Nc3 Bb4{The Nimzo-Indian: pin the knight and fight for e4.} e3 O-O Bd3 d5 Nf3 c5 O-O Nc6 a3 Bxc3 bxc3 dxc4 Bxc4 Qc7 Bd3 e5' },
      { name: 'Classical: 4.Qc2', plan: 'Trade the bishop on c3, accept the doubled pawns, and use the strong light-squared bishop and ...d6/...e5.', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 b6 Bg5 Bb7 e3 d6 f3 Nbd7 Ne2 Qe8' },
      { name: 'Sämisch: 4.f3', plan: 'White has the bishop pair but a weakened king-side. Hit the centre with ...e5 and ...Nc6.', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 f3 d5 a3 Be7 e4 dxe4 fxe4 e5 Nf3 Nc6 Be3 Ng4' },
      { name: 'Kasparov: 4.Nf3', plan: 'Develop quickly: ...c5, ...Nc6 and trade on c3 when it helps.', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Nf3 c5 g3 Nc6 Bg2 Bxc3+ bxc3 d6 O-O O-O Nd2 e5' },
    ],
  },
  {
    id: 'slav', name: 'Slav Defense', side: 'b', level: 'Intermediate', icon: '🏰',
    tagline: 'Support d5 with ...c6 and keep the light-squared bishop active.',
    ideas: ['Play ...c6 to support d5 without blocking the c8-bishop.', 'Develop the bishop to f5 or g4 before ...e6.', 'After ...dxc4 hold the pawn with ...b5 or return it for activity.', 'Castle and use the c-file.'],
    deep: {
      overview: 'The Slav is a very solid answer to the Queen\'s Gambit. Black defends d5 with the c-pawn, keeps the bishop outside the pawn chain and builds a flexible centre.',
      plans: ['Black: ...Bf5, ...e6, ...Bb4 and castle; trade a pair of pieces and aim for ...c5 or ...e5 breaks.', 'White: develop, play e3 and Bxc4, and use the extra space.'],
      mistakes: ['Locking the bishop in with ...e6 before ...Bf5.', 'Taking on c4 without a plan to hold it.', 'Missing White\'s Ne5 jump.'],
    },
    lines: [
      { name: 'Main line: 4.Nc3 dxc4 5.a4', plan: 'Develop the bishop outside the chain, hold the c4 pawn briefly, then complete development.', moves: 'd4 d5 c4 c6{The Slav: support d5 while keeping the c8-bishop free.} Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6 e4 O-O' },
      { name: '4.e3 Bf5', plan: 'Develop with ...e6 and trade the light bishop; complete development with ...Be7 and castling.', moves: 'd4 d5 c4 c6 Nf3 Nf6 e3 Bf5 Nc3 e6 Nh4 Bg6 Nxg6 hxg6 Bd3 Bd6' },
      { name: 'Exchange Slav: 3.cxd5', plan: 'Equal but solid: develop with ...Nf6, ...Nc6, ...Bf5 and avoid being outplayed.', moves: 'd4 d5 c4 c6 cxd5 cxd5 Nc3 Nf6 Bf4 Nc6 e3 Bf5 Nf3 e6' },
    ],
  },
  {
    id: 'pirc', name: 'Pirc Defense', side: 'b', level: 'Intermediate', icon: '🦎',
    tagline: 'Let White build a centre, then undermine it with pieces and pawn breaks.',
    ideas: ['Fianchetto the bishop to g7 and castle quickly.', 'Play ...d6 and ...Nf6 to control the centre indirectly.', 'Strike with ...c5 or ...e5 at the right moment.', 'Keep your pieces flexible and prepare counter-attacks.'],
    deep: {
      overview: 'The Pirc is a hypermodern defence: Black allows White to build a big centre and then attacks it. It leads to rich, unbalanced positions.',
      plans: ['Black: ...Bg7, ...O-O, then ...c5/...e5 to break open the centre.', 'White: build a pawn centre with e4/d4/f4 or play the Austrian Attack.'],
      mistakes: ['Passive play: you must strike at the centre.', 'Neglecting king safety against the 150 Attack.', 'Underestimating the e4-e5 push.'],
    },
    lines: [
      { name: 'Classical: 5.Be2', plan: 'Play ...c6, ...Nbd7 and ...e5 to challenge the centre.', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6 a4 Nbd7 Re1 e5 Bf1 Re8' },
      { name: 'Austrian Attack: 4.f4', plan: 'Hit the centre with ...c5 (or ...Nc6) and use your bishop on g7; White\'s big centre becomes a target.', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5 d5 Bg4 h3 Bxf3 Qxf3 Nc7' },
      { name: '150 Attack: 4.Be3', plan: 'Counter in the centre with ...c6/...b5 and be ready to castle long if White castles king-side.', moves: 'e4 d6 d4 Nf6 Nc3 g6 Be3 c6 Qd2 b5 f3 Nbd7 Bd3 Bg7 Nge2 O-O' },
    ],
  },
  {
    id: 'dragon', name: 'Sicilian Dragon', side: 'b', level: 'Advanced', icon: '🐉',
    tagline: 'A fianchettoed bishop breathes on White\'s queenside and the long diagonal.',
    ideas: ['Play ...g6 and ...Bg7 to develop the dragon bishop.', 'Castle and then attack on the c-file with ...Rc8.', 'Use ...Nc6, ...Bd7 and ...Rc8 as a standard setup.', 'Know when to sacrifice the exchange on c3.'],
    deep: {
      overview: 'The Dragon is a sharp Sicilian where Black fianchettoes the king\'s bishop. The bishop on g7 strikes at the long diagonal and the queenside. It is one of the most combative responses to 1.e4.',
      plans: ['Black: castle, use the c-file, and play ...Ne5 and ...Rc8 against White\'s attacking setup.', 'White: attack with h4-h5 and Bh6 in the Yugoslav, or play a slower Classical setup.'],
      mistakes: ['Opening the h-file for White\'s rook without counterplay.', 'Playing ...d5 too early.', 'Leaving the dragon bishop undefended on g7.'],
    },
    lines: [
      { name: 'Yugoslav Attack', plan: 'White attacks with h4-h5; you counter on the queenside with ...Rc8, ...Ne5 and ...b5 or the exchange sacrifice.', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6{The Dragon: develop the bishop to g7 and pressure the long diagonal.} Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8 Bb3 Ne5 h4 h5' },
      { name: 'Classical: 6.Be2', plan: 'A positional fight: play ...Nc6, ...Be6 and ...Qc8, then pressure the queenside.', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be2 Bg7 O-O O-O Be3 Nc6 Nb3 Be6 f4 Qc8 Kh1 Rd8' },
      { name: '6.Bc4', plan: 'Complete development with ...Nc6 and ...Bd7, then break with ...Rc8 and ...Ne5.', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Bc4 Bg7 Be3 Nc6 Qd2 O-O f3 Bd7 O-O-O Rc8' },
    ],
  },
  {
    id: 'dutch', name: 'Dutch Defense', side: 'b', level: 'Intermediate', icon: '🌷',
    tagline: 'Fight for e4 immediately with ...f5 and play for an attack.',
    ideas: ['Control e4 with ...f5 and ...Nf6.', 'Choose the Stonewall or Leningrad setup depending on White\'s plan.', 'Castle and push ...Qe8-h5.', 'Use the e4 break to change the structure.'],
    deep: {
      overview: 'The Dutch is a fighting reply to 1.d4. Black stakes a claim on e4 and avoids the main-line Queen\'s Gambit. The structure creates unbalanced positions with chances for both sides.',
      plans: ['Black: ...Nf6, ...e6, ...Be7, ...O-O, then ...d6, ...Qe8 and ...Qh5 to attack.', 'White: fianchetto and break with e4 or c5.'],
      mistakes: ['Weakening your king with f5 without castling.', 'Leaving the e6 square weak.', 'Ignoring the e4 break.'],
    },
    lines: [
      { name: 'Fianchetto: 2.g3', plan: 'Use the setup ...Be7, ...O-O, ...d6 and ...Qe8-h5 to build a kingside attack.', moves: 'd4 f5{The Dutch: control e4 immediately.} g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d6 Nc3 Qe8 Re1 Qh5 e4 fxe4 Nxe4 Nxe4 Rxe4' },
      { name: '2.Nf3', plan: 'A flexible Dutch: ...e6, ...Be7 and ...O-O; trade pieces to ease the position.', moves: 'd4 f5 Nf3 Nf6 g3 e6 Bg2 Be7 O-O O-O c4 d6 Nc3 Qe8' },
      { name: '2.Nc3 and Bg5', plan: 'Meet 3.Bg5 with ...e6 and ...Be7; accept a solid structure and trade the pinning bishop.', moves: 'd4 f5 Nc3 Nf6 Bg5 e6 e4 fxe4 Nxe4 Be7 Bxf6 Bxf6 Nf3 O-O Bd3 b6' },
    ],
  },
  {
    id: 'grunfeld', name: 'Grünfeld Defense', side: 'b', level: 'Advanced', icon: '🔥',
    tagline: 'Let White build a huge centre, then smash it with pieces and pawn breaks.',
    ideas: ['Play ...g6 and ...d5 to challenge the centre directly.', 'Take on c3 and put pressure on d4 with ...c5 and ...Bg7.', 'Use the open g7-bishop and the pin on the long diagonal.', 'Aim for active piece play and counterattack.'],
    deep: {
      overview: 'The Grünfeld is a dynamic defence: Black concedes a large centre and attacks it right away. It leads to sharp positions where piece activity beats pawn space.',
      plans: ['Black: pressure d4, develop the bishop to g7, and play ...c5 and ...Qa5+ ideas.', 'White: build a pawn centre and attack with Rb1 and h4, or play quietly with the Fianchetto.'],
      mistakes: ['Passive play: White\'s centre must be attacked.', 'Weakening the king.', 'Forgetting to castle.'],
    },
    lines: [
      { name: 'Exchange Variation', plan: 'Hit d4 with ...c5 and ...Bg7; the open lines favour Black\'s piece play.', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Rb1 O-O Be2 cxd4 cxd4 Qa5+ Bd2 Qxa2 O-O Bg4' },
      { name: '4.Nf3 and Qb3', plan: 'Take the c4 pawn, castle, and counter in the centre with ...Bg4 and ...Nb6.', moves: 'd4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4 Bg4 Be3 Nfd7 Qb3 Nb6' },
      { name: '4.Bg5', plan: 'Take on c3 to damage White\'s structure; then take the c4 pawn and play ...c5.', moves: 'd4 Nf6 c4 g6 Nc3 d5 Bg5 Ne4 Bh4 Nxc3 bxc3 dxc4 e3 Bg7 Bxc4 c5 Ne2 Nc6' },
    ],
  },
  {
    id: 'qga', name: 'Queen\'s Gambit Accepted', side: 'b', level: 'Beginner', icon: '🎁',
    tagline: 'Take the pawn, return it at the right moment, and play against the centre.',
    ideas: ['Take on c4 and develop pieces quickly.', 'Break with ...c5 to challenge d4.', 'Do not cling to the pawn — give it back when needed.', 'Trade pieces and use the extra space on the queenside.'],
    deep: {
      overview: 'In the QGA, Black takes the c4 pawn and leaves White with the task of regaining it. White usually gets a pawn centre while Black gets activity and solid development.',
      plans: ['Black: ...Nf6, ...e6, ...c5 and ...a6/...b5, then develop the bishop to b7.', 'White: win the pawn back with Bxc4 and build a space advantage.'],
      mistakes: ['Holding the pawn with ...b5 too early.', 'Neglecting development.', 'Missing White\'s e4-e5 break.'],
    },
    lines: [
      { name: 'Classical: 3.Nf3 Nf6 4.e3', plan: 'Develop pieces, play ...c5, and trade into a comfortable position.', moves: 'd4 d5 c4 dxc4{The QGA: take the pawn and develop with the idea of returning it.} Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7 Rd1 Nbd7 Nc3 Qb6' },
      { name: '3.e3 e5', plan: 'Strike the centre early and develop with ...Nf6 and ...Be7.', moves: 'd4 d5 c4 dxc4 e3 e5 Bxc4 exd4 exd4 Nf6 Nc3 Be7 Nf3 O-O O-O Nc6' },
      { name: '4.Nc3 a6', plan: 'Hit the centre and keep the extra pawn if safe; after e5 play ...Nd5.', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 Nc3 a6 e4 b5 e5 Nd5 a4 Nxc3 bxc3 Bb7' },
    ],
  },
];
