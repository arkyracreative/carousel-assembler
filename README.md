# Carousel Assembler

Aplicación web estática para ordenar imágenes y exportarlas como una única tira horizontal. Todo el procesamiento se realiza localmente en el navegador: las imágenes no se suben a ningún servidor.

## Uso

1. Abre `index.html` directamente en un navegador moderno.
2. Añade varias imágenes desde el selector o arrastrándolas al área de carga.
3. Ordénalas arrastrando o con los botones de flecha y configura tamaño, ajuste, fondo y formato.
4. Revisa el resumen y pulsa **Exportar carrusel**.

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
- Vista previa desplazable, resumen de dimensiones y advertencia para lienzos grandes.

## Compatibilidad y límites

No necesita instalación, compilación, frameworks ni dependencias externas. Los límites máximos de ancho, alto y memoria de un lienzo varían entre navegadores y dispositivos; para carruseles muy largos, reduce el tamaño de cada slide o exporta menos imágenes a la vez.
