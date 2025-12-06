import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Point } from './entities/point.entity';
import { PointTransaction } from './entities/point-transaction.entity';
import { CreatePointTransactionDto } from './dto/create-point-transaction.dto';
import { GetPointTransactionsDto } from './dto/get-point-transactions.dto';

@Injectable()
export class PointsService {
    constructor(
        @InjectRepository(Point)
        private pointsRepository: Repository<Point>,
        @InjectRepository(PointTransaction)
        private pointTransactionsRepository: Repository<PointTransaction>,
    ) { }

    getBalance(userId: string) {
        // TODO: implement getBalance logic
    }

    addPoints(createPointTransactionDto: CreatePointTransactionDto) {
        // TODO: implement addPoints logic
    }

    spendPoints(createPointTransactionDto: CreatePointTransactionDto) {
        // TODO: implement spendPoints logic
    }

    getTransactionHistory(getPointTransactionsDto: GetPointTransactionsDto) {
        // TODO: implement getTransactionHistory logic
    }

    refundPoints(createPointTransactionDto: CreatePointTransactionDto) {
        // TODO: implement refundPoints logic
    }
}
