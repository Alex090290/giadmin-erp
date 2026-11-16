-- CreateTable
CREATE TABLE "access_menu_hidden" (
    "group_id" VARCHAR(120) NOT NULL,
    "application_id" VARCHAR(120) NOT NULL,
    "menu_id" VARCHAR(120) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_menu_hidden_pkey" PRIMARY KEY ("group_id","application_id","menu_id")
);
