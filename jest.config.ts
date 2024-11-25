import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
    dir: './',
});

const config: Config = {
    coverageProvider: 'v8',
    testEnvironment: 'node', // Zmieniono na 'node' zamiast 'jsdom'
};

export default createJestConfig(config);
