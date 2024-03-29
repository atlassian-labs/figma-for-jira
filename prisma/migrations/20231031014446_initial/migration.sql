-- CreateEnum
CREATE TYPE "jira_figma_team_auth_status" AS ENUM ('OK', 'ERROR');

-- CreateTable
CREATE TABLE "jira_connect_installation" (
    "id" BIGSERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "client_key" TEXT NOT NULL,
    "shared_secret" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "display_url" TEXT NOT NULL,

    CONSTRAINT "jira_connect_installation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_associated_figma_design" (
    "id" BIGSERIAL NOT NULL,
    "file_key" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "associated-with-ari" TEXT NOT NULL,
    "connect_installation_id" BIGINT NOT NULL,

    CONSTRAINT "jira_associated_figma_design_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_figma_oauth2_user_credentials" (
    "id" BIGSERIAL NOT NULL,
    "atlassian_user_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "connect_installation_id" BIGINT NOT NULL,

    CONSTRAINT "jira_figma_oauth2_user_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_figma_team" (
    "id" BIGSERIAL NOT NULL,
    "webhook_id" TEXT NOT NULL,
    "webhook_passcode" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "team_name" TEXT NOT NULL,
    "figma_admin_atlassian_user_id" TEXT NOT NULL,
    "authStatus" "jira_figma_team_auth_status" NOT NULL,
    "connect_installation_id" BIGINT NOT NULL,

    CONSTRAINT "jira_figma_team_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jira_connect_installation_client_key_key" ON "jira_connect_installation"("client_key");

-- CreateIndex
CREATE UNIQUE INDEX "jira_associated_figma_design_file_key_node_id_associated-wi_key" ON "jira_associated_figma_design"("file_key", "node_id", "associated-with-ari", "connect_installation_id");

-- CreateIndex
CREATE UNIQUE INDEX "jira_figma_oauth2_user_credentials_atlassian_user_id_connec_key" ON "jira_figma_oauth2_user_credentials"("atlassian_user_id", "connect_installation_id");

-- CreateIndex
CREATE UNIQUE INDEX "jira_figma_team_webhook_id_key" ON "jira_figma_team"("webhook_id");

-- CreateIndex
CREATE UNIQUE INDEX "jira_figma_team_team_id_connect_installation_id_key" ON "jira_figma_team"("team_id", "connect_installation_id");

-- AddForeignKey
ALTER TABLE "jira_associated_figma_design" ADD CONSTRAINT "jira_associated_figma_design_connect_installation_id_fkey" FOREIGN KEY ("connect_installation_id") REFERENCES "jira_connect_installation"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jira_figma_oauth2_user_credentials" ADD CONSTRAINT "jira_figma_oauth2_user_credentials_connect_installation_id_fkey" FOREIGN KEY ("connect_installation_id") REFERENCES "jira_connect_installation"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jira_figma_team" ADD CONSTRAINT "jira_figma_team_connect_installation_id_fkey" FOREIGN KEY ("connect_installation_id") REFERENCES "jira_connect_installation"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
