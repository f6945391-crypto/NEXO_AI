/*
  Warnings:

  - A unique constraint covering the columns `[id,organizacion_id]` on the table `perfil_usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "rol_en_equipo" AS ENUM ('responsable', 'integrante');

-- CreateTable
CREATE TABLE "equipo" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "miembro_de_equipo" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "equipo_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "rol_en_equipo" "rol_en_equipo" NOT NULL,
    "incorporado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "miembro_de_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipo_organizacion_id_idx" ON "equipo"("organizacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipo_id_organizacion_id_key" ON "equipo"("id", "organizacion_id");

-- CreateIndex
CREATE INDEX "miembro_de_equipo_organizacion_id_idx" ON "miembro_de_equipo"("organizacion_id");

-- CreateIndex
CREATE INDEX "miembro_de_equipo_perfil_id_idx" ON "miembro_de_equipo"("perfil_id");

-- CreateIndex
CREATE UNIQUE INDEX "miembro_de_equipo_equipo_id_perfil_id_key" ON "miembro_de_equipo"("equipo_id", "perfil_id");

-- CreateIndex
CREATE UNIQUE INDEX "perfil_usuario_id_organizacion_id_key" ON "perfil_usuario"("id", "organizacion_id");

-- AddForeignKey
ALTER TABLE "equipo" ADD CONSTRAINT "equipo_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembro_de_equipo" ADD CONSTRAINT "miembro_de_equipo_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembro_de_equipo" ADD CONSTRAINT "miembro_de_equipo_equipo_id_organizacion_id_fkey" FOREIGN KEY ("equipo_id", "organizacion_id") REFERENCES "equipo"("id", "organizacion_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembro_de_equipo" ADD CONSTRAINT "miembro_de_equipo_perfil_id_organizacion_id_fkey" FOREIGN KEY ("perfil_id", "organizacion_id") REFERENCES "perfil_usuario"("id", "organizacion_id") ON DELETE RESTRICT ON UPDATE CASCADE;
