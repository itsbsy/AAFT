-- Extra indexes for common filters (FK uniques already cover some paths)
CREATE INDEX "Enrollment_course_run_id_idx" ON "Enrollment"("course_run_id");
CREATE INDEX "Enrollment_user_id_idx" ON "Enrollment"("user_id");
CREATE INDEX "Certificate_course_run_id_idx" ON "Certificate"("course_run_id");
CREATE INDEX "Certificate_user_id_idx" ON "Certificate"("user_id");
CREATE INDEX "CourseRun_course_id_idx" ON "CourseRun"("course_id");
CREATE INDEX "QuizAttempt_user_id_idx" ON "QuizAttempt"("user_id");
CREATE INDEX "UnitProgress_user_id_idx" ON "UnitProgress"("user_id");
