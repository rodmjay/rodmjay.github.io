---
id: dark-factory-living-spec
title: "La fábrica oscura: la especificación como documento vivo"
dek: Los requisitos viven en fuentes versionadas, la especificación se compone a partir de ellas y los agentes construyen solo el diff.
date: 2026-11-27
tags: [architecture, ai]
cover: /blog/media/dark-factory-living-spec.jpg
cover_alt: Una fábrica estilizada que brilla en un valle de montaña de noche, con su luz reflejada en un lago en calma.
toc: false
draft: false
---
Una fábrica oscura trabaja con las luces apagadas. Las máquinas construyen y nadie camina por el piso de la planta. En software, el programa de control es la especificación, así que la especificación tiene que estar viva.

Así la operaría yo. Los requisitos viven en fuentes. Cuando se aprueba un cambio, la especificación se recompone como una versión nueva. Los agentes construyen entonces la diferencia entre las dos versiones. Las personas escriben requisitos y revisan cambios.

![Fuentes tipadas de requisitos (producto, estándares, seguridad) componen una especificación versionada; un agente construye el diff entre versiones, y cualquier origen puede ser una fuente si habla un contrato MCP pequeño: listar, obtener una versión, comparar dos versiones.](/blog/media/dark-factory-diagram.png "El ciclo: requisitos adentro, especificación y diff afuera.")

## La especificación se genera

Todo equipo tiene una especificación que fue cierta alguna vez. Se desactualizó porque mantenerla al día no era tarea de nadie cuando había una entrega encima. Sigo una regla sencilla: si un dato se puede calcular desde su origen, se calcula. La especificación es la composición de los requisitos que valen hoy, así que yo escribo los requisitos y genero la especificación.

## Fuentes

Una fuente guarda un tipo de requisito y tiene un solo responsable. El producto va en una fuente, la seguridad en otra, y el diseño, el rendimiento y el costo tienen cada uno la suya. El responsable aprueba los cambios de su fuente, lo que resuelve dónde va cada requisito.

Hoy una fuente es un repositorio o una carpeta dentro de uno. Los estándares compartidos viven en su propio repositorio y alimentan a varios espacios de trabajo, con versión fija como una biblioteca compartida. Un espacio de trabajo enumera las fuentes que compone y la versión de cada una. Pasar a una versión nueva le muestra primero el diff.

## Los agentes construyen el diff

Cuando se aprueba un cambio, la especificación pasa a la versión 2, luego a la 3, y las anteriores se conservan. Así "qué cambió" tiene una respuesta exacta. Un agente que recibe la especificación completa la relee toda y a veces rehace trabajo terminado. Uno que recibe el diff recibe una tarea pequeña con una lista: agregar estos requisitos, cambiar este, quitar aquel. Cada elemento trae su identificador y su motivo, y por eso el agente sabe qué prueba escribir.

## MCP convierte cualquier origen en fuente

Un repositorio es una buena primera fuente. Cualquier origen puede sumarse si responde tres preguntas: cuáles son sus requisitos, en qué versión, y qué cambió entre dos versiones. Si esas respuestas se sirven por MCP, con puntos de acceso conocidos y un esquema compartido, una tabla de Postgres, un sistema de tickets, una herramienta de diseño o un registro de cumplimiento pueden funcionar como fuentes. El espacio de trabajo los compone sin saber qué hay detrás de cada uno.

Los requisitos ya viven en una docena de sistemas. Con este contrato se componen donde están y no hace falta copiarlos a un documento que se desfasa. Mantenga el contrato en esas tres llamadas: listar, obtener una versión, comparar dos versiones.

## Siga el identificador

Cada requisito recibe un identificador al nacer. No cambia nunca y no se reutiliza, y enlaza todo lo que viene después.

Póngalo donde cada herramienta pueda buscarlo:

- Rama: `req/PROD-142-export-csv`, para que el identificador exista antes del primer commit.
- Issue y pull request: el identificador en el título y una etiqueta `req:PROD-142`.
- Commit: un trailer, `Requirement: PROD-142`, agregado como se agrega una firma de aprobación (sign-off).
- Prueba: una etiqueta con el identificador que verifica.

Una sola búsqueda devuelve entonces todo el rastro. `git log --grep "Requirement: PROD-142"` lista los cambios, la etiqueta lista los issues y pull requests, y la etiqueta de la prueba lista la evidencia.

Se puede leer desde cualquiera de los dos extremos. Desde un requisito se llega al código. Desde una línea de código se llega con blame a un commit, se lee su trailer y se llega al requisito y su motivo. La cobertura queda como una pregunta sobre requisitos: ¿qué identificadores de este release tienen un cambio integrado y una prueba que pasa?

CI lo hace cumplir para que nadie tenga que acordarse. Todo pull request lleva un identificador real de la especificación fija, o dice `Maintenance:` con un motivo. Todo requisito del diff necesita un cambio integrado y una prueba etiquetada antes de que la versión se dé por terminada, o la compilación falla.

Los casos límite necesitan reglas. Una división da identificadores nuevos a los hijos y marca al padre como reemplazado. Una fusión conserva un identificador y los demás apuntan a él. Un pull request que toca varios requisitos los enumera todos, y una lista larga significa que el pull request es demasiado grande. El código antiguo no tiene identificadores, así que se empieza en la versión actual y se etiqueta lo que se toca. El rastro se calcula a partir de trailers, etiquetas e informes de pruebas, igual que la especificación, y no se guarda en una tabla.

## Empiece esta semana

1. Elija un producto y tres fuentes con responsables distintos: el producto, un estándar compartido y la seguridad. Use la menor cantidad de fuentes que tengan aprobadores distintos, y deje que la aprobación sea el merge que su equipo ya hace.
2. Ponga cada una en un repositorio y fije una versión en el espacio de trabajo.
3. Componga la especificación al compilar y deje la salida sin editar.
4. En el siguiente cambio, genere el diff y entréguele al agente solo eso, con el identificador y el motivo de cada requisito.
5. Dé a cada requisito un identificador permanente en la rama, el título del pull request, el trailer del commit y la etiqueta de la prueba, y agregue la verificación de CI descrita arriba.
6. Cuando un segundo sistema guarde requisitos que usted copia a mano, ponga el contrato MCP por delante y conviértalo también en fuente.
