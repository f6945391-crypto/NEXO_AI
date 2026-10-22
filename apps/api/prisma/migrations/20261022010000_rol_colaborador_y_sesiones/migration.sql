-- AlterEnum
ALTER TYPE "rol" ADD VALUE 'colaborador';

-- CreateTable
CREATE TABLE "sesion_renovacion" (
    "id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "hash_token" TEXT NOT NULL,
    "familia" UUID NOT NULL,
    "expira_en" TIMESTAMPTZ(3) NOT NULL,
    "revocada_en" TIMESTAMPTZ(3),
    "creada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesion_renovacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sesion_renovacion_hash_token_key" ON "sesion_renovacion"("hash_token");

-- CreateIndex
CREATE INDEX "sesion_renovacion_familia_idx" ON "sesion_renovacion"("familia");

-- AddForeignKey
ALTER TABLE "sesion_renovacion" ADD CONSTRAINT "sesion_renovacion_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

