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
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
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
  @ApiResponse({ status: 201, description: 'Receipt created from OCR' })
  @ApiResponse({ status: 400, description: 'Invalid file upload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiResponse({ status: 201, description: 'Receipt created manually' })
  @ApiResponse({ status: 400, description: 'Invalid receipt payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiResponse({ status: 200, description: 'Receipt list returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Request() req) {
    return this.receiptsService.findAll(req.user.userId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get receipt statistics' })
  @ApiResponse({ status: 200, description: 'Statistics returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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

  @Get('export')
  @ApiOperation({ summary: 'Export receipts as ZIP of CSV files' })
  @ApiResponse({ status: 200, description: 'ZIP export generated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportReceipts(@Request() req, @Res({ passthrough: true }) res) {
    const zipBuffer = await this.receiptsService.exportReceiptsZip(req.user.userId);
    const fileName = `Receipts-${req.user.userId}.zip`;

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    return new StreamableFile(zipBuffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific receipt' })
  @ApiResponse({ status: 200, description: 'Receipt returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.receiptsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a receipt' })
  @ApiResponse({ status: 200, description: 'Receipt updated' })
  @ApiResponse({ status: 400, description: 'Invalid receipt payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
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
  @ApiResponse({ status: 200, description: 'Receipt deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.receiptsService.remove(id, req.user.userId);
    return { message: 'Receipt deleted successfully' };
  }

  @Get(':id/share-link')
  @ApiOperation({ summary: 'Get or generate share link for receipt' })
  @ApiResponse({ status: 200, description: 'Share link returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  getShareLink(@Param('id') id: string, @Request() req) {
    return this.receiptsService.getShareLink(id, req.user.userId);
  }
}
