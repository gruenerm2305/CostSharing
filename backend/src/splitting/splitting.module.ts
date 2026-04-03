import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SplittingService } from './splitting.service';
import { SplittingController } from './splitting.controller';
import { Receipt } from '../receipts/entities/receipt.entity';
import { ReceiptItem } from '../receipts/entities/receipt-item.entity';
import { ReceiptsModule } from '../receipts/receipts.module';
import { UsersModule } from '../users/users.module';
import { ReceiptParticipant } from './entities/receipt-participant.entity';
import { ItemClaim } from './entities/item-claim.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Receipt, ReceiptItem, ReceiptParticipant, ItemClaim]),
    ReceiptsModule,
    UsersModule,
  ],
  controllers: [SplittingController],
  providers: [SplittingService],
})
export class SplittingModule {}
