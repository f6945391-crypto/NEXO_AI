-- AlterTable
ALTER TABLE "conversacion_agente" ADD COLUMN     "ultima_actividad_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "turno_asistente" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "conversacion_id" UUID NOT NULL,
    "secuencia" SERIAL NOT NULL,
    "en" TIMESTAMPTZ(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "datos" JSONB NOT NULL,
    "actividad_tipo" TEXT,
    "actividad_id" TEXT,

    CONSTRAINT "turno_asistente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "turno_asistente_perfil_id_secuencia_idx" ON "turno_asistente"("perfil_id", "secuencia");

-- CreateIndex
CREATE INDEX "turno_asistente_conversacion_id_idx" ON "turno_asistente"("conversacion_id");

-- CreateIndex
CREATE INDEX "turno_asistente_organizacion_id_idx" ON "turno_asistente"("organizacion_id");

-- AddForeignKey
ALTER TABLE "turno_asistente" ADD CONSTRAINT "turno_asistente_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turno_asistente" ADD CONSTRAINT "turno_asistente_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turno_asistente" ADD CONSTRAINT "turno_asistente_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "conversacion_agente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
