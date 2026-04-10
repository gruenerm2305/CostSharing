import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UserRole } from './entities/user.entity';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  @Get('me/permissions')
  @ApiOperation({ summary: 'Get current user permissions' })
  @ApiResponse({ status: 200, description: 'Current user permissions returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPermissions(@Request() req) {
    return this.usersService.getRolePermissions(req.user.role);
  }

  @Get()
  @ApiOperation({ summary: 'List users with id and username' })
  @ApiResponse({ status: 200, description: 'User list returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden for current role' })
  async listUsers(@Request() req) {
    if (req.user.role !== UserRole.Owner && req.user.role !== UserRole.Admin) {
      throw new ForbiddenException('Only owners and admins can list users');
    }
    return this.usersService.findAllUserSummaries();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden for current role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Request() req, @Param('id') id: string) {
    const requester = await this.usersService.findById(req.user.userId);
    const targetUser = await this.usersService.findById(id);

    // Every authenticated user except Owner may delete their own account.
    if (targetUser.id === requester.id) {
      if (requester.role === UserRole.Owner) {
        throw new ForbiddenException('Owner account cannot be deleted');
      }
      await this.usersService.removeById(id);
      return { success: true };
    }

    if (requester.role === UserRole.Owner) {
      if (targetUser.role === UserRole.Owner) {
        throw new ForbiddenException('Owners cannot delete other owners');
      }
    } else if (requester.role === UserRole.Admin) {
      if (targetUser.role !== UserRole.User) {
        throw new ForbiddenException('Admins can only delete users');
      }
    } else {
      throw new ForbiddenException('Users can only delete their own account');
    }

    await this.usersService.removeById(id);
    return { success: true };
  }

  @Patch(':id/username') 
  @ApiOperation({ summary: 'Update username by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Username updated' })
  @ApiResponse({ status: 400, description: 'Invalid username payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden for current role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUsername(@Request() req, @Param('id') id: string, @Body() body: UpdateUsernameDto) {
    if (id !== req.user.userId) {
      throw new ForbiddenException('Users can only update their own username');
    }
    await this.usersService.updateUsernameById(id, body.username);
    return { success: true };
  }

  @Patch(':id/password') 
  @ApiOperation({ summary: 'Update password by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Password updated' })
  @ApiResponse({ status: 400, description: 'Invalid password payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden for current role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updatePassword(@Request() req, @Param('id') id: string, @Body() body: UpdatePasswordDto) {
    if (id !== req.user.userId) {
      throw new ForbiddenException('Users can only update their own password');
    }
    await this.usersService.updatePasswordById(id, body.password);
    return { success: true };
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Update user role by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'User role updated' })
  @ApiResponse({ status: 400, description: 'Invalid role payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden for current role' })
  @ApiResponse({ status: 404, description: 'User not found' })
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