import type {
  SQLiteConnection as SQLiteConnectionBridge,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import type {
  SqliteConnectionFactory,
  SqliteConnectionPort,
  SqliteRow,
  SqliteValue,
} from './port.ts';

class NativeSqliteConnection implements SqliteConnectionPort {
  readonly name: string;
  private database: SQLiteDBConnection;
  private closeNative: () => Promise<void>;
  private closed = false;

  constructor(name: string, database: SQLiteDBConnection, closeNative: () => Promise<void>) {
    this.name = name;
    this.database = database;
    this.closeNative = closeNative;
  }

  async execute(statements: string) {
    await this.database.execute(statements, false);
  }

  async run(statement: string, values: readonly SqliteValue[] = []) {
    const result = await this.database.run(statement, [...values], false);
    return {
      changes: result.changes?.changes ?? 0,
      ...(result.changes?.lastId === undefined ? {} : { lastId: result.changes.lastId }),
    };
  }

  async query<Row extends SqliteRow = SqliteRow>(
    statement: string,
    values: readonly SqliteValue[] = [],
  ) {
    const result = await this.database.query(statement, [...values]);
    return (result.values ?? []) as Row[];
  }

  async begin() {
    await this.database.beginTransaction();
  }

  async commit() {
    await this.database.commitTransaction();
  }

  async rollback() {
    await this.database.rollbackTransaction();
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    await this.closeNative();
  }
}

export class CapacitorSqliteFactory implements SqliteConnectionFactory {
  private bridge: SQLiteConnectionBridge | null = null;

  private async getBridge() {
    if (this.bridge) return this.bridge;
    const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
    this.bridge = new SQLiteConnection(CapacitorSQLite);
    return this.bridge;
  }

  async open(name: string, version: number): Promise<SqliteConnectionPort> {
    const bridge = await this.getBridge();
    await bridge.checkConnectionsConsistency();
    const existing = await bridge.isConnection(name, false);
    const database = existing.result
      ? await bridge.retrieveConnection(name, false)
      : await bridge.createConnection(name, false, 'no-encryption', version, false);
    const opened = await database.isDBOpen();
    if (!opened.result) await database.open();
    return new NativeSqliteConnection(name, database, () => bridge.closeConnection(name, false));
  }
}
