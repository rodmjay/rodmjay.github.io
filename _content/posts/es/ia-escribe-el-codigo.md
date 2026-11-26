---
id: ai-writes-the-code
title: Con la IA escribiendo el código, la arquitectura importa más
dek: El código se abarató. Decidir qué construir, no.
date: 2026-11-21
tags: [ai, architecture, delivery]
toc: false
draft: false
---
Escucho seguido que las herramientas de IA para programar van a hacer menos necesarios a los arquitectos. La idea es que si un modelo puede escribir el servicio, ya no hace falta alguien que decida cómo se construyen los servicios.

No creo que sea así. Lo que se abarató fue teclear. Escoger qué construir sigue siendo igual de difícil, y echar atrás una mala decisión sigue doliendo lo mismo.

## Mucho más código, muy rápido

Dele buenas herramientas de IA a un equipo y lo primero que se nota es el volumen. Los pull requests son más grandes y llegan más seguido. Un prototipo que antes tomaba una semana ahora sale en una tarde.

Sin dirección, todo ese volumen solo lo lleva más rápido a un desorden. Un modelo le escribe sin problema una quinta forma de llamar a la misma API. Si lo deja, se inventa su propio formato de error. Cada PR se ve bien por separado, y unos meses después nadie sabe explicar cómo encaja el sistema. Por eso todos, personas y modelos, tienen que seguir los mismos patrones.

En una base de código limpia, con patrones claros, lo que escribe un modelo encaja sin esfuerzo. Si le da un repositorio con cinco estilos distintos, va a tomar el primero que vea. Por eso el trabajo aburrido (bibliotecas compartidas, servicios de referencia, una estructura de proyecto consistente) termina siendo casi la mejor instrucción que le puede dar a un modelo. Los ingenieros nuevos siempre han aprendido el sistema a partir de un buen servicio de referencia, y ahora los modelos también.

Los registros de decisiones importan más por lo mismo. Un modelo no puede ir a preguntarle al ingeniero que se fue hace dos años por qué las cosas están hechas así. Si alguien dejó el razonamiento por escrito, el modelo lo puede leer.

## La revisión no da abasto

Cuando el código llega más rápido, se acumula en la revisión humana. La solución es mover los controles más temprano y automatizarlos.

- Revise dependencias, secretos y patrones débiles conocidos en cada cambio, dentro del flujo de entrega. No lo deje para una auditoría trimestral.
- Las pruebas son el contrato. Si un comportamiento importa, tiene su prueba. Así ya no me importa mucho si el código lo escribió una persona o un modelo.
- Los despliegues tienen que ser automáticos y aburridos, para que publicar sea rutina y revertir sea fácil.
- Los límites claros entre servicios evitan que un error en un lugar se riegue a todo lo demás.

Con eso en su lugar, los revisores pueden dedicar su tiempo a lo que las máquinas todavía juzgan mal, como si de verdad conviene construir esto y si encaja con hacia dónde va el sistema.

## Lo que la IA no toca

Sigue haciendo falta alguien que entienda el negocio lo suficiente para saber para qué es el sistema. Esa persona pesa el costo contra la velocidad y la flexibilidad contra la simplicidad, piensa en lo que vamos a necesitar en cinco años y no solo ahora, logra que los equipos jalen para el mismo lado y dice que no cuando hace falta. Nada de eso es nuevo.

Si su equipo está empezando a usar estas herramientas, esto es lo que yo haría primero.

1. Limpie un servicio de referencia y conviértalo en el ejemplo del que parten todos, modelos incluidos.
2. Escriba sus diez decisiones más importantes como registros de decisiones cortos.
3. Pase un control manual al flujo de entrega este mes.
4. Mida lo que sale a producción y si funciona, no las líneas de código.

Llevo unos 21 años construyendo software, y este es el cambio más grande que he visto en la forma de hacerlo. Si su arquitectura es un desorden, simplemente se va a dar cuenta más rápido.
