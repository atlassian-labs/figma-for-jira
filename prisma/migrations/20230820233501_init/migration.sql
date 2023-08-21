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

-- CreateIndex
CREATE UNIQUE INDEX "ConnectInstallation_key_key" ON "ConnectInstallation"("key");
