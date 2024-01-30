-- AlterTable
ALTER TABLE "jira_associated_figma_design" ADD COLUMN     "dev_status" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "last_updated" TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
