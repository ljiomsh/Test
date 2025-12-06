import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceConfig } from './database';

@Module({
    imports: [TypeOrmModule.forRoot(dataSourceConfig)],
})
export class DatabaseModule { }
