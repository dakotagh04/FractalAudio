# Árbol Fractal Audio-Reactivo

En este proyecto he creado un árbol fractal interactivo que reacciona al sonido del micrófono. He añadido efectos visuales que cambian dinámicamente según el audio que capta.

## Cambios Visuales y de Interactividad

El árbol fractal no es estático, sino que cambia a tiempo real según el nivel de audio que capta el micrófono. Cada trozo del fractal responde a una franja sonora diferente: las frecuencias bajas abren o cierran el ángulo de las ramas, las medias alargan o acortan lo que miden, las altas cambian los colores y el volumen general la profundidad del árbol.

Los colores cambian en tiempo real, las ramas tienen "hojas" en sus extremos que hacen que parezca más un árbol.

## Uso de IA

Para este proyecto usé DeepSeek como única asistente, que me ayudó a estructurar todo el código y a implementar tanto la parte del fractal recursivo como la del análisis de audio en tiempo real.

También me ayudó a pensar cómo mapear diferentes características del sonido a parámetros visuales del fractal, lo que acabó siendo división actual: volumen para la profundidad, bajos para el ángulo, medios para el tamaño y agudos para el color. Esto hace que el árbol responda de manera muy orgánica a la música o la voz.
