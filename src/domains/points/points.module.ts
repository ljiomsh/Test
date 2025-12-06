import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';
import { Point } from './entities/point.entity';
import { PointTransaction } from './entities/point-transaction.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Point, PointTransaction])],
    controllers: [PointsController],
    providers: [PointsService],
    exports: [PointsService],
})
export class PointsModule { }
