---
id: standards-that-stick
title: Estándares que se cumplen
dek: La mayoría de los estándares de ingeniería mueren en una wiki. Los que se quedan son código que la gente quiere usar. Esto fue lo que marcó la diferencia.
date: 2026-11-21
tags: [architecture, standards, leadership]
toc: false
draft: false
---
He escrito estándares de ingeniería que nadie siguió. También he creado algunos que se volvieron la norma sin que nadie tuviera que pedir que se usaran. La diferencia casi no tuvo que ver con la autoridad.

## La página de la wiki que muere

Usted conoce el patrón. Alguien con experiencia escribe una página larga: cómo registramos eventos, cómo nombramos las cosas, cómo se comunican los servicios. Hay una reunión y una ronda de aprobación. Después, nadie la usa.

No porque los ingenieros sean tercos. Porque seguirla cuesta algo, e ignorarla no cuesta nada. La página le pide a la gente trabajo extra con una fecha de entrega encima, y la fecha de entrega siempre gana.

Un estándar que depende de que todos se acuerden de seguirlo es un deseo.

## Que lo correcto sea lo fácil

Los estándares que se quedaron tenían algo en común: eran código, no documentos.

Cuando trabajé con el grupo de Ingeniería de Confiabilidad de Sitios (SRE) de Microsoft, el problema era el registro de eventos. Cada servicio lo hacía un poco distinto, así que seguir una solicitud entre servicios era lento y doloroso. En lugar de escribir una guía de registro, construí una biblioteca. Se agregaba al servicio, y el servicio registraba bien casi sin esfuerzo.

Se volvió el estándar del departamento. Nadie lo ordenó. Simplemente era menos trabajo que hacerlo uno mismo.

Pasó lo mismo con una arquitectura de referencia para microservicios. No describí cómo debía verse un buen servicio. Construí uno, funcionando y documentado, y se volvió el modelo de los servicios que vinieron después. Los ingenieros copian lo que funciona. Hay que darles algo que valga la pena copiar.

En Solution Stream fue una base de código compartida en .NET. Cada proyecto nuevo empezaba desde ella, así que cada proyecto tenía la misma estructura, los mismos patrones y las mismas correcciones desde el primer día. La consistencia no era una regla que alguien tuviera que vigilar. Era el punto de partida.

## Qué hace que un estándar se quede

Mirando atrás, esto fue lo que importó:

1. **Ahorra tiempo desde el primer día.** Si adoptar el estándar es más lento que ignorarlo, la gente lo va a ignorar. Empiece por el atajo.
2. **Solo opina sobre lo aburrido.** Estandarice el registro, la estructura, el despliegue y los nombres. Deje las decisiones de diseño interesantes al equipo dueño del problema.
3. **Hay un ejemplo que funciona.** Un servicio real bien construido enseña más que cualquier documento.
4. **Es fácil de cambiar.** Un estándar que no se puede mejorar se vuelve una pelea. Acepte contribuciones. Cuando un equipo encuentra una mejor forma, inclúyala para que todos la reciban.
5. **Alguien es su dueño.** El código compartido sin dueño se pudre. Asígnele un responsable y una forma de reportar problemas.

## Donde los documentos sí ayudan

No estoy en contra de escribir. Escribo mucho. Lo útil es registrar el *porqué*: por qué elegimos esta base de datos, por qué los servicios se comunican así, a qué renunciamos. Para eso sirve un registro de decisiones de arquitectura, y vale la pena años después, cuando alguien pregunta «¿por qué está hecho así?».

El documento explica la decisión. El código la ejecuta. Si solo tiene el documento, tiene un estándar en papel. Si tiene el código, tiene un estándar en producción.

## La prueba de verdad

Así juzgo si un estándar funcionó: un año después, ¿alguien sigue hablando de él?

Los mejores desaparecen. Ya nadie discute la biblioteca de registro. Solo la usan, y dedican su energía al trabajo que de verdad los necesita.
