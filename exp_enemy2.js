// Experiment C: the same head-to-head, with the reflex triggering only when
// the enemy is close (higher smell threshold). 80,000 ticks, 4 seeds each.
const S = require('./sim.js');
const E = require('./evolved_baseline.json');
const pool = E.eras[E.eras.length - 1].genomes;
console.log('threshold  predators  reflex share (%) at 80k ticks per seed | bites per 1000 worm-ticks: reflex vs plain');
for (const at of [0.15, 0.5, 0.8]) for (const n of [6, 24]) {
  const shares = []; let bf = 0, bp = 0, tf = 0, tp = 0;
  for (const seed of [11, 22, 33, 44]) {
    S.P.nPred = n; S.P.minWorms = 0;
    const w = S.createWorld(seed, { genomes: pool.concat(pool), noMutate: true, fleeHalf: true, fleeAt: at });
    for (let t = 0; t < 80000; t++) {
      S.step(w);
      if (t < 10000 && t % 50 === 0) for (const o of w.worms) { if (o.flee) tf += 50; else tp += 50; }
      if (t === 9999) for (const o of w.worms) { if (o.flee) bf += o.bites; else bp += o.bites; }
    }
    shares.push(w.worms.length ? Math.round(100 * w.worms.filter((o) => o.flee).length / w.worms.length) : 'x');
  }
  console.log(String(at).padStart(9) + String(n).padStart(11) + '  ' + shares.join(' / '));
}
