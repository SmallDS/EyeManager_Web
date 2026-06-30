UPDATE "Customer"
SET "note" = CASE
  WHEN "note" IS NULL OR btrim("note") = '' THEN '原备用电话: ' || "secondaryPhone"
  ELSE "note" || E'\n' || '原备用电话: ' || "secondaryPhone"
END
WHERE "secondaryPhone" IS NOT NULL AND btrim("secondaryPhone") <> '';

ALTER TABLE "Customer" DROP COLUMN "secondaryPhone";
