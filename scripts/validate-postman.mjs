import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const collectionPath = new URL(
  '../postman/HoneyFlower-Avance3.postman_collection.json',
  import.meta.url,
);
const collection = JSON.parse(await readFile(collectionPath, 'utf8'));

assert.equal(
  collection.info?.schema,
  'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  'La colección debe usar el esquema Postman 2.1.',
);

const variables = new Map(collection.variable.map((variable) => [variable.key, variable.value]));
const requiredVariables = [
  'supabase_url',
  'publishable_key',
  'test_email',
  'test_password',
  'access_token',
  'refresh_token',
  'user_id',
  'device_id',
  'device_created_at',
  'request_time',
  'app_version',
];
for (const variable of requiredVariables)
  assert.ok(variables.has(variable), `Falta la variable de colección ${variable}.`);

assert.equal(
  variables.get('supabase_url'),
  'https://jkrlnelqsafkztsvnbrr.supabase.co',
  'La colección debe apuntar al proyecto HoneyFlower.',
);
for (const sensitive of [
  'publishable_key',
  'test_email',
  'test_password',
  'access_token',
  'refresh_token',
  'user_id',
])
  assert.equal(variables.get(sensitive), '', `${sensitive} debe permanecer vacío en Git.`);

function requests(items, path = []) {
  return items.flatMap((item) =>
    item.request
      ? [{ name: [...path, item.name].join(' / '), ...item }]
      : requests(item.item ?? [], [...path, item.name]),
  );
}

const allRequests = requests(collection.item);
assert.equal(
  allRequests.length,
  10,
  'La colección debe conservar sus diez peticiones documentadas.',
);

const methods = new Set(allRequests.map((item) => item.request.method));
for (const method of ['GET', 'POST', 'PUT', 'DELETE'])
  assert.ok(methods.has(method), `La colección no cubre ${method}.`);

for (const item of allRequests) {
  const tests = item.event?.find((event) => event.listen === 'test')?.script?.exec;
  assert.ok(Array.isArray(tests) && tests.length, `${item.name} no tiene pruebas automáticas.`);
  assert.equal(
    item.response?.length,
    0,
    `${item.name} no debe versionar respuestas con datos reales.`,
  );
}

const dataRequests = allRequests.filter((item) => String(item.request.url).includes('/rest/v1/'));
for (const item of dataRequests) {
  const headers = new Map(
    item.request.header.map((header) => [header.key.toLowerCase(), header.value]),
  );
  assert.equal(
    headers.get('apikey'),
    '{{publishable_key}}',
    `${item.name} no usa la clave pública.`,
  );
  assert.match(
    headers.get('authorization') ?? '',
    /^Bearer \{\{(?:access_token|publishable_key)\}\}$/,
    `${item.name} no declara un Bearer permitido.`,
  );
}

const crudRequests = allRequests.filter((item) =>
  String(item.request.url).includes('/rest/v1/sync_devices'),
);
assert.ok(
  crudRequests.some(
    (item) => item.request.method === 'PUT' && /user_id=eq\./.test(item.request.url),
  ),
  'PUT debe filtrar la llave primaria compuesta.',
);
assert.ok(
  crudRequests.some(
    (item) => item.request.method === 'DELETE' && /device_id=eq\./.test(item.request.url),
  ),
  'DELETE debe limitarse al dispositivo temporal.',
);

const serialized = JSON.stringify(collection);
assert.doesNotMatch(serialized, /sb_secret_|service_role|postgres(?:ql)?:\/\//i);
assert.doesNotMatch(serialized, /sb_publishable_[A-Za-z0-9_-]{10,}/);

console.log(
  `Colección Postman válida: ${allRequests.length} peticiones, métodos ${[...methods].sort().join(', ')} y credenciales vacías.`,
);
