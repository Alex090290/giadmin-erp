-- CreateTable
CREATE TABLE "flota_mantenimiento" (
    "id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "name" VARCHAR(300) NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "fecha" TIMESTAMPTZ(3) NOT NULL,
    "kilometraje" INTEGER NOT NULL,
    "create_by" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flota_mantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flota_mantenimiento_vehicle_id_idx" ON "flota_mantenimiento"("vehicle_id");

-- CreateIndex
CREATE INDEX "flota_mantenimiento_create_by_idx" ON "flota_mantenimiento"("create_by");

-- AddForeignKey
ALTER TABLE "flota_mantenimiento" ADD CONSTRAINT "flota_mantenimiento_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "flota_vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flota_mantenimiento" ADD CONSTRAINT "flota_mantenimiento_create_by_fkey" FOREIGN KEY ("create_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
