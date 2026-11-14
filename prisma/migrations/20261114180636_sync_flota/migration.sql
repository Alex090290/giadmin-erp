-- CreateEnum
CREATE TYPE "flota_vehicle_estado" AS ENUM ('disponible', 'mantenimiento');

-- AlterTable
ALTER TABLE "flota_vehicle" ADD COLUMN     "estado" "flota_vehicle_estado" NOT NULL DEFAULT 'disponible';
