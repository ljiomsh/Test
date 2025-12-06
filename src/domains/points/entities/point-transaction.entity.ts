import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('point_transactions')
@Index(['userId'])
@Index(['createdAt'])
export class PointTransaction {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    userId!: string;

    @Column()
    type!: string;

    @Column({ type: 'int' })
    amount!: number;

    @Column()
    description!: string;

    @Column({ type: 'int' })
    balanceBefore!: number;

    @Column({ type: 'int' })
    balanceAfter!: number;

    @CreateDateColumn()
    createdAt!: Date;
}
