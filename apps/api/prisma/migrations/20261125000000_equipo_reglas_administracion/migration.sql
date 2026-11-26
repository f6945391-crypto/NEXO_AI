-- Fusión del 25 de noviembre de 2026 (D-F1, GUIA-FUSION-MAIN-2026-11-25.md). Las tablas de equipo son las de
-- CUN-05 (`20261110145111_agregar_equipos`); la migración `20261107T0300_administracion` ya no crea las suyas.
-- Esta lleva a `equipo` y `miembro_de_equipo` las dos reglas que aquellas imponían en la base, y que son
-- requisitos de 08-administracion. Escrita a mano, con el estilo de `prisma migrate diff`.

-- REQ-ADM-28: dos equipos de la misma organización no comparten nombre
-- CreateIndex
CREATE UNIQUE INDEX "equipo_organizacion_id_nombre_key" ON "equipo"("organizacion_id", "nombre");

-- REQ-ADM-30, H-ADM-09: un responsable por equipo como mucho. Índice único parcial: Prisma no lo declara
CREATE UNIQUE INDEX "miembro_de_equipo_un_responsable" ON "miembro_de_equipo"("equipo_id") WHERE "rol_en_equipo" = 'responsable';
