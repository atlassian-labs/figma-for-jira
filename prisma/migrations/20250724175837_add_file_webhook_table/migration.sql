-- CreateEnum
CREATE TYPE "jira_figma_webhook_event_type" AS ENUM ('FILE_UPDATE', 'DEV_MODE_STATUS_UPDATE');

-- CreateTable
CREATE TABLE "jira_figma_file_webhook" (
    "id" BIGSERIAL NOT NULL,
    "webhook_id" TEXT NOT NULL,
    "webhook_passcode" TEXT NOT NULL,
    "event_type" "jira_figma_webhook_event_type" NOT NULL,
    "file_key" TEXT NOT NULL,
    "creator_atlassian_user_id" TEXT NOT NULL,
    "connect_installation_id" BIGINT NOT NULL,

    CONSTRAINT "jira_figma_file_webhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jira_figma_file_webhook_webhook_id_key" ON "jira_figma_file_webhook"("webhook_id");

-- CreateIndex
CREATE UNIQUE INDEX "jira_figma_file_webhook_file_key_event_type_connect_install_key" ON "jira_figma_file_webhook"("file_key", "event_type", "connect_installation_id");

-- AddForeignKey
ALTER TABLE "jira_figma_file_webhook" ADD CONSTRAINT "jira_figma_file_webhook_connect_installation_id_fkey" FOREIGN KEY ("connect_installation_id") REFERENCES "jira_connect_installation"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
