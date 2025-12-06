import { IsString, IsOptional, IsEnum } from 'class-validator';
import { PointTransactionType } from '../entities/point.entity';

export class GetPointTransactionsDto {
    @IsString()
    userId!: string;

    @IsEnum(PointTransactionType)
    @IsOptional()
    type?: PointTransactionType;

    @IsOptional()
    startDate?: Date;

    @IsOptional()
    endDate?: Date;
}
