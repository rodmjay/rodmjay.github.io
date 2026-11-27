---
id: dark-factory-living-spec
title: "La fábrica oscura: la especificación como documento vivo"
dek: Usted edita los requisitos, la especificación se escribe sola y los agentes construyen la diferencia entre una versión y la siguiente.
date: 2026-11-27
tags: [architecture, ai]
cover: /blog/media/dark-factory-living-spec.jpg
cover_alt: Una fábrica estilizada que brilla en un valle de montaña de noche, con su luz reflejada en un lago en calma.
toc: false
draft: false
---
Una fábrica oscura funciona con las luces apagadas. Las máquinas hacen la construcción y nadie está en el taller.

Creo que el software puede funcionar así. El programa de control es la especificación, y tiene que mantenerse viva.

## La idea

Usted edita los requisitos. La especificación se escribe sola. La fábrica construye la diferencia.

1. Los requisitos viven en sumideros.
2. Al aprobar un cambio, la especificación se recompone en una versión nueva.
3. Los agentes construyen el diff entre versiones.
4. Usted trabaja los requisitos, y la fábrica trabaja el taller.

En esta imagen las personas no escriben la especificación, ni trabajan el taller. Cuidan los requisitos.

## Por qué la especificación tiene que ser derivada

Todo equipo tiene una especificación que fue cierta alguna vez. Alguien la escribió con cuidado, el producto avanzó y la página se quedó quieta. Nadie decidió dejarla pudrir. Mantenerla al día nunca fue la tarea de nadie en un día de entrega.

Tengo una regla para mí mismo: cuando un dato se puede calcular desde su fuente, se calcula. Un valor que hay que seguir actualizando se desvía, y uno derivado no. Una especificación es un valor derivado que hemos tratado como un documento. Así que deje de escribirla, y compóngala.

## Sumideros

Un sumidero es un lugar donde viven los requisitos, de una sola clase cada uno. Un sumidero de producto guarda lo que el producto debe hacer. Otros guardan estándares técnicos, estándares de diseño, seguridad, velocidad, disponibilidad y costo. Cada uno tiene un dueño que conoce esa clase de cosa, así que nadie discute dónde va un requisito.

Un sumidero es un repositorio, o una carpeta dentro de uno. Los estándares compartidos tienen su propio repositorio y alimentan muchos espacios de trabajo, como un sistema de diseño con sus estándares de diseño al lado. Los requisitos de un producto se quedan con el producto. Un espacio de trabajo elige qué sumideros compone y qué versión de cada uno.

Si ha compartido una biblioteca de código entre productos, este es el mismo movimiento. Lo que se comparte, se versiona y se fija es un estándar en vez de código, y pasar a una versión nueva es una decisión que le muestra exactamente qué cambió.

## La aprobación hace una versión

Un cambio a un sumidero espera hasta que la persona correcta lo apruebe. Los cambios de producto van al dueño del producto. Una regla de seguridad va a seguridad. Cuando pasa, la especificación se recompone y recibe una versión nueva. Versión uno, versión dos, versión tres, y las anteriores se quedan.

Ahora "¿qué cambió?" tiene una respuesta precisa. Ponga dos versiones lado a lado y obtiene el diff: este requisito se agregó, aquel se reformuló, este se quitó.

## Construir la diferencia

Un agente que recibe una especificación entera tiene que adivinar qué es nuevo. Relee todo y a veces rehace trabajo ya terminado. Un agente que recibe el diff tiene una tarea pequeña y exacta: implemente estos tres, cambie este, quite aquel. El trabajo y el costo siguen el tamaño del cambio. Cada requisito en el diff lleva su razón y su identificador, así que el agente sabe qué prueba escribir o actualizar.

## Una idea para explorar

Si un repositorio puede ser un sumidero, también lo puede ser cualquier cosa que hable una interfaz estándar. Defina qué debe responder una fuente de requisitos, déle endpoints bien conocidos y una forma compartida, y un repositorio, una base de datos o un servicio pueden conectarse, con MCP como el portador probable. No diseñaría ese contrato primero. Construiría con repositorios, vería qué tienen en común dos o tres sumideros reales, y escribiría la interfaz a partir de eso.

## Qué vigilar

Demasiados sumideros traen de vuelta el problema del wiki, así que empiece con los menos que tengan aprobadores distintos. Dos sumideros pueden contradecirse, así que componer necesita una revisión de conflictos que se detenga y nombre quién decide. Un diff esconde el contexto, así que cada requisito cambiado debería llevar su razón. Y nada de esto debería agregar una reunión. La aprobación puede ser el merge que su equipo ya hace.

Empiece en pequeño: un producto, tres sumideros, un agente que trabaja desde el diff. Si el ciclo se sostiene, amplíelo. Espero volver a esto, porque hay más que decir sobre las revisiones en la puerta de aprobación y sobre las pruebas que informan qué requisitos cubren.
