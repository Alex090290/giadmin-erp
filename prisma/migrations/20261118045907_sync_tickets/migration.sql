-- CreateTable
CREATE TABLE "tickets_ticket" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asunto" VARCHAR(160) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "create_by" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_name_key" ON "tickets_ticket"("name");

-- CreateIndex
CREATE INDEX "tickets_ticket_create_by_idx" ON "tickets_ticket"("create_by");

-- AddForeignKey
ALTER TABLE "tickets_ticket" ADD CONSTRAINT "tickets_ticket_create_by_fkey" FOREIGN KEY ("create_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
