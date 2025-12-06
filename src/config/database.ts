import { DataSourceOptions } from 'typeorm';

const isTestEnv = process.env.NODE_ENV === 'test';

const baseConfig: Partial<DataSourceOptions> = {
    type: 'sqlite',
    synchronize: true,
    logging: false,
    entities: ['src/domains/**/entities/*.entity.ts'],
};

export const dataSourceConfig: DataSourceOptions = (isTestEnv
    ? {
        ...baseConfig,
        database: ':memory:',
    }
    : {
        ...baseConfig,
        database: 'data/database.sqlite',
    }) as DataSourceOptions;