-- CreateTable
CREATE TABLE "tickets_categoria" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "minutos_recomendados" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "create_by" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_categoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tickets_categoria_create_by_idx" ON "tickets_categoria"("create_by");

-- AddForeignKey
ALTER TABLE "tickets_categoria" ADD CONSTRAINT "tickets_categoria_create_by_fkey" FOREIGN KEY ("create_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
