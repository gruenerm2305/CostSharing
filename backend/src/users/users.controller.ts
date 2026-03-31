import { Body, Controller, Delete, Get, Param, Patch, Request } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  @Delete(':id')
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


}