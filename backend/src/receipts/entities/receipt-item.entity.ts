import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Receipt } from './receipt.entity';
import { Category } from '../../categories/entities/category.entity';
import { User } from '../../users/entities/user.entity';

@Entity('receipt_items')
export class ReceiptItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  receiptId: string;

  @ManyToOne(() => Receipt, (receipt) => receipt.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiptId' })
  receipt: Receipt;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ default: false })
  needsReview: boolean;

  // For shared receipts
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  sharedQuantity: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  sharedPercentage: number;

  @Column({ nullable: true })
  assignedToUserId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignedToUserId' })
  assignedToUser: User;
}
