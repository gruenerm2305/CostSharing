import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(username: string, password: string, firstName?: string, lastName?: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = this.usersRepository.create({
      username,
      password: hashedPassword,
      firstName,
      lastName,
    });

    return this.usersRepository.save(user);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
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
}
