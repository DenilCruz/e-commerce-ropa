/**
 * Jest config for the real-application database specs. The installed @nestjs/typeorm 12 is published as
 * ESM only ("type": "module"), which jest's CommonJS runtime cannot load, so that one package is
 * transformed to CommonJS here (Node itself loads it fine through require(esm), which is why the API runs).
 */
module.exports = {
  rootDir: '../..',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  testEnvironment: 'node',
  transform: { '^.+\\.(t|j)s$': '<rootDir>/test/db/ts-jest-esm-compat.js' },
  transformIgnorePatterns: ['/node_modules/(?!\\.pnpm/|@nestjs/typeorm/)'],
};
