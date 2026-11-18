-- CreateEnum
CREATE TYPE "tickets_ticket_estado" AS ENUM ('nuevo', 'enProceso', 'enEspera', 'resuelto', 'cerrado');

-- AlterTable
ALTER TABLE "tickets_ticket" ADD COLUMN     "estado" "tickets_ticket_estado" NOT NULL DEFAULT 'nuevo';
