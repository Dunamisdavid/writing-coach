◇ injected env (2) from .env.local // tip: ⌁ auth for agents [www.vestauth.com]
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "rewrite" TEXT NOT NULL,
    "corrections" JSONB NOT NULL,
    "scores" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

