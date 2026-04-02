import { ApiProperty } from '@nestjs/swagger/dist/decorators/api-property.decorator';
import { IsString, MinLength } from 'class-validator';

export class UpdateUsernameDto {
  @ApiProperty({ example: 'newUsername' })
  @IsString()
  @MinLength(3)
  username: string;
}
