import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PointsService } from './points.service';
import { CreatePointTransactionDto } from './dto/create-point-transaction.dto';
import { GetPointTransactionsDto } from './dto/get-point-transactions.dto';

@Controller('points')
export class PointsController {
    constructor(private readonly pointsService: PointsService) { }

    @Get('balance/:userId')
    getBalance(@Param('userId') userId: string) {
        return this.pointsService.getBalance(userId);
    }

    @Post('add')
    addPoints(@Body() createPointTransactionDto: CreatePointTransactionDto) {
        return this.pointsService.addPoints(createPointTransactionDto);
    }

    @Post('spend')
    spendPoints(@Body() createPointTransactionDto: CreatePointTransactionDto) {
        return this.pointsService.spendPoints(createPointTransactionDto);
    }

    @Post('refund')
    refundPoints(@Body() createPointTransactionDto: CreatePointTransactionDto) {
        return this.pointsService.refundPoints(createPointTransactionDto);
    }

    @Get('history/:userId')
    getTransactionHistory(
        @Param('userId') userId: string,
        @Query() query: GetPointTransactionsDto,
    ) {
        return this.pointsService.getTransactionHistory({
            ...query,
            userId,
        });
    }
}
