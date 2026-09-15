# Carousel Assembler

Aplicación web estática para ordenar imágenes y exportarlas como una única tira horizontal. Todo el procesamiento se realiza localmente en el navegador: las imágenes no se suben a ningún servidor.

## Uso

1. Abre `index.html` directamente en un navegador moderno.
2. Añade varias imágenes desde el selector o arrastrándolas al área de carga.
3. Ordénalas arrastrando o con los botones de flecha y configura tamaño, ajuste, fondo y formato.
4. Opcionalmente, sube un logo PNG/SVG y configura la numeración de los slides.
5. Revisa el resultado y exporta la tira horizontal o cada slide final por separado.

También se puede servir como sitio estático, por ejemplo:

```bash
python3 -m http.server 8000
```

Después, abre `http://localhost:8000`.

## Funciones

- Carga múltiple de PNG, JPG, WEBP y otros formatos de imagen compatibles con el navegador.
- Reordenación mediante drag and drop y controles grandes aptos para móvil.
- Tamaños 1080 × 1350, 1080 × 1440, 1080 × 1920 o personalizados.
- Ajuste `cover` o `contain`, con fondo negro, blanco o transparente.
- Exportación PNG o JPG con calidad ajustable.
- Logo PNG o SVG con alcance, posición, tamaño, margen y opacidad configurables.
- Numeración personalizable, con cuatro formatos, seis posiciones y fondo opcional.
- Exportación de la tira horizontal y de slides PNG individuales (`slide-01.png`, `slide-02.png`, etc.).
- Vista previa desplazable que incluye imagen, logo y numeración, resumen de dimensiones y advertencia para lienzos grandes.

## Compatibilidad y límites

No necesita instalación, compilación, frameworks ni dependencias externas. Por este motivo, la descarga de slides individuales no se agrupa en un ZIP. Algunos navegadores pueden pedir permiso para descargar varios archivos.

Los límites máximos de ancho, alto y memoria de un lienzo varían entre navegadores y dispositivos; para carruseles muy largos, reduce el tamaño de cada slide o exporta menos imágenes a la vez.
