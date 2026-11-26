-- CreateEnum
CREATE TYPE "estado_reunion" AS ENUM ('pendiente', 'agendada', 'vencida', 'cancelada');

-- CreateEnum
CREATE TYPE "franja_reunion" AS ENUM ('manana', 'tarde');

-- AlterTable
ALTER TABLE "consentimiento_integracion" ADD COLUMN     "correo_cuenta" TEXT;

-- CreateTable
CREATE TABLE "reunion" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "equipo_id" UUID NOT NULL,
    "convocante_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "duracion_minutos" INTEGER NOT NULL,
    "franja" "franja_reunion",
    "zona_horaria" TEXT NOT NULL,
    "rango_desde" TIMESTAMPTZ(3) NOT NULL,
    "rango_hasta" TIMESTAMPTZ(3) NOT NULL,
    "estado" "estado_reunion" NOT NULL DEFAULT 'pendiente',
    "inicio" TIMESTAMPTZ(3),
    "fin" TIMESTAMPTZ(3),
    "google_evento_id" TEXT,
    "creada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cambiada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reunion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitado_reunion" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "reunion_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "opcional" BOOLEAN NOT NULL DEFAULT false,
    "direccion" TEXT,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitado_reunion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reunion_organizacion_id_idx" ON "reunion"("organizacion_id");

-- CreateIndex
CREATE INDEX "reunion_convocante_id_idx" ON "reunion"("convocante_id");

-- CreateIndex
CREATE UNIQUE INDEX "reunion_id_organizacion_id_key" ON "reunion"("id", "organizacion_id");

-- CreateIndex
CREATE INDEX "invitado_reunion_organizacion_id_idx" ON "invitado_reunion"("organizacion_id");

-- CreateIndex
CREATE INDEX "invitado_reunion_perfil_id_idx" ON "invitado_reunion"("perfil_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitado_reunion_reunion_id_perfil_id_key" ON "invitado_reunion"("reunion_id", "perfil_id");

-- AddForeignKey
ALTER TABLE "reunion" ADD CONSTRAINT "reunion_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunion" ADD CONSTRAINT "reunion_equipo_id_organizacion_id_fkey" FOREIGN KEY ("equipo_id", "organizacion_id") REFERENCES "equipo"("id", "organizacion_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunion" ADD CONSTRAINT "reunion_convocante_id_organizacion_id_fkey" FOREIGN KEY ("convocante_id", "organizacion_id") REFERENCES "perfil_usuario"("id", "organizacion_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitado_reunion" ADD CONSTRAINT "invitado_reunion_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitado_reunion" ADD CONSTRAINT "invitado_reunion_reunion_id_organizacion_id_fkey" FOREIGN KEY ("reunion_id", "organizacion_id") REFERENCES "reunion"("id", "organizacion_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitado_reunion" ADD CONSTRAINT "invitado_reunion_perfil_id_organizacion_id_fkey" FOREIGN KEY ("perfil_id", "organizacion_id") REFERENCES "perfil_usuario"("id", "organizacion_id") ON DELETE RESTRICT ON UPDATE CASCADE;
