#!/usr/bin/env python3
"""Build paper.html (journal-style layout) from the results. Then print to PDF with Chrome:
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --no-pdf-header-footer \
       --print-to-pdf=GRN_worm_paper.pdf paper.html
"""

# ---------- data ----------
stage1 = [(0, 0, 1.5), (25, 0, 2.9), (50, 0.3, 4.6), (75, 0.3, 5.7), (100, 0.2, 4.2), (125, 3, 5.6), (150, 3.5, 6.2),
          (175, 3.1, 5.9), (200, 3.6, 5.7), (225, 2.9, 5.5), (250, 2.4, 5.5), (275, 1.9, 5), (300, 1.9, 5.2),
          (325, 2.2, 5.5), (350, 2.2, 5.5), (375, 2.6, 4.9), (400, 2.7, 4.9), (425, 2.2, 5.2), (450, 3.1, 5.2)]
knock = [("Unperturbed", 1.13), ("S3 knockout", 1.16), ("Enemy senses blocked", 1.15), ("S2 knockout", 1.13),
         ("Maternal marker blocked", 1.11), ("Edge sense blocked", 1.09), ("S1 knockout", 0.24),
         ("anus knockout", 0.20), ("Gut senses blocked", 0.17), ("Food senses blocked", 0.10),
         ("Food-side sense blocked", 0.08), ("Energy sense blocked", 0.00), ("divide knockout", 0.00),
         ("T1 knockout", 0.00)]


