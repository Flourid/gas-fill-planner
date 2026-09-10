/* Run with: node test/i18n.test.js */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var I = require('../assets/i18n.js');

var pass = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok  ' + name); }
  catch (e) { console.error('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
}
function read(f) { return fs.readFileSync(path.join(__dirname, '..', f), 'utf8'); }
function placeholders(text) {
  return (text.match(/\{\w+\}/g) || []).slice().sort();
}

var keys = Object.keys(I.STRINGS);

console.log('dictionary');
test('every string exists in every language', function () {
  var missing = [];
  keys.forEach(function (k) {
    I.LANGS.forEach(function (lang) {
      var v = I.STRINGS[k][lang];
      if (typeof v !== 'string' || !v.trim()) missing.push(k + '.' + lang);
    });
  });
  assert.deepStrictEqual(missing, [], 'missing translations: ' + missing.join(', '));
  console.log('       ' + keys.length + ' keys × ' + I.LANGS.length + ' languages');
});
test('translations are not copies of the English (except unit-only strings)', function () {
  /* A handful legitimately read the same in both languages. */
  var shared = ['field.name', 'btn.lang.toDe', 'btn.lang.toEn'];
  var copies = keys.filter(function (k) {
    return shared.indexOf(k) < 0 && I.STRINGS[k].de === I.STRINGS[k].en;
  });
  assert.deepStrictEqual(copies, [], 'untranslated: ' + copies.join(', '));
});
test('placeholders match across languages', function () {
  keys.forEach(function (k) {
    assert.deepStrictEqual(placeholders(I.STRINGS[k].de), placeholders(I.STRINGS[k].en),
      'placeholder mismatch in ' + k);
  });
});
test('markup is balanced in both languages', function () {
  keys.forEach(function (k) {
    I.LANGS.forEach(function (lang) {
      var v = I.STRINGS[k][lang];
      var open = (v.match(/<(?!\/)[a-z]+>/g) || []).length;
      var close = (v.match(/<\/[a-z]+>/g) || []).length;
      assert.strictEqual(open, close, 'unbalanced tags in ' + k + '.' + lang + ': ' + v);
    });
  });
});

console.log('substitution');
test('t() fills placeholders and falls back to English', function () {
  I.setLang('de');
  assert.strictEqual(I.t('fill.label', { n: 3 }), 'Füllung 3');
  I.setLang('en');
  assert.strictEqual(I.t('fill.label', { n: 3 }), 'Fill 3');
  assert.strictEqual(I.t('nope.missing'), 'nope.missing', 'unknown keys should surface as the key');
  assert.strictEqual(I.t('fill.label', {}), 'Fill {n}', 'unfilled placeholders stay visible');
});
test('numbers follow the language', function () {
  I.setLang('de');
  assert.strictEqual(I.nf(253.75, 1), '253,8');
  assert.strictEqual(I.nf(12345, 0), '12.345');
  I.setLang('en');
  assert.strictEqual(I.nf(253.75, 1), '253.8');
  assert.strictEqual(I.nf(12345, 0), '12,345');
});
test('an unknown language falls back to English', function () {
  assert.strictEqual(I.setLang('fr'), 'en');
  assert.strictEqual(I.t('btn.reset'), 'Reset');
});

console.log('wiring');
test('every key used in the app exists in the dictionary', function () {
  var app = read('assets/app.js');
  var used = [];
  var re = /\b(?:tn|t)\(\s*'([a-zA-Z][\w.]*)'/g;
  var m;
  while ((m = re.exec(app))) used.push(m[1]);
  /* Keys chosen by a conditional appear as plain strings too. */
  var conditional = app.match(/'((?:btn|stat|list|fill|method|issue|timeline|verdict|cmp|field|step|bottle|residual)\.[\w.]+)'/g) || [];
  conditional.forEach(function (q) { used.push(q.slice(1, -1)); });
  /* A stem handed to tn() is valid when its plural family exists. */
  var unknown = used.filter(function (k) {
    return !I.STRINGS[k] && !I.STRINGS[k + '.one'];
  });
  assert.deepStrictEqual([...new Set(unknown)], [], 'app.js uses undefined keys: ' + unknown.join(', '));
  assert.ok(used.length > 40, 'expected the app to be fully wired, found ' + used.length + ' uses');
});
test('every data-i18n key in the markup exists', function () {
  var html = read('index.html');
  var attrs = html.match(/data-i18n(?:-html|-title|-aria)?="([^"]+)"/g) || [];
  var unknown = attrs.map(function (a) { return a.replace(/.*="([^"]+)"/, '$1'); })
                     .filter(function (k) { return !I.STRINGS[k]; });
  assert.deepStrictEqual(unknown, [], 'index.html references undefined keys: ' + unknown.join(', '));
  assert.ok(attrs.length > 20, 'expected the markup to be wired, found ' + attrs.length);
});
test('no dictionary key is left unused', function () {
  var all = read('assets/app.js') + read('index.html');
  var unused = keys.filter(function (k) {
    /* Plural families are addressed by their stem through tn(). */
    var stem = k.replace(/\.(one|many)$/, '');
    return all.indexOf(k) < 0 && all.indexOf(stem) < 0;
  });
  assert.deepStrictEqual(unused, [], 'unused keys: ' + unused.join(', '));
});
test('every plural family has both forms', function () {
  var stems = {};
  keys.forEach(function (k) {
    var m = k.match(/^(.*)\.(one|many)$/);
    if (m) (stems[m[1]] = stems[m[1]] || []).push(m[2]);
  });
  assert.ok(Object.keys(stems).length >= 5, 'expected several plural families');
  Object.keys(stems).forEach(function (stem) {
    assert.deepStrictEqual(stems[stem].slice().sort(), ['many', 'one'],
      stem + ' is missing a plural form');
  });
});
test('tn() picks the form and passes the count through', function () {
  I.setLang('de');
  assert.strictEqual(I.tn('timeline.more', 1), '1 weitere Füllung nicht aufgeführt.');
  assert.strictEqual(I.tn('timeline.more', 4), '4 weitere Füllungen nicht aufgeführt.');
  I.setLang('en');
  assert.strictEqual(I.tn('timeline.more', 1), '1 further fill not listed.');
  assert.strictEqual(I.tn('stat.fills', 2), 'Fills delivered');
});

console.log('\n' + pass + ' checks passed' + (process.exitCode ? ' (with failures)' : ''));
