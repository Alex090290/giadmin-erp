-- CreateTable
CREATE TABLE "tickets_tecnico" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "create_by" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_tecnico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tickets_tecnico_create_by_idx" ON "tickets_tecnico"("create_by");

-- AddForeignKey
ALTER TABLE "tickets_tecnico" ADD CONSTRAINT "tickets_tecnico_create_by_fkey" FOREIGN KEY ("create_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
