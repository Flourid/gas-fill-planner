# Gas Fill Planner

A compressed-air bottle transfer calculator that runs entirely in the browser — no build step, no
dependencies, no server. Point GitHub Pages at this repository and it works.

Enter a bank of donor bottles and one or more recipient bottles — each with its own volume, pressure,
working limits and fill target — pick a filling strategy, and the app lays out the transfer sequence,
the pressure after every transfer, and how many fills the bank can deliver before it is spent.

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

**Smart (cascade).** Two donors per fill at most: the lowest usable bottle carries the bulk of the
charge, then the fullest one tops the recipient up as close to its maximum as equalising allows.
Spending the cheap gas first is what keeps the high-pressure bottle useful for later fills.

**Dumb (sequential).** Donors are never combined. One bottle stays on the station and is drained fill
after fill for as long as it alone can bring the recipient to its target. When it can no longer manage
that it is set aside — with whatever is left still in it — and the fullest bottle that can reach the
target takes over. The plan closes with one best-effort transfer from whichever bottle gets closest,
so the end pressure is visible even when nothing reaches the target any more.

### Reading the results

Fill count alone is misleading. Sequential filling often shows *more* fills than the cascade, because
each one is weaker and spends less gas — a bottle handed back at 167 bar is not worth as much as one
handed back at 188 bar. So the plan compares both methods on three figures:

| Figure | What it says |
| --- | --- |
| Fills | How many times a bottle reached its target. |
| Average after fill | The pressure a fill ends at, averaged over the counted fills. |
| Usable air | Air held above the minimum pressure, summed over the counted fills — the air you actually get to spend. |

With the default example — three 6 L donors at 300 bar filling a 68 in³ tank that works between 50 and
300 bar and counts as filled at 200 bar — the cascade delivers 10 fills averaging 254 bar and 79 ft³ of
usable air, against 6 fills averaging 244 bar and 45 ft³ for the sequential method. Lower the target to
100 bar and the sequential method shows *more* fills than the cascade while still delivering less
usable air, which is exactly why the count is not the headline.

**Fill counting.** A transfer stops at the recipient's maximum working pressure; the surplus stays in
the donor. Every recipient carries its own **fill target** — the pressure, in that bottle's own unit,
at which a fill counts as delivered. Once a fill reaches the target the bottle is assumed to go into
service, come back at its minimum pressure and queue for a refill. The first fill that falls short of
the target is still reported with its resulting pressure, but ends that bottle's campaign, because
every later attempt would deliver less.

The target is what makes "how many fills" a well-defined question. Without it, topping a bottle up
from its minimum by a hair would count as a fill and the campaign would never end. Raise a target if
only near-full bottles are useful to you; lower it to squeeze the bank dry. Because targets are per
bottle, a mixed fleet works: a tank that has to come out at 200 bar and one that is useful at 120 bar
can share the same bank and are counted on their own terms.

A target must sit above the bottle's minimum, and is capped at its maximum. A bottle filled to within
a hair of its maximum always counts, since equalising can only approach the maximum asymptotically.

**Safety limit.** A donor above a recipient's maximum working pressure is never connected. Enabling
*Allow unsafe filling* permits it and flags every affected transfer: filling still stops at the
recipient's maximum, but the bottle and valve see the full donor pressure.

The limit carries 1% of slack, to absorb both the rounding when a limit is typed in another unit (300
bar as whole psi comes back as 299.99 bar) and ordinary gauge tolerance. In practice a 300 bar bottle
may be filled from a donor reading up to 303 bar without being flagged.

**Units.** Volume in L, cm³, in³ or ft³; pressure in bar, psi or MPa, chosen per bottle. Results are
shown in the units of the bottle they belong to, so a donor bank in bar feeding a tank in psi reads
correctly on both sides. Changing a unit converts every pressure on that bottle — current, maximum,
minimum and target — so it re-expresses the same physical bottle rather than reinterpreting the
numbers.

## Languages

The interface ships in English and German. The language follows the browser on
first load and can be switched from the header; the choice is remembered. Numbers follow the language
too — 253.8 bar in English, 253,8 bar in German — and the number fields accept either a decimal point
or a decimal comma, whichever you type. (They are text fields rather than `type="number"` inputs
precisely because those silently discard a decimal comma: a German user typing 6,5 would end up with
a 65 litre bottle.)

Every string lives in `assets/i18n.js`, one entry per key with all languages side by side. Static
markup carries its key in a `data-i18n` attribute (`data-i18n-html` where the text has inline markup,
`data-i18n-title` / `data-i18n-aria` for attributes), so the whole page can be re-lettered without
being rebuilt. Plural forms come in `.one` / `.many` pairs resolved by `tn()`. `test/i18n.test.js`
checks that every key exists in every language, that placeholders and inline markup match between
languages, that both plural forms are present, and that the app and the dictionary agree in both
directions — no missing keys, no unused ones.

To add a language: add its code to `LANGS`, add that code to every entry in the file, and the test
will tell you what you missed.

## Running it

Open `index.html` in a browser. That is all — it is a static page and works from the filesystem.

The current setup is kept in `localStorage`, and **Copy link** produces a URL that restores it
elsewhere.

## Tests

The calculation core (`assets/calc.js`) has no DOM dependencies and is covered by a plain Node test
runner:

```
node test/calc.test.js && node test/i18n.test.js
```

or `npm test`.

The tests check unit conversion, conservation of gas content across every transfer, the maximum-pressure
cap, the safety gate, recipient cycling, per-bottle fill targets and their clamping, and that the
cascade never does worse than the sequential method.

## Deploying to GitHub Pages

Push this directory as a repository, then in **Settings → Pages** choose *Deploy from a branch*, branch
`main`, folder `/ (root)`. The site appears at `https://<user>.github.io/<repo>/` within a minute or two.

`.nojekyll` is present so Pages serves the files as they are instead of running them through Jekyll.

## Layout

```
index.html          markup, with translation keys as data attributes
assets/calc.js      units, equalisation, campaign simulation (no DOM)
assets/i18n.js      every user-visible string, English and German
assets/app.js       state, bottle SVGs, plan rendering
assets/styles.css   theme tokens and layout
test/calc.test.js   the physics and the strategies
test/i18n.test.js   translation completeness and wiring
```

## Disclaimer

A planning aid, not an authority. Verify every pressure against the markings on the bottle and valve
and against the rules that apply to you before filling anything.
