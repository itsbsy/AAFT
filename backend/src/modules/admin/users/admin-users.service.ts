import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AdminUsersRepository } from './admin-users.repository';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AdminUsersService {
  constructor(private readonly usersRepo: AdminUsersRepository) {}

  async create(dto: CreateAdminUserDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.usersRepo.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const role = await this.usersRepo.ensureRole(dto.role);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.usersRepo.create({
      email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: { connect: { id: role.id } },
    });

    return this.toPublic(user);
  }

  async findAll(query: ListUsersQueryDto) {

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const skip = (page - 1) * limit;

    const rows = await this.usersRepo.findManyPaginated(skip, limit);
    return rows.map((u) => this.toPublic(u));
  }

  async findOne(id: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toPublic(user);
  }

  async update(id: string, dto: UpdateAdminUserDto) {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email !== undefined) {
      const email = dto.email.toLowerCase();
      const other = await this.usersRepo.findByEmail(email);
      if (other && other.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.email !== undefined) {
      data.email = dto.email.toLowerCase();
    }
    if (dto.firstName !== undefined) {
      data.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      data.lastName = dto.lastName;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    }
    if (dto.role !== undefined) {
      const role = await this.usersRepo.ensureRole(dto.role);
      data.role = { connect: { id: role.id } };
    }

    if (Object.keys(data).length === 0) {
      return this.toPublic(user);
    }

    const updated = await this.usersRepo.update(id, data);
    return this.toPublic(updated);
  }

  async softDelete(id: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // soft delete only sets flag 
    const updated = await this.usersRepo.update(id, { isActive: false });
    return this.toPublic(updated);
  }

  private toPublic(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    role: { id: string; name: RoleName; createdAt: Date; updatedAt: Date };
  }) {
    const { role, ...rest } = user;
    return {
      ...rest,
      role: { id: role.id, name: role.name },
    };
  }
}
