-- Migration: add mustChangePassword to User
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

-- Ensure existing accounts are not forced to change their passwords
UPDATE "User" SET "mustChangePassword" = false;
