# GRN worm

A small artificial-life simulation. Each worm grows from one egg cell into a chain of cells, and
every cell runs the same gene regulatory network, read from a DNA string of A, C, G and T. The
network controls growth, feeding, excretion, movement and egg laying. None of that behaviour is
programmed; it evolved by mutation and differential reproduction.

**Live simulation:** https://hamidmhl.github.io/grn-worm/

**Paper (preprint, not peer reviewed):** [GRN_worm_paper.pdf](GRN_worm_paper.pdf)

## Using the live simulation

- **Start from** picks a point in the world's history. The world keeps evolving while you watch unless you switch **Mutation** off.
- Click a worm to see gene activity in each of its cells, its gene list, and its DNA with genes highlighted.
- Click a product name (for example `S1`) to knock it out in every worm, or a sense to block it.

## What evolved, in short

- A self-sustaining population of about 80 worms that feed, grow to 4 to 5 cells and lay eggs.
- A diffusible signal (S1) that limits body size. Knock it out and the worms overgrow and starve.
- Predator avoidance did **not** evolve, although a close-range flee reflex wins every head-to-head competition when added by hand.

This is one run of a toy model. See the paper's Limitations section.

## Running it yourself

Requires Node.js. No dependencies.

```bash
node evolve.js 450 200000 1        # stage 1 (scored warm-up) + stage 2 (shared world), about 16 minutes
node evolve.js 450 200000 1 reuse  # stage 2 only, from founders.json
node analyze.js                    # sense-blocking and knockout tests
node exp_enemy.js                  # flee-reflex experiments
python3 -m http.server 8000        # then open http://localhost:8000 for the viewer
```

| File | Purpose |
| --- | --- |
| `sim.js` | World, worm, DNA parser, mutation |
| `evolve.js` | Two-stage evolution |
| `analyze.js` | Knockout and sense-blocking tests |
| `exp_enemy*.js` | Predator-avoidance experiments |
| `index.html` | Live viewer |
| `evolved.js`, `evolved.json` | The evolved population used by the viewer and the tests |
| `build_paper.py` | Builds the paper's HTML |

## Authors

Fable 5.2 (Claude, Anthropic) wrote the code, ran the experiments and drafted the paper.
Hamid Mohamadlou posed the questions and directed the work.
