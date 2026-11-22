---
id: ai-writes-the-code
title: Cuando la IA escribe el código, la arquitectura importa más
dek: La IA abarató escribir código. No abarató decidir qué construir, y por eso la arquitectura importa más ahora, no menos.
date: 2026-11-21
tags: [ai, architecture, delivery]
toc: false
draft: false
---
Una predicción común dice que las herramientas de IA para programar harán menos necesarios a los arquitectos. Si un modelo puede escribir el servicio, ¿para qué se necesita a alguien que decida cómo deben construirse los servicios?

Creo que es al revés. La IA abarató escribir código. No abarató decidir qué construir, y no hizo más barato deshacer una mala decisión.

## Más código, más rápido, en más direcciones

Dele buenas herramientas de IA a un equipo y lo primero que notará es el volumen. Los cambios llegan más grandes y más rápido. Los prototipos que tomaban una semana toman una tarde.

Eso es real, y es bueno. Pero el volumen sin dirección es solo una forma más rápida de construir un desorden. Un modelo escribirá con gusto una quinta forma de llamar a la misma API, inventará un formato de error un poco distinto o traerá una biblioteca que nadie más usa. Cada pieza se ve bien por sí sola. Juntas forman un sistema que nadie puede entender.

Mientras más rápido se produce el código, más importa que todos, personas y modelos, construyan hacia la misma forma.

## Los patrones son la instrucción

Esto es lo que he visto que funciona: los modelos copian lo que tienen enfrente. Apunte una herramienta de IA a una base de código limpia con patrones claros y escribirá código que encaja. Apúntela a una base de código con cinco estilos que compiten entre sí y escogerá uno al azar.

Así que el trabajo de arquitectura de siempre, bibliotecas compartidas, servicios de referencia, estructura consistente, resulta ser la mejor instrucción que puede escribir. Una buena implementación de referencia antes enseñaba a los ingenieros nuevos. Ahora también enseña a cada modelo que trabaja en el repositorio.

Los registros de decisiones también importan más. Un modelo no puede preguntarle a la persona que se fue hace dos años por qué el sistema está hecho así. Si el razonamiento está escrito, lo puede leer.

## Las barreras automáticas ganan a la revisión

Cuando el código llega más rápido, la revisión humana se vuelve el cuello de botella. No se arregla pidiendo a los revisores que lean más rápido. Se arregla moviendo los controles antes y haciéndolos automáticos:

- **Controles de seguridad en el flujo de entrega,** no en una auditoría trimestral. Revise dependencias, secretos y patrones débiles conocidos en cada cambio.
- **Las pruebas como contrato.** Si el comportamiento importa, tiene una prueba. Entonces no importa quién, o qué, escribió el código.
- **Despliegues automáticos y aburridos,** para que publicar sea rutina y revertir sea fácil.
- **Límites claros entre servicios,** para que un error en un lugar se quede en ese lugar.

Así los revisores dedican su tiempo a las preguntas que las máquinas no responden bien: ¿es esto lo correcto para construir, y encaja con hacia dónde va el sistema?

## Lo que no cambia

Hay cosas que la IA no toca.

Alguien todavía tiene que entender el negocio lo suficiente para saber para qué es el sistema. Alguien tiene que sopesar las concesiones: costo contra velocidad, flexibilidad contra simplicidad, hoy contra dentro de cinco años. Alguien tiene que lograr que equipos distintos jalen en la misma dirección. Y alguien tiene que decir que no.

Ese siempre fue el trabajo. Las herramientas solo lo hicieron más evidente.

## Por dónde empezaría

Si su equipo está adoptando herramientas de IA para programar, esto es lo que yo haría primero:

1. **Limpie un servicio de referencia** y vuélvalo el ejemplo del que parten todos, personas y modelos.
2. **Escriba sus diez decisiones principales** como registros de decisiones cortos.
3. **Mueva un control manual al flujo de entrega** este mes.
4. **Mida lo que sale a producción, no las líneas escritas.** Las líneas de código nunca fueron lo importante.

La IA es el cambio más grande que he visto en 21 años en la forma de construir software. Premia a los equipos con buena arquitectura y castiga a los que no la tienen, más rápido que nunca.
