import { Injectable } from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** basic prisma wrapper*/
@Injectable()
export class AdminUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async ensureRole(name: RoleName) {
    let role = await this.prisma.role.findUnique({ where: { name } });
    if (!role) {
      role = await this.prisma.role.create({ data: { name } });
    }
    return role;
  }

  count(): Promise<number> {
    return this.prisma.user.count();
  }

  findManyPaginated(skip: number, take: number) {
    return this.prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { role: true },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data,
      include: { role: true },
    });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: { role: true },
    });
  }
}