def fig1():
    W, H, L, R, T, B = 700, 270, 46, 150, 14, 40
    x = lambda g: L + g / 450 * (W - L - R)
    y = lambda v: H - B - v / 7 * (H - T - B)
    o = [f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" class="fig">']
    o.append(f'<rect x="{x(135):.1f}" y="{T}" width="{x(337) - x(135):.1f}" height="{H - T - B}" fill="#e9e9e9"/>')
    o.append(f'<text x="{x(236):.1f}" y="{T + 13}" text-anchor="middle" class="s">marker half-life reduced 3,500 → 138 ticks</text>')
    for v in (0, 2, 4, 6):
        o.append(f'<line x1="{L}" x2="{W - R}" y1="{y(v):.1f}" y2="{y(v):.1f}" stroke="#bbb" stroke-width="0.5"/>')
        o.append(f'<text x="{L - 6}" y="{y(v) + 3.5:.1f}" text-anchor="end">{v}</text>')
    for g in (0, 100, 200, 300, 400):
        o.append(f'<line x1="{x(g):.1f}" x2="{x(g):.1f}" y1="{H - B}" y2="{H - B + 4}" stroke="#000" stroke-width="0.7"/>')
        o.append(f'<text x="{x(g):.1f}" y="{H - B + 16}" text-anchor="middle">{g}</text>')
    o.append(f'<line x1="{L}" x2="{W - R}" y1="{H - B}" y2="{H - B}" stroke="#000" stroke-width="0.8"/>')
    o.append(f'<line x1="{L}" x2="{L}" y1="{T}" y2="{H - B}" stroke="#000" stroke-width="0.8"/>')
    o.append(f'<text x="{(L + W - R) / 2:.1f}" y="{H - 6}" text-anchor="middle">Generation (stage 1)</text>')
    o.append(f'<text transform="translate(12 {(T + H - B) / 2:.1f}) rotate(-90)" text-anchor="middle">Count</text>')
    for idx, dash, mark, lab in ((2, "5 3", "o", "Cells per body"), (1, "", "s", "Eggs laid per life")):
        pts = " ".join(f"{x(r[0]):.1f},{y(r[idx]):.1f}" for r in stage1)
        o.append(f'<polyline points="{pts}" fill="none" stroke="#000" stroke-width="1.2" stroke-dasharray="{dash}"/>')
        for r in stage1:
            cx, cy = x(r[0]), y(r[idx])
            if mark == "o":
                o.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="2.6" fill="#fff" stroke="#000" stroke-width="1"/>')
            else:
                o.append(f'<rect x="{cx - 2.6:.1f}" y="{cy - 2.6:.1f}" width="5.2" height="5.2" fill="#000"/>')
        o.append(f'<text x="{x(450) + 10:.1f}" y="{y(stage1[-1][idx]) + 3.5:.1f}">{lab}</text>')
    o.append('</svg>')
    return "\n".join(o)


def fig2():
    rowh, L, T = 14, 170, 22
    W, H = 700, T + rowh * len(knock) + 30
    x = lambda v: L + v / 1.3 * 380
    o = [f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" class="fig" style="width:76%;margin:0 auto">']
    o.append(f'<line x1="{x(1.13):.1f}" x2="{x(1.13):.1f}" y1="{T - 6}" y2="{T + rowh * len(knock)}" stroke="#000" stroke-width="0.6" stroke-dasharray="3 3"/>')
    o.append(f'<text x="{x(1.13):.1f}" y="{T - 10}" text-anchor="middle" class="s">unperturbed</text>')
    for i, (lab, v) in enumerate(knock):
        yy = T + i * rowh
        fill = "#000" if lab == "Enemy senses blocked" else "#9a9a9a"
        o.append(f'<text x="{L - 8}" y="{yy + 10}" text-anchor="end">{lab}</text>')
        o.append(f'<rect x="{L}" y="{yy + 3}" width="{max(1.2, x(v) - L):.1f}" height="8.5" fill="{fill}"/>')
        o.append(f'<text x="{(x(1.2) if v > 0.9 else x(v)) + 8:.1f}" y="{yy + 10}">{v:.2f}</text>')
    base = T + rowh * len(knock)
    o.append(f'<line x1="{L}" x2="{x(1.3):.1f}" y1="{base}" y2="{base}" stroke="#000" stroke-width="0.8"/>')
    for v in (0, 0.5, 1.0):
        o.append(f'<line x1="{x(v):.1f}" x2="{x(v):.1f}" y1="{base}" y2="{base + 4}" stroke="#000" stroke-width="0.7"/>')
        o.append(f'<text x="{x(v):.1f}" y="{base + 15}" text-anchor="middle">{v:.1f}</text>')
    o.append(f'<text x="{x(0.65):.1f}" y="{base + 28}" text-anchor="middle">Eggs laid per completed life</text>')
    o.append('</svg>')
    return "\n".join(o)


CSS = """
@page { size: letter; margin: 0.85in 0.75in 0.9in 0.75in;
  @bottom-center { content: counter(page); font-family: 'STIX Two Text','Times New Roman',Times,serif; font-size: 9pt; }
  @top-left { content: 'Fable 5.2 and Mohamadlou · GRN-driven artificial development'; font-family: 'STIX Two Text','Times New Roman',Times,serif; font-size: 8pt; font-style: italic; color: #444; }
  @top-right { content: 'Preprint · not peer reviewed'; font-family: 'STIX Two Text','Times New Roman',Times,serif; font-size: 8pt; font-style: italic; color: #444; } }
@page :first { @top-left { content: ''; } }
* { box-sizing: border-box; }
html { font-family: 'STIX Two Text','Times New Roman',Times,serif; font-size: 9.6pt; line-height: 1.32; color: #000; }
body { margin: 0; background: #fff; }
@media screen { body { max-width: 7in; margin: 0.6in auto; } }
h1 { font-size: 18.5pt; line-height: 1.15; font-weight: 700; text-align: center; margin: 0 0 10pt; }
.authors { text-align: center; font-size: 11.5pt; margin: 0 0 3pt; }
.affil { text-align: center; font-size: 8.8pt; font-style: italic; margin: 0 0 2pt; }
.dates { text-align: center; font-size: 8.5pt; margin: 6pt 0 12pt; color: #222; }
.abstract { margin: 0 0.45in 8pt; font-size: 9.2pt; text-align: justify; hyphens: auto; }
.abstract b.h { font-variant: small-caps; letter-spacing: 0.03em; }
.keywords { margin: 0 0.45in 12pt; font-size: 8.8pt; }
hr.rule { border: 0; border-top: 0.6pt solid #000; margin: 0 0 10pt; }
.cols { column-count: 2; column-gap: 0.28in; text-align: justify; hyphens: auto; }
h2 { font-size: 10.6pt; font-weight: 700; margin: 11pt 0 4pt; text-align: left; break-after: avoid; }
h3 { font-size: 9.8pt; font-weight: 700; font-style: italic; margin: 8pt 0 2pt; text-align: left; break-after: avoid; }
p { margin: 0; text-indent: 1.2em; orphans: 2; widows: 2; }
h2 + p, h3 + p, .noindent { text-indent: 0; }
.run { font-style: italic; font-weight: 400; }
figure, .tbl { margin: 8pt 0 9pt; break-inside: avoid; }
.wide { column-span: all; }
figure.wide { break-inside: auto; }
figure.wide figcaption { break-before: avoid; }
svg.fig { width: 100%; height: auto; display: block; font-family: 'STIX Two Text','Times New Roman',Times,serif; font-size: 10.5px; }
svg.fig .s { font-size: 9.5px; font-style: italic; }
figcaption, .cap { font-size: 8.5pt; line-height: 1.25; text-align: justify; margin-top: 4pt; hyphens: auto; }
.cap { margin: 0 0 4pt; }
figcaption b, .cap b { font-weight: 700; }
table { border-collapse: collapse; width: 100%; font-size: 8.4pt; line-height: 1.22; text-align: left; hyphens: manual; }
thead th { border-top: 0.9pt solid #000; border-bottom: 0.5pt solid #000; font-weight: 700; padding: 3pt 5pt 3pt 0; vertical-align: bottom; }
tbody td { padding: 2.2pt 5pt 2.2pt 0; vertical-align: top; }
tbody tr:last-child td { border-bottom: 0.9pt solid #000; padding-bottom: 3pt; }
td.n, th.n { text-align: right; padding-right: 8pt; white-space: nowrap; }
code { font-family: Menlo, Courier, monospace; font-size: 8pt; }
.refs { font-size: 8.5pt; padding-left: 1.6em; margin: 0; text-align: left; hyphens: manual; }
.refs li { margin-bottom: 2.5pt; }
.small { font-size: 8.5pt; }
"""

HTML = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Evolving a multicellular worm from a DNA-encoded gene regulatory network</title>
<style>{CSS}</style></head><body>

<h1>Evolving a multicellular worm from a DNA-encoded gene regulatory network: a growth-limiting signal emerges, predator avoidance does not</h1>
<p class="authors noindent">Fable 5.2<sup>1</sup> and Hamid Mohamadlou<sup>2</sup></p>
<p class="affil noindent"><sup>1</sup>Claude AI model, Anthropic, working in Claude Code &nbsp;·&nbsp; <sup>2</sup>Independent researcher</p>
<p class="dates noindent">Preprint, 10 November 2026. This manuscript has not been peer reviewed.</p>

<p class="abstract noindent"><b class="h">Abstract.</b> We ask whether development, physiology, behaviour and reproduction can be encoded together in one small genome and recovered by evolution in a form simple enough to dissect gene by gene. Each simulated worm grows from a single egg cell into a chain of cells, all running the same gene regulatory network, which is read from a DNA string over four letters and mutated by substitutions, indels, and segmental duplications and deletions. A scored warm-up of 450 generations was followed by 200,000 ticks in a shared world with no fitness function, where lineages spread only by laying eggs that survive. The resulting population was self-sustaining (77 to 95 animals, 1.2 to 1.4 eggs per life, no immigration). Knockout and sense-blocking assays showed that the worms depend on a diffusible product, S1, that represses cell division: removing it raised body size from 4.2 to 6.9 cells and cut egg output by 79%. A maternal head marker whose half-life was shortened 25-fold during evolution became dispensable. Predator avoidance did not evolve, although predators caused about one third of deaths. Competition assays showed that a hand-wired flee reflex spreads to fixation when it triggers at close range and is eliminated when it triggers at long range, and that 400,000 further ticks under fourfold predator density produced no adaptation. We report in full the six points at which evolution stalled and the rule changes that resolved them; in each case the population had responded correctly to the rules as written. All results derive from a single evolutionary lineage in a deliberately minimal model.</p>
<p class="keywords noindent"><b>Keywords:</b> gene regulatory network; artificial development; artificial life; evolvability; body size control; morphogen.</p>
<hr class="rule">

<div class="cols">

<h2>1. Introduction</h2>
<p>Every cell of an animal carries the same DNA. Cells differ because they express different genes, and expression is controlled by the products of other genes. This control system, the gene regulatory network (GRN), is what turns one genome into many cell types arranged in a body [1, 2]. A long-standing question in artificial life is how much of that process can be reproduced in a model small enough to be understood completely.</p>
<p>GRNs have been modelled as networks of continuous units with weighted activating and repressing inputs since the connectionist model of Mjolsness, Sharp and Reinitz [3]. Artificial embryogeny grows multicellular bodies from compact genomes [4, 5, 6]; evolved virtual creatures are scored on behaviour [7]; and neural cellular automata grow a target form from one cell under a shared local rule [8]. We make no claim of novelty for any component.</p>
<p>What we contribute is a single small system in which one DNA-encoded network controls growth, cell specialisation, feeding, excretion, locomotion and reproduction, followed by a genetic dissection of what evolved and a full account of where evolution failed. There is no formula that maps a target organism to a genome, so genomes were found by mutation and selection, and the result was then analysed with knockouts, as a geneticist would analyse a mutant.</p>

<h2>2. Methods</h2>
<h3>2.1 Genome encoding</h3>
<p>The genome is a string over A, C, G and T, about 920 letters long at initialisation. A gene begins at the promoter <code>TATA</code>. The next three letters specify its product, two letters its basal level, and one letter its rate constant. Each following six-letter block is a binding site: one continuation letter, three letters naming a regulator and two letters giving a signed strength between −4.5 and +4.5. A block beginning with T terminates the gene. Sequence between genes is non-coding. At most 64 genes are read.</p>

<div class="tbl"><p class="cap noindent"><b>Table 1.</b> Gene products.</p>
<table><thead><tr><th>Class</th><th class="n">Kinds</th><th>Role</th></tr></thead><tbody>
<tr><td>Transcription factors (T1–T12)</td><td class="n">12</td><td>Cell-autonomous regulators</td></tr>
<tr><td>Signals (S1–S3)</td><td class="n">3</td><td>Diffuse to neighbours and decay; S1 long-range and slow, S3 short-range and fast</td></tr>
<tr><td>Workers</td><td class="n">7</td><td>mouth, digest, anus, left muscle, right muscle, divide, lay</td></tr>
</tbody></table></div>

<h3>2.2 Regulation</h3>
<p>Each gene has a level in [0, 1] in each cell. At every tick the level relaxes, at the gene's rate, toward a logistic function of its basal term plus the weighted sum of its regulators. Regulators are the summed levels of the 12 transcription factor kinds, the local concentrations of the 3 signals, and 9 senses: food smell, lateral difference in food smell, enemy smell, lateral difference in enemy smell, body energy, gut food, gut waste, the maternal marker, and an edge sense that is 1 in the two end cells of the body.</p>

<h3>2.3 Cell and body</h3>
<p>A worm is a chain of up to 24 cells. The five physiological workers of a cell share a fixed capacity, so no cell can perform every function at full strength. Food enters at any cell expressing mouth, flows posteriorly through the gut, and is digested into energy and waste; waste must be expelled or it blocks the gut and becomes toxic. Bilateral muscle contraction propels the worm and a left–right difference turns it. A cell divides when its divide product exceeds 0.5 and body energy permits; the daughter is placed posterior to the mother with half her levels. The egg carries a maternal marker that remains in the anterior cell and decays exponentially.</p>

<h3>2.4 World</h3>
<p>The world is a 500 × 500 torus with food pellets that regrow in patches, and six predators that pursue worms within a detection radius that increases with body size. A bite on the head is lethal; a bite elsewhere removes that cell and all cells posterior to it.</p>

<h3>2.5 Reproduction and mutation</h3>
<p>A worm of at least five cells with sufficient energy lays an egg when its lay product is on. Offspring DNA is copied with substitutions (0.002 per letter), insertions or deletions of one to three letters (probability 0.08 per egg), and duplication (0.04) or deletion (0.015) of a 30 to 200 letter segment. An egg hatches only if its DNA retains at least one gene for each of the seven workers, and hatching probability falls with population density.</p>

<h3>2.6 Evolution procedure</h3>
<p><span class="run">Stage 1 (scored).</span> A population of 300 genomes, each initialised with one gene per product and random regulation, was evolved for 450 generations. Each genome was grown alone from an egg in six random worlds for 3,000 ticks and scored as energy assimilated plus 100 per egg laid. The best 15 genomes were retained and the remainder replaced by mutated copies of tournament winners, at three times the stage 2 substitution rate. The half-life of the maternal marker was held at 3,500 ticks until generation 135 and then shortened geometrically to 138 ticks by generation 337.</p>
<p><span class="run">Stage 2 (unscored).</span> The 40 best stage 1 genomes were released, two copies each, into four independent shared worlds for 200,000 ticks. No fitness is computed. A world that falls below 20 worms receives eggs from outside; this did not occur in the reported world.</p>

<h3>2.7 Assays</h3>
<p>For each perturbation, a fresh world was stocked with the final genomes with mutation disabled, one sense was clamped to zero or one product was forced to zero in every worm, and the world was run for 20,000 ticks. The primary measure is eggs laid per completed life. For competition assays, half of the founding worms and all of their descendants carried a hard-wired reflex that turns the head away from a predator whenever enemy smell exceeds a threshold; the reflex share of the population was recorded after 80,000 ticks.</p>

<h2>3. Results</h2>
<h3>3.1 Bodies evolved first, then reproduction</h3>
<p>Multicellular bodies appeared within 30 generations of stage 1, and egg laying became established between generations 100 and 125 (Fig. 1). Shortening the maternal marker's half-life 25-fold cost about half of egg output at its worst, near generation 300, after which the population recovered with the marker at its final setting.</p>

<figure class="wide">{fig1()}
<figcaption><b>Figure 1.</b> Stage 1 evolution. Body size (open circles, dashed) and eggs laid per life (filled squares) for the best genome of each generation, averaged over 10-generation windows. The shaded band marks the generations during which the half-life of the maternal head marker was shortened from 3,500 to 138 ticks.</figcaption></figure>

<h3>3.2 A self-sustaining population</h3>
<p>In stage 2 the population persisted for the full 200,000 ticks without immigration (Table 2). Of deaths in the sampled windows, 37% were from old age, 34% from starvation and 29% from predation. The deepest lineage at the end spanned 76 generations.</p>

<div class="tbl"><p class="cap noindent"><b>Table 2.</b> Stage 2 population. Ranges over ten samples taken at 20,000-tick intervals.</p>
<table><thead><tr><th>Measure</th><th>Value</th></tr></thead><tbody>
<tr><td>Worms alive</td><td>77–95</td></tr>
<tr><td>Cells per worm</td><td>4.2–4.6</td></tr>
<tr><td>Eggs hatched per 5,000 ticks</td><td>102–129</td></tr>
<tr><td>Eggs added from outside</td><td>0</td></tr>
<tr><td>Eggs laid per life</td><td>1.2–1.4</td></tr>
<tr><td>Mean lifespan (ticks; limit 6,000)</td><td>3,400–4,100</td></tr>
</tbody></table></div>

<h3>3.3 Dependence on senses and gene products</h3>
<p>Egg output collapsed when the food, gut or energy senses were blocked, or when S1, T1, anus or divide was removed (Fig. 2). Without S1, worms grew to 6.9 cells instead of 4.2 and 70% starved. Without the energy sense they remained at 1.8 cells and never laid. Eleven of the twelve transcription factor kinds could be removed singly with no measurable effect (1.11 to 1.21 eggs per life). Blocking the maternal marker, the edge sense, or the enemy senses had no measurable effect; with enemy senses blocked, predators caused 34% of deaths against 32% in the unperturbed world.</p>

<figure class="wide">{fig2()}
<figcaption><b>Figure 2.</b> Eggs laid per completed life in the final population under sense blocking and product knockout (one world of 20,000 ticks per condition, mutation off). The dashed line marks the unperturbed level. Blocking the enemy senses (black bar) has no effect.</figcaption></figure>

<h3>3.4 Evolved circuits</h3>
<p>Table 3 gives the wiring read from one representative genome of the final population, which has 10 genes. Two circuits share their logic with well-known biological ones, by analogy only: growth limited by an inhibitor that the tissue itself produces, as with myostatin in muscle, and a gene held off by a repressor that an input removes, as in the <i>lac</i> operon [1].</p>

<div class="tbl wide"><p class="cap noindent"><b>Table 3.</b> Regulatory wiring in one representative final genome. Strengths in parentheses are in model units (maximum 4.5).</p>
<table><thead><tr><th style="width:13%">Function</th><th style="width:47%">Wiring</th><th>Interpretation</th></tr></thead><tbody>
<tr><td>Body size</td><td>divide on by default; activated by energy at two sites; repressed by S1 (4.5). S1 on by default.</td><td>Cells divide while energy is high, until slowly accumulating S1 shuts division off</td></tr>
<tr><td>Excretion</td><td>T1 on by default, repressed by gut waste (4.5); anus repressed by T1 (4.5)</td><td>Double negative: waste switches T1 off, which releases anus</td></tr>
<tr><td>Steering</td><td>Right muscle activated by food on the right (4.5); left muscle repressed by it (4.5)</td><td>Turns toward food</td></tr>
<tr><td>Feeding</td><td>mouth on by default; activated by edge; repressed by gut waste, energy and S1</td><td>Feeds at the body ends and stops when full</td></tr>
<tr><td>Reproduction</td><td>lay on by default; repressed by edge</td><td>Interior cells trigger laying, subject to the size and energy rules</td></tr>
</tbody></table></div>

<h3>3.5 Genome size</h3>
<p>Initial genomes had 22 genes in about 920 letters. The stage 1 founders averaged 11.7 genes in 1,581 letters and the final population 10.4 genes in 1,611 letters: unused regulator genes were lost while non-coding sequence grew. Every final genome retained T1 and S1; 65% carried an S3 gene although its removal had no measurable effect.</p>

<h3>3.6 Predator avoidance is favoured but was not found</h3>
<p>When every worm was given the flee reflex with a threshold reached about 58 units from a predator, deaths from predation fell from 33% to 0%, yet eggs per life were unchanged (1.16 in both cases). In a saturated world, egg output per life is held near replacement whatever the worms do, so it is a poor measure of individual advantage, and we turned to competition.</p>
<p>In head-to-head competition (Table 4), the long-range reflex was eliminated or reduced in all eight worlds, most plausibly because carriers turn away from distant predators instead of feeding. Reflexes triggering only at close range rose from 50% to between 78% and 100% in all 16 worlds.</p>

<div class="tbl"><p class="cap noindent"><b>Table 4.</b> Share of reflex carriers after 80,000 ticks, from an initial 50%. Four worlds per cell.</p>
<table><thead><tr><th>Trigger range (threshold)</th><th>6 predators</th><th>24 predators</th></tr></thead><tbody>
<tr><td>≈58 units (0.15)</td><td>14, 6, 31, 20%</td><td>0, 0, 0, 0%</td></tr>
<tr><td>≈35 units (0.5)</td><td>100, 100, 91, 100%</td><td>100% in all four</td></tr>
<tr><td>≈20 units (0.8)</td><td>94, 78, 78, 99%</td><td>100% in all four</td></tr>
</tbody></table></div>

<p>We then let the final population evolve for a further 400,000 ticks with 24 predators. It did not adapt: predation accounted for 83% to 87% of deaths throughout, the population fell to the immigration floor of about 22 worms, and about 300 eggs per 50,000 ticks were added from outside. Assayed afterwards, these worms did no better than their ancestors (82% of deaths from predation in both), and blocking their enemy senses made no clear difference (84% against 82%).</p>

<h2>4. Discussion</h2>
<h3>4.1 A self-produced growth inhibitor</h3>
<p>The clearest result is that selection for reproduction in a food-limited world produced a body-size control circuit of a familiar kind. Division is driven by energy and shut off by a slowly accumulating, self-produced, diffusible inhibitor. Removing the inhibitor does not merely enlarge the animal; it makes it unviable, because a larger body costs more than it can gather. The model was not given any notion of target size.</p>

<h3>4.2 Why avoidance may be hard to reach</h3>
<p>The following is a hypothesis. The useful behaviour is conditional: turn away only when the enemy is close, and let that override the turn toward food. In this model a gene sums its inputs, so the simplest wiring, a lateral enemy sense acting directly on a muscle gene, yields the always-on reflex that competition shows to be harmful. The beneficial form needs a second input to gate the first, and there may be no path of single mutations that improves at every step. Consistent with this, every genome from the high-predation run carried at least one enemy-sense binding site, and one inspected genome had the lateral enemy sense activating the correct muscle, without measurable benefit.</p>

<h3>4.3 Where evolution stalled</h3>
<p>The reported run was the eighth attempt. Each earlier attempt stalled for an identifiable reason (Table 5), and each remedy is a design decision by the authors and not an evolved property. In every case the population had found a correct response to the rules as written. The energy-budget stall was measured directly by forcing a generation-190 worm to fixed sizes under the earlier costs (Table 6): evolution had stopped at the size the world could support.</p>

<div class="tbl wide"><p class="cap noindent"><b>Table 5.</b> Stalls encountered, their causes, and the rules introduced.</p>
<table><thead><tr><th style="width:30%">Stall</th><th style="width:37%">Cause identified</th><th>Rule introduced</th></tr></thead><tbody>
<tr><td>No reproduction in a shared world started from random DNA</td><td>Random worms starve or are eaten before any lays an egg</td><td>Scored warm-up stage</td></tr>
<tr><td>Worms remained single-celled, laying one egg per life</td><td>Hoarding energy for an egg outscored building a body</td><td>Laying requires five or more cells</td></tr>
<tr><td>No bodies after 120 generations</td><td>The unused divide gene was deleted within 30 generations and could not be regained</td><td>Worker genes made essential for hatching</td></tr>
<tr><td>Bodies fixed at two cells for 150 generations</td><td>Larger bodies gathered no more food and cost more (Table 6)</td><td>Pellets 33% richer; muscle cost −42%; resting cost −25%</td></tr>
<tr><td>Search about 25 times slower than with a fixed gene set</td><td>A substitution matters only if it hits the few letters that set a level or a site</td><td>Stage 1 substitution rate tripled</td></tr>
<tr><td>Shared world not self-sustaining</td><td>Immigration floor of 100 worms exceeded the food supply</td><td>Floor lowered to 20; food regrowth doubled</td></tr>
</tbody></table></div>

<div class="tbl"><p class="cap noindent"><b>Table 6.</b> A generation-190 worm forced to fixed body sizes under the earlier energy budget (40 trials each).</p>
<table><thead><tr><th>Body size</th><th class="n">Energy gained</th><th class="n">Lifespan</th><th class="n">Starved</th></tr></thead><tbody>
<tr><td>1 cell</td><td class="n">53</td><td class="n">2,303</td><td class="n">0/40</td></tr>
<tr><td>2 cells (evolved)</td><td class="n">102</td><td class="n">2,225</td><td class="n">4/40</td></tr>
<tr><td>3 cells</td><td class="n">107</td><td class="n">1,897</td><td class="n">18/40</td></tr>
<tr><td>4 cells</td><td class="n">86</td><td class="n">1,297</td><td class="n">25/40</td></tr>
<tr><td>6 cells</td><td class="n">65</td><td class="n">861</td><td class="n">35/40</td></tr>
</tbody></table></div>

<h3>4.4 Limitations</h3>
<p>All results come from one stage 1 run with one random seed and one of four stage 2 worlds; whether the S1 circuit would evolve again is untested. The rules in Table 5 shaped the outcome and other choices could yield a different animal. The body is a one-dimensional chain without mechanics, so nothing here bears on morphogenesis. The evolved network is shallow, with about 10 genes and one essential transcription factor. Behaviour is reflexive, with no nervous system and no learning. Reproduction is asexual. The edge sense was always available, and blocking it together with the maternal marker was not tested. Each assay condition was run once, so differences of a few percent are within noise; the collapses to near zero are not.</p>

<h2>5. Conclusion</h2>
<p>A genome of about ten genes, written in a four-letter code and shaped only by mutation and differential reproduction, was sufficient to grow, feed, excrete and reproduce a simple multicellular animal, and it arrived at an inhibitor-based mechanism for limiting its own size. The same process failed to find a predator-avoidance reflex that demonstrably pays, which we attribute, provisionally, to the absence of an incremental path to conditional behaviour in a network whose genes sum their inputs. Testing that explanation, by allowing binding sites that require two regulators together, is the natural next experiment.</p>

<h2>Author contributions</h2>
<p class="noindent small">H.M. conceived the study, posed the questions and directed the experiments. Fable 5.2 designed and implemented the model, ran the experiments and analyses, and wrote the manuscript. Both authors discussed the results.</p>

<h2>Code availability</h2>
<p class="noindent small">The simulation is under 1,000 lines of dependency-free JavaScript (<code>sim.js</code>, <code>evolve.js</code>, <code>analyze.js</code>, <code>exp_enemy*.js</code>) with a browser viewer (<code>index.html</code>). The reported run takes about 16 minutes on a 10-core laptop and is deterministic for a given seed.</p>

<h2>References</h2>
<ol class="refs">
<li>Jacob, F. &amp; Monod, J. Genetic regulatory mechanisms in the synthesis of proteins. <i>J. Mol. Biol.</i> <b>3</b>, 318–356 (1961).</li>
<li>Wolpert, L. Positional information and the spatial pattern of cellular differentiation. <i>J. Theor. Biol.</i> <b>25</b>, 1–47 (1969).</li>
<li>Mjolsness, E., Sharp, D. H. &amp; Reinitz, J. A connectionist model of development. <i>J. Theor. Biol.</i> <b>152</b>, 429–453 (1991).</li>
<li>Eggenberger, P. Evolving morphologies of simulated 3D organisms based on differential gene expression. In <i>Proc. Fourth European Conference on Artificial Life</i> (1997).</li>
<li>Bongard, J. C. &amp; Pfeifer, R. Evolving complete agents using artificial ontogeny. In <i>Morpho-functional Machines: The New Species</i> (Springer, 2003).</li>
<li>Stanley, K. O. &amp; Miikkulainen, R. A taxonomy for artificial embryogeny. <i>Artif. Life</i> <b>9</b>, 93–130 (2003).</li>
<li>Sims, K. Evolving virtual creatures. In <i>Proc. SIGGRAPH '94</i>, 15–22 (1994).</li>
<li>Mordvintsev, A., Randazzo, E., Niklasson, E. &amp; Levin, M. Growing neural cellular automata. <i>Distill</i> (2020).</li>
</ol>
<p class="noindent small" style="margin-top:5pt"><i>Note.</i> Bibliographic details were supplied from the model's memory and should be verified against the original sources before submission.</p>

</div>
</body></html>
"""

open("paper.html", "w").write(HTML)
print("wrote paper.html")
