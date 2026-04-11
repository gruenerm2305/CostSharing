import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Receipt } from '../../receipts/entities/receipt.entity';
import { ReceiptItem } from '../../receipts/entities/receipt-item.entity';
import { User } from '../../users/entities/user.entity';

@Entity('item_claims')
@Index(['itemId', 'claimerUserId'], { unique: true })
export class ItemClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  receiptId: string;

  @ManyToOne(() => Receipt, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiptId' })
  receipt: Receipt;

  @Column()
  itemId: string;

  @ManyToOne(() => ReceiptItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'itemId' })
  item: ReceiptItem;

  @Column()
  claimerUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'claimerUserId' })
  claimer: User;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  claimedQuantity: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  claimedPercentage: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
