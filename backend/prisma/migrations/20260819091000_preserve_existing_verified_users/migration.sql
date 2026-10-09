UPDATE "User"
SET "emailVerified" = true
WHERE "verificationToken" IS NULL;