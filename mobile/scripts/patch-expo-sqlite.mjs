import fs from 'fs';
import path from 'path';

const patches = [
  {
    file: 'node_modules/expo-sqlite/build/index.js',
    replacements: [
      ["export * from './SQLiteDatabase';", "export * from './SQLiteDatabase.js';"],
      ["export * from './SQLiteStatement';", "export * from './SQLiteStatement.js';"],
      ["export * from './hooks';", "export * from './hooks.js';"],
    ],
  },
  {
    file: 'node_modules/expo-sqlite/build/hooks.js',
    replacements: [
      ["import ExpoSQLite from './ExpoSQLiteNext';", "import ExpoSQLite from './ExpoSQLiteNext.js';"],
      ["import { openDatabaseAsync } from './SQLiteDatabase';", "import { openDatabaseAsync } from './SQLiteDatabase.js';"],
    ],
  },
  {
    file: 'node_modules/expo-sqlite/build/SQLiteDatabase.js',
    replacements: [
      ["import ExpoSQLite from './ExpoSQLiteNext';", "import ExpoSQLite from './ExpoSQLiteNext.js';"],
      ["import { SQLiteStatement, } from './SQLiteStatement';", "import { SQLiteStatement, } from './SQLiteStatement.js';"],
    ],
  },
  {
    file: 'node_modules/expo-sqlite/build/SQLiteStatement.js',
    replacements: [
      [
        "import { composeRow, composeRows, normalizeParams } from './paramUtils';",
        "import { composeRow, composeRows, normalizeParams } from './paramUtils.js';",
      ],
    ],
  },
  {
    file: 'node_modules/expo-sqlite/build/legacy/index.js',
    replacements: [
      ["export * from './SQLite';", "export * from './SQLite.js';"],
      ["export * from './SQLite.types';", "export * from './SQLite.types.js';"],
    ],
  },
  {
    file: 'node_modules/expo-sqlite/build/legacy/SQLite.js',
    replacements: [
      ["import './polyfillNextTick';", "import './polyfillNextTick.js';"],
      [
        "import customOpenDatabase from '@expo/websql/custom';",
        "import customOpenDatabase from '@expo/websql/custom/index.js';",
      ],
    ],
  },
];

for (const patch of patches) {
  const target = path.resolve(process.cwd(), patch.file);
  if (!fs.existsSync(target)) {
    continue;
  }

  let contents = fs.readFileSync(target, 'utf8');
  let updated = contents;

  for (const [from, to] of patch.replacements) {
    updated = updated.replace(from, to);
  }

  if (updated !== contents) {
    fs.writeFileSync(target, updated, 'utf8');
    console.log(`Patched ${patch.file}`);
  }
}
