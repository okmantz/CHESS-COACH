// UCI wrapper around Stockfish (WASM, single-threaded "lite" build).
// Transport-agnostic so the very same code runs in the browser (Web Worker)
// and in Node (child process) for the offline content-generation scripts / tests.

export class Engine {
  /** @param {{post:(cmd:string)=>void, terminate:()=>void, onmessage:null|((line:string)=>void)}} transport */
  constructor(transport) {
    this.t = transport;
    this.t.onmessage = (line) => this._onLine(line);
    this._waiters = [];
    this._search = null;
    this._chain = Promise.resolve();
    this.ready = false;
    this.name = 'Stockfish';
    this._lastOptions = {};
  }

  static browser(path = 'engine/stockfish-19-lite-single.js') {
    const worker = new Worker(path);
    const t = {
      onmessage: null,
      post: (c) => worker.postMessage(c),
      terminate: () => worker.terminate(),
    };
    worker.onmessage = (e) => t.onmessage && t.onmessage(typeof e.data === 'string' ? e.data : String(e.data));
    worker.onerror = (e) => { console.error('Engine worker error', e); t.onerror && t.onerror(e); };
    const eng = new Engine(t);
    t.onerror = (e) => eng._fail(e);
    return eng;
  }

  _fail(e) {
    const err = new Error('Engine failed to load: ' + (e && e.message ? e.message : 'unknown'));
    this.failed = err;
    this._waiters.splice(0).forEach((w) => w.reject(err));
    if (this._search) { this._search.reject(err); this._search = null; }
  }

  _onLine(line) {
    if (typeof line !== 'string') return;
    line = line.trim();
    if (!line) return;
    for (let i = 0; i < this._waiters.length; i++) {
      const w = this._waiters[i];
      if (line.startsWith(w.token)) { this._waiters.splice(i, 1); w.resolve(line); return; }
    }
    const s = this._search;
    if (!s) return;
    if (line.startsWith('info ') && line.includes(' pv ')) {
      const info = parseInfo(line);
      if (info && !info.bound) {
        const prev = s.lines[info.multipv];
        if (!prev || info.depth >= prev.depth) s.lines[info.multipv] = info;
        if (s.onInfo) s.onInfo(info, s.lines);
      }
    } else if (line.startsWith('bestmove')) {
      const m = line.split(/\s+/)[1];
      this._search = null;
      const lines = Object.keys(s.lines).map(Number).sort((a, b) => a - b).map((k) => s.lines[k]);
      s.resolve({ bestmove: m === '(none)' ? null : m, lines });
    }
  }

  _wait(token) {
    return new Promise((resolve, reject) => {
      if (this.failed) return reject(this.failed);
      this._waiters.push({ token, resolve, reject });
    });
  }

  async init() {
    if (this.ready) return this;
    this.t.post('uci');
    await this._wait('uciok');
    this.t.post('setoption name Hash value 32');
    this.t.post('isready');
    await this._wait('readyok');
    this.ready = true;
    return this;
  }

  async setOptions(opts) {
    for (const [k, v] of Object.entries(opts)) {
      if (this._lastOptions[k] === v) continue;
      this.t.post(`setoption name ${k} value ${v}`);
      this._lastOptions[k] = v;
    }
    this.t.post('isready');
    await this._wait('readyok');
  }

  async newGame() {
    this.t.post('ucinewgame');
    this.t.post('isready');
    await this._wait('readyok');
  }

  /**
   * Run a search. Calls are serialised.
   * @returns {Promise<{bestmove:string|null, lines:Array}>} lines are sorted by multipv; scores are from the
   *          side-to-move's perspective (raw UCI) AND normalised to White in `.white` ({cp,mate}).
   */
  go({ fen, depth, movetime, nodes, multipv = 1, options = {}, onInfo, searchmoves } = {}) {
    const run = async () => {
      await this.init();
      await this.setOptions({ MultiPV: multipv, UCI_LimitStrength: 'false', 'Skill Level': 20, ...options });
      this.t.post(`position fen ${fen}`);
      const turn = fen.split(' ')[1] || 'w';
      let cmd = 'go';
      if (depth) cmd += ` depth ${depth}`;
      if (movetime) cmd += ` movetime ${movetime}`;
      if (nodes) cmd += ` nodes ${nodes}`;
      if (searchmoves && searchmoves.length) cmd += ` searchmoves ${searchmoves.join(' ')}`;
      if (cmd === 'go') cmd = 'go depth 12';
      const res = await new Promise((resolve, reject) => {
        this._search = { resolve, reject, lines: {}, onInfo };
        this.t.post(cmd);
      });
      for (const l of res.lines) l.white = l.mate != null ? { mate: turn === 'w' ? l.mate : -l.mate } : { cp: turn === 'w' ? l.cp : -l.cp };
      res.turn = turn;
      return res;
    };
    const p = this._chain.then(run, run);
    this._chain = p.catch(() => {});
    return p;
  }

  stop() { this.t.post('stop'); }

  /** Abort anything running and drop queued work. */
  async reset() {
    if (this._search) this.t.post('stop');
  }

  terminate() { try { this.t.terminate(); } catch (e) { /* ignore */ } }
}

export function parseInfo(line) {
  const tok = line.split(/\s+/);
  const o = { multipv: 1 };
  for (let i = 1; i < tok.length; i++) {
    switch (tok[i]) {
      case 'depth': o.depth = +tok[++i]; break;
      case 'seldepth': o.seldepth = +tok[++i]; break;
      case 'multipv': o.multipv = +tok[++i]; break;
      case 'nodes': o.nodes = +tok[++i]; break;
      case 'nps': o.nps = +tok[++i]; break;
      case 'time': o.time = +tok[++i]; break;
      case 'score': {
        const kind = tok[++i];
        const val = +tok[++i];
        if (kind === 'cp') o.cp = val; else if (kind === 'mate') o.mate = val;
        if (tok[i + 1] === 'lowerbound' || tok[i + 1] === 'upperbound') { o.bound = tok[++i]; }
        break;
      }
      case 'pv': o.pv = tok.slice(i + 1); i = tok.length; break;
      default: break;
    }
  }
  if (o.depth == null || (o.cp == null && o.mate == null) || !o.pv) return null;
  return o;
}
