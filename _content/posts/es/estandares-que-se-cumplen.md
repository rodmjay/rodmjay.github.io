---
id: standards-that-stick
title: Estándares que perduraron
dek: Los estándares míos que duraron fueron bibliotecas y código base que la gente podía instalar o copiar.
date: 2026-11-21
tags: [architecture, standards, leadership]
toc: false
draft: false
---
La mayoría de los estándares que he escrito terminaron ignorados. Unos pocos se volvieron la norma sin que nadie tuviera que pedir que se usaran.

Alguien con experiencia escribe una página larga en la wiki sobre el registro de eventos, los nombres y la forma en que los servicios deben comunicarse entre sí. Se aprueba en una reunión y nadie la vuelve a abrir. Seguir la página implica trabajo extra, y quien tiene una fecha de entrega encima deja de lado el trabajo extra.

## Código que la gente podía instalar o copiar

Cada estándar mío que se mantuvo era algo que la gente podía instalar o copiar.

Cuando trabajé con el grupo de Ingeniería de Confiabilidad de Sitios (SRE) de Microsoft, el problema era el registro de eventos. Cada servicio lo hacía un poco distinto, así que seguir una solicitud de un servicio a otro era lento y engorroso. Por eso construí una biblioteca de registro. Bastaba con agregarla al servicio para registrar de la forma correcta casi sin esfuerzo. Los equipos la adoptaron porque les ahorraba escribir la suya, y con el tiempo se volvió el estándar del departamento.

Hice lo mismo con una arquitectura de referencia para microservicios. Construí una, funcionando y documentada, y los servicios que vinieron después se armaron a partir de ella. Los equipos podían verla en marcha y copiarla, así que se difundió sin que yo tuviera que insistir mucho.

En Solution Stream fue una base de código compartida en .NET. Los proyectos nuevos arrancaban desde ahí, así que todos empezaban con la misma estructura y las mismas correcciones de errores, y se mantenían consistentes.

Viéndolo ahora, los que duraron tenían otras cosas en común. Fijaban reglas firmes para lo aburrido, como el registro de eventos, los nombres y la estructura del proyecto, y el equipo dueño de cada problema tomaba sus propias decisiones de diseño.

También eran fáciles de cambiar. Yo aceptaba pull requests, y cuando un equipo encontraba una mejor forma, la incorporaba para que todos la recibieran. Cada uno tenía un responsable que lo arreglaba cuando se rompía.

Todavía escribo muchos documentos. Los que vuelvo a consultar dejan registrado por qué elegimos una base de datos, o a qué renunciamos para llegar ahí. Para eso sirven los registros de decisiones de arquitectura (ADR), y rinden años después, cuando alguien pregunta por qué el sistema está hecho como está. Mantengo los ADR y las bibliotecas compartidas lado a lado. El ADR guarda el razonamiento, y los equipos usan la biblioteca en el día a día.

Un año después reviso si los equipos siguen usando un estándar. Los equipos siguen usando la biblioteca de registro.
