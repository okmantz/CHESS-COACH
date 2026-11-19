// Compact opening-name database ("moves|name"). Used to label opening phases and to mark "Book" moves.
// Names are common usage names; positions are matched by FEN (so transpositions are recognised).
const RAW = `
e4|King's Pawn Opening
e4 e5|Open Game
e4 e5 Nf3 Nc6|King's Knight Opening
e4 e5 Nf3 Nc6 Bc4|Italian Game
e4 e5 Nf3 Nc6 Bc4 Bc5|Italian Game: Giuoco Piano
e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3|Italian Game: Giuoco Pianissimo
e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+|Italian Game: Giuoco Piano, Main Line
e4 e5 Nf3 Nc6 Bc4 Bc5 b4|Italian Game: Evans Gambit
e4 e5 Nf3 Nc6 Bc4 Nf6|Italian Game: Two Knights Defense
e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5|Two Knights: Knight Attack, Main Line
e4 e5 Nf3 Nc6 Bb5|Ruy Lopez
e4 e5 Nf3 Nc6 Bb5 a6|Ruy Lopez: Morphy Defense
e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O|Ruy Lopez: Main Line
e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7|Ruy Lopez: Closed
e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4|Ruy Lopez: Open
e4 e5 Nf3 Nc6 Bb5 Nf6|Ruy Lopez: Berlin Defense
e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6|Ruy Lopez: Berlin, Main Line
e4 e5 Nf3 Nc6 Bb5 f5|Ruy Lopez: Schliemann Defense
e4 e5 Nf3 Nc6 d4 exd4 Nxd4|Scotch Game
e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5|Scotch Game: Mieses Variation
e4 e5 Nf3 Nc6 d4 exd4 Bc4|Scotch Gambit
e4 e5 Nf3 Nc6 Nc3 Nf6|Four Knights Game
e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5|Four Knights Game: Spanish Variation
e4 e5 Nf3 Nf6|Petrov's Defense
e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5|Petrov's Defense: Main Line
e4 e5 Nf3 d6|Philidor Defense
e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7|Philidor Defense: Hanham Variation
e4 e5 f4|King's Gambit
e4 e5 f4 exf4|King's Gambit Accepted
e4 e5 f4 Bc5|King's Gambit: Classical Defense
e4 e5 Nc3|Vienna Game
e4 e5 Nc3 Nf6 f4|Vienna Game: Vienna Gambit
e4 e5 Bc4|Bishop's Opening
e4 e5 d4 exd4 Qxd4 Nc6|Center Game
e4 e5 d4 exd4 c3|Danish Gambit
e4 c5|Sicilian Defense
e4 c5 Nf3|Sicilian Defense: Open Sicilian
e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3|Sicilian Defense: Open, Main Line
e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6|Sicilian Defense: Najdorf Variation
e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6|Sicilian Defense: Dragon Variation
e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6|Sicilian Defense: Scheveningen Variation
e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5|Sicilian Defense: Sveshnikov-type (…e5)
e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6|Sicilian Defense: Kan Variation
e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 e6|Sicilian Defense: Taimanov Variation
e4 c5 Nf3 Nc6 Bb5|Sicilian Defense: Rossolimo Variation
e4 c5 c3|Sicilian Defense: Alapin Variation
e4 c5 Nc3|Sicilian Defense: Closed
e4 c5 d4 cxd4 c3|Sicilian Defense: Smith-Morra Gambit
e4 e6|French Defense
e4 e6 d4 d5|French Defense: Main Line
e4 e6 d4 d5 Nc3 Bb4|French Defense: Winawer Variation
e4 e6 d4 d5 Nc3 Nf6|French Defense: Classical Variation
e4 e6 d4 d5 e5|French Defense: Advance Variation
e4 e6 d4 d5 exd5 exd5|French Defense: Exchange Variation
e4 e6 d4 d5 Nd2|French Defense: Tarrasch Variation
e4 c6|Caro-Kann Defense
e4 c6 d4 d5|Caro-Kann Defense: Main Line
e4 c6 d4 d5 e5|Caro-Kann Defense: Advance Variation
e4 c6 d4 d5 Nc3 dxe4 Nxe4|Caro-Kann Defense: Classical Variation
e4 c6 d4 d5 exd5 cxd5|Caro-Kann Defense: Exchange Variation
e4 c6 d4 d5 exd5 cxd5 c4|Caro-Kann Defense: Panov Attack
e4 d5|Scandinavian Defense
e4 d5 exd5 Qxd5|Scandinavian Defense: Main Line
e4 d5 exd5 Qxd5 Nc3 Qa5|Scandinavian Defense: Main Line, Qa5
e4 d5 exd5 Nf6|Scandinavian Defense: Modern Variation
e4 d6|Pirc/Robatsch Setup
e4 d6 d4 Nf6 Nc3 g6|Pirc Defense
e4 g6|Modern Defense
e4 Nf6|Alekhine's Defense
d4|Queen's Pawn Opening
d4 d5|Closed Game
d4 d5 c4|Queen's Gambit
d4 d5 c4 dxc4|Queen's Gambit Accepted
d4 d5 c4 e6|Queen's Gambit Declined
d4 d5 c4 e6 Nc3 Nf6 Bg5|Queen's Gambit Declined: Orthodox Defense
d4 d5 c4 e6 Nc3 Nf6 Nf3 Be7|Queen's Gambit Declined: Classical
d4 d5 c4 c6|Slav Defense
d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4|Slav Defense: Main Line
d4 d5 c4 c6 Nf3 Nf6 Nc3 e6|Semi-Slav Defense
d4 d5 Nf3 Nf6 Bf4|London System
d4 d5 Bf4|London System
d4 Nf6 Nf3 e6 Bf4|London System
d4 Nf6 Nf3 d5 Bf4|London System
d4 d5 e4|Blackmar-Diemer-type Gambit
d4 Nf6|Indian Defense
d4 Nf6 c4 g6|Indian Defense: Fianchetto
d4 Nf6 c4 g6 Nc3 Bg7 e4 d6|King's Indian Defense
d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5|King's Indian Defense: Classical Variation
d4 Nf6 c4 g6 Nc3 d5|Grünfeld Defense
d4 Nf6 c4 e6 Nc3 Bb4|Nimzo-Indian Defense
d4 Nf6 c4 e6 Nf3 b6|Queen's Indian Defense
d4 Nf6 c4 e6 g3|Catalan Opening
d4 Nf6 c4 e6 Nf3 d5|Queen's Gambit Declined (via Nf6)
d4 Nf6 Nf3 e6 Bg5|Torre Attack
d4 Nf6 Bg5|Trompowsky Attack
d4 f5|Dutch Defense
d4 f5 g3 Nf6 Bg2 e6|Dutch Defense: Leningrad-type
d4 d6|Old Indian-type Setup
c4|English Opening
c4 e5|English Opening: Reversed Sicilian
c4 c5|English Opening: Symmetrical Variation
c4 Nf6|English Opening: Anglo-Indian Defense
Nf3|Réti Opening
Nf3 d5 g3|Réti Opening: King's Indian Attack
Nf3 d5 c4|Réti Opening: Main Line
f4|Bird's Opening
b3|Nimzo-Larsen Attack
g3|King's Fianchetto Opening
b4|Polish (Sokolsky) Opening
`;

export const ECO = RAW.trim().split('\n').map((l) => {
  const [moves, name] = l.split('|');
  return { moves: moves.trim().split(/\s+/), name: name.trim() };
});
