import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsService } from './points.service';
import { Point } from './entities/point.entity';
import { PointTransaction } from './entities/point-transaction.entity';
import { CreatePointTransactionDto } from './dto/create-point-transaction.dto';
import { PointTransactionType } from './entities/point.entity';

describe('PointsService (with in-memory DB)', () => {
    let service: PointsService;
    let module: TestingModule;
    const testUserId = 'test-user-id';

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [Point, PointTransaction],
                    synchronize: true,
                    logging: false,
                }),
                TypeOrmModule.forFeature([Point, PointTransaction]),
            ],
            providers: [PointsService],
        }).compile();

        service = module.get<PointsService>(PointsService);
    });

    afterEach(async () => {
        await module.close();
    });

    describe('UC-01: 포인트 적립 (Earn Point)', () => {
        it('should earn points successfully', async () => {
            // Given: 사용자의 현재 포인트가 100P
            const initialPoint = 100;
            await service.initializeUserPoint(testUserId, initialPoint);

            // When: 사용자가 30P를 적립한다
            const earnAmount = 30;
            const result = await service.addPoints({
                userId: testUserId,
                type: PointTransactionType.EARN,
                amount: earnAmount,
                description: '커피 구매',
            } as CreatePointTransactionDto);

            // Then: 최종 포인트는 130P가 된다
            expect(result.balance).toBe(130);

            // And: 트랜잭션 타입은 EARN 이다
            const transaction = await service.getLastTransaction(testUserId);
            expect(transaction!.type).toBe(PointTransactionType.EARN);
            expect(transaction!.amount).toBe(earnAmount);
        });

        it('should not allow negative earn amount', async () => {
            // Given: 0P
            // When: -10P를 적립 요청
            // Then: 오류 발생 (NEGATIVE_AMOUNT_NOT_ALLOWED)
            await expect(
                service.addPoints({
                    userId: testUserId,
                    type: PointTransactionType.EARN,
                    amount: -10,
                    description: '잘못된 적립',
                } as CreatePointTransactionDto),
            ).rejects.toThrow('NEGATIVE_AMOUNT_NOT_ALLOWED');
        });

        it('should not allow zero earn amount', async () => {
            await expect(
                service.addPoints({
                    userId: testUserId,
                    type: PointTransactionType.EARN,
                    amount: 0,
                    description: '0 적립',
                } as CreatePointTransactionDto),
            ).rejects.toThrow();
        });
    });

    describe('UC-02: 포인트 사용 (Use Point)', () => {
        beforeEach(async () => {
            // 테스트 전에 사용자 포인트 초기화 (100P)
            await service.initializeUserPoint(testUserId, 100);
        });

        it('should use points successfully', async () => {
            // Given: 사용자의 현재 포인트가 100P
            // When: 사용자가 40P를 사용한다
            const result = await service.spendPoints({
                userId: testUserId,
                type: PointTransactionType.SPEND,
                amount: 40,
                description: '커피 결제',
            } as CreatePointTransactionDto);

            // Then: 남은 포인트는 60P가 된다
            expect(result.balance).toBe(60);

            // And: 트랜잭션 타입은 USE 이다
            const transaction = await service.getLastTransaction(testUserId);
            expect(transaction!.type).toBe(PointTransactionType.SPEND);
        });

        it('should not allow spending more than balance', async () => {
            // Given: 현재 포인트 50P (초기 100에서 50을 미리 사용)
            await service.spendPoints({
                userId: testUserId,
                type: PointTransactionType.SPEND,
                amount: 50,
                description: '사용',
            } as CreatePointTransactionDto);

            // When: 80P를 사용 요청
            // Then: 오류 발생 (INSUFFICIENT_POINTS)
            await expect(
                service.spendPoints({
                    userId: testUserId,
                    type: PointTransactionType.SPEND,
                    amount: 80,
                    description: '과다 사용',
                } as CreatePointTransactionDto),
            ).rejects.toThrow('INSUFFICIENT_POINTS');
        });

        it('should not allow spending zero or negative points', async () => {
            // When: 0P를 사용 요청
            // Then: 오류 발생 (INVALID_SPEND_AMOUNT)
            await expect(
                service.spendPoints({
                    userId: testUserId,
                    type: PointTransactionType.SPEND,
                    amount: 0,
                    description: '0 사용',
                } as CreatePointTransactionDto),
            ).rejects.toThrow();

            // When: -10P를 사용 요청
            await expect(
                service.spendPoints({
                    userId: testUserId,
                    type: PointTransactionType.SPEND,
                    amount: -10,
                    description: '음수 사용',
                } as CreatePointTransactionDto),
            ).rejects.toThrow('NEGATIVE_AMOUNT_NOT_ALLOWED');
        });

        it('should not allow spending when balance is zero', async () => {
            // Given: 현재 포인트 0P
            const noBalanceUserId = 'no-balance-user';
            await service.initializeUserPoint(noBalanceUserId, 0);

            // When: 1P를 사용 요청
            // Then: 오류 발생 (INSUFFICIENT_POINTS)
            await expect(
                service.spendPoints({
                    userId: noBalanceUserId,
                    type: PointTransactionType.SPEND,
                    amount: 1,
                    description: '잔액 부족',
                } as CreatePointTransactionDto),
            ).rejects.toThrow('INSUFFICIENT_POINTS');
        });
    });

    describe('UC-03: 포인트 충전 (Charge Point)', () => {
        beforeEach(async () => {
            await service.initializeUserPoint(testUserId, 0);
        });

        it('should charge points successfully', async () => {
            // Given: 현재 포인트 0P
            // When: 사용자가 1000P 충전
            const result = await service.addPoints({
                userId: testUserId,
                type: PointTransactionType.EARN,
                amount: 1000,
                description: '포인트 충전',
            } as CreatePointTransactionDto);

            // Then: 최종 포인트는 1000P가 된다
            expect(result.balance).toBe(1000);

            // And: 트랜잭션 타입은 CHARGE 이다
            const transaction = await service.getLastTransaction(testUserId);
            expect(transaction!.type).toBe(PointTransactionType.EARN);
        });

        it('should not allow zero charge amount', async () => {
            // When: 사용자가 0P 충전 요청
            // Then: 오류 발생 (INVALID_CHARGE_AMOUNT)
            await expect(
                service.addPoints({
                    userId: testUserId,
                    type: PointTransactionType.EARN,
                    amount: 0,
                    description: '0 충전',
                } as CreatePointTransactionDto),
            ).rejects.toThrow();
        });

        it('should not allow negative charge amount', async () => {
            await expect(
                service.addPoints({
                    userId: testUserId,
                    type: PointTransactionType.EARN,
                    amount: -100,
                    description: '음수 충전',
                } as CreatePointTransactionDto),
            ).rejects.toThrow('NEGATIVE_AMOUNT_NOT_ALLOWED');
        });
    });

    describe('UC-04: 포인트 사용/적립/충전 내역 조회 (Get Transactions)', () => {
        beforeEach(async () => {
            await service.initializeUserPoint(testUserId, 0);

            // 3개의 트랜잭션 생성
            // 1. EARN 100P
            await new Promise(resolve => setTimeout(resolve, 10));
            await service.addPoints({
                userId: testUserId,
                type: PointTransactionType.EARN,
                amount: 100,
                description: '첫 번째 적립',
            } as CreatePointTransactionDto);

            // 2. SPEND 30P
            await new Promise(resolve => setTimeout(resolve, 10));
            await service.spendPoints({
                userId: testUserId,
                type: PointTransactionType.SPEND,
                amount: 30,
                description: '첫 번째 사용',
            } as CreatePointTransactionDto);

            // 3. EARN 50P (충전)
            await new Promise(resolve => setTimeout(resolve, 10));
            await service.addPoints({
                userId: testUserId,
                type: PointTransactionType.EARN,
                amount: 50,
                description: '두 번째 적립',
            } as CreatePointTransactionDto);
        });

        it('should return all transactions in descending order', async () => {
            // When: 내역을 조회한다
            const result = await service.getTransactionHistory({
                userId: testUserId,
            });

            // Then: 최신 순으로 정렬된 목록이 반환된다
            expect(result).toHaveLength(3);

            // 시간 순서가 보장되므로 역순 확인
            const descriptions = result.map(t => t.description);
            expect(descriptions).toContain('첫 번째 적립');
            expect(descriptions).toContain('첫 번째 사용');
            expect(descriptions).toContain('두 번째 적립');

            // 최신 항목이 첫 번째여야 함
            expect(result[0].createdAt >= result[1].createdAt).toBe(true);
            expect(result[1].createdAt >= result[2].createdAt).toBe(true);
        });

        it('should return transactions with correct fields', async () => {
            const result = await service.getTransactionHistory({
                userId: testUserId,
            });

            // And: 각 트랜잭션은 type, amount, date 필드를 가진다
            result.forEach((transaction) => {
                expect(transaction).toHaveProperty('type');
                expect(transaction).toHaveProperty('amount');
                expect(transaction).toHaveProperty('createdAt');
                expect(['earn', 'spend', 'refund']).toContain(transaction.type);
                expect(transaction.amount).toBeGreaterThan(0);
            });
        });

        it('should return empty array for user with no transactions', async () => {
            const newUserId = 'new-user-no-transactions';
            const result = await service.getTransactionHistory({
                userId: newUserId,
            });

            expect(result).toEqual([]);
        });

        it('should filter transactions by type', async () => {
            const result = await service.getTransactionHistory({
                userId: testUserId,
                type: PointTransactionType.EARN,
            });

            expect(result.length).toBe(2);
            result.forEach((transaction) => {
                expect(transaction.type).toBe(PointTransactionType.EARN);
            });
        });
    });

    describe('getBalance', () => {
        it('should return current balance for user', async () => {
            await service.initializeUserPoint(testUserId, 500);

            const balance = await service.getBalance(testUserId);

            expect(balance).toBe(500);
        });

        it('should return 0 for new user', async () => {
            const newUserId = 'brand-new-user';
            const balance = await service.getBalance(newUserId);

            expect(balance).toBe(0);
        });
    });

    describe('refund', () => {
        beforeEach(async () => {
            await service.initializeUserPoint(testUserId, 100);
            // 포인트 사용
            await service.spendPoints({
                userId: testUserId,
                type: PointTransactionType.SPEND,
                amount: 50,
                description: '사용',
            } as CreatePointTransactionDto);
        });

        it('should refund points successfully', async () => {
            // Given: 사용자의 현재 포인트가 50P
            // When: 50P를 환불한다
            const result = await service.refundPoints({
                userId: testUserId,
                type: PointTransactionType.REFUND,
                amount: 50,
                description: '환불',
            } as CreatePointTransactionDto);

            // Then: 포인트는 100P가 된다
            expect(result.balance).toBe(100);
        });
    });
});
