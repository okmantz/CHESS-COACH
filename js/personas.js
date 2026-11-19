// The voices of the ten opponents (and the coach). Each opponent reacts to what happens on the board with a short speech-bubble line.
// Lines are deliberately short: a bubble must be readable at a glance on a phone while the board is on screen.
export const COACH = {
  who: 'Coach', title: 'Your coach', avatar: 'coach', color: '#f5c451',
};

// event -> lines. {x} placeholders are filled by the caller (square / piece names) where relevant.
const V = {
  1: { // Sam — cheerful beginner
    greet: ['Hi! I just learned castling. Be nice!', 'Ooh, a real game! Good luck!'],
    capture: ['Yoink! Was that allowed? Yes!', 'I took something! Is that good?'],
    check: ['Check! I think. Yep, check!', 'Your king is in trouble. Probably.'],
    userCapture: ['Hey, that was mine!', 'Oh no. I liked that piece.'],
    userBlunder: ['Wait, did you just leave that there?', 'Is that a free piece? It is, right?'],
    userGreat: ['Whoa, how did you see that?', 'Okay, you are good at this.'],
    botSlip: ['Hmm. That might have been a mistake.', 'Oops. I wanted to do something else.'],
    winning: ['I think I am winning? Wow!', 'This is going great. I think.'],
    losing: ['I am losing, aren\'t I?', 'Uh oh. Where did my pieces go?'],
    win: ['I won?! Really?! Thanks for playing!', 'Yay! Good game!'],
    lose: ['You win! That was fun. Again?', 'Great game! I learned a lot.'],
    draw: ['A draw! That is like winning, right?', 'Nobody lost. Hooray!'],
  },
  2: { // Maya — curious, bubbly
    greet: ['Let\'s play! I\'ve been practising forks.', 'Hi! Ready when you are.'],
    capture: ['Got it! Thanks for the piece.', 'Free material, yes please.'],
    check: ['Check! Did you see that coming?', 'Knock knock. Check!'],
    userCapture: ['Hey! I was using that.', 'Okay okay, you got me there.'],
    userBlunder: ['Is that piece protected? I do not think so.', 'Ooh, that looks loose.'],
    userGreat: ['Nice one. I did not see that.', 'Clever! Teach me that trick.'],
    botSlip: ['Hmm, I may have rushed that.', 'Whoops. That was not the plan.'],
    winning: ['I like my position. Do you like yours?', 'Things are looking up for me!'],
    losing: ['Okay, this is getting tricky.', 'I need a miracle. Or a fork.'],
    win: ['I won! Great game, you almost had me.', 'Yes! Thanks for the game!'],
    lose: ['Well played! I need to study more.', 'You beat me fair and square.'],
    draw: ['A draw. I will take it!', 'Evenly matched today.'],
  },
  3: { // Ethan — thoughtful
    greet: ['Hmm, let me set up my thinking cap.', 'Good luck. I will think carefully.'],
    capture: ['Calculated. That one was safe.', 'I counted the attackers. Worth it.'],
    check: ['Check. I thought about that one.', 'A check, carefully prepared.'],
    userCapture: ['Hmm. I should have counted that.', 'Fair trade. Or maybe not.'],
    userBlunder: ['Interesting. I think that hangs something.', 'Hold on, is that really safe?'],
    userGreat: ['Good move. I missed that idea.', 'Hm, that is stronger than it looks.'],
    botSlip: ['I miscalculated. Annoying.', 'I should have looked one move deeper.'],
    winning: ['The plan is working so far.', 'I think I have a small edge.'],
    losing: ['I need to find counterplay, quick.', 'Hmm. Let me think about defence.'],
    win: ['Good game. Careful thinking pays off.', 'I enjoyed that. Thanks!'],
    lose: ['You outplayed me. Nicely done.', 'I will review this game tonight.'],
    draw: ['A fair result.', 'I will take a draw. Good game.'],
  },
  4: { // Jake — cocky
    greet: ['Hope you brought your A-game.', 'Quick game? I play fast.'],
    capture: ['Thanks for the gift!', 'Mine now. Keep up!'],
    check: ['Check! Too slow.', 'Scared yet? Check!'],
    userCapture: ['Lucky. Do not get used to it.', 'Fine. Take it. I have a plan.'],
    userBlunder: ['Ha! Are you sure about that?', 'That is going to cost you.'],
    userGreat: ['Okay, that one was actually good.', 'Hm. Did not expect that. Respect.'],
    botSlip: ['That was on purpose. Obviously.', 'Okay, I may have blundered that one.'],
    winning: ['This is not even close.', 'I could play this with my eyes shut.'],
    losing: ['Whatever, I am just warming up.', 'Okay, now I have to actually try.'],
    win: ['Easy! Rematch whenever you are ready.', 'Told you. Good game though.'],
    lose: ['Alright, alright. Nice game. Rematch?', 'You got me. It will not happen twice.'],
    draw: ['A draw? I am letting you off easy.', 'Next game I will win.'],
  },
  5: { // Sofia — composed, encouraging with a bite
    greet: ['Let\'s have a good game.', 'May the better strategist win.'],
    capture: ['Thank you. That was undefended.', 'A pawn here, a piece there.'],
    check: ['Check. Choose your reply wisely.', 'Check. Your king looks nervous.'],
    userCapture: ['Well spotted.', 'Taken. I will get it back.'],
    userBlunder: ['That was a generous move.', 'I do not think that piece is safe.'],
    userGreat: ['Excellent. I did not expect that.', 'Beautiful. Truly.'],
    botSlip: ['I should have seen that. Noted.', 'An inaccuracy. It happens to the best.'],
    winning: ['I am pleased with this position.', 'Steady pressure. It always works.'],
    losing: ['You are playing well. I am impressed.', 'I will need to fight for this one.'],
    win: ['Good fight. Study that ending and come back.', 'A well-played game by both of us.'],
    lose: ['Congratulations. That was well earned.', 'You deserved that win.'],
    draw: ['A balanced game. Respectable.', 'Neither of us gave an inch.'],
  },
  6: { // Marcus — calm, dry humour
    greet: ['Good luck. Take your time.', 'Let us see what you have prepared.'],
    capture: ['Exchange accepted.', 'I will take that, thank you.'],
    check: ['Check. Nothing personal.', 'Check. Quietly.'],
    userCapture: ['Fair enough.', 'I expected that. Continue.'],
    userBlunder: ['That loses material, I believe.', 'I will not argue with a free piece.'],
    userGreat: ['A strong move. Respect.', 'Hm. That is the right idea.'],
    botSlip: ['Imprecise. I will correct it.', 'A small slip. Nothing to see here.'],
    winning: ['The position is going my way.', 'Slowly, then all at once.'],
    losing: ['Impressive. Now I am worried.', 'I may need to rethink this.'],
    win: ['Thanks for the game. Study the endgame.', 'Solid game. See you next time.'],
    lose: ['You earned that. Well played.', 'Good game. Genuinely.'],
    draw: ['A draw. Balanced, like all good things.', 'I accept the draw. Good game.'],
  },
  7: { // Elena — confident, precise
    greet: ['Let\'s see how well you calculate.', 'I have been looking forward to this.'],
    capture: ['That piece was loose.', 'I take what the position gives me.'],
    check: ['Check. The attack begins.', 'Check. Your move is forced.'],
    userCapture: ['A fair exchange. Continue.', 'Noted. Let us see where that leads.'],
    userBlunder: ['That is a mistake, and I will use it.', 'Thank you. That changes the evaluation.'],
    userGreat: ['Precise. I am impressed.', 'You found the only move. Well done.'],
    botSlip: ['An inaccuracy. I will fix it.', 'I misjudged that. Be careful.'],
    winning: ['The initiative is mine.', 'Everything is coordinating nicely.'],
    losing: ['You are better here. For now.', 'I will need to find a resource.'],
    win: ['Good game. Review the critical moment.', 'Convincing, but you played well.'],
    lose: ['Excellent play. You earned the point.', 'Well done. That was convincing.'],
    draw: ['A fair draw, well fought.', 'I will accept. Good game.'],
  },
  8: { // Daniel — serious, strategic
    greet: ['Let us begin. Play your best.', 'A pleasure. Do not hurry.'],
    capture: ['The pawn structure favours me now.', 'Material is material.'],
    check: ['Check. Think before you reply.', 'Check. A necessary step.'],
    userCapture: ['Acceptable. I have compensation.', 'Hm. Interesting choice.'],
    userBlunder: ['That is a serious concession.', 'The weakness will not go away.'],
    userGreat: ['A mature move. I respect it.', 'That requires real understanding.'],
    botSlip: ['An inexactitude. It will not repeat.', 'That was less accurate than I intended.'],
    winning: ['The plan is unfolding as expected.', 'I am slowly improving my position.'],
    losing: ['You are outplaying me. Continue.', 'This is difficult. I must be precise.'],
    win: ['Good game. Your play had promise.', 'A hard-fought win. Well played.'],
    lose: ['That was masterful. Congratulations.', 'You beat me fairly. Impressive.'],
    draw: ['A draw is a fair reflection.', 'Both of us played with care.'],
  },
  9: { // Kai — cool, intense
    greet: ['Show me what you have got.', 'No tricks. Just chess.'],
    capture: ['Taken.', 'That piece was not safe.'],
    check: ['Check.', 'Check. Quietly.'],
    userCapture: ['Expected.', 'You have my attention now.'],
    userBlunder: ['That is a mistake.', 'I will not waste that.'],
    userGreat: ['Nice. Very nice.', 'Not bad at all.'],
    botSlip: ['Careless.', 'I missed that. It will not happen again.'],
    winning: ['The initiative is mine.', 'You are running out of good moves.'],
    losing: ['Hm. You are dangerous.', 'I am under pressure. Good.'],
    win: ['Good game. Come back stronger.', 'Respect for fighting to the end.'],
    lose: ['Brilliant game. Truly.', 'You beat me. Do not let it go to your head.'],
    draw: ['A draw. Neither of us blinked.', 'Evenly matched. I like that.'],
  },
  10: { // Viktor — old master
    greet: ['Sit. Let us see what you have learned.', 'Chess is a long conversation. Begin.'],
    capture: ['You left it. I took it.', 'The board always collects its debts.'],
    check: ['Check. Calmly now.', 'Check. The king must choose.'],
    userCapture: ['Taken. We shall see about compensation.', 'A fair trade. Nothing more.'],
    userBlunder: ['Ah. That was an error.', 'A small mistake. It is usually enough.'],
    userGreat: ['Ah, there it is. A real move.', 'That was worthy of a good player.'],
    botSlip: ['A slip. Even old masters have them.', 'Hm. That was not my finest.'],
    winning: ['The position speaks for itself.', 'I have seen this ending many times.'],
    losing: ['You surprise me. I like that.', 'This is unexpected. Well played.'],
    win: ['Good game. Come back when you are stronger.', 'A good fight. Study it well.'],
    lose: ['Remarkable. You have my respect.', 'You played better than I did today.'],
    draw: ['A draw. It was a fair fight.', 'We both played well. Thank you.'],
  },
};

