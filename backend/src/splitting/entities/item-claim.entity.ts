import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('item_claims')
@Index(['itemId', 'claimerUserId'], { unique: true })
export class ItemClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  receiptId: string;

  @Column()
  itemId: string;

  @Column()
  claimerUserId: string;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  claimedQuantity: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  claimedPercentage: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
