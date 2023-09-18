/*
  Warnings:

  - The values [PENDING,ACTIVE,PAUSED] on the enum `figma_team_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "figma_team_status_new" AS ENUM ('OK', 'ERROR');
ALTER TABLE "figma_team" ALTER COLUMN "status" TYPE "figma_team_status_new" USING ("status"::text::"figma_team_status_new");
ALTER TYPE "figma_team_status" RENAME TO "figma_team_status_old";
ALTER TYPE "figma_team_status_new" RENAME TO "figma_team_status";
DROP TYPE "figma_team_status_old";
COMMIT;
