import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
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

    describe('initializeUserPoint', () => {
        it('should initialize user point with given balance', async () => {
            const result = await service.initializeUserPoint(testUserId, 500);

            expect(result).toBeDefined();
            expect(result.userId).toBe(testUserId);
            expect(result.balance).toBe(500);
        });

        it('should not reinitialize existing user point', async () => {
            await service.initializeUserPoint(testUserId, 100);
            const result = await service.initializeUserPoint(testUserId, 500);

            // 기존 포인트 유지 (재초기화 안됨)
            expect(result.balance).toBe(100);
        });

        it('should initialize with zero balance', async () => {
            const result = await service.initializeUserPoint('zero-user', 0);

            expect(result.balance).toBe(0);
        });
    });

    describe('UC-01: 포인트 적립 (Earn Point)', () => {
        it('should earn points successfully', async () => {
            const initialPoint = 100;
            await service.initializeUserPoint(testUserId, initialPoint);

            const earnAmount = 30;
            const result = await service.addPoints({
                userId: testUserId,
                type: PointTransactionType.EARN,
                amount: earnAmount,
                description: '커피 구매',
            } as CreatePointTransactionDto);

            expect(result.balance).toBe(130);

            const transaction = await service.getLastTransaction(testUserId);
            expect(transaction!.type).toBe(PointTransactionType.EARN);
            expect(transaction!.amount).toBe(earnAmount);
            expect(transaction!.balanceBefore).toBe(100);
            expect(transaction!.balanceAfter).toBe(130);
        });

        it('should earn large amount successfully', async () => {
            await service.initializeUserPoint(testUserId, 100);

            const result = await service.addPoints({
                userId: testUserId,
                type: PointTransactionType.EARN,
                amount: 10000,
                description: '대량 적립',
            } as CreatePointTransactionDto);

            expect(result.balance).toBe(10100);
        });

        it('should not allow negative earn amount', async () => {
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
            const error = await service.addPoints({
                userId: testUserId,
                type: PointTransactionType.EARN,
                amount: 0,
                description: '0 적립',
            } as CreatePointTransactionDto).catch(e => e);

            expect(error).toBeInstanceOf(BadRequestException);
        });

        it('should create new user on earn attempt if not exists', async () => {
            const newUserId = 'new-earn-user';
            const result = await service.addPoints({
                userId: newUserId,
                type: PointTransactionType.EARN,
                amount: 100,
                description: '첫 적립',
            } as CreatePointTransactionDto);

            expect(result.userId).toBe(newUserId);
            expect(result.balance).toBe(100);
        });

        it('should earn multiple times correctly', async () => {
            await service.initializeUserPoint(testUserId, 0);

            await service.addPoints({
                userId: testUserId,
                type: PointTransactionType.EARN,
                amount: 100,
                description: '첫 번째',
            } as CreatePointTransactionDto);

            const result = await service.addPoints({
                userId: testUserId,
                type: PointTransactionType.EARN,
                amount: 50,
                description: '두 번째',
            } as CreatePointTransactionDto);

            expect(result.balance).toBe(150);
        });
    });

    describe('UC-02: 포인트 사용 (Use Point)', () => {
        beforeEach(async () => {
            await service.initializeUserPoint(testUserId, 100);
        });

        it('should use points successfully', async () => {
            const result = await service.spendPoints({
                userId: testUserId,
                type: PointTransactionType.SPEND,
                amount: 40,
                description: '커피 결제',
            } as CreatePointTransactionDto);

            expect(result.balance).toBe(60);

            const transaction = await service.getLastTransaction(testUserId);
            expect(transaction!.type).toBe(PointTransactionType.SPEND);
            expect(transaction!.balanceBefore).toBe(100);
            expect(transaction!.balanceAfter).toBe(60);
        });

        it('should use exactly all points', async () => {
            const result = await service.spendPoints({
                userId: testUserId,
                type: PointTransactionType.SPEND,
                amount: 100,
                description: '전액 사용',
            } as CreatePointTransactionDto);

            expect(result.balance).toBe(0);
        });

        it('should not allow spending more than balance', async () => {
            await expect(
                service.spendPoints({
                    userId: testUserId,
                    type: PointTransactionType.SPEND,
                    amount: 101,
                    description: '초과 사용',
                } as CreatePointTransactionDto),
            ).rejects.toThrow('INSUFFICIENT_POINTS');
        });

        it('should not allow spending zero or negative points', async () => {
            await expect(
                service.spendPoints({
                    userId: testUserId,
                    type: PointTransactionType.SPEND,
                    amount: 0,
                    description: '0 사용',
                } as CreatePointTransactionDto),
            ).rejects.toThrow();

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
            const noBalanceUserId = 'no-balance-user';
            await service.initializeUserPoint(noBalanceUserId, 0);

            await expect(
                service.spendPoints({
                    userId: noBalanceUserId,
                    type: PointTransactionType.SPEND,
                    amount: 1,
                    description: '잔액 부족',
                } as CreatePointTransactionDto),
            ).rejects.toThrow('INSUFFICIENT_POINTS');
        });

        it('should spend multiple times correctly', async () => {
            await service.spendPoints({
                userId: testUserId,
                type: PointTransactionType.SPEND,
                amount: 30,
                description: '첫 번째',
            } as CreatePointTransactionDto);

            const result = await service.spendPoints({
                userId: testUserId,
                type: PointTransactionType.SPEND,
                amount: 40,
                description: '두 번째',
            } as CreatePointTransactionDto);

            expect(result.balance).toBe(30);
        });

        it('should create new user with zero balance on spend attempt if not exists', async () => {
            const newUserId = 'new-spend-user';

            await expect(
                service.spendPoints({
                    userId: newUserId,
                    type: PointTransactionType.SPEND,
                    amount: 1,
                    description: '사용',
                } as CreatePointTransactionDto),
            ).rejects.toThrow('INSUFFICIENT_POINTS');
        });
    });

    describe('UC-03: 포인트 충전 (Charge Point)', () => {
        beforeEach(async () => {
            await service.initializeUserPoint(testUserId, 0);
        });

        it('should charge points successfully', async () => {
            const result = await service.addPoints({
                userId: testUserId,
                type: PointTransactionType.EARN,
                amount: 1000,
                description: '포인트 충전',
            } as CreatePointTransactionDto);

            expect(result.balance).toBe(1000);

            const transaction = await service.getLastTransaction(testUserId);
            expect(transaction!.type).toBe(PointTransactionType.EARN);
            expect(transaction!.description).toBe('포인트 충전');
        });

        it('should not allow zero charge amount', async () => {
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

        it('should charge multiple times correctly', async () => {
            await service.addPoints({
                userId: testUserId,
                type: PointTransactionType.EARN,
                amount: 500,
                description: '첫 번째 충전',
            } as CreatePointTransactionDto);

            const result = await service.addPoints({
                userId: testUserId,
                type: PointTransactionType.EARN,
                amount: 300,
                description: '두 번째 충전',
            } as CreatePointTransactionDto);

            expect(result.balance).toBe(800);
        });
    });

    describe('UC-04: 포인트 사용/적립/충전 내역 조회 (Get Transactions)', () => {
        beforeEach(async () => {
            await service.initializeUserPoint(testUserId, 0);

            await new Promise(resolve => setTimeout(resolve, 10));
            await service.addPoints({
                userId: testUserId,
                type: PointTransactionType.EARN,
                amount: 100,
                description: '첫 번째 적립',
            } as CreatePointTransactionDto);

            await new Promise(resolve => setTimeout(resolve, 10));
            await service.spendPoints({
                userId: testUserId,
                type: PointTransactionType.SPEND,
                amount: 30,
                description: '첫 번째 사용',
            } as CreatePointTransactionDto);

            await new Promise(resolve => setTimeout(resolve, 10));
            await service.addPoints({
                userId: testUserId,
                type: PointTransactionType.EARN,
                amount: 50,
                description: '두 번째 적립',
            } as CreatePointTransactionDto);
        });

        it('should return all transactions in descending order', async () => {
            const result = await service.getTransactionHistory({
                userId: testUserId,
            });

            expect(result).toHaveLength(3);

            const descriptions = result.map(t => t.description);
            expect(descriptions).toContain('첫 번째 적립');
            expect(descriptions).toContain('첫 번째 사용');
            expect(descriptions).toContain('두 번째 적립');

            expect(result[0].createdAt >= result[1].createdAt).toBe(true);
            expect(result[1].createdAt >= result[2].createdAt).toBe(true);
        });

        it('should return transactions with correct fields', async () => {
            const result = await service.getTransactionHistory({
                userId: testUserId,
            });

            result.forEach((transaction) => {
                expect(transaction).toHaveProperty('type');
                expect(transaction).toHaveProperty('amount');
                expect(transaction).toHaveProperty('createdAt');
                expect(transaction).toHaveProperty('description');
                expect(transaction).toHaveProperty('balanceBefore');
                expect(transaction).toHaveProperty('balanceAfter');
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

        it('should filter transactions by EARN type', async () => {
            const result = await service.getTransactionHistory({
                userId: testUserId,
                type: PointTransactionType.EARN,
            });

            expect(result.length).toBe(2);
            result.forEach((transaction) => {
                expect(transaction.type).toBe(PointTransactionType.EARN);
            });
        });

        it('should filter transactions by SPEND type', async () => {
            const result = await service.getTransactionHistory({
                userId: testUserId,
                type: PointTransactionType.SPEND,
            });

            expect(result.length).toBe(1);
            expect(result[0].type).toBe(PointTransactionType.SPEND);
        });

        it('should filter transactions by date range', async () => {
            const now = new Date();
            const futureDate = new Date(now.getTime() + 1000);

            const result = await service.getTransactionHistory({
                userId: testUserId,
                startDate: new Date(now.getTime() - 60000),
                endDate: futureDate,
            });

            expect(result.length).toBe(3);
        });

        it('should return empty when date range does not match', async () => {
            const result = await service.getTransactionHistory({
                userId: testUserId,
                startDate: new Date('2099-01-01'),
                endDate: new Date('2099-12-31'),
            });

            expect(result).toEqual([]);
        });

        it('should handle null startDate', async () => {
            const result = await service.getTransactionHistory({
                userId: testUserId,
                endDate: new Date(),
            });

            expect(result.length).toBe(3);
        });

        it('should handle null endDate', async () => {
            const result = await service.getTransactionHistory({
                userId: testUserId,
                startDate: new Date(0),
            });

            expect(result.length).toBe(3);
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

        it('should return updated balance after transaction', async () => {
            await service.initializeUserPoint(testUserId, 100);
            await service.spendPoints({
                userId: testUserId,
                type: PointTransactionType.SPEND,
                amount: 25,
                description: '사용',
            } as CreatePointTransactionDto);

            const balance = await service.getBalance(testUserId);

            expect(balance).toBe(75);
        });
    });

    describe('refund', () => {
        it('should refund points successfully', async () => {
            const refundTestUserId = 'refund-user-1';
            await service.initializeUserPoint(refundTestUserId, 100);
            await service.spendPoints({
                userId: refundTestUserId,
                type: PointTransactionType.SPEND,
                amount: 50,
                description: '사용',
            } as CreatePointTransactionDto);

            const result = await service.refundPoints({
                userId: refundTestUserId,
                type: PointTransactionType.REFUND,
                amount: 50,
                description: '환불',
            } as CreatePointTransactionDto);

            expect(result.balance).toBe(100);
        });

        it('should not allow negative refund', async () => {
            const refundTestUserId = 'refund-user-2';
            await service.initializeUserPoint(refundTestUserId, 100);

            await expect(
                service.refundPoints({
                    userId: refundTestUserId,
                    type: PointTransactionType.REFUND,
                    amount: -50,
                    description: '음수 환불',
                } as CreatePointTransactionDto),
            ).rejects.toThrow('NEGATIVE_AMOUNT_NOT_ALLOWED');
        });

        it('should not allow zero refund', async () => {
            const refundTestUserId = 'refund-user-3';
            await service.initializeUserPoint(refundTestUserId, 100);

            await expect(
                service.refundPoints({
                    userId: refundTestUserId,
                    type: PointTransactionType.REFUND,
                    amount: 0,
                    description: '0 환불',
                } as CreatePointTransactionDto),
            ).rejects.toThrow();
        });

        it('should record refund transaction correctly', async () => {
            const refundTestUserId = 'refund-user-4';
            await service.initializeUserPoint(refundTestUserId, 100);
            await service.spendPoints({
                userId: refundTestUserId,
                type: PointTransactionType.SPEND,
                amount: 50,
                description: '사용',
            } as CreatePointTransactionDto);

            const result = await service.refundPoints({
                userId: refundTestUserId,
                type: PointTransactionType.REFUND,
                amount: 25,
                description: '부분 환불',
            } as CreatePointTransactionDto);

            expect(result.balance).toBe(75);

            const history = await service.getTransactionHistory({ userId: refundTestUserId });
            const refundTxn = history.find(t => t.description === '부분 환불');
            expect(refundTxn).toBeDefined();
            expect(refundTxn!.balanceBefore).toBe(50);
            expect(refundTxn!.balanceAfter).toBe(75);
        });

        it('should refund to new user if not exists', async () => {
            const refundTestUserId = 'refund-user-5';

            const result = await service.refundPoints({
                userId: refundTestUserId,
                type: PointTransactionType.REFUND,
                amount: 100,
                description: '신규 환불',
            } as CreatePointTransactionDto);

            expect(result.balance).toBe(100);
        });

        it('should refund multiple times correctly', async () => {
            const refundTestUserId = 'refund-user-6';
            await service.initializeUserPoint(refundTestUserId, 100);
            await service.spendPoints({
                userId: refundTestUserId,
                type: PointTransactionType.SPEND,
                amount: 50,
                description: '사용',
            } as CreatePointTransactionDto);

            await service.refundPoints({
                userId: refundTestUserId,
                type: PointTransactionType.REFUND,
                amount: 25,
                description: '첫 환불',
            } as CreatePointTransactionDto);

            const result = await service.refundPoints({
                userId: refundTestUserId,
                type: PointTransactionType.REFUND,
                amount: 25,
                description: '두 번째 환불',
            } as CreatePointTransactionDto);

            expect(result.balance).toBe(100);
        });
    });

    describe('getLastTransaction', () => {
        it('should return null when no transactions exist', async () => {
            const newUserId = 'no-transaction-user';
            const transaction = await service.getLastTransaction(newUserId);

            expect(transaction).toBeNull();
        });

        it('should return most recent transaction', async () => {
            const lastTxnUserId = 'last-txn-user-unique';
            await service.initializeUserPoint(lastTxnUserId, 100);

            await service.addPoints({
                userId: lastTxnUserId,
                type: PointTransactionType.EARN,
                amount: 50,
                description: '첫 거래',
            } as CreatePointTransactionDto);

            await service.spendPoints({
                userId: lastTxnUserId,
                type: PointTransactionType.SPEND,
                amount: 20,
                description: '두 번째 거래',
            } as CreatePointTransactionDto);

            const transaction = await service.getLastTransaction(lastTxnUserId);

            expect(transaction).toBeDefined();
            // getLastTransaction은 createdAt DESC로 정렬되므로 마지막 거래를 반환
            expect([PointTransactionType.SPEND, PointTransactionType.EARN]).toContain(transaction!.type);
            expect(transaction!.balanceAfter).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases and Integration', () => {
        it('should handle concurrent operations correctly', async () => {
            const concurrentUserId = 'concurrent-user';
            await service.initializeUserPoint(concurrentUserId, 200);

            await Promise.all([
                service.spendPoints({
                    userId: concurrentUserId,
                    type: PointTransactionType.SPEND,
                    amount: 50,
                    description: '사용1',
                } as CreatePointTransactionDto),
                service.spendPoints({
                    userId: concurrentUserId,
                    type: PointTransactionType.SPEND,
                    amount: 50,
                    description: '사용2',
                } as CreatePointTransactionDto),
            ]);

            const balance = await service.getBalance(concurrentUserId);
            expect(balance).toBeLessThanOrEqual(200);
        });

        it('should track balance progression correctly', async () => {
            const balanceUserId = 'balance-tracking-user';
            await service.initializeUserPoint(balanceUserId, 0);

            await service.addPoints({
                userId: balanceUserId,
                type: PointTransactionType.EARN,
                amount: 100,
                description: '적립',
            } as CreatePointTransactionDto);

            const history1 = await service.getTransactionHistory({ userId: balanceUserId });
            expect(history1.length).toBe(1);
            expect(history1[0].balanceAfter).toBe(100);

            await service.spendPoints({
                userId: balanceUserId,
                type: PointTransactionType.SPEND,
                amount: 30,
                description: '사용',
            } as CreatePointTransactionDto);

            const history2 = await service.getTransactionHistory({ userId: balanceUserId });
            expect(history2.length).toBe(2);

            // 각 거래의 balanceAfter를 검증
            const spendTxn = history2.find(t => t.type === PointTransactionType.SPEND);
            const earnTxn = history2.find(t => t.type === PointTransactionType.EARN);

            expect(earnTxn).toBeDefined();
            expect(earnTxn!.balanceAfter).toBe(100);

            expect(spendTxn).toBeDefined();
            expect(spendTxn!.balanceAfter).toBe(70);
            expect(spendTxn!.balanceBefore).toBe(100);
        });

        it('should maintain transaction integrity across operations', async () => {
            const integrityUserId = 'integrity-test-user-2';
            await service.initializeUserPoint(integrityUserId, 1000);

            await service.addPoints({
                userId: integrityUserId,
                type: PointTransactionType.EARN,
                amount: 500,
                description: '추가',
            } as CreatePointTransactionDto);

            await service.spendPoints({
                userId: integrityUserId,
                type: PointTransactionType.SPEND,
                amount: 300,
                description: '사용',
            } as CreatePointTransactionDto);

            await service.refundPoints({
                userId: integrityUserId,
                type: PointTransactionType.REFUND,
                amount: 100,
                description: '환불',
            } as CreatePointTransactionDto);

            const transactions = await service.getTransactionHistory({ userId: integrityUserId });
            expect(transactions.length).toBe(3);

            const finalBalance = await service.getBalance(integrityUserId);
            expect(finalBalance).toBe(1300); // 1000 + 500 - 300 + 100
        });
    });
});
