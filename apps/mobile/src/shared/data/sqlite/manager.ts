import { LOCAL_DATABASE_VERSION, prepareSqliteConnection } from './migrations.ts';
import type { SqliteConnectionFactory, SqliteConnectionPort } from './port.ts';
import { sqliteTransaction } from './port.ts';

const accountId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sqliteDatabaseName(scope: string): string {
  if (scope === 'guest') return 'honeyflower_guest';
  if (!accountId.test(scope)) throw new Error('La cuenta no tiene un identificador SQLite válido.');
  return `honeyflower_${scope.replaceAll('-', '').toLowerCase()}`;
}

export interface OpenLocalDatabase {
  scope: string;
  name: string;
  version: number;
  connection: SqliteConnectionPort;
}

type PrepareConnection = (connection: SqliteConnectionPort, now?: () => number) => Promise<number>;

export class SqliteDatabaseManager {
  private factory: SqliteConnectionFactory;
  private prepare: PrepareConnection;
  private now: () => number;
  private current: OpenLocalDatabase | null = null;
  private serial: Promise<void> = Promise.resolve();

  constructor(
    factory: SqliteConnectionFactory,
    options: { prepare?: PrepareConnection; now?: () => number } = {},
  ) {
    this.factory = factory;
    this.prepare = options.prepare ?? prepareSqliteConnection;
    this.now = options.now ?? Date.now;
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const task = this.serial.then(operation, operation);
    this.serial = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }

  open(scope: string): Promise<OpenLocalDatabase> {
    return this.enqueue(async () => {
      const name = sqliteDatabaseName(scope);
      if (this.current?.name === name) return this.current;
      if (this.current) {
        await this.current.connection.close();
        this.current = null;
      }

      const connection = await this.factory.open(name, LOCAL_DATABASE_VERSION);
      try {
        const version = await this.prepare(connection, this.now);
        await this.bindScope(connection, scope);
        this.current = { scope, name, version, connection };
        return this.current;
      } catch (error) {
        await connection.close().catch(() => undefined);
        throw error;
      }
    });
  }

  close(): Promise<void> {
    return this.enqueue(async () => {
      if (!this.current) return;
      const connection = this.current.connection;
      this.current = null;
      await connection.close();
    });
  }

  private async bindScope(connection: SqliteConnectionPort, scope: string) {
    const rows = await connection.query<{ value: string }>(
      "SELECT value FROM hf_local_meta WHERE key = 'database_scope';",
    );
    const stored = rows[0]?.value;
    if (stored !== undefined) {
      if (stored !== scope) throw new Error('La base SQLite pertenece a otra cuenta.');
      return;
    }
    await sqliteTransaction(connection, () =>
      connection
        .run(
          `INSERT INTO hf_local_meta (key, value, updated_at)
           VALUES ('database_scope', ?, ?);`,
          [scope, this.now()],
        )
        .then(() => undefined),
    );
    const verified = await connection.query<{ value: string }>(
      "SELECT value FROM hf_local_meta WHERE key = 'database_scope';",
    );
    if (verified[0]?.value !== scope)
      throw new Error('SQLite no pudo confirmar la separación de la cuenta.');
  }
}
