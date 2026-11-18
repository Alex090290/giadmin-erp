-- CreateEnum
CREATE TYPE "tickets_ticket_prioridad" AS ENUM ('baja', 'normal', 'alta');

-- AlterTable
ALTER TABLE "tickets_ticket" ADD COLUMN     "prioridad" "tickets_ticket_prioridad" NOT NULL DEFAULT 'normal';
