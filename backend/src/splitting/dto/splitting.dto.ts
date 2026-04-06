import { IsString, IsNumber, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteUserDto {
  @ApiProperty({ example: 'uuid-receipt-id' })
  @IsString()
  receiptId: string;

  @ApiProperty({ example: 'friend@example.com' })
  @IsEmail()
  userEmail: string;

  @ApiProperty({ example: 'Let\'s split this receipt!', required: false })
  @IsOptional()
  @IsString()
  message?: string;
}

export class ClaimItemDto {
  @ApiProperty({ example: 'uuid-receipt-id' })
  @IsString()
  receiptId: string;

  @ApiProperty({ example: 'uuid-item-id' })
  @IsString()
  itemId: string;

  @ApiProperty({ example: 1, required: false, description: 'Quantity to claim' })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiProperty({ example: 50, required: false, description: 'Percentage to claim (0-100)' })
  @IsOptional()
  @IsNumber()
  percentage?: number;
}
