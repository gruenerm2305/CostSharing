import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UserRole } from './entities/user.entity';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete user by id' })
  @ApiParam({ name: 'id', type: String })
  async deleteUser(@Param('id') id: string) {
    await this.usersService.removeById(id);
    return { success: true };
  }

  @Patch(':id/username') //Kann jeder machen, keine Berechtigungsprüfung
  @ApiOperation({ summary: 'Update username by id' })
  @ApiParam({ name: 'id', type: String })
  async updateUsername(@Param('id') id: string, @Body() body: UpdateUsernameDto) {
    await this.usersService.updateUsernameById(id, body.username);
    return { success: true };
  }

  @Patch(':id/password') //Kann jeder machen, keine Berechtigungsprüfung
  @ApiOperation({ summary: 'Update password by id' })
  @ApiParam({ name: 'id', type: String })
  async updatePassword(@Param('id') id: string, @Body() body: UpdatePasswordDto) {
    await this.usersService.updatePasswordById(id, body.password);
    return { success: true };
  }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user role by id (Owner only)' })
  @ApiParam({ name: 'id', type: String })
  async updateRole(@Request() req, @Param('id') id: string, @Body() body: UpdateRoleDto) {
    const requester = await this.usersService.findById(req.user.userId);
    const targetUser = await this.usersService.findById(id);

    if (requester.role === UserRole.User) {
      throw new ForbiddenException('Users cannot manage roles');
    }

    if (requester.role === UserRole.Admin) {
      if (targetUser.role !== UserRole.User || body.role !== UserRole.Admin) {
        throw new ForbiddenException('Admins can only promote users to admin');
      }
    }

    if (requester.role === UserRole.Owner) {
      if (targetUser.role === UserRole.Owner && body.role !== UserRole.Owner) {
        throw new ForbiddenException('Owner role cannot be changed');
      }
    }

    await this.usersService.updateRoleById(id, body.role);
    return { success: true };
  }


}