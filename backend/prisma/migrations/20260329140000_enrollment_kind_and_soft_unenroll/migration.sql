-- CreateEnum
CREATE TYPE "EnrollmentKind" AS ENUM ('free', 'paid', 'honor');

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN "kind" "EnrollmentKind" NOT NULL DEFAULT 'free';
ALTER TABLE "Enrollment" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Enrollment" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex (prevent duplicate enrollment rows per user per run)
CREATE UNIQUE INDEX "Enrollment_course_run_id_user_id_key" ON "Enrollment"("course_run_id", "user_id");
