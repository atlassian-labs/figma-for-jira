-- CreateEnum
CREATE TYPE "figma_team_auth_status" AS ENUM ('OK', 'ERROR');

-- CreateTable
CREATE TABLE "connect_installation" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "client_key" TEXT NOT NULL,
    "shared_secret" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "display_url" TEXT NOT NULL,

    CONSTRAINT "connect_installation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "associated_figma_design" (
    "id" SERIAL NOT NULL,
    "file_key" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "connect_installation_id" INTEGER NOT NULL,

    CONSTRAINT "associated_figma_design_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "figma_oauth2_user_credentials" (
    "id" SERIAL NOT NULL,
    "atlassian_user_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "figma_oauth2_user_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "figma_team" (
    "id" SERIAL NOT NULL,
    "webhook_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "team_name" TEXT NOT NULL,
    "figma_admin_atlassian_user_id" TEXT NOT NULL,
    "authStatus" "figma_team_auth_status" NOT NULL,
    "connect_installation_id" INTEGER NOT NULL,

    CONSTRAINT "figma_team_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "connect_installation_client_key_key" ON "connect_installation"("client_key");

-- CreateIndex
CREATE UNIQUE INDEX "associated_figma_design_file_key_node_id_connect_installati_key" ON "associated_figma_design"("file_key", "node_id", "connect_installation_id");

-- CreateIndex
CREATE UNIQUE INDEX "figma_oauth2_user_credentials_atlassian_user_id_key" ON "figma_oauth2_user_credentials"("atlassian_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "figma_team_webhook_id_key" ON "figma_team"("webhook_id");

-- CreateIndex
CREATE UNIQUE INDEX "figma_team_team_id_connect_installation_id_key" ON "figma_team"("team_id", "connect_installation_id");

-- AddForeignKey
ALTER TABLE "associated_figma_design" ADD CONSTRAINT "associated_figma_design_connect_installation_id_fkey" FOREIGN KEY ("connect_installation_id") REFERENCES "connect_installation"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "figma_team" ADD CONSTRAINT "figma_team_connect_installation_id_fkey" FOREIGN KEY ("connect_installation_id") REFERENCES "connect_installation"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
