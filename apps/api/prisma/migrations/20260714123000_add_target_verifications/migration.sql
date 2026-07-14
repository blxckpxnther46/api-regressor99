CREATE TYPE "TargetVerificationMethod" AS ENUM ('WELL_KNOWN', 'DNS_TXT', 'HEADER', 'JSON_BODY');
CREATE TYPE "TargetVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'REVOKED');

CREATE TABLE "target_verifications" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "target_base_url" TEXT NOT NULL,
  "method" "TargetVerificationMethod" NOT NULL,
  "token_hash" TEXT NOT NULL,
  "status" "TargetVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verification_url" TEXT,
  "verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "target_verifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "target_verifications_project_id_status_idx" ON "target_verifications"("project_id", "status");
CREATE INDEX "target_verifications_organization_id_created_at_idx" ON "target_verifications"("organization_id", "created_at");

ALTER TABLE "target_verifications"
ADD CONSTRAINT "target_verifications_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
