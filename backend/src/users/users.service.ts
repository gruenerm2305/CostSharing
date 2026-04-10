import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureOwnerRole();
  }

  async create(username: string, password: string, firstName?: string, lastName?: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const normalizedUsername = username.trim();
    const role = normalizedUsername.toLowerCase() === 'owner' ? UserRole.Owner : UserRole.User;
    
    const user = this.usersRepository.create({
      username: normalizedUsername,
      password: hashedPassword,
      firstName,
      lastName,
      role,
    });

    return this.usersRepository.save(user);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'username', 'firstName', 'lastName', 'role', 'createdAt', 'updatedAt'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async findAllUserSummaries(): Promise<Array<Pick<User, 'id' | 'username' | 'firstName' | 'lastName' | 'role' | 'createdAt' | 'updatedAt'>>> {
    return this.usersRepository.find({
      select: ['id', 'username', 'firstName', 'lastName', 'role', 'createdAt', 'updatedAt'],
      order: { username: 'ASC' },
    });
  }

  async removeById(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.usersRepository.remove(user);
  }

  async updateUsername(user: User, newUsername: string): Promise<User> {
    user.username = newUsername;
    return this.usersRepository.save(user);
  }

  async updateUsernameById(id: string, newUsername: string): Promise<void> {
    const user = await this.findById(id);
    await this.updateUsername(user, newUsername);
    user.username = newUsername;
    await this.usersRepository.save(user);
  }

  async updatePasswordById(id: string, newPassword: string): Promise<void> {
    const user = await this.findById(id);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await this.usersRepository.save(user);
  }

  async updateRoleById(id: string, role: UserRole): Promise<void> {
    const user = await this.findById(id);
    user.role = role;
    await this.usersRepository.save(user);
  }

  getRolePermissions(role: UserRole) {
    if (role === UserRole.Owner) {
      return {
        role,
        canListUsers: true,
        deletableRoles: [UserRole.Admin, UserRole.User],
        assignableRoles: [UserRole.Admin, UserRole.User],
        assignableTargetRoles: [UserRole.Admin, UserRole.User],
        canDeleteSelf: false,
        canDeleteAdmin: true,
        canDeleteUser: true,
      };
    }

    if (role === UserRole.Admin) {
      return {
        role,
        canListUsers: true,
        deletableRoles: [UserRole.User],
        assignableRoles: [UserRole.Admin],
        assignableTargetRoles: [UserRole.User],
        canDeleteSelf: true,
        canDeleteAdmin: false,
        canDeleteUser: true,
      };
    }

    return {
      role,
      canListUsers: false,
      deletableRoles: [],
      assignableRoles: [],
      assignableTargetRoles: [],
      canDeleteSelf: true,
      canDeleteAdmin: false,
      canDeleteUser: false,
    };
  }

  private async ensureOwnerRole(): Promise<void> {
    const ownerUser = await this.usersRepository.findOne({
      where: [{ username: 'Owner' }, { username: 'owner' }],
    });

    if (!ownerUser) {
      return;
    }

    if (ownerUser.role !== UserRole.Owner) {
      ownerUser.role = UserRole.Owner;
      await this.usersRepository.save(ownerUser);
      this.logger.warn('Owner account role was corrected to Owner.');
    }
  }
}
