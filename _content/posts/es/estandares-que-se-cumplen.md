---
id: standards-that-stick
title: Ponga sus estándares donde trabajan sus agentes
dek: Escriba los estándares, intégrelos al flujo de trabajo y haga que sus agentes de IA los carguen.
date: 2026-11-21
tags: [architecture, standards, leadership]
toc: false
draft: false
---
Una página de estándares en una wiki se pasa por alto cuando aprieta la fecha de entrega, y un agente de IA nunca la ve. Ahora sigo tres pasos.

## 1. Escriba el estándar como texto

Mantenga cada estándar breve y en el repositorio, junto al código: nombres, registro de eventos, formato de errores, cómo se comunican los servicios entre sí, cómo escribimos. Los archivos markdown funcionan bien porque tanto las personas como los agentes pueden leerlos.

## 2. Intégrelo al flujo de trabajo

Ponga el estándar donde ocurre el trabajo:

- una biblioteca compartida o una plantilla inicial que ya lo cumpla
- una regla de lint o una verificación de CI que haga fallar la compilación cuando no se cumple
- una lista de revisión construida a partir del mismo archivo

## 3. Haga que su agente lo cargue

Con Claude Code hay varias formas de hacerlo:

- **CLAUDE.md** en el repositorio apunta a los archivos de estándares, así cada sesión los lee.
- **Skills** empaquetan un estándar con sus pasos, por ejemplo "escribir una migración" o "escribir notas de versión".
- **Hooks** ejecutan una verificación por sí solos, antes de un commit o después de escribir un archivo, y detienen el trabajo que no cumple el estándar.
- **Un servidor MCP** puede entregar sus estándares a cualquier agente. Dele una herramienta para consultar un estándar y otra para revisar un borrador contra él, y todas las herramientas que usa su equipo leerán la misma fuente.

## Manténgalo al día

Cuando alguien encuentre una mejor forma, cambie el estándar en un solo lugar y luego actualice a partir de él la biblioteca, las verificaciones y las instrucciones del agente. Asigne un responsable a cada estándar. Cuando tome una decisión que alguien cuestionará más adelante, escriba un ADR con el razonamiento.

## Empiece en pequeño

1. Elija un estándar sobre el que su equipo discute.
2. Escríbalo como un archivo markdown breve en el repositorio.
3. Agregue una verificación automática para él.
4. Haga que CLAUDE.md apunte a él y agregue un hook que ejecute la verificación.
