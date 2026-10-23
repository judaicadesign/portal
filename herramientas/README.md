# Herramientas de Judaica Design

Sitio público independiente: calculadora de paneles en `folletos/`, revisión en `pdf/` e imposición en `cuadernillo/`. No incluye portal, cotizador comercial, reglas de precios ni configuración de Supabase.

## Calculadora de folletos · armado del archivo

Calcula anchos y guías; no calcula precios ni envía cotizaciones.
Lectura hebrea (por defecto) y española; tríptico/cuadríptico envolvente,
Z/acordeón, y ventana cerrada de cuatro paneles. Muestra ambas caras.

## Convenciones contrastadas

Cada cara se ve de izquierda a derecha, con el texto derecho. El reverso
invierte los paneles físicos: el panel 1 de A está a la derecha de B.
La lectura española invierte el esquema hebreo entero en cada cara;
no se cambia solo el texto de la tapa. Los números de panel identifican
posiciones físicas desde la izquierda de A, no orden de lectura.

Distribuciones para lectura española, de izquierda a derecha:

| Plegado | Cara A | Cara B |
| --- | --- | --- |
| Envolvente, 3 | Solapa / Contratapa / Tapa | Interior de tapa / Interior de contratapa / Interior de solapa |
| Envolvente, 4 | Solapa 2 / Solapa 1 / Contratapa / Tapa | Interiores correspondientes, en orden físico inverso |
| Z, 3 | Interiores / Tapa al extremo derecho | Interiores / Contratapa al extremo derecho |
| Acordeón, 4 | Contratapa / Interior / Interior / Tapa | Interiores de los cuatro paneles |
| Ventana cerrada, 4 | Puerta / Contratapa / Tapa / Puerta | Interiores de los cuatro paneles |

La diferencia entre Z de 3 y acordeón de 4 no se puede resolver solo
cambiando etiquetas del envolvente. Con tres paneles las tapas están en
caras opuestas; con cuatro están en los extremos de la misma cara.

Ventana significa aquí **closed gate / doble puerta con cierre central**:
puertas hacia el centro y después cierre al medio. No representa ventana
abierta sin el cierre central (que tiene otra medida cerrada y otra tapa).

## Medidas

X es el ancho cerrado; d es la reducción editable de imprenta (2 mm por
defecto, orientativos). En orientación hebrea:

- Envolvente 3: X / X / X−d; abierto = 3X−d.
- Envolvente 4: X / X / X−d / X−2d; abierto = 4X−3d.
- Acordeón: todos X; abierto = nX, sin reducción.
- Ventana cerrada 4: X−d / X / X / X−d; abierto = 4X−2d.

El reverso usa los anchos físicos en orden inverso. Guías acumuladas desde
el borde izquierdo del corte, sin demasía. Medidas visibles redondeadas a
2 decimales, cálculos sin redondeo intermedio. La tolerancia se confirma
con imprenta según papel, hendido y plastificado.

## Fuentes primarias consultadas

- Hopkins Printing, tablas envolvente y ventana (paneles centrales tapa y contratapa):
  https://www.hopkinsprinting.com/folding/
- PrintPapa, tríptico Z con ambas caras:
  https://www.printpapatrade.com/templates/BROCHURE/8.5%20x%2011%20Z-Fold/trade_8.5%20x%2011%20Z_Fold.pdf
- Printgraphics, cuadríptico acordeón 8pp:
  https://printgraphics.com.au/wp-content/uploads/2019/01/8pp-DL-Z-Fold.pdf
- CMYK Colour Online, posiciones de tapas para Z de 6pp y 8pp:
  https://www.cmykonline.com.au/help-centre/product-information/folding-information/
- Printing for Less, diferencia ventana abierta/cerrada:
  https://www.printingforless.com/template/brochure-templates/

La inversión para lectura hebrea es una adaptación geométrica de estas
plantillas occidentales, manteniendo la convención hebrea preexistente.
No se copian recursos gráficos de las imprentas.

## Verificación

`npm test`: medidas, fórmulas inversas, ubicaciones explícitas de tapas,
inversión de ambas caras, correspondencia física y guías del reverso,
compensaciones y estados inválidos.

## Armado de cuadernillos

La herramienta aplica la rotación interna del PDF conservando texto y vectores. Permite elegir lectura hebrea/española, un giro adicional de 90°, 180° o 270°, y hoja automática, horizontal o vertical. El esquema y la vista previa señalan el pliegue y el abrochado central sin dibujar grampas sobre el archivo descargable. Las instrucciones de doble faz se ajustan a la geometría; el PDF ya está impuesto y no debe volver a imponerse desde la impresora.

`npm test` también comprueba todas las combinaciones de giros, RTL/LTR, referencias a recursos PDF, cajas de corte/demasía y cambios de opciones que invalidan la descarga anterior.
