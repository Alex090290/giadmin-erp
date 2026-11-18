-- Reviewed module operation ec3b64bf39eae3c11584dc3fe2ed378b
BEGIN;
SET LOCAL lock_timeout = '10s';
DELETE FROM "record_activities" WHERE model IN ('TicketsTicket', 'TicketsCategoria', 'TicketsTecnico');
DELETE FROM "access_model_overrides" WHERE model IN ('tickets.ticket', 'tickets.categoria', 'tickets.tecnico');
-- DropForeignKey
ALTER TABLE "tickets_ticket" DROP CONSTRAINT "tickets_ticket_categoria_id_fkey";

-- DropForeignKey
ALTER TABLE "tickets_ticket" DROP CONSTRAINT "tickets_ticket_create_by_fkey";

-- DropForeignKey
ALTER TABLE "tickets_categoria" DROP CONSTRAINT "tickets_categoria_create_by_fkey";

-- DropForeignKey
ALTER TABLE "tickets_tecnico" DROP CONSTRAINT "tickets_tecnico_create_by_fkey";

-- DropTable
DROP TABLE "tickets_ticket";

-- DropTable
DROP TABLE "tickets_categoria";

-- DropTable
DROP TABLE "tickets_tecnico";

-- DropEnum
DROP TYPE "tickets_ticket_prioridad";

-- DropEnum
DROP TYPE "tickets_ticket_estado";


COMMIT;
