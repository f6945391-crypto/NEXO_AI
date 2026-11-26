-- CreateTable
CREATE TABLE "restablecimiento_contrasena" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "hash_token" TEXT NOT NULL,
    "vence_en" TIMESTAMPTZ(3) NOT NULL,
    "usado_en" TIMESTAMPTZ(3),
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restablecimiento_contrasena_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restablecimiento_contrasena_hash_token_key" ON "restablecimiento_contrasena"("hash_token");

-- CreateIndex
CREATE INDEX "restablecimiento_contrasena_perfil_id_idx" ON "restablecimiento_contrasena"("perfil_id");

-- CreateIndex
CREATE INDEX "restablecimiento_contrasena_organizacion_id_idx" ON "restablecimiento_contrasena"("organizacion_id");

-- AddForeignKey
ALTER TABLE "restablecimiento_contrasena" ADD CONSTRAINT "restablecimiento_contrasena_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restablecimiento_contrasena" ADD CONSTRAINT "restablecimiento_contrasena_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
