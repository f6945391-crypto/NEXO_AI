-- T-046 · specs/08-tareas-personales/plan.md §3. Tareas personales (EN-04).

-- CreateEnum
CREATE TYPE "estado_tarea" AS ENUM ('pendiente', 'completada', 'cancelada');

-- CreateTable
CREATE TABLE "tarea" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "estado" "estado_tarea" NOT NULL DEFAULT 'pendiente',
    "fecha" DATE,
    "hora" TEXT,
    "espera_de" TEXT,
    "espera_que" TEXT,
    "completada_en" TIMESTAMPTZ(3),
    "cancelada_en" TIMESTAMPTZ(3),
    "operacion_id" UUID,
    "creada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarea_pkey" PRIMARY KEY ("id"),
    -- La hora solo existe con fecha
    CONSTRAINT "tarea_hora_con_fecha" CHECK ("hora" IS NULL OR "fecha" IS NOT NULL),
    -- Quién y qué se espera van juntos o no van
    CONSTRAINT "tarea_espera_completa" CHECK (("espera_de" IS NULL) = ("espera_que" IS NULL)),
    -- Cada marca de cierre solo existe en su estado
    CONSTRAINT "tarea_cierre_coherente" CHECK (
        ("completada_en" IS NULL OR "estado" = 'completada')
        AND ("cancelada_en" IS NULL OR "estado" = 'cancelada')
        AND ("estado" <> 'completada' OR "completada_en" IS NOT NULL)
        AND ("estado" <> 'cancelada' OR "cancelada_en" IS NOT NULL)
    )
);

-- CreateIndex
CREATE INDEX "tarea_perfil_id_estado_fecha_idx" ON "tarea"("perfil_id", "estado", "fecha");

-- CreateIndex
CREATE INDEX "tarea_organizacion_id_idx" ON "tarea"("organizacion_id");

-- AddForeignKey
ALTER TABLE "tarea" ADD CONSTRAINT "tarea_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea" ADD CONSTRAINT "tarea_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
