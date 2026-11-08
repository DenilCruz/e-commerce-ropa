/**
 * ts-jest wrapper for the one ESM-only dependency the API pulls in (@nestjs/typeorm 12). Its
 * typeorm-compat.js builds `require` from import.meta.url, which has no meaning once the file is compiled
 * to CommonJS (where `require` already exists), so those two lines are dropped before compiling.
 */
const { TsJestTransformer } = require('ts-jest');

const options = {
  tsconfig: { allowJs: true, module: 'commonjs', esModuleInterop: true, experimentalDecorators: true, emitDecoratorMetadata: true, target: 'ES2021' },
  diagnostics: false,
};
const inner = new TsJestTransformer(options);

module.exports = {
  process(source, filename, config, opts) {
    const patched = filename.endsWith('typeorm-compat.js')
      ? source
          .replace(/^import \{ createRequire \} from 'node:module';\r?\n/, '')
          .replace(/^const require = createRequire\(import\.meta\.url\);\r?\n/m, '')
      : source;
    return inner.process(patched, filename, config, opts);
  },
  getCacheKey(source, filename, opts) {
    return inner.getCacheKey(source, filename, opts) + ':esm-compat';
  },
};