const FALLBACK = {
  greet: ['Good luck!'], capture: ['Captured.'], check: ['Check!'], userCapture: ['Good capture.'], userBlunder: ['That might be a mistake.'], userGreat: ['Nice move.'],
  botSlip: ['Hmm.'], winning: ['I like my position.'], losing: ['This is getting hard.'], win: ['Good game!'], lose: ['Well played!'], draw: ['A fair draw.'],
};

const spoken = new Map(); // persona+event -> last index (avoids repeating the same line twice in a row)
export function line(levelN, event, rand = Math.random) {
  const set = (V[levelN] && V[levelN][event]) || FALLBACK[event] || [''];
  const key = `${levelN}:${event}`;
  let i = Math.floor(rand() * set.length);
  if (set.length > 1 && spoken.get(key) === i) i = (i + 1) % set.length;
  spoken.set(key, i);
  return set[i];
}

export const PRIORITY = ['win', 'lose', 'draw', 'userBlunder', 'userGreat', 'botSlip', 'check', 'capture', 'userCapture', 'winning', 'losing'];
/** Pick the most relevant reaction among several candidates (nulls ignored). */
export const best = (...rs) => rs.filter(Boolean).sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind))[0] || null;

/**
 * Decide what (if anything) this opponent says after a move. `ctx`:
 *   mover: 'bot'|'user'; mv: chess.js verbose move; check: bool; botEval: bot-POV centipawns BEFORE bot's move (or null);
 *   prevEval: bot-POV centipawns on the previous bot turn; slip: bool (bot played a clearly worse move than its best);
 *   moveNo: ply count. Returns {text, mood} or null (silence is part of a personality).
 */
