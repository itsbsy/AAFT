import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CertificatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEnrollmentId(enrollmentId: string) {
    return this.prisma.certificate.findUnique({ where: { enrollmentId } });
  }

  findByVerificationCode(code: string) {
    return this.prisma.certificate.findUnique({
      where: { verificationCode: code },
    });
  }

  create(data: Prisma.CertificateCreateInput) {
    return this.prisma.certificate.create({ data });
  }
}
