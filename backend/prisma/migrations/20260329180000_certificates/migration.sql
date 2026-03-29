-- CreateTable
CREATE TABLE "Certificate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enrollment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_run_id" UUID NOT NULL,
    "verification_code" TEXT NOT NULL,
    "course_title_snapshot" TEXT NOT NULL,
    "run_name_snapshot" TEXT NOT NULL,
    "recipient_name_snapshot" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_enrollment_id_key" ON "Certificate"("enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verification_code_key" ON "Certificate"("verification_code");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_course_run_id_fkey" FOREIGN KEY ("course_run_id") REFERENCES "CourseRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
