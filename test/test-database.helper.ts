import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

export const getTestDatabaseModule = (entities: any[]) => {
    const testConfig: DataSourceOptions = {
        type: 'sqlite',
        database: ':memory:',
        entities,
        synchronize: true,
        logging: false,
    };

    return TypeOrmModule.forRoot(testConfig);
};
