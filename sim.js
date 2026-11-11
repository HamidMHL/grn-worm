// A shared world of worms. Each worm grows from one egg cell and is run by a
// gene regulatory network that is read from a DNA string (letters A, C, G, T).
// Worms eat, grow, expel waste, get hunted, and lay eggs with mutated DNA.
// Works in Node (require) and in the browser (window.GRNSim).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GRNSim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- what a cell can sense, make and do ----------
  const INPUTS = ['foodSmell', 'foodSide', 'enemySmell', 'enemySide', 'energy',
    'gutFood', 'gutWaste', 'maternal', 'edge'];
  const N_TF = 12;   // transcription factor kinds
  const N_SIG = 3;   // signal kinds (spread to neighbouring cells)
  const EFFECTORS = ['mouth', 'digest', 'anus', 'muscleL', 'muscleR', 'divide', 'lay'];
  const N_IN = INPUTS.length, N_EFF = EFFECTORS.length;
  const NPROD = N_TF + N_SIG + N_EFF;    // kinds of gene product
  const NREG = N_IN + N_TF + N_SIG;      // things that can regulate a gene
  const P_SIG = N_TF, P_EFF = N_TF + N_SIG;
  const PM = P_EFF, PD = P_EFF + 1, PA = P_EFF + 2, PL = P_EFF + 3, PR = P_EFF + 4, PDIV = P_EFF + 5, PLAY = P_EFF + 6;
  const PROD_NAMES = [];
  for (let i = 0; i < N_TF; i++) PROD_NAMES.push('T' + (i + 1));
  for (let i = 0; i < N_SIG; i++) PROD_NAMES.push('S' + (i + 1));
  for (const e of EFFECTORS) PROD_NAMES.push(e);
  const REG_NAMES = INPUTS.concat(PROD_NAMES.slice(0, N_TF + N_SIG));
  // S1 spreads far and lasts, S3 stays local and fades fast.
  const SIG_D = [0.25, 0.1, 0.03], SIG_K = [0.02, 0.08, 0.2];
  const RATES = [0.03, 0.08, 0.18, 0.4];
  const MAXG = 64;   // genes read per genome

  const P = {
    size: 500, grid: 100, bucket: 10,
    maxCells: 24, spacing: 5, sensorOffset: 4, vmax: 1.6, wmax: 0.15,
    maxFood: 450, startFood: 350, regrow: 1.0, nPatches: 14, patchSpread: 20,
    foodMass: 8, foodSigma: 14, eatReach: 5, mouthMin: 0.15,
    gutCap: 12, digestRate: 0.03, yield: 2, wasteFrac: 0.5,
    gutFlow: 0.06, anusRate: 0.25, wasteTox: 4, toxCost: 0.02,
    eggEnergy: 30, basalCost: 0.003, effCost: 0.004, muscleCost: 0.007, regCost: 0.0005,
    divThreshold: 0.5, divCost: 5, divMinEnergy: 14, divCooldown: 40, effCapacity: 1.0,
    maternalDecay: 0.995,   // the egg's head marker fades (half gone in ~140 ticks)
    layMin: 50, layMinCells: 5, eggCost: 34, layCooldown: 150, maxAge: 6000,
    maxWorms: 200, minWorms: 20,
    nPred: 6, predWander: 0.4, predChase: 0.75, predSigma: 30,
    predDetectBase: 5, predDetectPerCell: 3.5, predDetectMax: 60,
    biteReach: 5, predSatiated: 200,
    mu: 0.002, pIndel: 0.08, pDup: 0.04, pDel: 0.015
  };

  // ---------- random numbers ----------
  function makeRng(seed) {
    let a = seed >>> 0;
    const rng = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    rng.gauss = function () {
      let u = 0; while (u === 0) u = rng();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307 * rng());
    };
    rng.int = (n) => Math.floor(rng() * n);
    return rng;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // ---------- DNA ----------
  // A gene starts at the promoter TATA and is read left to right:
  //   3 letters  which product it makes
  //   2 letters  default level (how on or off it is with nothing bound)
  //   1 letter   how fast its level changes
  //   then binding sites of 6 letters each, until a site slot starts with T:
  //     1 letter (A, C or G)  "another site follows"
  //     3 letters             which regulator binds here
  //     2 letters             strength: low values repress, high values activate
  const LET = 'ACGT', VAL = { A: 0, C: 1, G: 2, T: 3 };
  function val(d, p, n) { let v = 0; for (let i = 0; i < n; i++) v = v * 4 + VAL[d[p + i]]; return v; }
  function enc(v, n) { let s = ''; for (let i = n - 1; i >= 0; i--) s += LET[(v >> (2 * i)) & 3]; return s; }
  function randLetters(rng, n) { let s = ''; for (let i = 0; i < n; i++) s += LET[rng.int(4)]; return s; }

  function parse(dna) {
    const genes = []; let i = 0;
    while (genes.length < MAXG && (i = dna.indexOf('TATA', i)) >= 0) {
      let p = i + 4;
      if (p + 6 > dna.length) break;
      const g = { start: i, prod: val(dna, p, 3) % NPROD, bias: (val(dna, p + 3, 2) - 9) * 0.8, rate: RATES[val(dna, p + 5, 1)], sites: [] };
      p += 6;
      while (p + 6 <= dna.length && dna[p] !== 'T' && g.sites.length < 12) {
        g.sites.push([val(dna, p + 1, 3) % NREG, (val(dna, p + 4, 2) - 7.5) * 0.6]);
        p += 6;
      }
      g.end = p; genes.push(g); i = p;
    }
    return genes;
  }

  function compile(genes) {
    const n = genes.length, start = new Int32Array(n + 1), src = [], wt = [];
    const prod = new Int32Array(n), bias = new Float32Array(n), rate = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      start[i] = src.length; prod[i] = genes[i].prod; bias[i] = genes[i].bias; rate[i] = genes[i].rate;
      for (const [r, w] of genes[i].sites) { src.push(r); wt.push(w); }
    }
    start[n] = src.length;
    return { n, start, src: Int32Array.from(src), wt: Float32Array.from(wt), prod, bias, rate };
  }

  // A starting genome: one gene for each product, with random regulation.
  function randomDNA(rng) {
    let s = randLetters(rng, 10);
    for (let p = 0; p < NPROD; p++) {
      s += 'TATA' + enc(p + NPROD * rng.int(2), 3) + randLetters(rng, 3);
      const k = 2 + rng.int(3);
      for (let j = 0; j < k; j++) s += LET[rng.int(3)] + randLetters(rng, 5);
      s += 'T' + randLetters(rng, 6 + rng.int(14));
    }
    return s;
  }

  // Copying errors: letter changes, small insertions and deletions,
  // and occasionally a whole stretch duplicated or lost.
  function mutateDNA(dna, rng) {
    let a = dna.split('');
    const nsub = Math.floor(a.length * P.mu + rng());
    for (let i = 0; i < nsub; i++) a[rng.int(a.length)] = LET[rng.int(4)];
    let s = a.join('');
    if (rng() < P.pIndel) {
      const p = rng.int(s.length), k = 1 + rng.int(3);
      s = rng() < 0.5 ? s.slice(0, p) + randLetters(rng, k) + s.slice(p) : s.slice(0, p) + s.slice(p + k);
    }
    if (rng() < P.pDup && s.length < 8000) {
      const k = 30 + rng.int(170), p = rng.int(Math.max(1, s.length - k)), q = rng.int(s.length);
      s = s.slice(0, q) + s.slice(p, p + k) + s.slice(q);
    }
    if (rng() < P.pDel && s.length > 400) {
      const k = 30 + rng.int(170), p = rng.int(s.length - k);
      s = s.slice(0, p) + s.slice(p + k);
    }
    return s;
  }

  // An egg hatches only if its DNA still has at least one gene for every
  // worker product. These are the essential genes.
  function viable(dna) {
    const have = new Uint8Array(NPROD);
    for (const g of parse(dna)) have[g.prod] = 1;
    for (let p = P_EFF; p < NPROD; p++) if (!have[p]) return false;
    return true;
  }
  // A viable mutant of dna (the parent's own DNA if several tries all fail).
  function offspring(dna, rng) {
    for (let i = 0; i < 6; i++) { const d = mutateDNA(dna, rng); if (viable(d)) return d; }
    return dna;
  }

  // ---------- world ----------
  function wrap(v) { const S = P.size; v %= S; return v < 0 ? v + S : v; }
  function wdiff(d) { const S = P.size; if (d > S / 2) d -= S; else if (d < -S / 2) d += S; return d; }

  function stamp(world, x, y, sign) {
    const GN = P.grid, cs = P.size / GN, sg = P.foodSigma, R = Math.ceil(3.5 * sg / cs);
    const ci = Math.round(x / cs), cj = Math.round(y / cs), inv = 1 / (2 * sg * sg);
    for (let dj = -R; dj <= R; dj++) {
      const j = ((cj + dj) % GN + GN) % GN, dy = (cj + dj) * cs - y;
      for (let di = -R; di <= R; di++) {
        const i = ((ci + di) % GN + GN) % GN, dx = (ci + di) * cs - x;
        world.smell[j * GN + i] += sign * Math.exp(-(dx * dx + dy * dy) * inv);
      }
    }
  }
  function sampleSmell(world, x, y) {
    const GN = P.grid, cs = P.size / GN;
    const gx = wrap(x) / cs, gy = wrap(y) / cs;
    const i0 = Math.floor(gx) % GN, j0 = Math.floor(gy) % GN, fx = gx - Math.floor(gx), fy = gy - Math.floor(gy);
    const i1 = (i0 + 1) % GN, j1 = (j0 + 1) % GN, s = world.smell;
    const v = (s[j0 * GN + i0] * (1 - fx) + s[j0 * GN + i1] * fx) * (1 - fy) +
      (s[j1 * GN + i0] * (1 - fx) + s[j1 * GN + i1] * fx) * fy;
    return v > 0 ? v : 0;
  }
  function bucketOf(x, y) { const NB = P.size / P.bucket; return (Math.floor(y / P.bucket) % NB) * NB + (Math.floor(x / P.bucket) % NB); }

  function addFood(world) {
    if (world.nFood >= P.maxFood) return;
    const rng = world.rng; let f = 0;
    while (world.falive[f]) f++;
    let x, y;
    if (rng() < 0.2) { x = rng() * P.size; y = rng() * P.size; }
    else { const p = rng.int(P.nPatches); x = wrap(world.px[p] + rng.gauss() * P.patchSpread); y = wrap(world.py[p] + rng.gauss() * P.patchSpread); }
    world.fx[f] = x; world.fy[f] = y; world.falive[f] = 1; world.nFood++;
    x = world.fx[f]; y = world.fy[f];   // use the stored (rounded) position so removal finds the same bucket
    const b = bucketOf(x, y); world.bnext[f] = world.bhead[b]; world.bhead[b] = f;
    stamp(world, x, y, 1);
  }
  function removeFood(world, f) {
    const b = bucketOf(world.fx[f], world.fy[f]);
    if (world.bhead[b] === f) world.bhead[b] = world.bnext[f];
    else { let q = world.bhead[b]; while (q >= 0 && world.bnext[q] !== f) q = world.bnext[q]; if (q >= 0) world.bnext[q] = world.bnext[f]; }
    world.falive[f] = 0; world.nFood--;
    stamp(world, world.fx[f], world.fy[f], -1);
  }

  function newCell(x, y, nG) {
    return {
      x, y, g: new Float32Array(nG), gn: new Float32Array(nG), pl: new Float32Array(NPROD), c: new Float32Array(N_SIG),
      eff: new Float32Array(5), m: 0, food: 0, waste: 0, cd: 0, poopAcc: 0, dx: 1, dy: 0
    };
  }

  function addWorm(world, dna, x, y, gen, parent) {
    const genes = parse(dna), net = compile(genes);
    const egg = newCell(x, y, net.n); egg.m = 1;
    const worm = {
      id: world.nextId++, parent: parent || 0, gen: gen || 0, dna, genes, net, cells: [egg],
      heading: world.rng() * 6.283, energy: P.eggEnergy, alive: true, cause: '', age: 0, layCd: P.layCooldown,
      assimilated: 0, eaten: 0, pooped: 0, bites: 0, maxCells: 1, eggs: 0
    };
    world.worms.push(worm);
    return worm;
  }

  // opts: genomes (DNA strings to start from), pool (fixed DNA strings used to
  // refill the world, with no mutation), noMutate, knock (product numbers forced
  // to zero), blind (sense numbers forced to zero), record (keep poop for drawing)
  function createWorld(seed, opts) {
    opts = opts || {};
    const rng = makeRng(seed), NB = P.size / P.bucket;
    const world = {
      rng, t: 0, opts, smell: new Float32Array(P.grid * P.grid),
      fx: new Float32Array(P.maxFood), fy: new Float32Array(P.maxFood), falive: new Uint8Array(P.maxFood), nFood: 0,
      bhead: new Int32Array(NB * NB).fill(-1), bnext: new Int32Array(P.maxFood),
      px: [], py: [], preds: [], worms: [], eggQ: [], poops: [], hall: [], nextId: 1,
      knock: opts.knock || null, blind: opts.blind || null, record: !!opts.record,
      stats: { births: 0, injected: 0, failedEggs: 0, starved: 0, eaten: 0, old: 0, bites: 0, lifeSum: 0, cellSum: 0, eggSum: 0 }
    };
    for (let p = 0; p < P.nPatches; p++) { world.px.push(rng() * P.size); world.py.push(rng() * P.size); }
    for (let k = 0; k < P.startFood; k++) addFood(world);
    for (let i = 0; i < P.nPred; i++) world.preds.push({ x: rng() * P.size, y: rng() * P.size, th: rng() * 6.283, sat: 0, chasing: false });
    const start = opts.genomes || Array.from({ length: P.minWorms }, () => randomDNA(rng));
    // fleeHalf (test option): every second starting worm, and its descendants, gets the flee reflex
    start.forEach((d, i) => { addWorm(world, d, rng() * P.size, rng() * P.size, 0, 0).flee = !!opts.fleeHalf && i % 2 === 0; });
    return world;
  }

  const reg = new Float32Array(NREG);
  const lap = new Float32Array(P.maxCells * N_SIG);

  function enemyAt(world, x, y) {
    let e = 0; const inv = 1 / (2 * P.predSigma * P.predSigma), pr = world.preds, far = 12 * P.predSigma * P.predSigma;
    x = wrap(x); y = wrap(y);
    for (let i = 0; i < pr.length; i++) {
      const dx = wdiff(pr[i].x - x), dy = wdiff(pr[i].y - y), d = dx * dx + dy * dy;
      if (d < far) e += Math.exp(-d * inv);
    }
    return e;
  }

  function stepWorm(world, worm) {
    const cells = worm.cells, net = worm.net, rng = world.rng, nG = net.n;
    const n = cells.length;
    worm.age++;

    for (let k = 0; k < n; k++) {
      const c = cells[k];
      if (k === 0) { c.dx = Math.cos(worm.heading); c.dy = Math.sin(worm.heading); }
      else { const ax = cells[k - 1].x - c.x, ay = cells[k - 1].y - c.y, d = Math.hypot(ax, ay) || 1; c.dx = ax / d; c.dy = ay / d; }
    }

    // 1. sense, then update every gene in every cell
    const epc = worm.energy / n, so = P.sensorOffset;
    for (let k = 0; k < n; k++) {
      const c = cells[k], nx = -c.dy, ny = c.dx;   // (nx, ny) points to the cell's left
      const sL = sampleSmell(world, c.x + so * nx, c.y + so * ny), sR = sampleSmell(world, c.x - so * nx, c.y - so * ny);
      const eL = enemyAt(world, c.x + so * nx, c.y + so * ny), eR = enemyAt(world, c.x - so * nx, c.y - so * ny);
      const s = (sL + sR) / 2, e = (eL + eR) / 2;
      reg[0] = s / (0.3 + s);
      reg[1] = clamp(6 * (sR - sL) / (sR + sL + 0.02), -1, 1);
      reg[2] = e > 1 ? 1 : e;
      reg[3] = clamp(6 * (eR - eL) / (eR + eL + 0.02), -1, 1);
      reg[4] = epc / (epc + 5);
      reg[5] = c.food / P.gutCap;
      reg[6] = c.waste / P.gutCap;
      reg[7] = c.m;
      reg[8] = (k === 0 || k === n - 1) ? 1 : 0;
      if (k === 0) { worm.fleeSide = reg[3]; worm.fleeLevel = reg[2]; }
      if (world.blind) for (let i = 0; i < world.blind.length; i++) reg[world.blind[i]] = 0;
      for (let i = 0; i < N_TF; i++) reg[N_IN + i] = c.pl[i];
      for (let i = 0; i < N_SIG; i++) reg[N_IN + N_TF + i] = c.c[i];
      for (let i = 0; i < nG; i++) {
        let z = net.bias[i];
        for (let q = net.start[i], q1 = net.start[i + 1]; q < q1; q++) z += net.wt[q] * reg[net.src[q]];
        c.gn[i] = c.g[i] + net.rate[i] * (1 / (1 + Math.exp(-z)) - c.g[i]);
      }
    }
    let cost = 0, wantsEgg = false;
    for (let k = 0; k < n; k++) {
      const c = cells[k], t = c.g; c.g = c.gn; c.gn = t;
      const g = c.g, pl = c.pl;
      pl.fill(0);
      let r = 0;
      for (let i = 0; i < nG; i++) { pl[net.prod[i]] += g[i]; r += g[i]; }
      for (let i = 0; i < NPROD; i++) if (pl[i] > 1) pl[i] = 1;
      if (world.knock) for (let i = 0; i < world.knock.length; i++) pl[world.knock[i]] = 0;
      const sum = pl[PM] + pl[PD] + pl[PA] + pl[PL] + pl[PR];
      const sc = sum > P.effCapacity ? P.effCapacity / sum : 1;
      c.eff[0] = pl[PM] * sc; c.eff[1] = pl[PD] * sc; c.eff[2] = pl[PA] * sc; c.eff[3] = pl[PL] * sc; c.eff[4] = pl[PR] * sc;
      cost += P.basalCost + P.regCost * r + P.effCost * (c.eff[0] + c.eff[1] + c.eff[2]) + P.muscleCost * (c.eff[3] + c.eff[4]);
      if (c.cd > 0) c.cd--;
      c.m *= P.maternalDecay;
      if (pl[PLAY] > 0.5) wantsEgg = true;
    }

    // 2. signals spread between neighbours and decay
    for (let s = 0; s < N_SIG; s++) for (let k = 0; k < n; k++) {
      const here = cells[k].c[s];
      lap[k * N_SIG + s] = (k > 0 ? cells[k - 1].c[s] : here) + (k < n - 1 ? cells[k + 1].c[s] : here) - 2 * here;
    }
    for (let k = 0; k < n; k++) {
      const c = cells[k];
      for (let s = 0; s < N_SIG; s++) {
        c.c[s] += SIG_K[s] * (c.pl[P_SIG + s] - c.c[s]) + SIG_D[s] * lap[k * N_SIG + s];
        if (c.c[s] < 0) c.c[s] = 0;
      }
    }

    // 3. move: both sides contracting pushes forward, a difference turns
    let thrust = 0, turn = 0, wsum = 0;
    for (let k = 0; k < n; k++) {
      const c = cells[k], w = Math.exp(-k / 1.5);
      thrust += (c.eff[3] + c.eff[4]) / 2; turn += w * (c.eff[3] - c.eff[4]); wsum += w;
    }
    const speed = Math.min(P.vmax, P.vmax * thrust / (2 + 0.6 * n));
    worm.heading += P.wmax * turn / wsum * Math.min(1, speed * 4 + 0.2) + rng.gauss() * 0.01;
    // test option only: a hard-wired reflex that turns the head away from a nearby enemy
    if ((world.opts.flee || worm.flee) && worm.fleeLevel > (world.opts.fleeAt || 0.15)) worm.heading += P.wmax * (worm.fleeSide >= 0 ? 1 : -1);
    const head = cells[0];
    head.x += speed * Math.cos(worm.heading); head.y += speed * Math.sin(worm.heading);
    for (let k = 1; k < n; k++) {
      const c = cells[k], p = cells[k - 1], ax = c.x - p.x, ay = c.y - p.y, d = Math.hypot(ax, ay) || 1;
      c.x = p.x + ax / d * P.spacing; c.y = p.y + ay / d * P.spacing;
    }

    // 4. eat
    const NB = P.size / P.bucket, reach2 = P.eatReach * P.eatReach;
    for (let k = 0; k < n; k++) {
      const c = cells[k];
      if (c.eff[0] < P.mouthMin) continue;
      const cx = wrap(c.x), cy = wrap(c.y), bi = Math.floor(cx / P.bucket), bj = Math.floor(cy / P.bucket);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        let f = world.bhead[((bj + dj + NB) % NB) * NB + (bi + di + NB) % NB];
        while (f >= 0) {
          const nf = world.bnext[f], dx = wdiff(world.fx[f] - cx), dy = wdiff(world.fy[f] - cy);
          if (dx * dx + dy * dy < reach2) {
            const space = P.gutCap - c.food - c.waste;
            if (space >= 0.5) { c.food += Math.min(P.foodMass * c.eff[0], space); worm.eaten++; removeFood(world, f); }
          }
          f = nf;
        }
      }
    }

    // 5. digest, move gut contents backward, expel
    for (let k = 0; k < n; k++) {
      const c = cells[k], d = P.digestRate * c.eff[1] * c.food;
      c.food -= d; c.waste += P.wasteFrac * d; worm.energy += P.yield * d; worm.assimilated += P.yield * d;
    }
    for (let k = n - 2; k >= 0; k--) {
      const a = cells[k], b = cells[k + 1], space = P.gutCap - b.food - b.waste, want = P.gutFlow * (a.food + a.waste);
      if (want <= 0 || space <= 0) continue;
      const f = Math.min(1, space / want) * P.gutFlow;
      b.food += a.food * f; b.waste += a.waste * f; a.food -= a.food * f; a.waste -= a.waste * f;
    }
    for (let k = 0; k < n; k++) {
      const c = cells[k];
      if (c.eff[2] > 0.02) {
        const f = P.anusRate * c.eff[2], out = f * (c.food + c.waste);
        c.food -= c.food * f; c.waste -= c.waste * f; worm.pooped += out; c.poopAcc += out;
        if (c.poopAcc >= 1.5) {
          c.poopAcc = 0;
          if (world.record) { world.poops.push({ x: wrap(c.x), y: wrap(c.y), t: world.t }); if (world.poops.length > 1200) world.poops.shift(); }
        }
      }
      if (c.waste > P.wasteTox) cost += P.toxCost * (c.waste - P.wasteTox);
    }
    worm.energy -= cost;

    // 6. grow. The new cell sits behind its mother and starts with half her
    // levels and none of the egg's head marker (an asymmetric division).
    if (n < P.maxCells && worm.energy >= P.divMinEnergy) {
      for (let k = 0; k < n; k++) {
        const c = cells[k];
        if ((world.opts.forceCells ? n < world.opts.forceCells : c.pl[PDIV] > P.divThreshold) && c.cd <= 0) {
          const d = newCell(c.x - c.dx * P.spacing * 0.5, c.y - c.dy * P.spacing * 0.5, nG);
          for (let i = 0; i < nG; i++) d.g[i] = c.g[i] * 0.5;
          for (let i = 0; i < NPROD; i++) d.pl[i] = c.pl[i] * 0.5;
          d.c.set(c.c);
          c.food /= 2; c.waste /= 2; d.food = c.food; d.waste = c.waste;
          c.cd = d.cd = P.divCooldown;
          cells.splice(k + 1, 0, d);
          worm.energy -= P.divCost;
          if (cells.length > worm.maxCells) worm.maxCells = cells.length;
          break;
        }
      }
    }

    // 7. reproduce
    if (worm.layCd > 0) worm.layCd--;
    else if (wantsEgg && worm.energy >= P.layMin && cells.length >= P.layMinCells) {
      const tail = cells[cells.length - 1];
      worm.energy -= P.eggCost; worm.eggs++; worm.layCd = P.layCooldown;
      world.eggQ.push({ dna: worm.dna, x: wrap(tail.x), y: wrap(tail.y), gen: worm.gen + 1, parent: worm.id, flee: worm.flee });
    }

    if (worm.energy <= 0) { worm.alive = false; worm.cause = 'starved'; }
    else if (worm.age >= P.maxAge) { worm.alive = false; worm.cause = 'old'; }
  }

  // A bite on the head kills. Otherwise the worm loses the bitten cell and
  // everything behind it.
  function bite(world, worm, k) {
    const n = worm.cells.length;
    worm.bites++; world.stats.bites++;
    if (k === 0) { worm.alive = false; worm.cause = 'eaten'; return; }
    worm.cells.length = k;
    worm.energy *= k / n;
  }

  function stepPredators(world) {
    const rng = world.rng, worms = world.worms;
    for (const p of world.preds) {
      let bw = null, bk = -1, bd = 1e9, bx = 0, by = 0;
      if (p.sat <= 0) {
        for (let w = 0; w < worms.length; w++) {
          const worm = worms[w]; if (!worm.alive) continue;
          const cells = worm.cells, n = cells.length;
          const detect = Math.min(P.predDetectMax, P.predDetectBase + P.predDetectPerCell * n);
          const hx = wdiff(wrap(cells[0].x) - p.x), hy = wdiff(wrap(cells[0].y) - p.y), lim = detect + n * P.spacing;
          if (hx * hx + hy * hy > lim * lim) continue;
          for (let k = 0; k < n; k++) {
            const dx = wdiff(wrap(cells[k].x) - p.x), dy = wdiff(wrap(cells[k].y) - p.y), d = dx * dx + dy * dy;
            if (d < detect * detect && d < bd) { bd = d; bw = worm; bk = k; bx = dx; by = dy; }
          }
        }
      }
      let v = P.predWander; p.chasing = false;
      if (bw) {
        p.th = Math.atan2(by, bx); v = P.predChase; p.chasing = true;
        if (bd < P.biteReach * P.biteReach) { bite(world, bw, bk); p.sat = P.predSatiated; p.th += 3.14159; p.chasing = false; }
      } else p.th += rng.gauss() * 0.08;
      if (p.sat > 0) p.sat--;
      p.x = wrap(p.x + v * Math.cos(p.th)); p.y = wrap(p.y + v * Math.sin(p.th));
    }
  }

  function step(world) {
    const worms = world.worms, rng = world.rng, st = world.stats;
    for (let i = 0; i < worms.length; i++) if (worms[i].alive) stepWorm(world, worms[i]);
    stepPredators(world);

    // remove the dead
    let j = 0;
    for (let i = 0; i < worms.length; i++) {
      const w = worms[i];
      if (w.alive) worms[j++] = w;
      else {
        st[w.cause]++; st.lifeSum += w.age; st.cellSum += w.maxCells; st.eggSum += w.eggs;
        // remember the best feeders and breeders, for restocking a failing world
        const score = w.assimilated + 100 * w.eggs, hall = world.hall;
        for (let h = 0; h < hall.length; h++) hall[h].score *= 0.998;
        if (score > 0 && (hall.length < 30 || score > hall[hall.length - 1].score)) {
          hall.push({ score, dna: w.dna }); hall.sort((a, b) => b.score - a.score);
          if (hall.length > 30) hall.length = 30;
        }
      }
    }
    worms.length = j;

    if (world.opts.solo) { world.eggQ.length = 0; if (rng() < P.regrow) addFood(world); world.t++; return; }

    // hatch eggs; crowding makes hatching less likely
    for (const e of world.eggQ) {
      const crowd = worms.length / P.maxWorms;
      const dna = world.opts.noMutate ? e.dna : mutateDNA(e.dna, rng);
      if (rng() < 1 - crowd * crowd && viable(dna)) { addWorm(world, dna, e.x, e.y, e.gen, e.parent).flee = e.flee; st.births++; }
      else st.failedEggs++;
    }
    world.eggQ.length = 0;

    // if the population is too small to sustain itself, add eggs from outside
    if (worms.length < P.minWorms) {
      let dna;
      if (world.opts.pool) dna = world.opts.pool[rng.int(world.opts.pool.length)];
      else if (world.hall.length && rng() < 0.9) dna = offspring(world.hall[rng.int(world.hall.length)].dna, rng);
      else dna = randomDNA(rng);
      addWorm(world, dna, rng() * P.size, rng() * P.size, 0, 0);
      st.injected++;
    }

    // food grows back
    if (rng() < P.regrow) addFood(world);
    world.t++;
  }

  function summary(world) {
    const w = world.worms, n = w.length || 1;
    let cells = 0, genes = 0, len = 0, gen = 0;
    for (const o of w) { cells += o.cells.length; genes += o.net.n; len += o.dna.length; if (o.gen > gen) gen = o.gen; }
    return { pop: w.length, cells: cells / n, genes: genes / n, dnaLen: len / n, maxGen: gen };
  }

  return {
    P, INPUTS, EFFECTORS, PROD_NAMES, REG_NAMES, N_IN, N_TF, N_SIG, N_EFF, NPROD, NREG, P_SIG, P_EFF, PDIV, PLAY,
    makeRng, parse, randomDNA, mutateDNA, viable, offspring, createWorld, step, summary, wrap, wdiff
  };
});
