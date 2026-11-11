// Experiment A: would fleeing pay? Give the evolved worms a hard-wired
// turn-away reflex and compare with the unmodified worms, at several
// predator densities. Mutation off, 3 worlds of 20,000 ticks per condition.
// Usage: node exp_enemy.js
const S = require('./sim.js');
const E = require('./evolved_baseline.json');
const pool = E.eras[E.eras.length - 1].genomes;
function run(nPred, flee, seed, extra) {
  S.P.nPred = nPred;
  const w = S.createWorld(seed, Object.assign({ genomes: pool.concat(pool), pool, noMutate: true, flee }, extra || {}));
  for (let t = 0; t < 20000; t++) S.step(w);
  const st = w.stats, d = st.starved + st.eaten + st.old || 1;
  return { eggs: st.eggSum / d, eaten: 100 * st.eaten / d, life: st.lifeSum / d, pop: w.worms.length, bites: st.bites, added: st.injected };
}
const avg = (rs, k) => rs.reduce((a, r) => a + r[k], 0) / rs.length;
console.log('predators  reflex  eggs/life  %eaten  lifespan  worms  bites  added');
for (const n of [6, 12, 24]) for (const flee of [false, true]) {
  const rs = [11, 22, 33].map((s) => run(n, flee, s));
  console.log(String(n).padStart(9) + (flee ? '     yes' : '      no') + avg(rs, 'eggs').toFixed(2).padStart(11) + avg(rs, 'eaten').toFixed(0).padStart(8) +
    avg(rs, 'life').toFixed(0).padStart(10) + avg(rs, 'pop').toFixed(0).padStart(7) + avg(rs, 'bites').toFixed(0).padStart(7) + avg(rs, 'added').toFixed(0).padStart(7));
}

// Experiment B: head-to-head. Half the starting worms (and all their
// descendants) get the reflex; both kinds share one world. Mutation off, no
// refill. If fleeing is an advantage, the reflex share rises above 50%.
console.log('\npredators  seed  reflex share of population (%) at tick 0 / 20k / 40k / 60k');
for (const n of [6, 12, 24]) for (const seed of [11, 22, 33, 44]) {
  S.P.nPred = n; S.P.minWorms = 0;
  const w = S.createWorld(seed, { genomes: pool.concat(pool), noMutate: true, fleeHalf: true });
  const share = () => w.worms.length ? Math.round(100 * w.worms.filter((o) => o.flee).length / w.worms.length) : NaN;
  const out = [share()];
  for (let k = 0; k < 3; k++) { for (let t = 0; t < 20000; t++) S.step(w); out.push(share()); }
  console.log(String(n).padStart(9) + String(seed).padStart(6) + '  ' + out.join(' / ') + '   (worms ' + w.worms.length + ')');
}
