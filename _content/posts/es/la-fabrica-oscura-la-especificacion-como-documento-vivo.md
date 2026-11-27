---
id: dark-factory-living-spec
title: "La fábrica oscura: la especificación como documento vivo"
dek: Deje de escribir especificaciones. Ponga los requisitos en sumideros versionados, componga la especificación y déle al agente solo el diff.
date: 2026-11-27
tags: [architecture, ai]
cover: /blog/media/dark-factory-living-spec.jpg
cover_alt: Una fábrica estilizada que brilla en un valle de montaña de noche, con su luz reflejada en un lago en calma.
toc: false
draft: false
---
Una fábrica oscura trabaja con las luces apagadas. Las máquinas construyen, nadie está en el taller. El programa de control es la especificación, y eso solo funciona si la especificación está viva.

Este es el modelo completo:

- Los requisitos viven en sumideros.
- Aprobar un cambio recompone la especificación en una versión nueva.
- Los agentes construyen el diff entre versiones.

Las personas no escriben la especificación ni trabajan el taller. Cuidan los requisitos. Todo lo demás se deriva.

![Sumideros tipados de requisitos (producto, estándares, seguridad) componen una especificación versionada; un agente construye el diff entre versiones, y cualquier fuente se vuelve un sumidero al hablar un contrato MCP pequeño: listar, obtener una versión, comparar dos versiones.](/blog/media/dark-factory-diagram.svg "El ciclo: requisitos adentro, especificación y diff afuera.")

## Derive la especificación, no la mantenga

Todo equipo tiene una especificación que fue cierta alguna vez. Se pudre porque mantenerla al día nunca fue la tarea de nadie en un día de entrega. Así que deje de tratar la especificación como un documento que se mantiene. Un dato que se puede calcular desde su fuente debe calcularse, y una especificación es algo que se calcula: la composición de los requisitos que son ciertos ahora. Escriba los requisitos. Genere la especificación.

## Sumideros

Un sumidero es una fuente tipada de requisitos, de una sola clase cada uno, con un solo dueño. El producto en uno, la seguridad en otro, luego diseño, rendimiento, costo. El dueño aprueba los cambios de su sumidero, así que nadie discute dónde va un requisito.

Hoy un sumidero es un repositorio, o una carpeta dentro de uno. Los estándares compartidos tienen su propio repositorio y alimentan muchos espacios de trabajo, versionados y fijados igual que una biblioteca compartida. Un espacio de trabajo declara los sumideros que compone y la versión de cada uno. Subir una versión es una decisión que le muestra el diff antes de tomarla.

## Los agentes construyen el diff

Apruebe un cambio y la especificación se recompone: versión 2, versión 3, y las anteriores se guardan. Ahora "qué cambió" tiene una respuesta exacta. Si le da a un agente la especificación entera, relee todo y rehace trabajo terminado. Si le da el diff, la tarea es pequeña y precisa: agregue estos tres requisitos, cambie este, quite aquel. Cada uno lleva su identificador y su razón, así que el agente sabe qué prueba escribir. El costo sigue el tamaño del cambio, no el del sistema.

## MCP convierte cualquier cosa en un sumidero

Los repositorios son por donde se empieza, no donde esto termina. Una fuente de requisitos tiene que responder tres preguntas: cuáles son sus requisitos, en qué versión, y qué cambió entre dos versiones. Defina eso como un contrato pequeño y sírvalo sobre MCP, y la fuente deja de importar. Un repositorio, una tabla de Postgres, un sistema de tickets, una herramienta de diseño, un registro de cumplimiento: cada uno se vuelve un sumidero en cuanto habla el contrato. Endpoints bien conocidos, un solo esquema compartido, versiones y diffs en una forma fija. El espacio de trabajo los compone y nunca le importa qué hay detrás de cada uno.

Aquí está la palanca. Sus requisitos ya viven en una docena de sistemas. MCP le permite componerlos donde están en vez de copiarlos a un documento que se desvía al día siguiente de escribirlo. El contrato es pequeño a propósito: listar, obtener una versión, comparar dos versiones. Manténgalo así de pequeño y todo se conecta.

## Empiece esta semana

1. Elija un producto y tres sumideros con dueños distintos: el producto, un estándar compartido y la seguridad.
2. Ponga cada uno en un repositorio y fije una versión en el espacio de trabajo.
3. Componga la especificación en el build. Nunca edite la salida a mano.
4. En el próximo cambio, genere el diff y déle al agente solo eso, con el identificador y la razón de cada requisito.
5. Cuando un segundo sistema tenga requisitos que sigue copiando a mano, póngale enfrente el contrato MCP y conviértalo también en un sumidero.

Use los menos sumideros que tengan aprobadores distintos. Haga que la aprobación sea el merge que su equipo ya hace. La especificación se mantiene al día porque nadie la está manteniendo al día.
