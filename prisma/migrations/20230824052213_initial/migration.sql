-- CreateTable
CREATE TABLE "ConnectInstallation" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "sharedSecret" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "displayUrl" TEXT NOT NULL,

    CONSTRAINT "ConnectInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FigmaOAuth2UserCredentials" (
    "id" SERIAL NOT NULL,
    "atlassianUserId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "FigmaOAuth2UserCredentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConnectInstallation_key_key" ON "ConnectInstallation"("key");

-- CreateIndex
CREATE UNIQUE INDEX "FigmaOAuth2UserCredentials_atlassianUserId_key" ON "FigmaOAuth2UserCredentials"("atlassianUserId");
