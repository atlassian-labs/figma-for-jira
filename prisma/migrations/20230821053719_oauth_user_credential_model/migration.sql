-- CreateTable
CREATE TABLE "OAuthUserCredential" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresIn" TEXT NOT NULL,

    CONSTRAINT "OAuthUserCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthUserCredential_userId_key" ON "OAuthUserCredential"("userId");
