// Experiment D: let the evolved population keep evolving under four times as
// many predators (24), then test whether the worms have come to use their
// enemy senses. Usage: node exp_enemy3.js
const fs = require('fs');
const S = require('./sim.js');
const E = require('./evolved_baseline.json');
const pool = E.eras[E.eras.length - 1].genomes;
S.P.nPred = 24;
const w = S.createWorld(777, { genomes: pool.concat(pool) });
let last = Object.assign({}, w.stats); const t0 = Date.now();
for (let t = 1; t <= 400000; t++) {
  S.step(w);
  if (t % 50000 === 0) {
    const s = S.summary(w), d = {}; for (const k in w.stats) d[k] = w.stats[k] - last[k]; last = Object.assign({}, w.stats);
    const deaths = d.starved + d.eaten + d.old || 1;
    console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s tick ${t} worms ${s.pop} cells ${s.cells.toFixed(1)} genes ${s.genes.toFixed(1)} hatched ${d.births} added ${d.injected} eaten ${(100 * d.eaten / deaths).toFixed(0)}% lifespan ${(d.lifeSum / deaths).toFixed(0)} depth ${s.maxGen}`);
  }
}
const evolved = w.worms.map((o) => o.dna);
fs.writeFileSync('evolved_highpred.json', JSON.stringify({ genomes: evolved }));
function test(label, genomes, blind) {
  const rs = [5, 6, 7].map((seed) => {
    const x = S.createWorld(seed, { genomes: genomes.concat(genomes).slice(0, 80), pool: genomes, noMutate: true, blind });
    for (let t = 0; t < 20000; t++) S.step(x);
    const st = x.stats, d = st.starved + st.eaten + st.old || 1;
    return { eaten: 100 * st.eaten / d, life: st.lifeSum / d, pop: x.worms.length, bites: st.bites };
  });
  const a = (k) => (rs.reduce((s, r) => s + r[k], 0) / rs.length).toFixed(0).padStart(9);
  console.log(label.padEnd(44) + a('eaten') + a('life') + a('pop') + a('bites'));
}
console.log('\n24 predators, mutation off, 3 worlds x 20,000 ticks'.padEnd(44) + '  %eaten lifespan    worms    bites');
test('baseline worms', pool, null);
test('baseline worms, enemy senses blocked', pool, [2, 3]);
test('worms evolved under 24 predators', evolved, null);
test('evolved under 24, enemy senses blocked', evolved, [2, 3]);
const g = S.parse(evolved[0]);
console.log('\nBinding sites for enemy senses in one evolved genome:');
for (const x of g) { const e = x.sites.filter((q) => q[0] === 2 || q[0] === 3); if (e.length) console.log('  ' + S.PROD_NAMES[x.prod] + ': ' + e.map((q) => S.REG_NAMES[q[0]] + ' ' + q[1].toFixed(1)).join(', ')); }
let withSite = 0; for (const d of evolved) if (S.parse(d).some((x) => x.sites.some((q) => (q[0] === 2 || q[0] === 3) && Math.abs(q[1]) >= 0.9))) withSite++;
console.log('genomes with an enemy-sense binding site of strength >= 0.9: ' + withSite + ' of ' + evolved.length);
