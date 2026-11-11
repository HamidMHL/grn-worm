// Test the evolved worms: what breaks when a sense is blocked or a gene
// product is knocked out? Each condition runs a world stocked only with the
// final evolved DNA, with mutation off.
// Usage: node analyze.js [ticks per condition]
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const S = require('./sim.js');

if (!isMainThread) {
  const { label, pool, opts, ticks } = workerData;
  const world = S.createWorld(4242, Object.assign({ genomes: pool.concat(pool), pool, noMutate: true }, opts));
  let cells = 0, samples = 0;
  for (let t = 0; t < ticks; t++) {
    S.step(world);
    if (t % 500 === 0) { cells += S.summary(world).cells; samples++; }
  }
  const st = world.stats, deaths = st.starved + st.eaten + st.old || 1;
  parentPort.postMessage({ label, eggs: st.eggSum / deaths, life: st.lifeSum / deaths, maxCells: st.cellSum / deaths,
    eaten: 100 * st.eaten / deaths, starved: 100 * st.starved / deaths, pop: world.worms.length, added: st.injected, cells: cells / samples });
} else {
  const E = require('./evolved.json');
  const ticks = parseInt(process.argv[2] || '20000', 10);
  const pool = E.eras[E.eras.length - 1].genomes;
  const inp = (n) => S.INPUTS.indexOf(n), prod = (n) => S.PROD_NAMES.indexOf(n);
  const conds = [
    ['normal', {}],
    ['no food senses', { blind: [inp('foodSmell'), inp('foodSide')] }],
    ['no left/right food sense', { blind: [inp('foodSide')] }],
    ['no enemy senses', { blind: [inp('enemySmell'), inp('enemySide')] }],
    ['no maternal head marker', { blind: [inp('maternal')] }],
    ['no edge sense', { blind: [inp('edge')] }],
    ['no gut senses', { blind: [inp('gutFood'), inp('gutWaste')] }],
    ['no energy sense', { blind: [inp('energy')] }],
    ['knockout S1', { knock: [prod('S1')] }],
    ['knockout S2', { knock: [prod('S2')] }],
    ['knockout S3', { knock: [prod('S3')] }],
    ['knockout all signals', { knock: [prod('S1'), prod('S2'), prod('S3')] }],
    ['knockout all TFs', { knock: Array.from({ length: S.N_TF }, (_, i) => i) }],
    ['knockout anus', { knock: [prod('anus')] }],
    ['knockout divide', { knock: [prod('divide')] }]
  ];
  for (let i = 0; i < S.N_TF; i++) conds.push(['knockout T' + (i + 1), { knock: [i] }]);
  const results = new Array(conds.length); let next = 0, running = 0;
  function launch() {
    while (running < 8 && next < conds.length) {
      const i = next++; running++;
      const w = new Worker(__filename, { workerData: { label: conds[i][0], pool, opts: conds[i][1], ticks } });
      w.on('message', (m) => { results[i] = m; running--; if (next >= conds.length && running === 0) report(); else launch(); });
    }
  }
  function report() {
    console.log(`Worms from tick ${E.eras[E.eras.length - 1].t}, ${ticks} ticks per condition`);
    console.log('condition'.padEnd(26) + 'eggs/life  lifespan  cells  %eaten  %starved  worms  added');
    for (const r of results) {
      console.log(r.label.padEnd(26) + r.eggs.toFixed(2).padStart(9) + r.life.toFixed(0).padStart(10) + r.cells.toFixed(1).padStart(7) +
        r.eaten.toFixed(0).padStart(8) + r.starved.toFixed(0).padStart(10) + String(r.pop).padStart(7) + String(r.added).padStart(7));
    }
    const g = pool.map((d) => S.parse(d));
    console.log('\nGenes per genome: ' + (g.reduce((s, x) => s + x.length, 0) / g.length).toFixed(1) +
      ', DNA letters: ' + Math.round(pool.reduce((s, d) => s + d.length, 0) / pool.length));
    process.exit(0);
  }
  launch();
}
