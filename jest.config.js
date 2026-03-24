/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/reference'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        strict: true,
        noUnusedLocals: false,
        noUnusedParameters: false
      }
    }],
    '^.+\\.js$': ['ts-jest', {
      tsconfig: 'tsconfig.jest-js.json',
      isolatedModules: true
    }]
  },
  collectCoverageFrom: [
    'runtime/**/*.ts',
    '!runtime/**/*.d.ts'
  ]
};
