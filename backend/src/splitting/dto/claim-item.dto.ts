import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class ClaimItemDto {
  @ApiProperty({ example: 1, required: false, description: 'Mengen-Split' })
  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => o.claimedPercentage === undefined)
  claimedQuantity?: number;

  @ApiProperty({ example: 0.5, required: false, description: 'Wert-Split 0-1' })
  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => o.claimedQuantity === undefined)
  claimedPercentage?: number;
}
