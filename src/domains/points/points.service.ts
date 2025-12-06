import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Point } from './entities/point.entity';
import { PointTransaction } from './entities/point-transaction.entity';
import { CreatePointTransactionDto } from './dto/create-point-transaction.dto';
import { GetPointTransactionsDto } from './dto/get-point-transactions.dto';
import { PointTransactionType } from './entities/point.entity';

@Injectable()
export class PointsService {
    constructor(
        @InjectRepository(Point)
        private pointsRepository: Repository<Point>,
        @InjectRepository(PointTransaction)
        private pointTransactionsRepository: Repository<PointTransaction>,
    ) { }

    async initializeUserPoint(userId: string, initialBalance: number): Promise<Point> {
        let point = await this.pointsRepository.findOne({ where: { userId } });

        if (!point) {
            point = this.pointsRepository.create({
                userId,
                balance: initialBalance,
            });
            await this.pointsRepository.save(point);
        }

        return point;
    }

    async getBalance(userId: string): Promise<number> {
        const point = await this.pointsRepository.findOne({ where: { userId } });
        return point ? point.balance : 0;
    }

    async addPoints(createPointTransactionDto: CreatePointTransactionDto): Promise<Point> {
        const { userId, amount, type, description } = createPointTransactionDto;

        if (amount <= 0) {
            throw new BadRequestException('NEGATIVE_AMOUNT_NOT_ALLOWED');
        }

        let point = await this.pointsRepository.findOne({ where: { userId } });
        if (!point) {
            point = await this.initializeUserPoint(userId, 0);
        }

        const balanceBefore = point.balance;
        const balanceAfter = point.balance + amount;

        point.balance = balanceAfter;
        await this.pointsRepository.save(point);

        await this.pointTransactionsRepository.save({
            userId,
            type,
            amount,
            description,
            balanceBefore,
            balanceAfter,
        });

        return point;
    }

    async spendPoints(createPointTransactionDto: CreatePointTransactionDto): Promise<Point> {
        const { userId, amount, type, description } = createPointTransactionDto;

        if (amount <= 0) {
            throw new BadRequestException('NEGATIVE_AMOUNT_NOT_ALLOWED');
        }

        let point = await this.pointsRepository.findOne({ where: { userId } });
        if (!point) {
            point = await this.initializeUserPoint(userId, 0);
        }

        if (point.balance < amount) {
            throw new BadRequestException('INSUFFICIENT_POINTS');
        }

        const balanceBefore = point.balance;
        const balanceAfter = point.balance - amount;

        point.balance = balanceAfter;
        await this.pointsRepository.save(point);

        await this.pointTransactionsRepository.save({
            userId,
            type,
            amount,
            description,
            balanceBefore,
            balanceAfter,
        });

        return point;
    }

    async refundPoints(createPointTransactionDto: CreatePointTransactionDto): Promise<Point> {
        const { userId, amount, type, description } = createPointTransactionDto;

        if (amount <= 0) {
            throw new BadRequestException('NEGATIVE_AMOUNT_NOT_ALLOWED');
        }

        let point = await this.pointsRepository.findOne({ where: { userId } });
        if (!point) {
            point = await this.initializeUserPoint(userId, 0);
        }

        const balanceBefore = point.balance;
        const balanceAfter = point.balance + amount;

        point.balance = balanceAfter;
        await this.pointsRepository.save(point);

        await this.pointTransactionsRepository.save({
            userId,
            type,
            amount,
            description,
            balanceBefore,
            balanceAfter,
        });

        return point;
    }

    async getTransactionHistory(getPointTransactionsDto: GetPointTransactionsDto): Promise<PointTransaction[]> {
        const { userId, type, startDate, endDate } = getPointTransactionsDto;

        const query = this.pointTransactionsRepository
            .createQueryBuilder('transaction')
            .where('transaction.userId = :userId', { userId });

        if (type) {
            query.andWhere('transaction.type = :type', { type });
        }

        if (startDate) {
            query.andWhere('transaction.createdAt >= :startDate', { startDate });
        }

        if (endDate) {
            query.andWhere('transaction.createdAt <= :endDate', { endDate });
        }

        return query
            .orderBy('transaction.createdAt', 'DESC')
            .getMany();
    }

    async getLastTransaction(userId: string): Promise<PointTransaction | null> {
        return this.pointTransactionsRepository.findOne({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }
}
