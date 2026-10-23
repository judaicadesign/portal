const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('folletos/index.html', 'utf8');
const dom = new JSDOM(html, { runScripts:'outside-only', url:'https://judaicadesign.github.io/portal/herramientas/folletos/' });
const w = dom.window, $ = id => w.document.getElementById(id);
const downloads = [], blobs = [];
w.URL.createObjectURL = blob => { blobs.push(blob); return 'blob:jd-test-' + blobs.length; };
w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function(){ downloads.push({ href:this.href, name:this.download }); };
w.eval(fs.readFileSync('calculator.js', 'utf8'));
w.eval(fs.readFileSync('folletos/folletos-ui.js', 'utf8'));

const input = (id, val) => { $(id).value = String(val); $(id).dispatchEvent(new w.Event('input', { bubbles:true })); };
const click = id => $(id).click();
assert.ok(w.JDFolletos);
assert.equal($('mainResult').textContent, '534 mm');
assert.equal($('summaryMeta').textContent, '4 paneles · 210 mm de alto');
assert.equal($('copy-summary').disabled, false);
click('download-front');
click('download-back');
assert.deepEqual(downloads.map(d => d.name), ['JD-cuadriptico-envolvente-cara-A.svg','JD-cuadriptico-envolvente-cara-B.svg']);
assert.equal(blobs.length, 2);
assert.equal(blobs[0].type, 'image/svg+xml;charset=utf-8');

input('height','0');
assert.equal($('download-front').disabled,true);
assert.equal($('height-error').hidden,false);
input('height','210');
assert.equal($('height-error').hidden,true);
input('bleed','11');
assert.equal($('download-back').disabled,true);
assert.equal($('bleed-error').hidden,false);
input('bleed','3');
assert.equal($('download-back').disabled,false);

click('spanishBtn');
click('triBtn');
click('accordionBtn');
click('download-front');
assert.equal(downloads.at(-1).name,'JD-triptico-acordeon-cara-A.svg');
assert.equal($('summaryMeta').textContent,'3 paneles · 210 mm de alto');
assert.equal($('compensation-settings').hidden,true);
click('quadBtn');
click('gateBtn');
click('download-back');
assert.equal(downloads.at(-1).name,'JD-cuadriptico-ventana-cara-B.svg');

input('measure','1');
assert.equal($('copy-summary').disabled,true);
input('measure','135');
assert.equal($('copy-summary').disabled,false);
assert.equal($('action-feedback').textContent,'');

dom.window.close();
console.log('OK: leaflet export integration, file variants, height / bleed validation and change recovery.');
