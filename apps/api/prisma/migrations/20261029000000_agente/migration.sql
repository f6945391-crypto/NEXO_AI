-- CreateEnum
CREATE TYPE "motivo_espera" AS ENUM ('asistente_no_disponible', 'permiso_faltante', 'funcion_por_llegar');

-- CreateEnum
CREATE TYPE "estado_conversacion" AS ENUM ('abierta', 'cerrada');

-- CreateEnum
CREATE TYPE "desenlace_llamada" AS ENUM ('ok', 'no_disponible', 'error');

-- AlterTable
ALTER TABLE "operacion" ADD COLUMN     "conversacion_id" UUID,
ADD COLUMN     "motivo_espera" "motivo_espera";

-- CreateTable
CREATE TABLE "conversacion_agente" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "estado" "estado_conversacion" NOT NULL,
    "abierta_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerrada_en" TIMESTAMPTZ(3),

    CONSTRAINT "conversacion_agente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llamada_modelo" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "conversacion_id" UUID,
    "proveedor" TEXT NOT NULL,
    "modelo" TEXT,
    "tokens_entrada" INTEGER,
    "tokens_salida" INTEGER,
    "costo_usd" DECIMAL(12,6),
    "duracion_ms" INTEGER NOT NULL,
    "intentos" INTEGER NOT NULL,
    "desenlace" "desenlace_llamada" NOT NULL,
    "error" TEXT,
    "ocurrida_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llamada_modelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invocacion_herramienta" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "conversacion_id" UUID NOT NULL,
    "llamada_modelo_id" UUID,
    "id_llamada" TEXT NOT NULL,
    "herramienta" TEXT NOT NULL,
    "argumentos" JSONB NOT NULL,
    "resultado" JSONB,
    "error" TEXT,
    "operacion_id" UUID,
    "duracion_ms" INTEGER NOT NULL,
    "ocurrida_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invocacion_herramienta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversacion_agente_perfil_id_estado_idx" ON "conversacion_agente"("perfil_id", "estado");

-- CreateIndex
CREATE INDEX "conversacion_agente_organizacion_id_idx" ON "conversacion_agente"("organizacion_id");

-- CreateIndex
CREATE INDEX "llamada_modelo_organizacion_id_ocurrida_en_idx" ON "llamada_modelo"("organizacion_id", "ocurrida_en");

-- CreateIndex
CREATE INDEX "invocacion_herramienta_organizacion_id_idx" ON "invocacion_herramienta"("organizacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "invocacion_herramienta_conversacion_id_id_llamada_key" ON "invocacion_herramienta"("conversacion_id", "id_llamada");

-- AddForeignKey
ALTER TABLE "operacion" ADD CONSTRAINT "operacion_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "conversacion_agente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversacion_agente" ADD CONSTRAINT "conversacion_agente_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversacion_agente" ADD CONSTRAINT "conversacion_agente_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llamada_modelo" ADD CONSTRAINT "llamada_modelo_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llamada_modelo" ADD CONSTRAINT "llamada_modelo_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llamada_modelo" ADD CONSTRAINT "llamada_modelo_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "conversacion_agente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invocacion_herramienta" ADD CONSTRAINT "invocacion_herramienta_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invocacion_herramienta" ADD CONSTRAINT "invocacion_herramienta_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invocacion_herramienta" ADD CONSTRAINT "invocacion_herramienta_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "conversacion_agente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invocacion_herramienta" ADD CONSTRAINT "invocacion_herramienta_llamada_modelo_id_fkey" FOREIGN KEY ("llamada_modelo_id") REFERENCES "llamada_modelo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
