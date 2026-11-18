-- Shared transactional counters for declarative model folios. No business data is changed.
CREATE TABLE "model_sequences" (
    "key" VARCHAR(200) NOT NULL,
    "period" VARCHAR(4) NOT NULL,
    "value" BIGINT NOT NULL DEFAULT 0,
    "configuration" VARCHAR(64) NOT NULL,
    CONSTRAINT "model_sequences_pkey" PRIMARY KEY ("key", "period")
);
