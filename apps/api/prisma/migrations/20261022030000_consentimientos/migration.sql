-- CreateEnum
CREATE TYPE "estado_consentimiento" AS ENUM ('concedido', 'revocado', 'caducado');

-- CreateTable
CREATE TABLE "consentimiento_integracion" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "proveedor" TEXT NOT NULL,
    "alcance" TEXT NOT NULL,
    "estado" "estado_consentimiento" NOT NULL,
    "token_cifrado" TEXT,
    "concedido_en" TIMESTAMPTZ(3),
    "cambiado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aviso_emitido_en" TIMESTAMPTZ(3),

    CONSTRAINT "consentimiento_integracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consentimiento_integracion_organizacion_id_idx" ON "consentimiento_integracion"("organizacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "consentimiento_integracion_perfil_id_proveedor_alcance_key" ON "consentimiento_integracion"("perfil_id", "proveedor", "alcance");

-- AddForeignKey
ALTER TABLE "consentimiento_integracion" ADD CONSTRAINT "consentimiento_integracion_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimiento_integracion" ADD CONSTRAINT "consentimiento_integracion_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

