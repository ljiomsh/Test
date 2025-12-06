import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsService } from './points.service';
import { Point } from './entities/point.entity';
import { PointTransaction } from './entities/point-transaction.entity';

describe('PointsService (with in-memory DB)', () => {
    let service: PointsService;
    let module: TestingModule;

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

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // TODO: 서비스 로직 구현 후 테스트 작성
});
