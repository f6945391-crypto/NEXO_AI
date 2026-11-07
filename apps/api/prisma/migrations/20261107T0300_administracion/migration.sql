-- specs/08-administracion/plan.md §3 (opción B) · T-065 · REQ-ADM-01, REQ-ADM-03, REQ-ADM-04
-- Escrita a mano: el motor de Prisma no se puede descargar en este equipo. Verificada con psql sobre una
-- base vacía y sobre una con los datos de la semilla anterior.

-- CreateEnum
CREATE TYPE "tipo_organizacion" AS ENUM ('personal', 'empresa');

-- CreateEnum
CREATE TYPE "estado_cuenta" AS ENUM ('activa', 'suspendida', 'cerrada');

-- CreateEnum
CREATE TYPE "origen_pertenencia" AS ENUM ('alta', 'afiliacion');

-- CreateEnum
CREATE TYPE "estado_pertenencia" AS ENUM ('invitada', 'vigente', 'rechazada', 'caducada', 'retirada');

-- CreateEnum
CREATE TYPE "motivo_retiro" AS ENUM ('administrador', 'persona', 'baja');

-- AlterTable
ALTER TABLE "organizacion" ADD COLUMN     "tipo" "tipo_organizacion" NOT NULL DEFAULT 'empresa';

-- AlterTable
ALTER TABLE "perfil_usuario" ADD COLUMN     "estado" "estado_cuenta" NOT NULL DEFAULT 'activa',
ADD COLUMN     "estado_cambiado_en" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "miembro_organizacion" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "origen" "origen_pertenencia" NOT NULL,
    "estado" "estado_pertenencia" NOT NULL,
    "administrador" BOOLEAN NOT NULL DEFAULT false,
    "equipos_propuestos" UUID[] DEFAULT ARRAY[]::UUID[],
    "invitada_por" UUID,
    "invitada_en" TIMESTAMPTZ(3),
    "respondida_en" TIMESTAMPTZ(3),
    "retirada_en" TIMESTAMPTZ(3),
    "motivo_retiro" "motivo_retiro",
    "creada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "miembro_organizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipo" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "miembro_equipo" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "equipo_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "responsable" BOOLEAN NOT NULL DEFAULT false,
    "desde" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "miembro_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "miembro_organizacion_organizacion_id_idx" ON "miembro_organizacion"("organizacion_id");

-- CreateIndex
CREATE INDEX "miembro_organizacion_perfil_id_idx" ON "miembro_organizacion"("perfil_id");

-- CreateIndex
CREATE INDEX "equipo_organizacion_id_idx" ON "equipo"("organizacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipo_organizacion_id_nombre_key" ON "equipo"("organizacion_id", "nombre");

-- CreateIndex
CREATE INDEX "miembro_equipo_organizacion_id_idx" ON "miembro_equipo"("organizacion_id");

-- CreateIndex
CREATE INDEX "miembro_equipo_perfil_id_idx" ON "miembro_equipo"("perfil_id");

-- CreateIndex
CREATE UNIQUE INDEX "miembro_equipo_equipo_id_perfil_id_key" ON "miembro_equipo"("equipo_id", "perfil_id");

-- Índices únicos parciales (Prisma no los declara; plan §3.2)
-- H-ADM-04: una sola pertenencia vigente por perfil en todo el sistema
CREATE UNIQUE INDEX "miembro_organizacion_un_vigente_por_perfil" ON "miembro_organizacion"("perfil_id") WHERE "estado" = 'vigente';
-- Una invitación pendiente o una pertenencia vigente por organización y perfil
CREATE UNIQUE INDEX "miembro_organizacion_una_abierta_por_organizacion" ON "miembro_organizacion"("organizacion_id", "perfil_id") WHERE "estado" IN ('invitada', 'vigente');
-- H-ADM-09: un responsable por equipo como mucho
CREATE UNIQUE INDEX "miembro_equipo_un_responsable" ON "miembro_equipo"("equipo_id") WHERE "responsable";

-- AddForeignKey
ALTER TABLE "miembro_organizacion" ADD CONSTRAINT "miembro_organizacion_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembro_organizacion" ADD CONSTRAINT "miembro_organizacion_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipo" ADD CONSTRAINT "equipo_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembro_equipo" ADD CONSTRAINT "miembro_equipo_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembro_equipo" ADD CONSTRAINT "miembro_equipo_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembro_equipo" ADD CONSTRAINT "miembro_equipo_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migración de los datos existentes (plan §3.3, con la regla del encargo del 7 de noviembre de 2026)
-- 1. Empresa si tiene más de una cuenta o alguna cuenta con el Plan Empresarial; si no, personal.
UPDATE "organizacion" o SET "tipo" = CASE
    WHEN (SELECT count(*) FROM "perfil_usuario" p WHERE p."organizacion_id" = o."id") > 1 THEN 'empresa'::"tipo_organizacion"
    WHEN EXISTS (SELECT 1 FROM "perfil_usuario" p WHERE p."organizacion_id" = o."id" AND p."plan" = 'empresarial') THEN 'empresa'::"tipo_organizacion"
    ELSE 'personal'::"tipo_organizacion"
END;

-- 2. Cada cuenta de una organización de empresa recibe su pertenencia propia y vigente.
INSERT INTO "miembro_organizacion" ("id", "organizacion_id", "perfil_id", "origen", "estado", "administrador", "creada_en")
SELECT gen_random_uuid(), p."organizacion_id", p."id", 'alta', 'vigente', false, p."creado_en"
FROM "perfil_usuario" p
JOIN "organizacion" o ON o."id" = p."organizacion_id"
WHERE o."tipo" = 'empresa';

-- 3. Ninguna empresa sin administrador (REQ-ADM-03, H-ADM-21): el gerente más antiguo; si no hay, la cuenta más antigua.
UPDATE "miembro_organizacion" m SET "administrador" = true
WHERE m."perfil_id" IN (
    SELECT DISTINCT ON (p."organizacion_id") p."id"
    FROM "perfil_usuario" p
    JOIN "organizacion" o ON o."id" = p."organizacion_id"
    WHERE o."tipo" = 'empresa'
    ORDER BY p."organizacion_id", (p."rol" = 'gerente') DESC, p."creado_en" ASC, p."id" ASC
);

-- 4. Todas las cuentas quedan activas: lo hace el valor por defecto de "estado".
