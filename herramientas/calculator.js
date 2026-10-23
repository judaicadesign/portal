/* Panel positions refer to the printed sheet, viewed upright on each face.
 * Hebrew is the reference orientation; Spanish mirrors each complete face.
 * Back-face physical panels are ALWAYS reversed, independently of reading.
 * See README.md for printer templates and the accordion parity rule.
 */
(() => {
  'use strict';
  function settings(kind, options = {}) {
    const { fold = 'roll', direction = 'rtl', compensation = 2 } = options;
    if (!['tri', 'quad'].includes(kind) || !['roll', 'accordion', 'gate'].includes(fold) || !['rtl', 'ltr'].includes(direction)) throw new Error('Elegí un tipo, plegado y lectura válidos.');
    if (fold === 'gate' && kind !== 'quad') throw new Error('El plegado ventana con cierre central necesita cuatro paneles.');
    if (typeof compensation !== 'number' || !Number.isFinite(compensation) || compensation < 0 || compensation > 10) throw new Error('La reducción de solapas debe estar entre 0 y 10 mm.');
    return { fold, direction, compensation };
  }
  function calculate(kind, mode, entered, options = {}) {
    const { fold, direction, compensation: d } = settings(kind, options);
    if (!['closed', 'open'].includes(mode)) throw new Error('Elegí un tipo y una medida válidos.');
    if (typeof entered !== 'number' || !Number.isFinite(entered) || entered <= 0) throw new Error('Ingresá una medida válida.');
    const count = kind === 'tri' ? 3 : 4;
    const deductions = fold === 'accordion' ? Array(count).fill(0) : fold === 'gate' ? [d, 0, 0, d] : kind === 'tri' ? [0, 0, d] : [0, 0, d, 2 * d];
    const deduction = deductions.reduce((a, b) => a + b, 0);
    const x = mode === 'closed' ? entered : (entered + deduction) / count;
    const panels = deductions.map(n => x - n);
    if (direction === 'ltr') panels.reverse();
    const openWidth = panels.reduce((a, b) => a + b, 0);
    if (!Number.isFinite(openWidth) || panels.some(n => !Number.isFinite(n) || n <= 0)) throw new Error('La medida es demasiado pequeña para aplicar esta compensación.');
    return { x, panels, openWidth };
  }
  function buildLayout(kind, mode, entered, options = {}) {
    const config = settings(kind, options), result = calculate(kind, mode, entered, config);
    const { fold, direction } = config, tri = kind === 'tri';
    const item = (role, label, reverseLabel, flap = false) => ({ role, label, reverseLabel, flap });
    let faces;
    if (fold === 'roll') {
      faces = [item('front', 'Tapa', 'Interior de tapa'), item('back', 'Contratapa', 'Interior de contratapa'), ...(tri ? [item('flap', 'Solapa interna', 'Interior de solapa', true)] : [item('flap', '1.ª solapa interna', 'Interior de 1.ª solapa', true), item('flap', '2.ª solapa interna', 'Interior de 2.ª solapa', true)])];
    } else if (fold === 'gate') {
      faces = [item('flap', 'Puerta de tapa', 'Interior de puerta de tapa', true), item('front', 'Tapa', 'Interior de tapa'), item('back', 'Contratapa', 'Interior de contratapa'), item('flap', 'Puerta de contratapa', 'Interior de puerta de contratapa', true)];
    } else {
      faces = tri
        ? [item('front', 'Tapa', 'Interior de tapa'), item('inside', 'Interior · cara A', 'Interior · cara B'), item('inside', 'Interior de contratapa', 'Contratapa')]
        : [item('front', 'Tapa', 'Interior de tapa'), item('inside', 'Interior · cara A', 'Interior · cara B'), item('inside', 'Interior · cara A', 'Interior · cara B'), item('back', 'Contratapa', 'Interior de contratapa')];
    }
    if (direction === 'ltr') faces.reverse();
    const front = faces.map((f, i) => ({ physical: i + 1, role: f.role, label: f.label, flap: f.flap, width: result.panels[i] }));
    const back = faces.map((f, i) => ({ physical: i + 1, role: f.reverseLabel === 'Contratapa' ? 'back' : 'inside', label: f.reverseLabel, flap: f.flap, width: result.panels[i] })).reverse();
    const guides = panels => { let x = 0; return panels.slice(0, -1).map(p => (x += p.width)); };
    return { ...result, front, back, frontGuides: guides(front), backGuides: guides(back) };
  }
  if (typeof window !== 'undefined') window.JDFolletos = Object.freeze({ calculate, buildLayout });
  if (typeof module !== 'undefined') module.exports = { calculate, buildLayout };
  if (typeof document === 'undefined') return;
  const $ = id => document.getElementById(id);
  const fmt = n => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(n);
  let kind = 'quad', mode = 'closed', fold = 'roll', direction = 'rtl';
  const options = () => ({ fold, direction, compensation: Number($('compensation').value) });
  function current() { return buildLayout(kind, mode, Number($('measure').value), options()); }
  function setMode(next) {
    let result; try { result = current(); } catch (_) {}
    mode = next;
    if (result) $('measure').value = mode === 'closed' ? result.x : result.openWidth;
    update();
  }
  function setKind(next) {
    let x; try { x = current().x; } catch (_) {}
    kind = next;
    const reset = kind === 'tri' && fold === 'gate';
    if (reset) fold = 'roll';
    if (x) $('measure').value = mode === 'closed' ? x : calculate(kind, 'closed', x, options()).openWidth;
    update();
    $('selection-status').textContent = reset ? 'Se seleccionó envolvente: ventana con cierre central solo está disponible para cuadrípticos.' : '';
  }
  function setFold(next) { if (kind === 'tri' && next === 'gate') return; fold = next; $('selection-status').textContent = ''; update(); }
  function draw(id, panels, x) {
    const root = $(id); root.replaceChildren(); root.style.gridTemplateColumns = panels.map(p => p.width + 'fr').join(' ');
    for (const p of panels) {
      const panel = document.createElement('div'); panel.className = 'panel ' + p.role + (p.flap ? ' flap' : ''); panel.dataset.physical = p.physical; panel.dataset.role = p.role;
      const delta = x - p.width, rule = Math.abs(delta) < 1e-8 ? 'X' : 'X − ' + fmt(delta) + ' mm';
      for (const [className, text] of [['panel-id', 'Panel ' + p.physical], ['panel-name', p.label], ['panel-value', fmt(p.width) + ' mm'], ['panel-rule', rule]]) {
        const line = document.createElement('div'); line.className = className; line.textContent = text; panel.append(line);
      }
      root.append(panel);
    }
  }
  function update() {
    const tri = kind === 'tri', accordion = fold === 'accordion';
    for (const [id, active] of [['closedBtn',mode==='closed'],['openBtn',mode==='open'],['triBtn',tri],['quadBtn',!tri],['hebrewBtn',direction==='rtl'],['spanishBtn',direction==='ltr'],['rollBtn',fold==='roll'],['accordionBtn',accordion],['gateBtn',fold==='gate']]) {
      $(id).classList.toggle('active', active); $(id).setAttribute('aria-pressed', String(active));
    }
    $('gateBtn').disabled = tri; $('gate-help').hidden = !tri;
    $('accordion-name').textContent = tri ? 'Z · acordeón' : 'Acordeón · zigzag';
    $('compensation-settings').hidden = accordion;
    $('inputLabel').textContent = mode === 'closed' ? 'Ancho cerrado (tapa / contratapa)' : 'Ancho total abierto';
    $('helper').textContent = mode === 'closed' ? 'X es el ancho final de la tapa y la contratapa. Medida sin demasía.' : 'Ancho de la hoja abierta, de borde a borde de corte, sin demasía.';
    $('resultLabel').textContent = mode === 'closed' ? 'Ancho total abierto' : 'Ancho cerrado (tapa)';
    $('measure').min = '0.01';
    const reading = direction === 'rtl' ? 'Hebreo · de derecha a izquierda' : 'Español · de izquierda a derecha';
    $('orientation').textContent = reading + '. Cada cara se muestra de izquierda a derecha, tal como la ves en el archivo.';
    $('front-title').textContent = fold === 'roll' || fold === 'gate' || !tri ? 'Cara A · exterior' : 'Cara A · tapa e interiores';
    $('back-title').textContent = fold === 'roll' || fold === 'gate' || !tri ? 'Cara B · interior' : 'Cara B · contratapa e interiores';
    $('fold-description').textContent = fold === 'roll' ? 'Las solapas se enrollan hacia adentro. Se empieza por la más angosta; la tapa cierra al final.' : accordion ? 'Los pliegues alternan hacia delante y hacia atrás. Todos los paneles tienen el mismo ancho.' : 'Las dos puertas se pliegan hacia el centro; después, el folleto se cierra al medio como un libro. Es ventana cerrada o doble puerta con cierre central.';
    $('layout-tip').textContent = accordion ? (tri ? 'En el tríptico Z, tapa y contratapa van en caras opuestas. No uses la distribución del tríptico envolvente.' : 'En el cuadríptico acordeón, tapa y contratapa van en los extremos de la cara A.') : fold === 'gate' ? 'En ventana cerrada, tapa y contratapa son los dos paneles centrales de la cara A. Las puertas son los paneles extremos, más angostos.' : 'Tapa y contratapa quedan juntas en la cara A. Las solapas más angostas se pliegan dentro.';
    $('note').textContent = accordion ? 'Acordeón: paneles iguales, sin reducción de solapas.' : 'Reducción usada: ' + fmt(Number($('compensation').value)) + ' mm' + (fold === 'gate' ? ' en cada puerta.' : tri ? ' en la solapa interna.' : ' por paso: X / X / X − d / X − 2d.');
    $('note').textContent += ' Las guías se miden desde el borde izquierdo de corte de cada cara. El esquema no incluye demasía. Confirmá la tolerancia con la imprenta según papel, plastificado e hendido.';
    let result;
    try { result = current(); } catch (e) {
      $('error').textContent = e.message; $('error').style.display = 'block'; $('measure').setAttribute('aria-invalid','true');
      $('mainResult').textContent = '—'; $('formula').textContent = 'Ingresá una medida válida para calcular.'; $('closedChip').textContent = 'Cerrado: —';
      for (const id of ['diagram','diagram-back','guides-front','guides-back']) $(id).replaceChildren();
      return;
    }
    $('error').style.display = 'none'; $('measure').removeAttribute('aria-invalid');
    draw('diagram', result.front, result.x); draw('diagram-back', result.back, result.x);
    $('guides-front').textContent = 'Guías desde la izquierda: ' + result.frontGuides.map(fmt).join(' / ') + ' mm.';
    $('guides-back').textContent = 'Guías desde la izquierda: ' + result.backGuides.map(fmt).join(' / ') + ' mm.';
    $('formula').textContent = result.panels.map(fmt).join(' + ') + ' = ' + fmt(result.openWidth) + ' mm';
    $('closedChip').textContent = 'Cerrado: ' + fmt(result.x) + ' mm';
    $('mainResult').textContent = fmt(mode==='closed' ? result.openWidth : result.x) + ' mm';
  }
  for (const [id, next] of [['closedBtn','closed'],['openBtn','open']]) $(id).addEventListener('click', () => setMode(next));
  for (const [id, next] of [['triBtn','tri'],['quadBtn','quad']]) $(id).addEventListener('click', () => setKind(next));
  for (const [id, next] of [['rollBtn','roll'],['accordionBtn','accordion'],['gateBtn','gate']]) $(id).addEventListener('click', () => setFold(next));
  for (const [id, next] of [['hebrewBtn','rtl'],['spanishBtn','ltr']]) $(id).addEventListener('click', () => { direction = next; update(); });
  for (const id of ['measure','compensation']) { $(id).addEventListener('input', update); $(id).addEventListener('change', update); }
  update();
})();
