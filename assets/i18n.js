/*
 * Gas Fill Planner — translations.
 *
 * One entry per string, English and German side by side, so a missing
 * translation is visible in the file and catchable in the tests.  Values may
 * carry {placeholders}, which t() substitutes, and inline markup, which the
 * caller inserts as HTML — every value here is authored, none is user input.
 */
(function (global) {
  'use strict';

  var STRINGS = {
    /* ---- document and header ---- */
    'meta.title': {
      en: 'Gas Fill Planner — compressed air bottle transfer calculator',
      de: 'Gas Fill Planner — Rechner für das Umfüllen von Druckluftflaschen'
    },
    'meta.description': {
      en: 'Plan compressed air bottle filling: cascade (smart) or sequential (dumb) transfers, fill counts and resulting pressures. Runs entirely in your browser.',
      de: 'Druckluftflaschen-Füllungen planen: Kaskadenfüllung (klug) oder sequenzielles Umfüllen (einfach), Anzahl der Füllungen und resultierende Drücke. Läuft vollständig im Browser.'
    },
    'app.tagline': {
      en: 'Compressed air transfer & cascade calculator',
      de: 'Rechner für Druckluft-Umfüllung und Kaskadenfüllung'
    },
    'btn.theme.light': { en: 'Light', de: 'Hell' },
    'btn.theme.dark': { en: 'Dark', de: 'Dunkel' },
    'btn.theme.title': { en: 'Toggle light / dark', de: 'Zwischen hell und dunkel wechseln' },
    'btn.lang.toDe': { en: 'Deutsch', de: 'Deutsch' },
    'btn.lang.toEn': { en: 'English', de: 'English' },
    'btn.lang.title': { en: 'Switch language', de: 'Sprache wechseln' },
    'btn.share': { en: 'Copy link', de: 'Link kopieren' },
    'btn.share.title': {
      en: 'Copy a link that restores this setup',
      de: 'Link kopieren, der diese Konfiguration wiederherstellt'
    },
    'btn.share.done': { en: 'Copied', de: 'Kopiert' },
    'btn.share.failed': { en: 'Copy failed', de: 'Kopieren fehlgeschlagen' },
    'btn.reset': { en: 'Reset', de: 'Zurücksetzen' },
    'btn.reset.title': {
      en: 'Restore the example setup',
      de: 'Beispiel-Konfiguration wiederherstellen'
    },

    /* ---- method switch ---- */
    'method.group': { en: 'Filling method', de: 'Füllmethode' },
    'method.smart': { en: 'Smart', de: 'Klug' },
    'method.smart.sub': {
      en: 'Cascade — two donors: low pressure first, fullest tops up',
      de: 'Kaskade — zwei Spender: niedriger Druck zuerst, vollste Flasche füllt auf'
    },
    'method.dumb': { en: 'Dumb', de: 'Einfach' },
    'method.dumb.sub': {
      en: 'Sequential — one donor at a time until it falls short',
      de: 'Sequenziell — eine Flasche nach der anderen, bis sie nicht mehr reicht'
    },
    'method.hint.smart': {
      en: 'Cascade: two donors per fill — the lowest carries the bulk, the fullest tops up.',
      de: 'Kaskade: zwei Spender pro Füllung — die niedrigste liefert die Hauptmenge, die vollste füllt auf.'
    },
    'method.hint.dumb': {
      en: 'Sequential: one donor per fill, drained until it can no longer reach the target.',
      de: 'Sequenziell: ein Spender pro Füllung, geleert bis er das Ziel nicht mehr erreicht.'
    },
    'unsafe.label': { en: 'Allow unsafe filling', de: 'Unsicheres Füllen erlauben' },
    'unsafe.title': {
      en: "Allow donors above the recipient's maximum working pressure",
      de: 'Spender über dem maximalen Betriebsdruck der Zielflasche zulassen'
    },

    /* ---- bottle lists ---- */
    'card.donors': { en: 'Donor bottles', de: 'Spenderflaschen' },
    'card.recipients': { en: 'Recipient bottles', de: 'Zielflaschen' },
    'btn.addDonor': { en: '+ Add donor', de: '+ Spender hinzufügen' },
    'btn.addRecipient': { en: '+ Add recipient', de: '+ Zielflasche hinzufügen' },
    'field.name': { en: 'Name', de: 'Name' },
    'field.volume': { en: 'Volume', de: 'Volumen' },
    'field.pressure': { en: 'Pressure', de: 'Druck' },
    'field.max': { en: 'Max pressure', de: 'Maximaldruck' },
    'field.min': { en: 'Min pressure', de: 'Minimaldruck' },
    'field.target': { en: 'Fill target', de: 'Füllziel' },
    'field.max.title': {
      en: 'Highest working pressure. Transfers stop here and no donor above it is connected unless unsafe filling is allowed.',
      de: 'Maximaler Betriebsdruck. Das Umfüllen stoppt hier, und kein Spender darüber wird angeschlossen, sofern unsicheres Füllen nicht erlaubt ist.'
    },
    'field.min.title': {
      en: 'The bottle comes back for a refill at this pressure.',
      de: 'Bei diesem Druck kommt die Flasche zum Nachfüllen zurück.'
    },
    'field.target.title': {
      en: 'A fill counts once it reaches this pressure. The bottle then goes into service and returns at its minimum for the next fill.',
      de: 'Eine Füllung zählt, sobald sie diesen Druck erreicht. Danach geht die Flasche in den Einsatz und kommt mit ihrem Minimaldruck zur nächsten Füllung zurück.'
    },
    'btn.remove.title': { en: 'Remove', de: 'Entfernen' },
    'btn.remove.aria': { en: 'Remove bottle', de: 'Flasche entfernen' },
    'list.emptyDonors': {
      en: 'No donor bottles — add one to start.',
      de: 'Keine Spenderflaschen — füge eine hinzu, um zu beginnen.'
    },
    'list.emptyRecipients': {
      en: 'No recipient bottles — add one to start.',
      de: 'Keine Zielflaschen — füge eine hinzu, um zu beginnen.'
    },
    'bottle.aria': { en: '{name} at {pressure}', de: '{name} bei {pressure}' },
    'bottle.ariaLeft': { en: '{name} left at {pressure}', de: '{name} verbleibt bei {pressure}' },
    'residual.was': { en: 'was {pressure}', de: 'war {pressure}' },

    /* ---- plan ---- */
    'card.plan': { en: 'Fill plan', de: 'Füllplan' },
    'residual.heading': {
      en: 'Donor bank when the plan ends',
      de: 'Spenderbank am Ende des Plans'
    },
    'stat.fills.one': { en: 'Fill delivered', de: 'Füllung geliefert' },
    'stat.fills.many': { en: 'Fills delivered', de: 'Füllungen geliefert' },
    'stat.avg': { en: 'Average after fill ({unit})', de: 'Ø Druck nach Füllung ({unit})' },
    'stat.usableAir': { en: 'Usable air delivered ({unit})', de: 'Nutzbare Luft geliefert ({unit})' },
    'stat.transfers': { en: 'Transfers', de: 'Umfüllvorgänge' },
    'stat.bankUsed': { en: 'Donor bank used', de: 'Spenderbank genutzt' },
    'stat.perBottle': { en: 'Per bottle', de: 'Pro Flasche' },

    'cmp.method': { en: 'Method', de: 'Methode' },
    'cmp.fills': { en: 'Fills', de: 'Füllungen' },
    'cmp.avg': { en: 'Avg. after fill ({unit})', de: 'Ø nach Füllung ({unit})' },
    'cmp.air': { en: 'Usable air ({unit})', de: 'Nutzbare Luft ({unit})' },
    'cmp.bank': { en: 'Bank used', de: 'Bank genutzt' },
    'cmp.cascade': { en: 'Cascade', de: 'Kaskade' },
    'cmp.sequential': { en: 'Sequential', de: 'Sequenziell' },
    'cmp.inUse': { en: 'in use', de: 'aktiv' },

    'verdict.none': {
      en: 'Neither method can bring a bottle to its target from this bank.',
      de: 'Keine der beiden Methoden bringt eine Flasche mit dieser Bank auf ihr Ziel.'
    },
    'verdict.same': {
      en: 'Both methods get the same out of this bank — with one donor, or donors at equal pressure, there is nothing to cascade.',
      de: 'Beide Methoden holen dasselbe aus dieser Bank — mit nur einem Spender oder Spendern auf gleichem Druck gibt es nichts zu kaskadieren.'
    },
    'verdict.airPct': {
      en: 'Cascade filling gets <b>{pct}% more usable air</b> out of the same bank',
      de: 'Kaskadenfüllung holt <b>{pct}% mehr nutzbare Luft</b> aus derselben Bank'
    },
    'verdict.airAbs': {
      en: 'Cascade filling gets <b>{air} {unit} more usable air</b> out of the same bank',
      de: 'Kaskadenfüllung holt <b>{air} {unit} mehr nutzbare Luft</b> aus derselben Bank'
    },
    'verdict.airSame': {
      en: 'Cascade filling gets the same air out of this bank',
      de: 'Kaskadenfüllung holt dieselbe Luftmenge aus dieser Bank'
    },
    'verdict.pressure': {
      en: ', with every fill ending <b>{delta}</b> higher on average',
      de: ', wobei jede Füllung im Schnitt <b>{delta}</b> höher endet'
    },
    'verdict.dumbMoreFills.one': {
      en: ' Sequential filling shows {n} more fill, but it is a weaker one: a bottle handed back at {dumbAvg} holds less than one at {smartAvg}.',
      de: ' Sequenzielles Füllen zeigt {n} Füllung mehr, aber eine schwächere: eine Flasche, die mit {dumbAvg} zurückgegeben wird, enthält weniger als eine mit {smartAvg}.'
    },
    'verdict.dumbMoreFills.many': {
      en: ' Sequential filling shows {n} more fills, but they are weaker ones: a bottle handed back at {dumbAvg} holds less than one at {smartAvg}.',
      de: ' Sequenzielles Füllen zeigt {n} Füllungen mehr, aber schwächere: eine Flasche, die mit {dumbAvg} zurückgegeben wird, enthält weniger als eine mit {smartAvg}.'
    },
    'verdict.smartMoreFills.one': {
      en: ' It also manages {n} more fill.',
      de: ' Sie schafft außerdem {n} Füllung mehr.'
    },
    'verdict.smartMoreFills.many': {
      en: ' It also manages {n} more fills.',
      de: ' Sie schafft außerdem {n} Füllungen mehr.'
    },

    'fill.label': { en: 'Fill {n}', de: 'Füllung {n}' },
    'fill.tag.full': { en: 'at maximum', de: 'am Maximum' },
    'fill.tag.counted': { en: 'counted', de: 'gezählt' },
    'fill.tag.short': { en: 'short of target', de: 'unter Ziel' },
    'fill.tag.unsafe': { en: 'unsafe transfer', de: 'unsicheres Umfüllen' },
    'fill.barTitle': {
      en: '{from} → {to}, target {target}, maximum {max}',
      de: '{from} → {to}, Ziel {target}, Maximum {max}'
    },
    'step.unsafe': { en: 'unsafe', de: 'unsicher' },
    'step.unsafe.title': {
      en: "Donor pressure exceeds this bottle's maximum",
      de: 'Spenderdruck übersteigt das Maximum dieser Flasche'
    },
    'step.capped': { en: 'stop at max', de: 'Stopp am Maximum' },
    'timeline.noTransfer': {
      en: "No transfer is possible — no donor is above a recipient's current pressure (and within its maximum).",
      de: 'Kein Umfüllen möglich — kein Spender liegt über dem aktuellen Druck einer Zielflasche (und innerhalb ihres Maximums).'
    },
    'timeline.addBottles': {
      en: 'Add at least one donor and one recipient bottle.',
      de: 'Füge mindestens eine Spender- und eine Zielflasche hinzu.'
    },
    'timeline.more.one': {
      en: '{n} further fill not listed.',
      de: '{n} weitere Füllung nicht aufgeführt.'
    },
    'timeline.more.many': {
      en: '{n} further fills not listed.',
      de: '{n} weitere Füllungen nicht aufgeführt.'
    },

    /* ---- notices ---- */
    'issue.truncated': {
      en: 'The plan was cut off after {n} fills. Raise a fill target to get a shorter, more realistic plan.',
      de: 'Der Plan wurde nach {n} Füllungen abgeschnitten. Erhöhe ein Füllziel für einen kürzeren, realistischeren Plan.'
    },
    'issue.unsafeTransfers.one': {
      en: "{n} transfer connects a donor above the recipient's maximum working pressure. Filling stops at the maximum, but the bottle and valve see the full donor pressure.",
      de: '{n} Umfüllvorgang verbindet einen Spender über dem maximalen Betriebsdruck der Zielflasche. Das Füllen stoppt am Maximum, Flasche und Ventil sehen aber den vollen Spenderdruck.'
    },
    'issue.unsafeTransfers.many': {
      en: "{n} transfers connect a donor above the recipient's maximum working pressure. Filling stops at the maximum, but the bottle and valve see the full donor pressure.",
      de: '{n} Umfüllvorgänge verbinden einen Spender über dem maximalen Betriebsdruck der Zielflasche. Das Füllen stoppt am Maximum, Flasche und Ventil sehen aber den vollen Spenderdruck.'
    },
    'issue.volumeZero': {
      en: '{name}: volume must be greater than zero.',
      de: '{name}: Das Volumen muss größer als null sein.'
    },
    'issue.maxNotAboveMin': {
      en: '{name}: maximum pressure must be above the minimum pressure.',
      de: '{name}: Der Maximaldruck muss über dem Minimaldruck liegen.'
    },
    'issue.targetBelowMin': {
      en: '{name}: the fill target must be above the minimum pressure, otherwise a bottle would count as filled the moment it is topped up at all.',
      de: '{name}: Das Füllziel muss über dem Minimaldruck liegen, sonst würde eine Flasche schon beim geringsten Nachfüllen als gefüllt gelten.'
    },
    'issue.targetAboveMax': {
      en: '{name}: the fill target sits above the maximum working pressure — {max} is used instead.',
      de: '{name}: Das Füllziel liegt über dem maximalen Betriebsdruck — es wird {max} verwendet.'
    },
    'issue.aboveMax': {
      en: '{name} already sits above its maximum working pressure ({pressure} > {max}) — it cannot be filled.',
      de: '{name} liegt bereits über ihrem maximalen Betriebsdruck ({pressure} > {max}) — sie kann nicht gefüllt werden.'
    },
    'issue.blockedOne': {
      en: '{names} exceeds a recipient maximum working pressure and is held back. Enable “Allow unsafe filling” to use it anyway.',
      de: '{names} übersteigt den maximalen Betriebsdruck einer Zielflasche und wird zurückgehalten. Aktiviere „Unsicheres Füllen erlauben“, um sie dennoch zu verwenden.'
    },
    'issue.blockedMany': {
      en: '{names} exceed a recipient maximum working pressure and are held back. Enable “Allow unsafe filling” to use them anyway.',
      de: '{names} übersteigen den maximalen Betriebsdruck einer Zielflasche und werden zurückgehalten. Aktiviere „Unsicheres Füllen erlauben“, um sie dennoch zu verwenden.'
    },

    /* ---- explanatory notes ---- */
    'notes.heading': { en: 'How the numbers are produced', de: 'Wie die Zahlen entstehen' },
    'notes.model': {
      en: "<strong>Model.</strong> Air is treated as an ideal gas at constant temperature (Boyle's law): bottle content is proportional to volume &times; absolute pressure. Connecting a donor to a recipient equalises both to the volume-weighted mean pressure <code>P = (V<sub>d</sub>P<sub>d</sub> + V<sub>r</sub>P<sub>r</sub>) / (V<sub>d</sub> + V<sub>r</sub>)</code>. The gauge/absolute offset cancels in that expression, so all pressures you enter and read are gauge pressures.",
      de: '<strong>Modell.</strong> Luft wird als ideales Gas bei konstanter Temperatur behandelt (Gesetz von Boyle-Mariotte): Der Flascheninhalt ist proportional zu Volumen &times; Absolutdruck. Verbindet man Spender und Zielflasche, gleichen sich beide auf den volumengewichteten Mitteldruck <code>P = (V<sub>S</sub>P<sub>S</sub> + V<sub>Z</sub>P<sub>Z</sub>) / (V<sub>S</sub> + V<sub>Z</sub>)</code> aus. Der Unterschied zwischen Über- und Absolutdruck fällt in dieser Formel heraus, deshalb sind alle Drücke, die du eingibst und abliest, Überdrücke (Manometerdruck).'
    },
    'notes.warm': {
      en: '<strong>Real fills run warm.</strong> Gas heats on compression and cools in the donor, so a bottle settled back to ambient temperature reads a little lower than shown here. Treat the results as the isothermal best case.',
      de: '<strong>Echte Füllungen werden warm.</strong> Gas erwärmt sich beim Verdichten und kühlt im Spender ab. Eine Flasche, die wieder Umgebungstemperatur erreicht hat, zeigt daher etwas weniger an als hier berechnet. Die Ergebnisse sind der isotherme Bestfall.'
    },
    'notes.methods': {
      en: '<strong>Smart vs. dumb.</strong> Smart uses two donors per fill at most: the lowest usable bottle carries the bulk of the charge, then the fullest one tops the recipient up. Spending the cheap gas first is what keeps the high-pressure bottle useful for later fills. Dumb never combines donors: one bottle stays on the station and is drained fill after fill for as long as it alone can reach the target, then it is set aside, with whatever is left still in it, and the fullest bottle that can reach the target takes over.',
      de: '<strong>Klug gegen einfach.</strong> Klug nutzt höchstens zwei Spender pro Füllung: Die niedrigste verwendbare Flasche liefert die Hauptmenge, dann füllt die vollste die Zielflasche auf. Das billige Gas zuerst auszugeben ist genau das, was die Hochdruckflasche für spätere Füllungen nützlich hält. Einfach kombiniert nie zwei Spender: Eine Flasche bleibt an der Station und wird Füllung für Füllung geleert, solange sie allein das Ziel erreicht. Dann wird sie mit ihrem Restinhalt beiseitegestellt, und die vollste Flasche, die das Ziel erreicht, übernimmt.'
    },
    'notes.reading': {
      en: '<strong>Reading the numbers.</strong> Fill count on its own is misleading: sequential filling often shows <em>more</em> fills, because each one is weaker and spends less gas. What matters is how full a bottle is when you take it away, so the comparison also carries the average pressure a fill ends at and the usable air delivered — the air a bottle holds above its minimum pressure, summed over every counted fill. That is the air you get to spend, and it is where the cascade wins.',
      de: '<strong>Die Zahlen lesen.</strong> Die Anzahl der Füllungen allein führt in die Irre: Sequenzielles Füllen zeigt oft <em>mehr</em> Füllungen, weil jede einzelne schwächer ist und weniger Gas verbraucht. Entscheidend ist, wie voll eine Flasche ist, wenn du sie mitnimmst. Der Vergleich enthält deshalb auch den durchschnittlichen Enddruck einer Füllung und die gelieferte nutzbare Luft — die Luft, die eine Flasche über ihrem Minimaldruck enthält, summiert über alle gezählten Füllungen. Das ist die Luft, die du tatsächlich verbrauchen kannst, und genau dort gewinnt die Kaskade.'
    },
    'notes.duty': {
      en: "<strong>Duty cycle.</strong> Every recipient carries its own <em>fill target</em>: the pressure a fill has to reach to count. Once a fill reaches it the bottle goes into service, comes back at its minimum pressure and queues for a refill. The first fill that falls short of the target is still shown, with its resulting pressure, but ends that bottle's campaign because every later attempt would deliver less. Raise a target if only near-full bottles are useful to you, lower it to squeeze the bank dry. A target must sit above the minimum — otherwise a bottle would count as filled the moment it is topped up at all — and is capped at the maximum.",
      de: '<strong>Einsatzzyklus.</strong> Jede Zielflasche hat ihr eigenes <em>Füllziel</em>: den Druck, den eine Füllung erreichen muss, um zu zählen. Ist er erreicht, geht die Flasche in den Einsatz, kommt mit ihrem Minimaldruck zurück und wartet auf die nächste Füllung. Die erste Füllung, die das Ziel verfehlt, wird mit ihrem Enddruck weiterhin angezeigt, beendet aber den Plan für diese Flasche, weil jeder weitere Versuch noch weniger liefern würde. Erhöhe das Ziel, wenn für dich nur nahezu volle Flaschen brauchbar sind; senke es, um die Bank leerzufahren. Ein Ziel muss über dem Minimum liegen — sonst würde eine Flasche schon beim geringsten Nachfüllen als gefüllt gelten — und wird beim Maximum begrenzt.'
    },
    'notes.safety': {
      en: "<strong>Safety limit.</strong> A donor above a recipient's maximum working pressure is never connected unless <em>Allow unsafe filling</em> is on; those transfers are then flagged. Transfers always stop at the recipient's maximum, the surplus stays in the donor. The limit carries 1% of slack, so that a limit typed in another unit — or ordinary gauge tolerance — does not flag a bottle that is level with it.",
      de: '<strong>Sicherheitsgrenze.</strong> Ein Spender über dem maximalen Betriebsdruck der Zielflasche wird nie angeschlossen, solange <em>Unsicheres Füllen erlauben</em> aus ist; ist es an, werden diese Umfüllvorgänge markiert. Das Umfüllen stoppt immer am Maximum der Zielflasche, der Überschuss bleibt im Spender. Die Grenze hat 1&nbsp;% Spielraum, damit eine in einer anderen Einheit eingegebene Grenze — oder die übliche Manometertoleranz — keine Flasche markiert, die genau auf dieser Höhe liegt.'
    },
    'notes.disclaimer': {
      en: 'Planning aid only. Verify every pressure against the bottle and valve markings and the rules that apply to you before filling anything.',
      de: 'Nur eine Planungshilfe. Prüfe jeden Druck anhand der Kennzeichnung von Flasche und Ventil sowie der für dich geltenden Vorschriften, bevor du etwas füllst.'
    },
    'footer.local': {
      en: 'Everything is computed locally in your browser — no data leaves this page.',
      de: 'Alles wird lokal in deinem Browser berechnet — keine Daten verlassen diese Seite.'
    }
  };

  var LANGS = ['en', 'de'];
  var lang = 'en';

  function setLang(next) { lang = LANGS.indexOf(next) >= 0 ? next : 'en'; return lang; }
  function getLang() { return lang; }
  function locale() { return lang === 'de' ? 'de-DE' : 'en-GB'; }

  function t(key, params) {
    var entry = STRINGS[key];
    var text = entry ? (entry[lang] || entry.en) : key;
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, function (whole, name) {
      return Object.prototype.hasOwnProperty.call(params, name) ? params[name] : whole;
    });
  }

  /* Both languages split on "one" versus "the rest", so one helper covers them:
     tn('stat.fills', 3) reads 'stat.fills.many'. */
  function tn(key, n, params) {
    var p = params || {};
    if (!Object.prototype.hasOwnProperty.call(p, 'n')) p.n = n;
    return t(key + (Math.abs(n) === 1 ? '.one' : '.many'), p);
  }

  /* Numbers follow the language: 253.8 in English, 253,8 in German. */
  function nf(value, decimals) {
    var d = decimals || 0;
    return Number(value).toLocaleString(locale(), {
      minimumFractionDigits: d,
      maximumFractionDigits: d
    });
  }

  var api = { STRINGS: STRINGS, LANGS: LANGS, t: t, tn: tn, setLang: setLang, getLang: getLang,
              locale: locale, nf: nf };
  global.I18N = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
