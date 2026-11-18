-- AlterTable
ALTER TABLE "tickets_ticket" ADD COLUMN     "categoria_id" TEXT;

-- CreateIndex
CREATE INDEX "tickets_ticket_categoria_id_idx" ON "tickets_ticket"("categoria_id");

-- AddForeignKey
ALTER TABLE "tickets_ticket" ADD CONSTRAINT "tickets_ticket_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "tickets_categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
