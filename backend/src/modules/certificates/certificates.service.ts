import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { CertificatesRepository } from './certificates.repository';

export type IssueCertificateContext = {
  enrollmentId: string;
  userId: string;
  courseRunId: string;
  courseTitle: string;
  runName: string;
  recipientFirstName: string;
  recipientLastName: string;
};

@Injectable()
export class CertificatesService {
  constructor(private readonly repo: CertificatesRepository) {}

  /**
   * certificate generation is simple sync logic  unique verification_code at DB 
   */
  async issueForPassedEnrollment(
    passed: boolean,
    ctx: IssueCertificateContext,
  ) {
    if (!passed) {
      return null;
    }

    const existing = await this.repo.findByEnrollmentId(ctx.enrollmentId);
    if (existing) {
      return existing;
    }

    const recipientNameSnapshot =
      `${ctx.recipientFirstName} ${ctx.recipientLastName}`.trim();

    for (let i = 0; i < 5; i++) {
      const verificationCode = randomBytes(16).toString('hex');
      try {
        return await this.repo.create({
          enrollment: { connect: { id: ctx.enrollmentId } },
          user: { connect: { id: ctx.userId } },
          courseRun: { connect: { id: ctx.courseRunId } },
          verificationCode,
          courseTitleSnapshot: ctx.courseTitle,
          runNameSnapshot: ctx.runName,
          recipientNameSnapshot,
        });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          continue;
        }
        throw e;
      }
    }
    throw new Error('Could not allocate verification code');
  }

  async verify(code: string) {
    const normalized = code.trim();
    if (!normalized) {
      return { valid: false as const };
    }

    const cert = await this.repo.findByVerificationCode(normalized);
    if (!cert) {
      return { valid: false as const };
    }

    return {
      valid: true as const,
      issuedAt: cert.issuedAt.toISOString(),
      courseTitle: cert.courseTitleSnapshot,
      runName: cert.runNameSnapshot,
      recipientName: cert.recipientNameSnapshot,
    };
  }
}
