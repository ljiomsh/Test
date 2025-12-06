process.env.NODE_ENV = 'test';

// SQLite in-memory database setup for testing
export const testDatabaseConfig = {
    type: 'sqlite',
    database: ':memory:',
    entities: ['src/domains/**/entities/*.entity.ts'],
    synchronize: true,
    logging: false,
};
