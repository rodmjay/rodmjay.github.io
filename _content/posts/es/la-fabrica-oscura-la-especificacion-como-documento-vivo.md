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

![Sumideros tipados de requisitos (producto, estándares, seguridad) componen una especificación versionada; un agente construye el diff entre versiones, y cualquier fuente se vuelve un sumidero al hablar un contrato MCP pequeño: listar, obtener una versión, comparar dos versiones.](/blog/media/dark-factory-diagram.png "El ciclo: requisitos adentro, especificación y diff afuera.")

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

## Siga el identificador

Cada requisito recibe un identificador cuando nace. El identificador no cambia y nunca se reutiliza. Es la llave que une todo lo que sucede después.

Póngalo donde cada herramienta pueda buscarlo:

- Rama: `req/PROD-142-exportar-csv`, para que el identificador exista antes del primer commit.
- Issue y pull request: el identificador en el título, más una etiqueta `req:PROD-142`.
- Commit: un trailer, `Requirement: PROD-142`, igual que se agrega un sign-off.
- Prueba: etiquétela con el identificador que verifica.

Así una sola búsqueda devuelve todo el rastro. `git log --grep "Requirement: PROD-142"` lista cada cambio. La etiqueta lista cada issue y pull request. La etiqueta de la prueba lista lo que lo demuestra.

Funciona en ambos sentidos. Si parte de un requisito, llega al código. Si parte de una línea de código, la rastrea con blame hasta un commit, lee el trailer y llega al requisito y a la razón por la que existe. La cobertura pasa a ser una pregunta sobre requisitos: ¿qué identificadores de esta versión tienen un cambio integrado y una prueba que pasa?

CI lo mantiene honesto, porque nadie debería tener que acordarse. Cada pull request lleva un identificador real de la especificación fijada, o dice `Maintenance:` con una razón. Cada requisito del diff necesita un cambio integrado y una prueba etiquetada antes de que la versión cuente como terminada. Si no, la compilación falla.

Algunos casos necesitan una regla. Una división da identificadores nuevos a los hijos y marca al padre como reemplazado. Una fusión conserva un identificador y apunta los demás hacia él. Un pull request que toca varios requisitos los lista todos, y si la lista se alarga, el pull request es demasiado grande. El código antiguo no tiene identificadores, y no hay problema: empiece en la versión actual y etiquete lo que toque.

Nunca guarde el rastro en una tabla. Calcúlelo a partir de los trailers, las etiquetas y los reportes de pruebas, igual que calcula la especificación.

## Empiece esta semana

1. Elija un producto y tres sumideros con dueños distintos: el producto, un estándar compartido y la seguridad.
2. Ponga cada uno en un repositorio y fije una versión en el espacio de trabajo.
3. Componga la especificación en el build. Nunca edite la salida a mano.
4. En el próximo cambio, genere el diff y déle al agente solo eso, con el identificador y la razón de cada requisito.
5. Dé a cada requisito un identificador permanente y póngalo en la rama, el título del pull request, el trailer del commit y la etiqueta de la prueba. Agregue una verificación de CI: cada pull request lleva uno, y cada requisito del diff tiene un cambio integrado y una prueba etiquetada.
6. Cuando un segundo sistema tenga requisitos que sigue copiando a mano, póngale enfrente el contrato MCP y conviértalo también en un sumidero.

Use los menos sumideros que tengan aprobadores distintos. Haga que la aprobación sea el merge que su equipo ya hace. La especificación se mantiene al día porque nadie la está manteniendo al día.
