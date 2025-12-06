import { IsString, IsNumber, IsNotEmpty, IsPositive, IsEnum } from 'class-validator';
import { PointTransactionType } from '../entities/point.entity';

export class CreatePointTransactionDto {
    @IsString()
    @IsNotEmpty()
    userId!: string;

    @IsEnum(PointTransactionType)
    type!: PointTransactionType;

    @IsNumber()
    @IsPositive()
    amount!: number;

    @IsString()
    @IsNotEmpty()
    description!: string;
}
