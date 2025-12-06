import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService (with in-memory DB)', () => {
    let service: UsersService;
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [User],
                    synchronize: true,
                    logging: false,
                }),
                TypeOrmModule.forFeature([User]),
            ],
            providers: [UsersService],
        }).compile();

        service = module.get<UsersService>(UsersService);
    });

    afterEach(async () => {
        await module.close();
    });

    describe('create', () => {
        it('should create a new user', async () => {
            const createUserDto: CreateUserDto = {
                email: 'test@example.com',
                name: 'Test User',
            };

            const result = await service.create(createUserDto);

            expect(result).toBeDefined();
            expect(result.email).toBe(createUserDto.email);
            expect(result.name).toBe(createUserDto.name);
            expect(result.id).toBeDefined();
            expect(result.createdAt).toBeDefined();
            expect(result.updatedAt).toBeDefined();
        });

        it('should not allow duplicate email', async () => {
            const createUserDto: CreateUserDto = {
                email: 'duplicate@example.com',
                name: 'User 1',
            };

            await service.create(createUserDto);

            await expect(service.create(createUserDto)).rejects.toThrow();
        });
    });

    describe('findAll', () => {
        it('should return an empty array when no users exist', async () => {
            const result = await service.findAll();

            expect(result).toEqual([]);
        });

        it('should return all users', async () => {
            const user1: CreateUserDto = {
                email: 'user1@example.com',
                name: 'User 1',
            };
            const user2: CreateUserDto = {
                email: 'user2@example.com',
                name: 'User 2',
            };

            await service.create(user1);
            await service.create(user2);

            const result = await service.findAll();

            expect(result).toHaveLength(2);
            expect(result[0].email).toBe(user1.email);
            expect(result[1].email).toBe(user2.email);
        });
    });

    describe('findOne', () => {
        it('should return a user by id', async () => {
            const createUserDto: CreateUserDto = {
                email: 'findone@example.com',
                name: 'Find One User',
            };

            const createdUser = await service.create(createUserDto);
            const result = await service.findOne(createdUser.id);

            expect(result).toBeDefined();
            expect(result!.id).toBe(createdUser.id);
            expect(result!.email).toBe(createUserDto.email);
        });

        it('should return null when user does not exist', async () => {
            const result = await service.findOne('non-existent-id');

            expect(result).toBeNull();
        });
    });

    describe('update', () => {
        it('should update user information', async () => {
            const createUserDto: CreateUserDto = {
                email: 'update@example.com',
                name: 'Original Name',
            };

            const createdUser = await service.create(createUserDto);

            const updateUserDto: UpdateUserDto = {
                name: 'Updated Name',
            };

            const result = await service.update(createdUser.id, updateUserDto);

            expect(result).toBeDefined();
            expect(result!.name).toBe('Updated Name');
            expect(result!.email).toBe(createUserDto.email);
        });

        it('should return null when user does not exist', async () => {
            const updateUserDto: UpdateUserDto = {
                name: 'Updated Name',
            };

            const result = await service.update('non-existent-id', updateUserDto);

            expect(result).toBeNull();
        });
    });

    describe('remove', () => {
        it('should delete a user', async () => {
            const createUserDto: CreateUserDto = {
                email: 'delete@example.com',
                name: 'User to Delete',
            };

            const createdUser = await service.create(createUserDto);
            await service.remove(createdUser.id);

            const result = await service.findOne(createdUser.id);

            expect(result).toBeNull();
        });

        it('should handle deletion of non-existent user', async () => {
            await expect(service.remove('non-existent-id')).resolves.not.toThrow();
        });
    });
});
