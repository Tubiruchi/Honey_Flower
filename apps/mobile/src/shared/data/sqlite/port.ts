export type SqliteValue = string | number | null;
export type SqliteRow = Record<string, unknown>;

export interface SqliteConnectionPort {
  readonly name: string;
  execute(statements: string): Promise<void>;
  run(
    statement: string,
    values?: readonly SqliteValue[],
  ): Promise<{ changes: number; lastId?: number }>;
  query<Row extends SqliteRow = SqliteRow>(
    statement: string,
    values?: readonly SqliteValue[],
  ): Promise<Row[]>;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  close(): Promise<void>;
}

export interface SqliteConnectionFactory {
  open(name: string, version: number): Promise<SqliteConnectionPort>;
}

const transactionQueues = new WeakMap<SqliteConnectionPort, Promise<void>>();

async function performTransaction<T>(
  connection: SqliteConnectionPort,
  operation: () => Promise<T>,
): Promise<T> {
  await connection.begin();
  try {
    const result = await operation();
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Preserve the operation error; reopening the connection will verify consistency.
    }
    throw error;
  }
}

/** Native SQLite exposes one transaction per connection; serialize every caller on that connection. */
export function sqliteTransaction<T>(
  connection: SqliteConnectionPort,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = transactionQueues.get(connection) ?? Promise.resolve();
  const task = previous.then(
    () => performTransaction(connection, operation),
    () => performTransaction(connection, operation),
  );
  const tail = task.then(
    () => undefined,
    () => undefined,
  );
  transactionQueues.set(connection, tail);
  void tail.finally(() => {
    if (transactionQueues.get(connection) === tail) transactionQueues.delete(connection);
  });
  return task;
}
