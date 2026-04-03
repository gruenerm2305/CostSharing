import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ReceiptsService } from './receipts.service';
import { ReceiptClaimsService } from './receipt-claims.service';
import { ReceiptsController } from './receipts.controller';
import { Receipt } from './entities/receipt.entity';
import { ReceiptItem } from './entities/receipt-item.entity';
import { ReceiptParticipant } from '../splitting/entities/receipt-participant.entity';
import { ItemClaim } from '../splitting/entities/item-claim.entity';
import { ValidationModule } from 'src/validation/validation.module';
import { CategoriesModule } from '../categories/categories.module';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { ReceiptsPublicController } from './receipts-public.controller';
import { OcrModule } from 'src/ocr/ocr.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Receipt, ReceiptItem, ReceiptParticipant, ItemClaim]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array.from({ length: 32 })
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
          return cb(new Error('Only image and PDF files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
    OcrModule,
    ValidationModule,
    CategoriesModule,
  ],
  controllers: [ReceiptsController, ReceiptsPublicController],
  providers: [ReceiptsService, ReceiptClaimsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
