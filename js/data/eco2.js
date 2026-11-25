// Extra named variations (more branches for the opening explorer and for labelling "Book" moves in reviews).
// Same format as eco.js: "moves|name". Legality of every line is checked by tests/openings.test.mjs.
export const ECO_EXTRA_RAW = `
e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6|Sicilian Defense: Najdorf Variation
e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5|Sicilian Defense: Najdorf, 6.Bg5
e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3|Sicilian Defense: Najdorf, English Attack
e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2|Sicilian Defense: Najdorf, Classical (6.Be2)
e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4|Sicilian Defense: Najdorf, 6.Bg5 e6 7.f4
e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6|Sicilian Defense: Dragon Variation
e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6|Sicilian Defense: Dragon, Yugoslav Attack
e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6|Sicilian Defense: Classical Variation
e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6|Sicilian Defense: Scheveningen Variation
e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5|Sicilian Defense: Lasker-Pelikan (Sveshnikov)
e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6|Sicilian Defense: Sveshnikov Variation
e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6|Sicilian Defense: Kan Variation
e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6|Sicilian Defense: Taimanov Variation
e4 c5 c3|Sicilian Defense: Alapin Variation
e4 c5 Nc3|Sicilian Defense: Closed Variation
e4 c5 Nf3 d6 Bb5+|Sicilian Defense: Moscow Variation
e4 c5 Nf3 Nc6 Bb5|Sicilian Defense: Rossolimo Variation
e4 c5 d4 cxd4 c3|Sicilian Defense: Smith-Morra Gambit
e4 c5 f4|Sicilian Defense: Grand Prix Attack
e4 e6 d4 d5 Nc3 Nf6|French Defense: Classical Variation
e4 e6 d4 d5 Nc3 Bb4|French Defense: Winawer Variation
e4 e6 d4 d5 Nc3 dxe4|French Defense: Rubinstein Variation
e4 e6 d4 d5 Nd2|French Defense: Tarrasch Variation
e4 e6 d4 d5 Nd2 Nf6|French Defense: Tarrasch, Closed (3...Nf6)
e4 e6 d4 d5 Nd2 c5|French Defense: Tarrasch, Open (3...c5)
e4 e6 d4 d5 e5|French Defense: Advance Variation
e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6|French Defense: Advance, Main Line
e4 e6 d4 d5 exd5 exd5|French Defense: Exchange Variation
e4 c6 d4 d5 Nc3 dxe4 Nxe4|Caro-Kann Defense: Main Line
e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5|Caro-Kann Defense: Classical Variation
e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7|Caro-Kann Defense: Smyslov Variation
e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6|Caro-Kann Defense: Bronstein-Larsen Variation
e4 c6 d4 d5 e5|Caro-Kann Defense: Advance Variation
e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2|Caro-Kann Defense: Advance, Short Variation
e4 c6 d4 d5 exd5 cxd5|Caro-Kann Defense: Exchange Variation
e4 c6 d4 d5 f3|Caro-Kann Defense: Fantasy Variation
e4 d5 exd5 Qxd5 Nc3 Qa5|Scandinavian Defense: Main Line
e4 d5 exd5 Qxd5 Nc3 Qd6|Scandinavian Defense: Qd6 Variation
e4 d5 exd5 Nf6|Scandinavian Defense: Modern Variation
e4 d6 d4 Nf6 Nc3 g6|Pirc Defense
e4 d6 d4 Nf6 Nc3 g6 f4|Pirc Defense: Austrian Attack
e4 d6 d4 Nf6 Nc3 g6 Nf3|Pirc Defense: Classical Variation
e4 d6 d4 Nf6 Nc3 g6 Be3|Pirc Defense: 150 Attack
e4 Nf6|Alekhine's Defense
e4 Nf6 e5 Nd5 d4 d6|Alekhine's Defense: Modern Variation
e4 g6|Modern Defense
e4 e5 Nf3 d6|Philidor Defense
e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7|Philidor Defense: Hanham Variation
e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7|Petrov's Defense: Main Line
e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 Nc3|Petrov's Defense: Three Knights (Nc3)
e4 e5 Nf3 Nc6 Bb5 a6|Ruy Lopez: Morphy Defense
e4 e5 Nf3 Nc6 Bb5 Nf6|Ruy Lopez: Berlin Defense
e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8|Ruy Lopez: Berlin, Endgame
e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O|Ruy Lopez: Closed, Main Line
e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4|Ruy Lopez: Open Variation
e4 e5 Nf3 Nc6 Bb5 a6 Bxc6|Ruy Lopez: Exchange Variation
e4 e5 Nf3 Nc6 Bb5 f5|Ruy Lopez: Schliemann Defense
e4 e5 Nf3 Nc6 Bb5 Bc5|Ruy Lopez: Classical (Cordel) Defense
e4 e5 Nf3 Nc6 d4 exd4 Nxd4|Scotch Game
e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4|Scotch Game: Mieses Variation
e4 e5 Nf3 Nc6 d4 exd4 Bc4|Scotch Gambit
e4 e5 Nc3|Vienna Game
e4 e5 Nc3 Nf6 f4|Vienna Game: Vienna Gambit
e4 e5 f4|King's Gambit
e4 e5 f4 exf4|King's Gambit Accepted
e4 e5 f4 exf4 Nf3 g5|King's Gambit Accepted: Classical Variation
e4 e5 f4 Bc5|King's Gambit Declined: Classical Variation
e4 e5 f4 d5|King's Gambit Declined: Falkbeer Countergambit
e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7|Italian Game: Fried Liver Attack
e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5|Italian Game: Two Knights, Main Line
e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3|Italian Game: Evans Gambit Accepted
e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3 Nxe4|Italian Game: Giuoco Piano, Moller Attack
e4 e5 Nf3 Nc6 Nc3 Nf6|Four Knights Game
e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5|Four Knights Game: Spanish Variation
d4 d5 c4|Queen's Gambit
d4 d5 c4 e6|Queen's Gambit Declined
d4 d5 c4 e6 Nc3 Nf6 Bg5|Queen's Gambit Declined: Orthodox Defense
d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4|Queen's Gambit Declined: Orthodox, Main Line
d4 d5 c4 e6 Nc3 Nf6 cxd5|Queen's Gambit Declined: Exchange Variation
d4 d5 c4 e6 Nc3 c5|Queen's Gambit Declined: Tarrasch Defense
d4 d5 c4 e6 Nc3 Nf6 Nf3 Be7|Queen's Gambit Declined: Main Line
d4 d5 c4 e6 Nf3 Nf6 g3|Catalan Opening
d4 d5 c4 dxc4|Queen's Gambit Accepted
d4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5|Queen's Gambit Accepted: Classical Variation
d4 d5 c4 c6|Slav Defense
d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4|Slav Defense: Accepted Variation
d4 d5 c4 c6 Nf3 Nf6 Nc3 e6|Semi-Slav Defense
d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5|Semi-Slav Defense: Meran Variation
d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5|Semi-Slav Defense: Anti-Meran (Bg5)
d4 d5 Bf4|London System
d4 Nf6 Bf4|London System: Indian Setup
d4 d5 Nf3 Nf6 Bf4 e6 e3 Bd6 Bg3|London System: Main Line
d4 Nf6 c4 e6 Nc3 Bb4|Nimzo-Indian Defense
d4 Nf6 c4 e6 Nc3 Bb4 e3|Nimzo-Indian Defense: Rubinstein Variation
d4 Nf6 c4 e6 Nc3 Bb4 Qc2|Nimzo-Indian Defense: Classical (Capablanca) Variation
d4 Nf6 c4 e6 Nf3 b6|Queen's Indian Defense
d4 Nf6 c4 e6 g3|Catalan Opening: Open Variation setup
d4 Nf6 c4 g6 Nc3 Bg7 e4 d6|King's Indian Defense
d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5|King's Indian Defense: Classical, Main Line
d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3|King's Indian Defense: Samisch Variation
d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7|King's Indian Defense: Classical, Mar del Plata
d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1|King's Indian Defense: Mar del Plata, 9.Ne1
d4 Nf6 c4 g6 Nc3 d5|Grunfeld Defense
d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7|Grunfeld Defense: Exchange Variation
d4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7|Grunfeld Defense: Russian/Classical Setup
d4 Nf6 c4 c5 d5 e6|Benoni Defense: Modern Variation
d4 Nf6 c4 c5 d5 b5|Benko Gambit
d4 f5|Dutch Defense
d4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d6|Dutch Defense: Classical Variation
d4 Nf6 Nf3 e6 Bg5|Torre Attack
d4 d5 Nf3 Nf6 e3 e6 Bd3|Colle System
c4 e5|English Opening: Reversed Sicilian
c4 c5|English Opening: Symmetrical Variation
c4 Nf6|English Opening: Anglo-Indian Defense
c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5|English Opening: Reversed Dragon
Nf3 d5 g3|Reti Opening: King's Indian Attack
Nf3 Nf6 c4 g6 Nc3 Bg7|Reti Opening: Anglo-Indian Setup
f4 d5|Bird's Opening: Dutch Variation
`;
