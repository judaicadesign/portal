const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {calculate} = require('../calculator.js');
assert.deepEqual(calculate('tri','closed',100),{x:100,panels:[100,100,98],openWidth:298});
assert.deepEqual(calculate('tri','open',298),{x:100,panels:[100,100,98],openWidth:298});
assert.deepEqual(calculate('quad','closed',135),{x:135,panels:[135,135,133,131],openWidth:534});
assert.deepEqual(calculate('quad','open',534),{x:135,panels:[135,135,133,131],openWidth:534});
for(const kind of ['tri','quad'])for(const x of [50,75,100,100.5,135,190]) {
  const result=calculate(kind,'closed',x);
  assert.ok(Math.abs(result.panels.reduce((a,b)=>a+b,0)-result.openWidth)<1e-9);
  assert.ok(Math.abs(calculate(kind,'open',result.openWidth).x-x)<1e-9);
}
for(const value of [0,-1,NaN,Infinity,'100',undefined])assert.throws(()=>calculate('tri','closed',value));
assert.throws(()=>calculate('tri','closed',2));
assert.throws(()=>calculate('tri','open',4));
assert.throws(()=>calculate('quad','closed',4));
assert.throws(()=>calculate('quad','open',10));
console.log('Tríptico, cuadríptico, cálculo inverso, decimales y valores inválidos: OK');

// Cover locations from printer templates, before mirroring to Hebrew.
const {buildLayout} = require('../calculator.js');
const roleMap = layout => [layout.front.map(p=>p.role),layout.back.map(p=>p.role)];
assert.deepEqual(roleMap(buildLayout('tri','closed',100,{fold:'accordion',direction:'ltr'})),[['inside','inside','front'],['inside','inside','back']]);
assert.deepEqual(roleMap(buildLayout('quad','closed',100,{fold:'accordion',direction:'ltr'})),[['back','inside','inside','front'],['inside','inside','inside','inside']]);
assert.deepEqual(roleMap(buildLayout('quad','closed',100,{fold:'gate',direction:'ltr'})),[['flap','back','front','flap'],['inside','inside','inside','inside']]);
assert.deepEqual(buildLayout('quad','closed',135,{fold:'gate'}).panels,[133,135,135,133]);
assert.equal(calculate('quad','open',536,{fold:'gate'}).x,135);
assert.deepEqual(calculate('quad','closed',100,{fold:'accordion'}).panels,[100,100,100,100]);
assert.deepEqual(calculate('tri','open',300,{fold:'accordion'}).panels,[100,100,100]);
for(const kind of ['tri','quad'])for(const fold of ['roll','accordion','gate']) {
  if(kind==='tri'&&fold==='gate')continue;
  for(const compensation of [0,1,2,3.2])for(const x of [50,100,100.125,135]) {
    const he=buildLayout(kind,'closed',x,{fold,compensation}),es=buildLayout(kind,'closed',x,{fold,compensation,direction:'ltr'});
    assert.deepEqual(es.panels,[...he.panels].reverse());
    for(const face of ['front','back']) {
      assert.deepEqual(es[face].map(p=>p.label),he[face].map(p=>p.label).reverse(),'Spanish mirrors complete panel identities');
      assert.deepEqual(es[face].map(p=>p.width),he[face].map(p=>p.width).reverse());
    }
    for(const l of [he,es]) {
      assert.equal(l.front.filter(p=>p.role==='front').length+l.back.filter(p=>p.role==='front').length,1);
      assert.equal(l.front.filter(p=>p.role==='back').length+l.back.filter(p=>p.role==='back').length,1);
      assert.deepEqual(l.back.map(p=>p.physical),l.front.map(p=>p.physical).reverse(),'Correct duplex pairing');
      for(const p of l.front)assert.equal(l.back.find(b=>b.physical===p.physical).width,p.width);
      assert.ok(Math.abs(l.front.reduce((s,p)=>s+p.width,0)-l.openWidth)<1e-9);
      assert.ok(Math.abs(calculate(kind,'open',l.openWidth,{fold,compensation}).x-x)<1e-9);
      assert.equal(l.frontGuides.length,(kind==='tri'?2:3));
      for(let i=0;i<l.frontGuides.length;i++)assert.ok(Math.abs(l.frontGuides[i]+l.backGuides.at(-i-1)-l.openWidth)<1e-9,'Duplex fold guides align');
    }
  }
}
assert.throws(()=>calculate('tri','closed',100,{fold:'gate'}),/cuatro paneles/);
for(const options of [{fold:'invalid'},{direction:'invalid'},{compensation:-1},{compensation:NaN},{compensation:Infinity},{compensation:11}])assert.throws(()=>calculate('quad','closed',100,options));
assert.deepEqual(buildLayout('quad','closed',135).front.map(p=>p.label),['Tapa','Contratapa','1.ª solapa interna','2.ª solapa interna']);
assert.deepEqual(buildLayout('quad','closed',135).frontGuides,[135,270,403]);
assert.deepEqual(buildLayout('quad','closed',135).backGuides,[131,264,399]);
console.log('OK: printer cover maps, Hebrew/Spanish mirrors, all fold/size combinations, inverse calculations, physical duplex pairing, fold guides and invalid options.');
