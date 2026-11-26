-- CreateTable
CREATE TABLE "punto_control_agente" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "conversacion_id" UUID NOT NULL,
    "datos" JSONB NOT NULL,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "punto_control_agente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "punto_control_agente_conversacion_id_key" ON "punto_control_agente"("conversacion_id");

-- CreateIndex
CREATE INDEX "punto_control_agente_organizacion_id_idx" ON "punto_control_agente"("organizacion_id");

-- AddForeignKey
ALTER TABLE "punto_control_agente" ADD CONSTRAINT "punto_control_agente_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "punto_control_agente" ADD CONSTRAINT "punto_control_agente_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "conversacion_agente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
