import * as SQLite from 'expo-sqlite/legacy';
import type { SQLResultSet, SQLTransaction } from 'expo-sqlite/legacy';

const db = SQLite.openDatabase('tasktracer.db');

export const initDb = () => {
  db.transaction((tx: SQLTransaction) => {
    tx.executeSql(
      'CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY NOT NULL, status TEXT, payload TEXT);',
    );
  });
};

export const upsertTasks = (tasks: { _id: string; status: string }[]) => {
  db.transaction((tx: SQLTransaction) => {
    tasks.forEach((task) => {
      tx.executeSql('INSERT OR REPLACE INTO tasks (id, status, payload) VALUES (?, ?, ?);', [
        task._id,
        task.status,
        JSON.stringify(task),
      ]);
    });
  });
};

export const getLocalTasks = (): Promise<any[]> => {
  return new Promise((resolve) => {
    db.transaction((tx: SQLTransaction) => {
      tx.executeSql('SELECT * FROM tasks;', [], (_, result: SQLResultSet) => {
        const items = result.rows._array.map((row: any) => JSON.parse(row.payload));
        resolve(items);
      });
    });
  });
};

export const markLocalTaskCompleted = (id: string) => {
  db.transaction((tx: SQLTransaction) => {
    tx.executeSql('UPDATE tasks SET status = ? WHERE id = ?;', ['completed', id]);
  });
};
