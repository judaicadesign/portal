const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),P=require('pdf-lib'),core=require('../pdf/print-pdf.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<.02,`${a} != ${b}`);
function references(doc){const seen=new Set();function walk(obj){if(obj instanceof P.PDFRef){const key=obj.toString();if(seen.has(key))return;seen.add(key);const value=doc.context.lookup(obj);assert.ok(value,'Missing embedded PDF resource '+key);walk(value);}else if(obj instanceof P.PDFDict){for(const [,v]of obj.entries())walk(v);}else if(obj instanceof P.PDFArray){for(const v of obj.asArray())walk(v);}else if(obj?.dict instanceof P.PDFDict)walk(obj.dict);}walk(doc.catalog);}
async function fixture(rotation=0,w=100,h=160,count=8){const d=await P.PDFDocument.create();for(let i=1;i<=count;i++){const p=d.addPage([w,h]);p.setRotation(P.degrees(rotation));p.drawText('PAGE '+i,{x:10,y:h-25,size:12});p.drawRectangle({x:10,y:10,width:12,height:20,color:P.rgb(1,0,0)});}return d.save();}
(async()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'jd-booklet-'));const bytes=await fixture();
 for(const direction of ['ltr','rtl'])for(const rotation of [0,90,180,270])for(const sheetOrientation of ['auto','landscape','portrait']){
  const result=await core.prepare(bytes,{booklet:true,direction,pageRotation:rotation,sheetOrientation});const d=await core.load(result.bytes);references(d);const p=d.getPage(0),w=rotation%180?160:100,h=rotation%180?100:160;
  assert.deepEqual(result.plan[0].pages,direction==='ltr'?[8,1]:[1,8]);assert.deepEqual(result.plan[1].pages,direction==='ltr'?[2,7]:[7,2]);
  assert.equal(d.getPageCount(),4);assert.equal(d.getPages().every(p=>p.getRotation().angle===0),true);near(p.getWidth()*p.getHeight(),2*w*h);
  if(sheetOrientation==='portrait')assert.ok(p.getHeight()>=p.getWidth());if(sheetOrientation==='landscape')assert.ok(p.getWidth()>=p.getHeight());
  near(p.getWidth(),result.layout.width);near(p.getHeight(),result.layout.height);
  fs.writeFileSync(path.join(out,`${direction}-${rotation}-${sheetOrientation}.pdf`),result.bytes);
 }
 for(const rotation of [90,180,270]){
  const source=await fixture(rotation),info=core.inspect(await core.load(source));near(info.pages[0].viewTrim.width,rotation%180?160:100);
  const result=await core.prepare(source,{booklet:true,direction:'ltr'}),d=await core.load(result.bytes);references(d);assert.equal(result.info.normalizedRotations,8);assert.equal(d.getPages().every(p=>p.getRotation().angle===0),true);
  near(d.getPage(0).getWidth(),rotation%180?320:200);near(d.getPage(0).getHeight(),rotation%180?100:160);
  fs.writeFileSync(path.join(out,'metadata-'+rotation+'.pdf'),result.bytes);
  const flat=await core.prepare(source,{});const flatDoc=await core.load(flat.bytes);near(flatDoc.getPage(0).getWidth(),rotation%180?160:100);
 }
 const mixed=await P.PDFDocument.create();const a=mixed.addPage([100,160]);a.drawText('upright');const b=mixed.addPage([160,100]);b.setRotation(P.degrees(90));b.drawText('turned');assert.equal(core.inspect(mixed).mixed,false);await core.prepare(await mixed.save(),{booklet:true});
 const narrow=await core.prepare(await fixture(0,50,160,4),{booklet:true});assert.equal(narrow.layout.duplexEdge,'long');
 const standard=await core.prepare(bytes,{booklet:true});assert.equal(standard.layout.duplexEdge,'short');
 const blank=await core.prepare(await fixture(0,100,160,6),{booklet:true});assert.deepEqual(blank.plan[0].pages,[1,null]);
 await assert.rejects(()=>core.prepare(bytes,{booklet:true,pageRotation:45}),/giro/);await assert.rejects(()=>core.prepare(bytes,{booklet:true,sheetOrientation:'invalid'}),/Orientación/);
 const bleedDoc=await P.PDFDocument.create();for(let i=0;i<4;i++){const p=bleedDoc.addPage([140,200]);p.setTrimBox(10,20,100,160);p.setBleedBox(5,15,110,170);p.drawText('TRIM '+i,{x:20,y:80,size:14});p.setRotation(P.degrees(90));}
 const br=await core.prepare(await bleedDoc.save(),{booklet:true,bleedMM:1,marks:true,pageRotation:270,sheetOrientation:'portrait'});const bd=await core.load(br.bytes);references(bd);near(bd.getPage(0).getTrimBox().width,160);near(bd.getPage(0).getTrimBox().height,200);
 fs.writeFileSync(path.join(out,'bleed-marks.pdf'),br.bytes);
 console.log('PASS booklet: RTL/LTR, all page/sheet rotations, internal PDF rotations, mixed storage orientations, trim/bleed boxes, duplex guidance and blank padding.');console.log('FIXTURES '+out);
})().catch(e=>{console.error(e);process.exit(1)});
