(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const api = window.JDFolletos;
  if (!api) return;

  const fmt = n => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(n);
  const readState = () => {
    const kind = $('quadBtn').getAttribute('aria-pressed') === 'true' ? 'quad' : 'tri';
    const mode = $('openBtn').getAttribute('aria-pressed') === 'true' ? 'open' : 'closed';
    const fold = $('accordionBtn').getAttribute('aria-pressed') === 'true'
      ? 'accordion' : $('gateBtn').getAttribute('aria-pressed') === 'true' ? 'gate' : 'roll';
    const direction = $('spanishBtn').getAttribute('aria-pressed') === 'true' ? 'ltr' : 'rtl';
    const width = Number($('measure').value);
    const height = Number($('height').value);
    const bleed = Number($('bleed').value);
    const compensation = Number($('compensation').value);
    const heightValid = $('height').value.trim() !== '' && Number.isFinite(height) && height >= 10 && height <= 1500;
    const bleedValid = $('bleed').value.trim() !== '' && Number.isFinite(bleed) && bleed >= 0 && bleed <= 10;
    $('height').setAttribute('aria-invalid', String(!heightValid));
    $('bleed').setAttribute('aria-invalid', String(!bleedValid));
    $('height-error').hidden = heightValid;
    $('bleed-error').hidden = bleedValid;
    $('summaryMeta').textContent = (kind === 'tri' ? '3' : '4') + ' paneles · ' + (heightValid ? fmt(height) + ' mm de alto' : 'revisar alto');
    try {
      if (!$('measure').value.trim() || !heightValid || !bleedValid) return null;
      const layout = api.buildLayout(kind, mode, width, { fold, direction, compensation });
      return { ...layout, kind, fold, direction, height, bleed, compensation };
    } catch (_) {
      return null;
    }
  };
  const buttons = [$('copy-summary'), $('download-front'), $('download-back')];
  const report = message => { $('action-feedback').textContent = message; };
  function refresh() {
    const state = readState();
    for (const button of buttons) button.disabled = !state;
    if (!state) report('Revisá las medidas para habilitar la copia y las descargas.');
    else if ($('action-feedback').textContent.startsWith('Revisá')) report('');
  }
  function specifications(state) {
    const foldNames = { roll: 'Envolvente', accordion: state.kind === 'tri' ? 'Z / acordeón' : 'Acordeón', gate: 'Ventana cerrada' };
    const face = (title, panels, guides) => [
      title + ' (de izquierda a derecha):',
      ...panels.map(p => 'Panel ' + p.physical + ' · ' + p.label + ' · ' + fmt(p.width) + ' mm'),
      'Guías desde el borde izquierdo de corte: ' + guides.map(fmt).join(' / ') + ' mm'
    ];
    return [
      'JUDAICA DESIGN® · GUÍA DE PLEGADO',
      'Folleto: ' + (state.kind === 'tri' ? 'Tríptico' : 'Cuadríptico') + ' · ' + foldNames[state.fold],
      'Lectura: ' + (state.direction === 'rtl' ? 'Hebreo (derecha a izquierda)' : 'Español (izquierda a derecha)'),
      'Medida abierta (corte): ' + fmt(state.openWidth) + ' × ' + fmt(state.height) + ' mm',
      'Ancho cerrado de tapa: ' + fmt(state.x) + ' mm',
      'Demasía para SVG: ' + fmt(state.bleed) + ' mm por lado',
      'Reducción de solapas: ' + (state.fold === 'accordion' ? 'No aplica' : fmt(state.compensation) + ' mm'),
      '',
      ...face('CARA A', state.front, state.frontGuides),
      '',
      ...face('CARA B', state.back, state.backGuides),
      '',
      'Guía orientativa; confirmar plegado y tolerancias con imprenta. No es arte final.'
    ].join('\n');
  }
  async function copySpecs() {
    const state = readState();
    if (!state) return refresh();
    const value = specifications(state);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const box = document.createElement('textarea');
        box.value = value;
        box.style.position = 'fixed';
        box.style.top = '-1000px';
        document.body.append(box);
        box.focus(); box.select();
        const success = document.execCommand('copy');
        box.remove();
        if (!success) throw new Error('El navegador bloqueó la copia.');
      }
      report('Medidas y distribución de las dos caras copiadas.');
    } catch (_) {
      report('No se pudo copiar automáticamente. Probá desde un navegador actualizado.');
    }
  }

  const esc = text => String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  const precise = n => Number(n.toFixed(5));
  function generateSvg(state, side) {
    const isFront = side === 'front';
    const panels = isFront ? state.front : state.back;
    const guides = isFront ? state.frontGuides : state.backGuides;
    const b = state.bleed, w = state.openWidth, h = state.height;
    const totalWidth = precise(w + 2*b), totalHeight = precise(h + 2*b);
    const trimX = precise(b), trimY = precise(b);
    const foldColor = '#876d46', ink = '#244c4d';
    let x = b;
    const rects = [], labels = [];
    panels.forEach((p) => {
      const width = precise(p.width);
      const fill = p.flap ? '#fbf2e3' : p.role === 'front' ? '#dce9e4' : p.role === 'back' ? '#f2e9d9' : '#f3f6f1';
      rects.push('<rect x="'+precise(x)+'" y="'+trimY+'" width="'+width+'" height="'+precise(h)+'" fill="'+fill+'"/>');
      const center = precise(x + width/2);
      if (h >= 30 && width >= 23) {
        const size = Math.min(3.8, Math.max(2.1, width/11));
        labels.push('<text x="'+center+'" y="'+precise(b + h*.42)+'" text-anchor="middle" fill="'+ink+'" font-family="Arial, sans-serif" font-size="'+precise(size)+'" font-weight="700">'+esc(p.label)+'</text>');
        labels.push('<text x="'+center+'" y="'+precise(b + h*.42 + 6)+'" text-anchor="middle" fill="'+ink+'" font-family="Arial, sans-serif" font-size="3">'+esc(fmt(p.width))+' mm</text>');
      }
      if (h >= 14 && width >= 8) {
        labels.push('<text x="'+center+'" y="'+precise(b+Math.min(7,h*.2))+'" text-anchor="middle" fill="#627871" font-family="Arial, sans-serif" font-size="2.7">Panel '+p.physical+'</text>');
      }
      x += p.width;
    });
    const folds = guides.map(g => '<line x1="'+precise(b+g)+'" y1="'+trimY+'" x2="'+precise(b+g)+'" y2="'+precise(b+h)+'" stroke="'+foldColor+'" stroke-width=".3" stroke-dasharray="2 1.3"/>');
    return '<?xml version="1.0" encoding="UTF-8"?>\n'
      + '<svg xmlns="http://www.w3.org/2000/svg" width="'+totalWidth+'mm" height="'+totalHeight+'mm" viewBox="0 0 '+totalWidth+' '+totalHeight+'">'
      + '<title>Judaica Design - Guía de plegado - Cara '+(isFront?'A':'B')+'</title>'
      + '<desc>Guía geométrica en milímetros; no es arte final. Usar al 100% y confirmar con imprenta.</desc>'
      + '<rect width="100%" height="100%" fill="#ffffff"/>'
      + rects.join('')
      + '<rect x="'+trimX+'" y="'+trimY+'" width="'+precise(w)+'" height="'+precise(h)+'" fill="none" stroke="'+ink+'" stroke-width=".4"/>'
      + folds.join('') + labels.join('')
      + '</svg>';
  }
  function downloadSvg(side) {
    const state = readState();
    if (!state) return refresh();
    const xml = generateSvg(state, side);
    const url = URL.createObjectURL(new Blob([xml], { type:'image/svg+xml;charset=utf-8' }));
    const a = document.createElement('a');
    const fold = state.fold === 'accordion' ? 'acordeon' : state.fold === 'gate' ? 'ventana' : 'envolvente';
    a.download = 'JD-' + (state.kind === 'tri' ? 'triptico' : 'cuadriptico') + '-' + fold + '-cara-' + (side === 'front' ? 'A' : 'B') + '.svg';
    a.href = url;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    report('Guía de la cara ' + (side === 'front' ? 'A' : 'B') + ' descargada en SVG. Abrila al 100% y verificá las medidas.');
  }
  $('copy-summary').addEventListener('click', copySpecs);
  $('download-front').addEventListener('click', () => downloadSvg('front'));
  $('download-back').addEventListener('click', () => downloadSvg('back'));
  for (const input of document.querySelectorAll('button[id$="Btn"], #measure, #height, #compensation, #bleed')) {
    input.addEventListener('click', refresh);
    input.addEventListener('input', refresh);
    input.addEventListener('change', refresh);
  }
  refresh();
})();
