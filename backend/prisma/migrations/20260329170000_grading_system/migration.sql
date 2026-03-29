-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN "grade_weighted" DOUBLE PRECISION,
ADD COLUMN "grade_passed" BOOLEAN,
ADD COLUMN "grade_breakdown" JSONB;

-- CreateTable
CREATE TABLE "GradingConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_run_id" UUID NOT NULL,
    "weights" JSONB NOT NULL,
    "pass_threshold_percent" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GradingConfig_course_run_id_key" ON "GradingConfig"("course_run_id");

-- AddForeignKey
ALTER TABLE "GradingConfig" ADD CONSTRAINT "GradingConfig_course_run_id_fkey" FOREIGN KEY ("course_run_id") REFERENCES "CourseRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