export function react(levelN, ctx, rand = Math.random) {
  const say = (event, mood = 'neutral') => ({ text: line(levelN, event, rand), mood, kind: event });
  const { mv, mover, check } = ctx;
  if (ctx.over) return say(ctx.over, ctx.over === 'win' ? 'happy' : ctx.over === 'lose' ? 'sad' : 'neutral');
  if (mover === 'bot') {
    if (ctx.slip && rand() < 0.8) return say('botSlip', 'sad');
    if (check) return rand() < 0.8 ? say('check', 'happy') : null;
    if (mv && mv.captured) return rand() < 0.7 ? say('capture', 'happy') : null;
    if (ctx.botEval != null && ctx.botEval >= 450 && rand() < 0.2) return say('winning', 'happy');
    if (ctx.botEval != null && ctx.botEval <= -450 && rand() < 0.2) return say('losing', 'sad');
    return null;
  }
  // the human just moved
  const swing = ctx.botEval != null && ctx.prevEval != null ? ctx.botEval - ctx.prevEval : 0;
  if (swing >= 220 && rand() < 0.85) return say('userBlunder', 'happy');
  if (swing <= -220 && rand() < 0.85) return say('userGreat', 'sad');
  if (mv && mv.captured && rand() < 0.6) return say('userCapture', 'sad');
  return null;
}
