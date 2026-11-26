---
id: standards-that-stick
title: Estándares que la gente sí usa
dek: En mi experiencia, los estándares que duraron fueron bibliotecas y código base, no páginas de wiki.
date: 2026-11-21
tags: [architecture, standards, leadership]
toc: false
draft: false
---
Casi todos los estándares que he escrito terminaron ignorados. Unos pocos se volvieron la norma sin que nadie tuviera que pedir que se usaran, y no fue por quién los aprobó.

Alguien con experiencia escribe una página larga en la wiki sobre el registro de eventos, los nombres y cómo deben comunicarse los servicios. Se aprueba en una reunión y nadie la vuelve a abrir. No es terquedad. Seguir la página es trabajo extra, y con una fecha de entrega encima, el trabajo extra es lo primero que se deja.

## Los que funcionaron eran código

Cada estándar mío que se quedó era algo que la gente podía instalar o copiar.

Cuando trabajé con el grupo de Ingeniería de Confiabilidad de Sitios (SRE) de Microsoft, el problema era el registro de eventos. Cada servicio lo hacía un poco distinto, así que seguir una solicitud de un servicio a otro era lento y engorroso. Pude haber escrito una guía de registro. En vez de eso, construí una biblioteca. Uno la agregaba a su servicio y ya estaba registrando bien casi sin esfuerzo. Se volvió el estándar del departamento sin que nadie lo ordenara, sobre todo porque daba menos trabajo que hacer uno el suyo.

Pasó lo mismo con una arquitectura de referencia para microservicios. No me puse a describir cómo debía verse un buen servicio. Construí uno, funcionando y documentado, y los servicios que vinieron después se armaron a partir de él. La gente copia lo que ya funciona, así que un ejemplo que funciona se difunde solo.

En Solution Stream fue una base de código compartida en .NET. Los proyectos nuevos arrancaban desde ahí, así que todos empezaban con la misma estructura y las mismas correcciones. Nunca tuvimos que andar vigilando la consistencia.

Viéndolo ahora, los que duraron tenían otras cosas en común. Imponían reglas en lo aburrido (el registro, los nombres, la estructura del proyecto) y dejaban las decisiones de diseño de verdad al equipo dueño del problema. Eran fáciles de cambiar. Si un estándar no se puede mejorar, la gente termina peleando contra él, así que hay que aceptar pull requests, y cuando un equipo encuentra una mejor forma, incorporarla para que todos la reciban. Y alguien tiene que hacerse cargo y arreglarlo cuando se rompe.

Todavía escribo muchos documentos. Los útiles dejan registrado por qué elegimos una base de datos, o a qué renunciamos para llegar ahí. Para eso están los registros de decisiones de arquitectura (ADR), y rinden años después, cuando alguien pregunta por qué el sistema está hecho como está. El ADR es el porqué. La biblioteca es lo que la gente de verdad usa. Hacen falta las dos cosas.

Mi prueba es si la gente sigue hablando del estándar un año después. Si ya no, funcionó. Nadie menciona la biblioteca de registro. Simplemente la usan.
