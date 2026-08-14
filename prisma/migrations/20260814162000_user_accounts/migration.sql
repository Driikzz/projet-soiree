ALTER TABLE "Admin"
ADD COLUMN "email" VARCHAR(254),
ADD COLUMN "displayName" VARCHAR(80);

UPDATE "Admin"
SET "displayName" = "username"
WHERE "displayName" IS NULL;

ALTER TABLE "Admin"
ALTER COLUMN "displayName" SET NOT NULL,
ALTER COLUMN "username" DROP NOT NULL;

CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
