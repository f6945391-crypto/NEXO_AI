-- CreateEnum
CREATE TYPE "estado_consentimiento_equipo" AS ENUM ('pendiente', 'concedida', 'rechazada', 'revocada');

-- AlterTable
ALTER TABLE "miembro_de_equipo" ADD COLUMN     "consentimiento_cambiado_en" TIMESTAMPTZ(3),
ADD COLUMN     "estado_consentimiento" "estado_consentimiento_equipo" NOT NULL DEFAULT 'pendiente';
