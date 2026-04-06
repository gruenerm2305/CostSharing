import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiProperty({ example: 'Lebensmittel', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '#4CAF50', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: '🛒', required: false })
  @IsOptional()
  @IsString()
  icon?: string;
}
