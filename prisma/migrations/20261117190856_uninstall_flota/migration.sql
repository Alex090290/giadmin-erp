-- Reviewed module operation 66282816ac5e6492a681d8c9719f7041
BEGIN;
SET LOCAL lock_timeout = '10s';
DELETE FROM "record_activities" WHERE model IN ('FlotaFabricante', 'FlotaModelo', 'FlotaVehicle', 'FlotaMantenimiento');
DELETE FROM "access_user_groups" WHERE group_id IN ('flota.consulta', 'flota.operador', 'flota.responsable');
DELETE FROM "access_model_overrides" WHERE group_id IN ('flota.consulta', 'flota.operador', 'flota.responsable') OR model IN ('flota.fabricante', 'flota.modelo', 'flota.vehicle', 'flota.mantenimiento');
DELETE FROM "access_rule_states" WHERE rule_id IN ('flota.vehiculos-propios', 'flota.vehiculos-todos');
-- DropForeignKey
ALTER TABLE "flota_fabricante" DROP CONSTRAINT "flota_fabricante_create_by_fkey";

-- DropForeignKey
ALTER TABLE "flota_modelo" DROP CONSTRAINT "flota_modelo_fabricante_id_fkey";

-- DropForeignKey
ALTER TABLE "flota_modelo" DROP CONSTRAINT "flota_modelo_create_by_fkey";

-- DropForeignKey
ALTER TABLE "flota_vehicle" DROP CONSTRAINT "flota_vehicle_modelo_id_fkey";

-- DropForeignKey
ALTER TABLE "flota_vehicle" DROP CONSTRAINT "flota_vehicle_create_by_fkey";

-- DropForeignKey
ALTER TABLE "flota_mantenimiento" DROP CONSTRAINT "flota_mantenimiento_vehicle_id_fkey";

-- DropForeignKey
ALTER TABLE "flota_mantenimiento" DROP CONSTRAINT "flota_mantenimiento_create_by_fkey";

-- DropTable
DROP TABLE "flota_fabricante";

-- DropTable
DROP TABLE "flota_modelo";

-- DropTable
DROP TABLE "flota_vehicle";

-- DropTable
DROP TABLE "flota_mantenimiento";

-- DropEnum
DROP TYPE "flota_vehicle_estado";


COMMIT;
