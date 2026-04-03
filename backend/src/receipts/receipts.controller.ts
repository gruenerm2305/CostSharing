import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto, UpdateReceiptDto } from './dto/receipt.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('receipts')
@Controller('receipts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload receipt image for OCR processing' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadReceipt(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.receiptsService.processReceiptImage(req.user.userId, file);
  }

  @Post('manual')
  @ApiOperation({ summary: 'Create receipt manually without image' })
  create(@Request() req, @Body() createReceiptDto: CreateReceiptDto) {
    return this.receiptsService.createManual(req.user.userId, {
      date: new Date(createReceiptDto.date),
      merchant: createReceiptDto.merchant,
      categoryId: createReceiptDto.categoryId,
      totalAmount: createReceiptDto.totalAmount,
      items: createReceiptDto.items,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all receipts for current user' })
  findAll(@Request() req) {
    return this.receiptsService.findAll(req.user.userId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get receipt statistics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getStatistics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.receiptsService.getStatistics(
      req.user.userId,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific receipt' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.receiptsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a receipt' })
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateReceiptDto: UpdateReceiptDto,
  ) {
    return this.receiptsService.update(id, req.user.userId, {
      date: updateReceiptDto.date ? new Date(updateReceiptDto.date) : undefined,
      merchant: updateReceiptDto.merchant,
      categoryId: updateReceiptDto.categoryId,
      totalAmount: updateReceiptDto.totalAmount,
      items: updateReceiptDto.items,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a receipt' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.receiptsService.remove(id, req.user.userId);
    return { message: 'Receipt deleted successfully' };
  }

  @Get(':id/share-link')
  @ApiOperation({ summary: 'Get or generate share link for receipt' })
  getShareLink(@Param('id') id: string, @Request() req) {
    return this.receiptsService.getShareLink(id, req.user.userId);
  }
}
