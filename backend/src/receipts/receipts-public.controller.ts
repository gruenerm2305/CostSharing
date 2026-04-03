import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReceiptsService } from './receipts.service';

@ApiTags('receipts-public')
@Controller('share')
export class ReceiptsPublicController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get(':shareToken')
  @ApiOperation({ summary: 'Get receipt by share token (public, read-only)' })
  async getSharedReceipt(@Param('shareToken') shareToken: string) {
    return this.receiptsService.getReceiptByShareToken(shareToken);
  }
}
