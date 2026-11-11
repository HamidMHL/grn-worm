// Experiment D repeated over many world seeds: continue evolution for 400,000
// ticks under 24 predators from the final evolved population, then test
// whether the resulting worms use their enemy senses.
// Usage: node exp_enemy_seeds.js [number of seeds]
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const S = require('./sim.js');
const E = require('./evolved_baseline.json');
const pool = E.eras[E.eras.length - 1].genomes;

function assay(genomes, blind) {
  let eaten = 0, deaths = 0;
  for (const seed of [5, 6]) {
    const x = S.createWorld(seed, { genomes: genomes.concat(genomes, genomes, genomes).slice(0, 80), pool: genomes, noMutate: true, blind });
    for (let t = 0; t < 20000; t++) S.step(x);
    eaten += x.stats.eaten; deaths += x.stats.starved + x.stats.eaten + x.stats.old;
  }
  return 100 * eaten / (deaths || 1);
}

if (!isMainThread) {
  S.P.nPred = 24;
  const seed = workerData.seed;
  const w = S.createWorld(seed, { genomes: pool.concat(pool) });
  let last = null;
  for (let t = 1; t <= 400000; t++) {
    S.step(w);
    if (t === 350000) last = Object.assign({}, w.stats);
  }
  const d = {}; for (const k in w.stats) d[k] = w.stats[k] - last[k];
  const deaths = d.starved + d.eaten + d.old || 1;
  const evolved = w.worms.map((o) => o.dna);
  parentPort.postMessage({ seed, pop: w.worms.length, eatenLate: 100 * d.eaten / deaths, added: d.injected, hatched: d.births,
    normal: assay(evolved, null), blocked: assay(evolved, [2, 3]) });
} else {
  const N = parseInt(process.argv[2] || '24', 10);
  const seeds = Array.from({ length: N }, (_, i) => 1001 + i);
  const res = []; let next = 0, running = 0;
  S.P.nPred = 24;
  const anc = assay(pool, null), ancBlocked = assay(pool, [2, 3]);
  function launch() {
    while (running < 8 && next < seeds.length) {
      running++;
      const w = new Worker(__filename, { workerData: { seed: seeds[next++] } });
      w.on('message', (m) => { res.push(m); running--; console.error(`seed ${m.seed} done (${res.length}/${N})`); if (res.length === N) report(); else launch(); });
    }
  }
  function report() {
    res.sort((a, b) => a.seed - b.seed);
    console.log('seed  worms  %eaten(last 50k)  eggs added(last 50k)  assay %eaten: normal  senses blocked  difference');
    for (const r of res) console.log(String(r.seed).padStart(4) + String(r.pop).padStart(7) + r.eatenLate.toFixed(0).padStart(14) + String(r.added).padStart(20) +
      r.normal.toFixed(0).padStart(24) + r.blocked.toFixed(0).padStart(16) + (r.blocked - r.normal).toFixed(1).padStart(12));
    const m = (k) => res.reduce((s, r) => s + r[k], 0) / N;
    const diffs = res.map((r) => r.blocked - r.normal), md = diffs.reduce((a, b) => a + b, 0) / N;
    const sd = Math.sqrt(diffs.reduce((a, b) => a + (b - md) ** 2, 0) / (N - 1));
    console.log(`\n${N} seeds. Ancestors under 24 predators: ${anc.toFixed(1)}% eaten (senses blocked: ${ancBlocked.toFixed(1)}%).`);
    console.log(`Evolved: mean ${m('normal').toFixed(1)}% eaten, range ${Math.min(...res.map((r) => r.normal)).toFixed(0)}-${Math.max(...res.map((r) => r.normal)).toFixed(0)}%.`);
    console.log(`Blocking enemy senses changes %eaten by ${md.toFixed(2)} points on average (sd ${sd.toFixed(2)}, standard error ${(sd / Math.sqrt(N)).toFixed(2)}).`);
    console.log(`Seeds where blocking raised predation by 5 points or more: ${diffs.filter((x) => x >= 5).length}. Worlds self-sustaining in the last 50k ticks (no eggs added): ${res.filter((r) => r.added === 0).length}.`);
    console.log(`Mean final population ${m('pop').toFixed(0)}; mean share of deaths from predators in the last 50k ticks ${m('eatenLate').toFixed(0)}%.`);
    process.exit(0);
  }
  launch();
}
