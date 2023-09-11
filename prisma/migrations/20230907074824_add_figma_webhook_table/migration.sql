-- CreateEnum
CREATE TYPE "FigmaWebhookStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'ERROR');

-- CreateTable
CREATE TABLE "FigmaWebhook" (
    "id" SERIAL NOT NULL,
    "webhookId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "figmaAdminAtlassianUserId" TEXT NOT NULL,
    "status" "FigmaWebhookStatus" NOT NULL,

    CONSTRAINT "FigmaWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FigmaWebhook_webhookId_key" ON "FigmaWebhook"("webhookId");

-- CreateIndex
CREATE UNIQUE INDEX "FigmaWebhook_teamId_key" ON "FigmaWebhook"("teamId");
