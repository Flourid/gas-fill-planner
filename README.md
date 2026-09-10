# Gas Fill Planner

A compressed-air bottle transfer calculator that runs entirely in the browser — no build step, no
dependencies, no server. Point GitHub Pages at this repository and it works.

Enter a bank of donor bottles and one or more recipient bottles, pick a filling strategy, and the app
lays out the transfer sequence, the pressure after every transfer, and how many fills the bank can
deliver before it is spent.

## What it computes

**Model.** Air is treated as an ideal gas at constant temperature (Boyle's law): the gas content of a
bottle is proportional to volume × absolute pressure. Connecting a donor to a recipient equalises both
to the volume-weighted mean pressure

```
P_eq = (V_d · P_d + V_r · P_r) / (V_d + V_r)
```

The offset between gauge and absolute pressure cancels in that expression, so every pressure entered
and displayed is a gauge pressure. Absolute pressure is used only where free-air volume is reported.

Real transfers are not isothermal — gas heats as it is compressed into the recipient and cools in the
donor — so a bottle that has settled back to ambient temperature reads a little lower than this calculation suggests.
Treat the output as the isothermal best case.

**Strategies.**

| Method | Donor order | Effect |
| --- | --- | --- |
| Smart | Lowest usable pressure first | Cascade filling. The bulk of the gas comes from bottles that would otherwise be unusable, and the highest-pressure bottle is kept in reserve for the final top-up. |
| Dumb | Highest pressure first | Sequential filling. Each donor is equalised until spent, starting with the fullest, which throws away the pressure differential that does the useful work. |

With the default example (three 50 L donors at 232 / 180 / 120 bar filling a 12 L tank between 50 and
232 bar) the cascade delivers 7 fills against 4 for the sequential method, from exactly the same bank.

**Fill counting.** A transfer stops at the recipient's maximum working pressure; the surplus stays in
the donor. A fill that reaches the *counts as a fill* threshold — by default half of the bottle's
working range between its minimum and maximum — is counted, and the bottle is then assumed to go into
service, come back at its minimum pressure and queue for a refill. The first fill that falls short of
the threshold is still reported with its resulting pressure, but ends that bottle's campaign, because
every later attempt would deliver less.

That threshold is what makes "how many fills" a well-defined question. Without it, topping a bottle up
from its minimum by a hair would count as a fill and the campaign would never end. Raise it if only
near-full bottles are useful to you; lower it to squeeze the bank dry.

**Safety limit.** A donor above a recipient's maximum working pressure is never connected. Enabling
*Allow unsafe filling* permits it and flags every affected transfer: filling still stops at the
recipient's maximum, but the bottle and valve see the full donor pressure.

**Units.** Volume in L, cm³, in³ or ft³; pressure in bar, psi or MPa, chosen per bottle. Results are
shown in the units of the bottle they belong to, so a donor bank in bar feeding a tank in psi reads
correctly on both sides. Changing a unit converts the value — it re-expresses the same physical
bottle rather than reinterpreting the number.

## Running it

Open `index.html` in a browser. That is all — it is a static page and works from the filesystem.

The current setup is kept in `localStorage`, and **Copy link** produces a URL that restores it
elsewhere.

## Tests

The calculation core (`assets/calc.js`) has no DOM dependencies and is covered by a plain Node test
runner:

```
node test/calc.test.js
```

The tests check unit conversion, conservation of gas content across every transfer, the maximum-pressure
cap, the safety gate, recipient cycling, and that the cascade never does worse than the sequential
method.

## Deploying to GitHub Pages

Push this directory as a repository, then in **Settings → Pages** choose *Deploy from a branch*, branch
`main`, folder `/ (root)`. The site appears at `https://<user>.github.io/<repo>/` within a minute or two.

`.nojekyll` is present so Pages serves the files as they are instead of running them through Jekyll.

## Layout

```
index.html          markup and the explanatory notes
assets/calc.js      units, equalisation, campaign simulation (no DOM)
assets/app.js       state, bottle SVGs, plan rendering
assets/styles.css   theme tokens and layout
test/calc.test.js   node test/calc.test.js
```

## Disclaimer

A planning aid, not an authority. Verify every pressure against the markings on the bottle and valve
and against the rules that apply to you before filling anything.
