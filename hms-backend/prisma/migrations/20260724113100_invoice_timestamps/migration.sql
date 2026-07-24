-- Migration: add createdAt / updatedAt to Invoice
-- This is a purely additive change; no existing columns are altered or removed.

ALTER TABLE "Invoice" ADD COLUMN "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Invoice" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
