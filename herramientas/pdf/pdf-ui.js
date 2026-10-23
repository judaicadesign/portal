(function(){
 'use strict';
 const $=id=>document.getElementById(id),core=()=>window.JDPrintPDF;
 const bookletMode=document.body.dataset.pdfMode==='booklet'||new URLSearchParams(location.search).get('modo')==='cuadernillo';
 let source=null,name='',info=null,originalDoc=null,resultDoc=null,view='original',page=1,outputURL=null,busy=false,renderTask=null,renderVersion=0,resultLayout=null;
 let enginePromise,markResults=[],marksAnalyzed=false;
 function engine(){return enginePromise||(enginePromise=import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/legacy/build/pdf.min.mjs').then(p=>{p.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/legacy/build/pdf.worker.min.mjs';return p;}).catch(e=>{enginePromise=null;throw e;}));}
 async function previewDoc(bytes){const p=await engine();return p.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,cMapUrl:'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/cmaps/',cMapPacked:true,standardFontDataUrl:'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/standard_fonts/',wasmUrl:'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/wasm/'}).promise;}
 function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
 const mm=v=>(v/core().MM).toLocaleString('es-AR',{maximumFractionDigits:2});
 function lock(value){busy=value;$('options').disabled=value;$('pdf-file').disabled=value;$('generate').disabled=value||(bookletMode&&(!info||info.count<2));$('generate').textContent=value?'Preparando…':bookletMode?'Armar cuadernillo y ver resultado':'Preparar PDF y abrir vista previa';}
 function invalidate(){
  resultLayout=null;
  $('result-summary').hidden=true;$('plan-details').hidden=true;$('view-result').disabled=true;$('view-result').textContent='Resultado pendiente';$('checked-preview').checked=false;$('download').removeAttribute('href');$('download').classList.add('disabled');$('download').setAttribute('aria-disabled','true');
  if(outputURL){URL.revokeObjectURL(outputURL);outputURL=null;}
  if(view==='result'){view='original';page=1;render();}if(resultDoc){resultDoc.destroy();resultDoc=null;}
 }
 function go(id){const el=$(id);for(let parent=el?.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;el?.scrollIntoView?.({behavior:'smooth',block:'start'});if(el){el.setAttribute('tabindex','-1');el.focus({preventScroll:true});}}
 if(bookletMode){
  document.body.dataset.pdfMode='booklet';document.title='Ordenar páginas para doblar · Judaica Design';
  document.querySelector('.intro h1').textContent='Ordenar páginas para doblar';
  document.querySelector('.intro>p:last-child').textContent='Convertí las páginas de tu librito o revista en hojas listas para imprimir doble faz, doblar al medio y abrochar. Elegí apertura hebrea o española.';
  document.querySelector('.intro .eyebrow').textContent='LIBRITOS Y REVISTAS · ARMADO PARA IMPRIMIR';
  document.querySelector('.upload strong').textContent='Elegí el PDF con las páginas en orden de lectura';
  const extra=document.createElement('details'),summary=document.createElement('summary');extra.id='extra-options';extra.className='extra-options';summary.textContent='Ajustes opcionales: marcas, demasía y numeración';extra.append(summary,$('review-section'),$('corrections-section'));$('options').prepend($('output-section'));$('options').append(extra);
  $('output-section').querySelector('h2').textContent='Armá tu cuadernillo';$('output-section').querySelector('.eyebrow').textContent='01 · ORDEN DE IMPRESIÓN';
  $('other-tool').innerHTML='¿Solo necesitás revisar medidas o marcas? <a href="../pdf/">Abrir revisión de PDF →</a>';
  $('single-page-note').textContent='Para armar un cuadernillo necesitás al menos dos páginas. Este PDF tiene una sola. Usá Revisar mi PDF para preparar una hoja suelta.';
  $('fold-section').hidden=true;$('booklet').checked=true;
  const steps=document.querySelector('.steps');steps.replaceChildren();for(const [id,text] of [['output-section','① Armar cuadernillo'],['corrections-section','Ajustes opcionales'],['preview-section','② Vista previa']]){const b=document.createElement('button');b.type='button';b.dataset.go=id;b.textContent=text;steps.append(b);}
 }
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
 function updateFill(){
  const mode=$('fill').value;$('color-label').hidden=mode!=='color';$('page-colors').hidden=mode!=='page-colors';
  $('fill-help').textContent=mode==='none'?'No agrega fondo. Si pedís más demasía de la que tiene el PDF, te vamos a pedir que elijas cómo completarla. Con 0 mm podés agregar marcas sin inventar fondo.':mode==='white'?'Agrega blanco en la franja exterior de todas las páginas. Elegilo si todos sus bordes son blancos.':mode==='color'?'Agrega el color elegido en la franja exterior de todas las páginas. No cambia el diseño interior.':'Elegí el color del borde de cada página: podés combinar páginas blancas y páginas de color. No extiende fotos ni ilustraciones.';
 }
 function trimSize(){return $('custom-trim').checked?{width:Number($('trim-width').value),height:Number($('trim-height').value)}:undefined;}
 function finding(title,text,action,fn,warn=false){const div=document.createElement('div');div.className='finding'+(warn?' warn':'');const strong=document.createElement('strong'),p=document.createElement('p');strong.textContent=title;p.textContent=text;div.append(strong,p);if(action){const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=action;button.onclick=()=>{if(busy)return;invalidate();fn();updateFill();updateFolds();status('Opción seleccionada. Prepará el PDF para ver el cambio.');};div.append(button);}$('findings').append(div);}
 function review(){
  if(!source)return;info=core().inspect(source.doc,trimSize());$('findings').replaceChildren();
  const first=info.pages[0];finding(info.count+(info.count===1?' página':' páginas'),mm(first.viewTrim.width)+' × '+mm(first.viewTrim.height)+' mm'+(info.mixed?' · Hay medidas diferentes.':' · Medida final uniforme.'),null,null,info.mixed);
  finding(info.hasThreeMM?'Demasía identificada: al menos 3 mm':'No se identifica una demasía de 3 mm',info.hasThreeMM?'Las cajas del PDF dejan espacio suficiente. Revisá visualmente que el fondo se prolongue hasta el borde.':'Las cajas del PDF no identifican 3 mm por lado en todas las páginas. Eso no prueba que no haya demasía dibujada: si la medida de corte no está definida, indicála antes de corregir.',info.hasThreeMM?null:'Elegir cómo completar',()=>{$('bleed').value=3;go('corrections-section');$('fill').focus({preventScroll:true});},!info.hasThreeMM);
  const checked=markResults.length===info.count&&!markResults.some(m=>m.status==='not-checked'),detected=markResults.filter(m=>m.status==='detected').length,possible=markResults.filter(m=>m.status==='possible').length;
  if(checked&&detected===info.count)finding('Marcas de corte vectoriales identificadas','Se encontró el patrón de ocho marcas alineadas con el corte en '+detected+(detected===1?' página.':' páginas.')+' Se conservan si no pedís reconstruirlas. La detección es orientativa.');
  else if(checked&&(detected||possible))finding('Marcas de corte detectadas en parte del archivo',detected+' páginas con el patrón completo y '+possible+' con posibles marcas. Revisá las otras páginas antes de reconstruir.',null,null,true);
  else finding(checked?'No pudimos detectar marcas de corte':marksAnalyzed?'No pudimos comprobar las marcas de corte':'Marcas de corte por revisar',checked?'Son las pequeñas líneas que indican dónde cortar el papel. Podrían estar dibujadas como imagen y no ser detectables. Revisá la vista previa antes de agregar otras.':'Comprobá las marcas respecto de la medida final elegida. Si el análisis no se puede completar, revisá el original visualmente.',checked?'Agregar marcas de corte':'Analizar marcas',checked?()=>{$('marks').checked=true;go('corrections-section');}:reanalyzeMarks,checked||marksAnalyzed);
  $('booklet-control').hidden=true;$('single-page-note').hidden=info.count>=2;$('booklet').disabled=bookletMode||info.count<2;if(info.count<2)$('booklet').checked=false;
  $('direction-label').hidden=info.count<2||(!$('booklet').checked&&!$('numbering').checked);
  if(info.rotated)finding('Orientación del PDF reconocida','Al preparar el archivo se aplicará su rotación interna automáticamente, conservando el contenido vectorial. Podés elegir un giro adicional en el armado del cuadernillo.');
  $('page-dimensions').replaceChildren();for(const p of info.pages){const row=document.createElement('tr');for(const text of [p.number,mm(p.viewTrim.width)+' × '+mm(p.viewTrim.height)+' mm',mm(Math.min(...Object.values(p.available)))+' mm']){const td=document.createElement('td');td.textContent=text;row.append(td);}$('page-dimensions').append(row);}
  $('booklet-note').textContent=info.blankPages?'Se agregarán '+info.blankPages+' páginas en blanco al final para completar el múltiplo de 4.':'La cantidad de páginas ya es múltiplo de 4.';
 }
 async function scanMarks(){
  markResults=[];const p=await engine();
  for(let i=0;i<info.count;i++){
   try{const page=await originalDoc.getPage(i+1),list=await page.getOperatorList();markResults.push(window.JDPDFMarks.detect(list,p.OPS,info.pages[i].trim));}
   catch{markResults.push({status:'not-checked',count:0});}
   if(i%10===0){status('Revisando marcas: '+(i+1)+' / '+info.count+' páginas…');await new Promise(r=>setTimeout(r,0));}
  }marksAnalyzed=true;
 }
 async function reanalyzeMarks(){lock(true);try{await scanMarks();review();status('Análisis de marcas actualizado.');}catch(e){status(e.message,true);}finally{lock(false);}}
 function foldSettings(){return $('fold-type').value==='none'?null:{panels:Number($('fold-type').value),style:$('fold-style').value,insetMM:Number($('fold-inset').value),positions:$('fold-custom').value,flap:$('fold-flap').value,mirrorBack:$('fold-mirror').checked};}
 function updateFolds(){
  updateBooklet();
  const settings=foldSettings();$('fold-options').hidden=!settings;$('booklet-note').hidden=!$('booklet').checked;$('duplex-note').hidden=!$('booklet').checked;$('direction-label').hidden=!info||info.count<2||(!$('booklet').checked&&!$('numbering').checked);
  $('fold-inset-label').hidden=$('fold-style').value!=='roll';$('fold-flap-label').hidden=$('fold-style').value!=='roll';$('fold-custom-label').hidden=$('fold-style').value!=='custom';
  const roll=$('fold-style').querySelector('[value="roll"]');roll.disabled=$('fold-type').value!=='3';
  if(settings&&info){try{const pos=core().foldPositions(info.pages[0].trim.width/core().MM,settings);$('fold-plan').textContent='Frente: '+pos.map(n=>n.toLocaleString('es-AR',{maximumFractionDigits:2})+' mm').join(' / ')+'.'+(settings.mirrorBack?' Dorso: posiciones reflejadas.':'');}catch(e){$('fold-plan').textContent=e.message;}}
 }
 function bookletOptions(){return{pageRotation:$('page-rotation').value,sheetOrientation:$('sheet-orientation').value,direction:$('direction').value,bleedMM:Number($('bleed').value),marks:$('marks').checked};}
 function printAdvice(layout){return 'Imprimí al 100 %, una página del PDF por cara y doble faz: volteo por borde '+(layout.duplexEdge==='short'?'corto':'largo')+'. No vuelvas a activar «Folleto» en la impresora: el archivo ya está ordenado. Si tu impresora abrocha, elegí abrochado al centro sobre el pliegue. Probá una hoja antes de imprimir la tirada. No incluye compensación por espesor ni división en cuadernillos.';}
 function updateBooklet(){
  const enabled=!!info&&info.count>1&&$('booklet').checked;
  $('booklet-orientation').hidden=!enabled;if(!enabled)return;
  try{
   const layout=core().bookletLayout(info,bookletOptions()),pair=core().bookletPlan(info.count,$('direction').value)[0].pages,sheet=$('booklet-sheet');
   sheet.style.aspectRatio=layout.width+'/'+layout.height;sheet.classList.toggle('turned',layout.sheetRotation===90);
   $('booklet-first-page').textContent=pair[0]===null?'En blanco':pair[0]===1?'1 · Tapa':'Página '+pair[0];
   $('booklet-second-page').textContent=pair[1]===null?'En blanco':pair[1]===1?'1 · Tapa':'Página '+pair[1];
   sheet.querySelectorAll('.page-up').forEach(el=>el.style.transform='rotate('+((layout.pageRotation+layout.sheetRotation)%360)+'deg)');
   const direction=$('direction').value==='rtl'?'derecha (lectura hebrea)':'izquierda (lectura española)',axis=layout.spineAxis==='vertical'?'vertical':'horizontal';
   $('binding-help').textContent='Lomo del libro: '+direction+'. En esta hoja, el pliegue y el abrochado van por el centro '+axis+'. Papel: '+mm(layout.width)+' × '+mm(layout.height)+' mm.';
   sheet.setAttribute('aria-label','Primera hoja: '+$('booklet-first-page').textContent+' y '+$('booklet-second-page').textContent+'. Pliegue y abrochado por el centro '+axis+'.');
   $('duplex-note').textContent=printAdvice(layout);
  }catch(e){$('binding-help').textContent=e.message;}
 }
 function previewSpine(){
  const wrap=$('canvas-wrap');wrap.classList.toggle('show-spine',view==='result'&&!!resultLayout);wrap.classList.toggle('spine-horizontal',resultLayout?.spineAxis==='horizontal');
 }
 async function render(){
  const version=++renderVersion,doc=view==='result'?resultDoc:originalDoc;previewSpine();
  if(renderTask){renderTask.cancel();try{await renderTask.promise;}catch{}renderTask=null;}
  if(!doc)return;page=Math.max(1,Math.min(page,doc.numPages));$('page-label').textContent=page+' / '+doc.numPages;$('previous').disabled=page===1;$('next').disabled=page===doc.numPages;
  $('preview-title').textContent=view==='result'?'PDF preparado':'Archivo original';$('view-original').setAttribute('aria-pressed',view==='original');$('view-result').setAttribute('aria-pressed',view==='result');$('preview-status').textContent='Cargando página…';
  try{const p=await doc.getPage(page);if(version!==renderVersion)return;const base=p.getViewport({scale:1}),scale=Math.min(2,1200/Math.max(base.width,base.height)),viewport=p.getViewport({scale}),canvas=$('pdf-preview');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);renderTask=p.render({canvasContext:canvas.getContext('2d'),viewport});await renderTask.promise;if(version===renderVersion){renderTask=null;$('preview-status').textContent=view==='result'?resultLayout?'La línea roja indica dónde doblar y abrochar al centro. Revisá el giro de frente y dorso; la guía no se imprime.':'Revisá corte, fondos y numeración. Podés recorrer todas las páginas antes de descargar.':'Vista del archivo original, antes de aplicar cambios.';}}
  catch(e){if(version===renderVersion&&e.name!=='RenderingCancelledException')$('preview-status').textContent='No se pudo mostrar esta página. Probá cargar nuevamente el archivo.';}
 }
 $('pdf-file').addEventListener('change',async e=>{
  if(busy)return;const file=e.target.files[0];if(!file)return;lock(true);status('Leyendo el PDF…');invalidate();$('editor').hidden=true;source=null;
  try{
   if(file.size>core().MAX_BYTES)throw Error('El archivo supera 200 MB. Exportá una copia más liviana.');if(file.size>75*1024*1024)status('Leyendo un archivo grande. Puede tardar; para este tamaño conviene usar una computadora.');
   const bytes=new Uint8Array(await file.arrayBuffer());if(!new TextDecoder().decode(bytes.slice(0,1024)).includes('%PDF-'))throw Error('El archivo elegido no parece ser un PDF.');
   const doc=await core().load(bytes);source={bytes,doc};name=file.name;markResults=[];marksAnalyzed=false;$('fold-type').value='none';$('fold-style').value='equal';updateFolds();
   $('page-rotation').value='auto';$('sheet-orientation').value='auto';$('custom-trim').checked=false;$('trim-width').disabled=true;$('trim-height').disabled=true;$('marks').checked=false;$('numbering').checked=false;$('number-options').hidden=true;$('booklet').checked=bookletMode;$('booklet-note').hidden=true;$('duplex-note').hidden=true;$('fill').value='none';$('color-label').hidden=true;
   review();$('page-colors').replaceChildren();for(let n=1;n<=info.count;n++){const label=document.createElement('label');label.textContent='Página '+n;const input=document.createElement('input');input.type='color';input.value='#ffffff';input.dataset.page=n;label.append(input);$('page-colors').append(label);}updateFill();$('bleed').value=info.hasThreeMM?3:0;$('trim-width').value=(info.pages[0].viewTrim.width/core().MM).toFixed(2);$('trim-height').value=(info.pages[0].viewTrim.height/core().MM).toFixed(2);$('number-to').value=info.count;$('number-from').value=1;$('number-from').max=info.count;$('number-to').max=info.count;
   if(originalDoc)await originalDoc.destroy();originalDoc=await previewDoc(bytes);view='original';page=1;$('editor').hidden=false;$('file-name').textContent=name+' · Se procesa en tu dispositivo.';await render();if(!bookletMode)await scanMarks();review();updateFolds();if(bookletMode){status(info.count<2?'Este PDF tiene una sola página. Necesitás al menos dos para armar un cuadernillo.':'PDF listo. Elegí la apertura y presioná «Armar cuadernillo y ver resultado».',info.count<2);go('output-section');}else status('Archivo revisado. Elegí las correcciones y prepará tu PDF.');
  }catch(e){source=null;status(e.message||'No pudimos abrir el archivo.',true);}finally{lock(false);}
 });
 function optionsChanged(e){if(bookletMode){$('booklet').checked=!!info&&info.count>1;$('fold-type').value='none';}invalidate();updateFill();$('number-options').hidden=!$('numbering').checked;$('booklet-note').hidden=!$('booklet').checked;$('duplex-note').hidden=!$('booklet').checked;$('trim-width').disabled=!$('custom-trim').checked;$('trim-height').disabled=!$('custom-trim').checked;$('direction-label').hidden=!info||info.count<2||(!$('booklet').checked&&!$('numbering').checked);if(e.target.id==='fold-type'&&$('fold-type').value!=='none'){$('booklet').checked=false;$('marks').checked=true;if($('fold-type').value!=='3'&&$('fold-style').value==='roll')$('fold-style').value='equal';}if(e.target.id==='booklet'&&$('booklet').checked)$('fold-type').value='none';updateFolds();if(['custom-trim','trim-width','trim-height'].includes(e.target.id)){try{markResults=[];marksAnalyzed=false;review();status('Medida final actualizada. Revisá el resultado antes de descargar.');}catch(err){status(err.message,true);}}}
 $('options').addEventListener('input',optionsChanged);$('options').addEventListener('change',optionsChanged);
 $('prepare-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!source||busy)return;if(bookletMode&&info.count<2){status('Necesitás al menos dos páginas para armar un cuadernillo.',true);go('status');return;}invalidate();lock(true);status('Preparando una copia del PDF…');
  try{
   const options={finalSize:trimSize(),marks:$('marks').checked,bleedMM:Number($('bleed').value),fill:$('fill').value,color:$('fill-color').value,booklet:bookletMode||$('booklet').checked,...bookletOptions()};
   if(options.fill==='page-colors'){options.fill='color';options.pageColors=Object.fromEntries([...$('page-colors').querySelectorAll('input')].map(el=>[el.dataset.page,el.value]));}if(foldSettings())options.folds=foldSettings();
   if($('numbering').checked)options.numbering={from:Number($('number-from').value),to:Number($('number-to').value),start:Number($('number-start').value),position:$('number-position').value,size:Number($('number-size').value),inset:Number($('number-inset').value)};
   const result=await core().prepare(source.bytes,options);resultLayout=result.layout;resultDoc=await previewDoc(result.bytes);outputURL=URL.createObjectURL(new Blob([result.bytes],{type:'application/pdf'}));$('download').href=outputURL;$('download').download=name.replace(/\.pdf$/i,'')+(options.booklet?'-folleto':'-preparado')+'.pdf';$('result-summary').hidden=false;$('view-result').disabled=false;$('view-result').textContent='Resultado listo';view='result';page=1;
   $('result-info').textContent=options.booklet?result.pageCount+' caras de impresión · '+(result.pageCount/2)+' hojas · Apertura '+(options.direction==='rtl'?'hebrea':'española')+'. Medida de papel mínima con márgenes: '+mm(result.layout.width)+' × '+mm(result.layout.height)+' mm.':result.pageCount+' páginas preparadas · Demasía: '+options.bleedMM+' mm por lado.';
   $('plan').replaceChildren();if(result.plan){for(const side of result.plan){const line=document.createElement('p');line.textContent='Hoja '+side.sheet+' · '+side.side+' · '+(result.layout.sheetRotation?'Arriba: ':'Izquierda: ')+(side.pages[0]??'blanca')+(result.layout.sheetRotation?' / Abajo: ':' / Derecha: ')+(side.pages[1]??'blanca');$('plan').append(line);}$('plan-details').hidden=false;}
   await render();go('preview-section');status('Resultado preparado. Revisalo y confirmá la revisión para descargar.');
  }catch(err){status(err.message||'No se pudo preparar este PDF.',true);go('status');}finally{lock(false);}
 });
 $('checked-preview').addEventListener('change',()=>{const enabled=$('checked-preview').checked&&!!outputURL;$('download').classList.toggle('disabled',!enabled);$('download').setAttribute('aria-disabled',!enabled);});
 $('download').addEventListener('click',e=>{if(!$('checked-preview').checked||!outputURL)e.preventDefault();});
 $('view-original').onclick=()=>{view='original';page=1;render();};$('view-result').onclick=()=>{if(resultDoc){view='result';page=1;render();}};
 $('previous').onclick=()=>{page--;render();};$('next').onclick=()=>{page++;render();};
 window.addEventListener('pagehide',()=>{if(outputURL)URL.revokeObjectURL(outputURL);});
})();
