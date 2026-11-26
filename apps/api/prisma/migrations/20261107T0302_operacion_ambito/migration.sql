-- specs/08-administracion/plan.md §5.2 y §7.3 · T-067. Las Operaciones de la zona de empresa se guardan en la
-- organización de la empresa con su ámbito, y no aparecen en las del usuario. Escrita a mano.

-- CreateEnum
CREATE TYPE "ambito_operacion" AS ENUM ('propio', 'empresa');

-- AlterTable
ALTER TABLE "operacion" ADD COLUMN     "ambito" "ambito_operacion" NOT NULL DEFAULT 'propio';

-- CreateIndex
CREATE INDEX "operacion_organizacion_id_ambito_creada_en_idx" ON "operacion"("organizacion_id", "ambito", "creada_en");
