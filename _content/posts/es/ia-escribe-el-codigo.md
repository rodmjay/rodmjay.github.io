---
id: ai-writes-the-code
title: Lo que hacen los arquitectos cuando la IA escribe el código
dek: Notas sobre lo que cambia en la arquitectura de software cuando los modelos escriben buena parte del código.
date: 2026-11-21
tags: [ai, architecture, delivery]
toc: false
draft: false
---
Escucho seguido que las herramientas de IA para programar van a hacer menos necesarios a los arquitectos. El argumento es que si un modelo puede escribir el servicio, ya no hace falta alguien que decida cómo se construyen los servicios.

No estoy de acuerdo. Escoger qué construir sigue siendo igual de difícil que siempre, y echar atrás una mala decisión duele igual que siempre. Que un modelo teclee el código no cambia ninguna de las dos cosas.

## Mucho más código, muy rápido

Dele buenas herramientas de IA a un equipo y lo primero que se nota es el volumen. Los pull requests son más grandes y llegan más rápido, y un prototipo que antes tomaba una semana puede quedar listo en una tarde. Sin dirección, ese volumen se acumula hasta volverse un desorden. Un modelo escribe sin problema una quinta forma de llamar a la misma API, y si usted lo deja, se inventa su propio formato de error. Cada PR puede verse razonable cuando usted lo revisa, y después de unos meses de PRs así nadie sabe explicar cómo encaja el sistema. Por eso quiero que personas y modelos sigan los mismos patrones.

Un modelo copia lo que encuentra en el repositorio. En un repositorio con cinco estilos que compiten entre sí, toma el que le toque ver. Los ingenieros nuevos siempre han aprendido el sistema a partir de un buen servicio de referencia, y los modelos aprenden de él de la misma manera. Así que el trabajo aburrido de mantener bibliotecas compartidas y servicios de referencia, junto con una estructura de proyecto consistente, le da a un modelo una de las mejores guías que puede recibir.

Los registros de decisiones escritos ayudan por la misma razón. Si alguien dejó por escrito por qué las cosas están hechas así, un modelo lo puede leer. Puede que el ingeniero que tomó la decisión se haya ido hace dos años.

## La revisión no da abasto

Cuando el código llega más rápido, se acumula esperando revisión humana. Yo movería los controles más temprano en el proceso y los automatizaría.

- Revise cada cambio dentro del flujo de entrega en busca de dependencias riesgosas, secretos expuestos y patrones de código débiles conocidos. Una auditoría trimestral es demasiado lenta para este volumen.
- Trate las pruebas como el contrato. Si un comportamiento importa, tiene su prueba, y una vez que la tiene, no me importa mucho si el código lo escribió una persona o un modelo.
- Automatice los despliegues para que publicar sea rutina y revertir sea fácil.
- Mantenga límites claros entre servicios para que un error en un lugar se quede ahí.

Con eso en su lugar, los revisores pueden dedicar su tiempo a preguntas que las máquinas todavía responden mal, como si de verdad conviene construir esto y si encaja con hacia dónde va el sistema.

## Lo que todavía necesita a una persona

Sigue haciendo falta alguien que entienda el negocio lo suficiente para saber para qué es el sistema. Esa persona pesa el costo contra la velocidad y la flexibilidad contra la simplicidad. Planea para lo que vamos a necesitar dentro de cinco años y también para hoy. Logra que los equipos jalen para el mismo lado, y dice que no cuando hace falta. Los arquitectos siempre han hecho este trabajo.

Si su equipo está empezando a usar estas herramientas, yo empezaría por estas cuatro cosas.

1. Limpie un servicio de referencia y conviértalo en el ejemplo del que parten todos, modelos incluidos.
2. Escriba sus diez decisiones más grandes como registros de decisiones cortos.
3. Pase un control manual al flujo de entrega este mes.
4. Mida lo que sale a producción y si funciona.

Llevo unos 21 años construyendo software, y este es el cambio más grande que he visto en la forma de hacerlo. Los equipos con una arquitectura desordenada van a sentir los problemas antes.
