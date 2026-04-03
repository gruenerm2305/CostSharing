import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('receipt_participants')
@Index(['receiptId', 'userId'], { unique: true })
export class ReceiptParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  receiptId: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', length: 20, default: 'participant' })
  role: 'owner' | 'participant';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
