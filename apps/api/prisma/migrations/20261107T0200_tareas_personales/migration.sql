-- specs/09-tareas-personales/plan.md §3 · T-047. Escrita a mano (el motor de migraciones de Prisma no se
-- puede descargar en este equipo), con el estilo de `prisma migrate diff`, y verificada con psql sobre una
-- base limpia.

-- CreateEnum
CREATE TYPE "estado_tarea" AS ENUM ('pendiente', 'hecha', 'descartada');

-- AlterTable
ALTER TABLE "operacion" ADD COLUMN     "convertida_en" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "tarea_personal" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "texto" VARCHAR(200) NOT NULL,
    "fecha" DATE,
    "hora_limite" VARCHAR(5),
    "zona_horaria" TEXT NOT NULL,
    "de_quien" VARCHAR(80),
    "esperada_desde" DATE,
    "estado" "estado_tarea" NOT NULL DEFAULT 'pendiente',
    "hecha_en" TIMESTAMPTZ(3),
    "descartada_en" TIMESTAMPTZ(3),
    "operacion_origen_id" UUID NOT NULL,
    "creada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizada_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tarea_personal_pkey" PRIMARY KEY ("id"),
    -- Plan §3.1: la hora límite exige fecha; desde cuándo se espera exige de quién
    CONSTRAINT "tarea_personal_hora_limite_con_fecha" CHECK ("hora_limite" IS NULL OR "fecha" IS NOT NULL),
    CONSTRAINT "tarea_personal_esperada_desde_con_de_quien" CHECK ("esperada_desde" IS NULL OR "de_quien" IS NOT NULL)
);

-- CreateIndex
CREATE UNIQUE INDEX "tarea_personal_operacion_origen_id_key" ON "tarea_personal"("operacion_origen_id");

-- CreateIndex
CREATE INDEX "tarea_personal_perfil_id_estado_fecha_idx" ON "tarea_personal"("perfil_id", "estado", "fecha");

-- CreateIndex
CREATE INDEX "tarea_personal_organizacion_id_idx" ON "tarea_personal"("organizacion_id");

-- AddForeignKey
ALTER TABLE "tarea_personal" ADD CONSTRAINT "tarea_personal_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_personal" ADD CONSTRAINT "tarea_personal_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_personal" ADD CONSTRAINT "tarea_personal_operacion_origen_id_fkey" FOREIGN KEY ("operacion_origen_id") REFERENCES "operacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
