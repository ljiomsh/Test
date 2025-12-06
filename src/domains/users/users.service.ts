import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

    create(createUserDto: CreateUserDto) {
        // TODO: implement create logic
    }

    findAll() {
        // TODO: implement findAll logic
    }

    findOne(id: string) {
        // TODO: implement findOne logic
    }

    update(id: string, updateUserDto: UpdateUserDto) {
        // TODO: implement update logic
    }

    remove(id: string) {
        // TODO: implement remove logic
    }
}
