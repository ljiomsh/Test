import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './config/database.module';
import { UsersModule } from './domains/users/users.module';
import { PointsModule } from './domains/points/points.module';

@Module({
    imports: [DatabaseModule, UsersModule, PointsModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }
