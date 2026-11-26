-- CreateEnum
CREATE TYPE "estado_operacion" AS ENUM ('en_espera', 'propuesta', 'ejecutada', 'descartada', 'fallida');

-- CreateEnum
CREATE TYPE "origen_operacion" AS ENUM ('agente', 'control_directo');

-- CreateTable
CREATE TABLE "operacion" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "origen" "origen_operacion" NOT NULL,
    "solicitud_original" TEXT,
    "carga" JSONB NOT NULL,
    "vista_confirmacion" JSONB NOT NULL,
    "estado" "estado_operacion" NOT NULL,
    "resultado" JSONB,
    "error" TEXT,
    "capturada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmada_en" TIMESTAMPTZ(3),
    "ejecutada_en" TIMESTAMPTZ(3),

    CONSTRAINT "operacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operacion_organizacion_id_perfil_id_estado_idx" ON "operacion"("organizacion_id", "perfil_id", "estado");

-- AddForeignKey
ALTER TABLE "operacion" ADD CONSTRAINT "operacion_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operacion" ADD CONSTRAINT "operacion_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil_usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

