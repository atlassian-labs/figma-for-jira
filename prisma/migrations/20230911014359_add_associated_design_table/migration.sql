-- CreateTable
CREATE TABLE "AssociatedDesign" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,

    CONSTRAINT "AssociatedDesign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssociatedDesign_url_key" ON "AssociatedDesign"("url");
