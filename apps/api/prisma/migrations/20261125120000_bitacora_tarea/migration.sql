-- AlterTable
ALTER TABLE "tarea_personal" ADD COLUMN     "contexto" VARCHAR(200),
ADD COLUMN     "vencimiento_atendido" DATE;

-- CreateTable
CREATE TABLE "avance_tarea" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "tarea_id" UUID NOT NULL,
    "texto" VARCHAR(500) NOT NULL,
    "anotado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zona_horaria" TEXT NOT NULL,
    "operacion_origen_id" UUID NOT NULL,

    CONSTRAINT "avance_tarea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "avance_tarea_operacion_origen_id_key" ON "avance_tarea"("operacion_origen_id");

-- CreateIndex
CREATE INDEX "avance_tarea_tarea_id_anotado_en_idx" ON "avance_tarea"("tarea_id", "anotado_en");

-- CreateIndex
CREATE INDEX "avance_tarea_organizacion_id_idx" ON "avance_tarea"("organizacion_id");

-- AddForeignKey
ALTER TABLE "avance_tarea" ADD CONSTRAINT "avance_tarea_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avance_tarea" ADD CONSTRAINT "avance_tarea_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avance_tarea" ADD CONSTRAINT "avance_tarea_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tarea_personal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avance_tarea" ADD CONSTRAINT "avance_tarea_operacion_origen_id_fkey" FOREIGN KEY ("operacion_origen_id") REFERENCES "operacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

