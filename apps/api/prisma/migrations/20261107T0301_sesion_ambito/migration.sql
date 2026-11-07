-- specs/08-administracion/plan.md §7.1 y §12 · T-066. La zona de empresa tiene su propia sesión, con su
-- cookie y su familia de renovación. Escrita a mano, como 20261107T0300_administracion.

-- CreateEnum
CREATE TYPE "ambito_sesion" AS ENUM ('propio', 'empresa');

-- AlterTable
ALTER TABLE "sesion_renovacion" ADD COLUMN     "ambito" "ambito_sesion" NOT NULL DEFAULT 'propio';
