---
id: regular-and-orderly
title: Ordenado y constante
dek: Por qué las partes más aburridas de mi semana son la razón de que pase el trabajo interesante, y qué tiene que ver eso con la arquitectura.
date: 2026-11-21
tags: [habits, architecture, focus]
toc: true
draft: true
---
Este es un artículo de ejemplo mientras se construye el blog. El artículo real viene en camino. Mientras tanto, esta página muestra cómo se ve un artículo, con todo tipo de contenido que puede tener.

## Texto y listas {#texto}

Un párrafo se lee como este, con [un enlace](/es/blog/), algunas **palabras en negrita** y un poco de `código en línea`.

- Un elemento de la lista.
- Otro elemento.
- Un tercero.

> “Sea constante y ordenado en su vida, para que pueda ser violento y original en su trabajo.”
>
> — Gustave Flaubert

## Código {#codigo}

Un bloque de código tiene una etiqueta y un botón para copiar:

```yaml title="_content/posts/en/regular-and-orderly.md" {3}
# _content/posts/en/regular-and-orderly.md: the Spanish twin shares its id
---
id: regular-and-orderly
title: Regular and orderly
date: 2026-11-21
tags: [habits, architecture, focus]
draft: true
---
```

Uno corto, sin etiqueta:

```sh bare
node scripts/build-blog.mjs   # fails if a live post has no twin
git push                      # GitHub Pages publishes it
```

::: pullquote
Una cita destacada se ve así, en grande entre dos líneas.
:::

## Figuras y tablas {#figuras}

<figure class="wide"><svg viewBox="0 0 832 200" role="img" aria-label="Borrador, luego los dos idiomas escritos, luego publicado" style="display:block;width:100%;height:auto"><g font-family="var(--md-ref-typeface-plain)" font-size="18" text-anchor="middle"><rect x="16" y="60" width="200" height="80" rx="12" fill="none" stroke="var(--md-sys-color-outline)" stroke-width="2"/><text x="116" y="106" fill="var(--md-sys-color-on-surface)">Borrador</text><rect x="316" y="60" width="200" height="80" rx="12" fill="none" stroke="var(--md-sys-color-tertiary)" stroke-width="2"/><text x="416" y="106" fill="var(--md-sys-color-on-surface)">EN + ES escritos</text><rect x="616" y="60" width="200" height="80" rx="12" fill="none" stroke="var(--md-sys-color-primary)" stroke-width="2"/><text x="716" y="106" fill="var(--md-sys-color-on-surface)">Publicado</text><path d="M224 100h84M524 100h84" stroke="var(--md-sys-color-on-surface-variant)" stroke-width="2"/><path d="M300 92l8 8-8 8M600 92l8 8-8 8" fill="none" stroke="var(--md-sys-color-on-surface-variant)" stroke-width="2"/></g></svg><figcaption>Un diagrama de ejemplo.</figcaption></figure>

| Columna | Columna | Columna |
| --- | --- | --- |
| Ejemplo | Sí | Los dos idiomas |
| Ejemplo | Sí | Los dos idiomas |
| Ejemplo | No | No |

---

Una oración con una nota al pie.[^1]

[^1]: Una nota al pie de ejemplo.
