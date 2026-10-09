ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "verificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN "verificationExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_verificationToken_key" ON "User"("verificationToken");