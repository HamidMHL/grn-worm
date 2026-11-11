// Two stages.
// Stage 1 (scored): random DNA is improved by mutation and selection, each worm
//   tested alone, scored by eggs laid and energy gained. This only exists to
//   get worms that can grow and reproduce at all.
// Stage 2 (no score): the stage 1 worms are released together into shared
//   worlds, where the ones that leave more surviving offspring take over.
// Usage: node evolve.js [stage1 generations] [stage2 ticks] [seed] [reuse]
//   'reuse' skips stage 1 and starts stage 2 from founders.json
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');
const fs = require('fs');
const path = require('path');
const S = require('./sim.js');

const T1 = 3000, WORLDS1 = 6, POP = 300, ERA = 5000;

function solo(dna, seed) {
  const world = S.createWorld(seed, { genomes: [dna], solo: true });
  const worm = world.worms[0];
  for (let t = 0; t < T1 && worm.alive; t++) S.step(world);
  return { score: worm.assimilated + 100 * worm.eggs, eggs: worm.eggs, cells: worm.maxCells, age: worm.age, cause: worm.cause, as: worm.assimilated };
}

if (!isMainThread) {
  if (workerData.mode === 'ga') {
    parentPort.on('message', ({ genomes, seeds, decay }) => {
      S.P.maternalDecay = decay;
      parentPort.postMessage(genomes.map((d) => {
        const r = seeds.map((s) => solo(d, s)), m = (k) => r.reduce((a, x) => a + x[k], 0) / r.length;
        return { score: m('score'), eggs: m('eggs'), cells: m('cells'), age: m('age'), as: m('as') };
      }));
    });
  } else {
    const { seed, ticks, genomes } = workerData;
    const world = S.createWorld(seed, { genomes });
    const rng = S.makeRng(seed + 99);
    let last = Object.assign({}, world.stats);
    for (let t = 1; t <= ticks; t++) {
      S.step(world);
      if (t % ERA === 0 || t === ticks) {
        const s = S.summary(world), st = world.stats, d = {};
        for (const k in st) d[k] = st[k] - last[k];
        last = Object.assign({}, st);
        const deaths = d.starved + d.eaten + d.old || 1;
        const row = {
          t, pop: s.pop, cells: +s.cells.toFixed(2), genes: +s.genes.toFixed(1), dnaLen: Math.round(s.dnaLen), maxGen: s.maxGen,
          births: d.births, injected: d.injected, starved: d.starved, eaten: d.eaten, old: d.old,
          life: Math.round(d.lifeSum / deaths), eggsPerLife: +(d.eggSum / deaths).toFixed(2)
        };
        const pick = world.worms.slice().sort(() => rng() - 0.5).slice(0, 40).map((w) => w.dna);
        parentPort.postMessage({ row, genomes: pick, done: t === ticks });
      }
    }
  }
} else {
  const GENS = parseInt(process.argv[2] || '250', 10);
  const TICKS = parseInt(process.argv[3] || '60000', 10);
  const SEED = parseInt(process.argv[4] || '1', 10);
  const nw = Math.max(1, Math.min(os.cpus().length - 2, 8));
  const rng = S.makeRng(SEED);
  const t0 = Date.now(), secs = () => ((Date.now() - t0) / 1000).toFixed(0) + 's';
  const out = { stage1: [], stage1Best: [], history: [], eras: [] };
  const save = () => {
    fs.writeFileSync(path.join(__dirname, 'evolved.json'), JSON.stringify(out));
    fs.writeFileSync(path.join(__dirname, 'evolved.js'), 'window.EVOLVED = ' + JSON.stringify(out) + ';\n');
  };

  async function stage1() {
    const workers = Array.from({ length: nw }, () => new Worker(__filename, { workerData: { mode: 'ga' } }));
    // The egg's head marker starts out long-lived and is made to fade faster and
    // faster, so worms must evolve their own way of remembering which end is the head.
    const FINAL = S.P.maternalDecay, H0 = 3500, H1 = Math.log(0.5) / Math.log(FINAL);
    const halfLife = (gen) => { const f = Math.min(1, Math.max(0, (gen - GENS * 0.3) / (GENS * 0.45))); return H0 * Math.pow(H1 / H0, f); };
    let decay = FINAL;
    const evalAll = (pop, seeds) => {
      const chunk = Math.ceil(pop.length / nw);
      return Promise.all(workers.map((w, i) => new Promise((res) => {
        const part = pop.slice(i * chunk, (i + 1) * chunk);
        if (!part.length) return res([]);
        w.once('message', res); w.postMessage({ genomes: part, seeds, decay });
      }))).then((p) => p.flat());
    };
    S.P.mu = 0.006;   // warm-up only: three times the copying-error rate used in the shared world
    let pop = Array.from({ length: POP }, () => S.randomDNA(rng)), order, res;
    for (let gen = 0; gen <= GENS; gen++) {
      const seeds = Array.from({ length: WORLDS1 }, () => Math.floor(rng() * 1e9));
      const hl = halfLife(gen); decay = Math.pow(0.5, 1 / hl);
      res = await evalAll(pop, seeds);
      order = res.map((r, i) => i).sort((a, b) => res[b].score - res[a].score);
      const b = res[order[0]], mean = res.reduce((s, r) => s + r.score, 0) / POP;
      const row = { gen, best: +b.score.toFixed(1), mean: +mean.toFixed(1), eggs: +b.eggs.toFixed(1), cells: +b.cells.toFixed(1), age: Math.round(b.age), energy: +b.as.toFixed(0), markerHalfLife: Math.round(hl) };
      out.stage1.push(row);
      if (gen % 10 === 0 || gen === GENS) {
        save();
        console.log(`${secs()} stage 1 gen ${gen} best ${row.best} mean ${row.mean} eggs ${row.eggs} cells ${row.cells} age ${row.age} energy ${row.energy} marker half-life ${row.markerHalfLife}`);
        out.stage1Best.push({ gen, dna: pop[order[0]] });
      }
      if (gen === GENS) break;
      const next = [];
      for (let i = 0; i < 15; i++) next.push(pop[order[i]]);
      const pick = () => { let a = Math.floor(rng() * POP); for (let i = 0; i < 3; i++) { const c = Math.floor(rng() * POP); if (res[c].score > res[a].score) a = c; } return pop[a]; };
      while (next.length < POP) { let d = S.offspring(pick(), rng); if (rng() < 0.5) d = S.offspring(d, rng); next.push(d); }
      pop = next;
    }
    for (const w of workers) w.terminate();
    S.P.mu = 0.002;
    return order.slice(0, 40).map((i) => pop[i]);
  }

  function stage2(founders) {
    out.eras.push({ t: 0, genomes: founders });
    save();
    const NI = Math.min(nw, 4), islands = [];
    let finished = 0;
    return new Promise((resolve) => {
      for (let i = 0; i < NI; i++) {
        const isl = { history: [], eras: [{ t: 0, genomes: founders }] };
        islands.push(isl);
        const w = new Worker(__filename, { workerData: { mode: 'world', seed: SEED * 1000 + i, ticks: TICKS, genomes: founders.concat(founders) } });
        w.on('message', (m) => {
          const r = m.row;
          isl.history.push(r); isl.eras.push({ t: r.t, genomes: m.genomes });
          console.log(`${secs()} stage 2 world ${i} tick ${r.t} worms ${r.pop} cells ${r.cells} genes ${r.genes} hatched ${r.births} added ${r.injected} eaten ${r.eaten} starved ${r.starved} old ${r.old} eggs/life ${r.eggsPerLife}`);
          const score = (x) => { const h = x.history.slice(-3); return h.length ? h.reduce((s, q) => s + q.pop * q.cells, 0) / h.length : 0; };
          const best = islands.slice().sort((a, b) => score(b) - score(a))[0];
          out.history = best.history; out.eras = best.eras; save();
          if (m.done && ++finished === NI) resolve();
        });
      }
    });
  }

  (async () => {
    let founders;
    if (process.argv[5] === 'reuse') {   // skip stage 1 and reuse the founders saved by an earlier run
      const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'founders.json'), 'utf8'));
      out.stage1 = F.stage1; out.stage1Best = F.stage1Best; founders = F.eras[0].genomes;
    } else {
      founders = await stage1();
      out.eras = [{ t: 0, genomes: founders }];
      fs.writeFileSync(path.join(__dirname, 'founders.json'), JSON.stringify(out));
    }
    await stage2(founders); console.log(secs() + ' done'); process.exit(0); })();
}
