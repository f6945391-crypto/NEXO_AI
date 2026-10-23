-- CreateEnum
CREATE TYPE "estado_evento" AS ENUM ('confirmado', 'cancelado');

-- CreateTable
CREATE TABLE "evento_agenda" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "google_calendario_id" TEXT NOT NULL,
    "google_evento_id" TEXT NOT NULL,
    "etag" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fin" TIMESTAMPTZ(3) NOT NULL,
    "zona_horaria" TEXT NOT NULL,
    "todo_el_dia" BOOLEAN NOT NULL,
    "es_organizador" BOOLEAN NOT NULL,
    "serie_id" TEXT,
    "estado" "estado_evento" NOT NULL,
    "sincronizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "evento_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sincronizacion_calendario" (
    "perfil_id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "sync_token" TEXT,
    "ventana_desde" TIMESTAMPTZ(3) NOT NULL,
    "ventana_hasta" TIMESTAMPTZ(3) NOT NULL,
    "ultima_sincronizacion" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sincronizacion_calendario_pkey" PRIMARY KEY ("perfil_id")
);

-- CreateIndex
CREATE INDEX "evento_agenda_perfil_id_inicio_fin_idx" ON "evento_agenda"("perfil_id", "inicio", "fin");

-- CreateIndex
CREATE INDEX "evento_agenda_organizacion_id_idx" ON "evento_agenda"("organizacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "evento_agenda_perfil_id_google_evento_id_key" ON "evento_agenda"("perfil_id", "google_evento_id");

-- CreateIndex
CREATE INDEX "sincronizacion_calendario_organizacion_id_idx" ON "sincronizacion_calendario"("organizacion_id");

-- AddForeignKey
ALTER TABLE "evento_agenda" ADD CONSTRAINT "evento_agenda_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_agenda" ADD CONSTRAINT "evento_agenda_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sincronizacion_calendario" ADD CONSTRAINT "sincronizacion_calendario_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sincronizacion_calendario" ADD CONSTRAINT "sincronizacion_calendario_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

