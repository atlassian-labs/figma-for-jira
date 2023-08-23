-- CreateTable
CREATE TABLE "OAuthUserCredential" (
    "id" SERIAL NOT NULL,
    "atlassianUserId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresIn" INTEGER NOT NULL,

    CONSTRAINT "OAuthUserCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthUserCredential_atlassianUserId_key" ON "OAuthUserCredential"("atlassianUserId");
