import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({ example: 'newPassword' })
  @IsString()
  @MinLength(6)
  password: string;
}
