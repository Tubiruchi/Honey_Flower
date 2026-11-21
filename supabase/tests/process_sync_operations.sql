-- Transactional integration check for the trusted sync-operation processor.
-- Run against a database that contains at least one Auth user without a profile.
-- Every fixture is rolled back at the end.

begin;

do $$
declare
  owner_id uuid;
  prefix text := 'phase5-' || pg_catalog.txid_current()::text;
  start_operation text;
  record_operation text;
  edit_operation text;
  remove_operation text;
  undo_operation text;
  preferences_operation text;
  invalid_operation text;
  test_event_id text;
  start_ms bigint;
  record_ms bigint;
  edit_ms bigint;
  remove_ms bigint;
  undo_ms bigint;
  preferences_ms bigint;
  invalid_ms bigint;
  initial_event jsonb;
  edited_event jsonb;
  operation_status text;
  operation_failure text;
  checkpoint bigint;
  stored_amount integer;
  stored_revision bigint;
  stored_deleted_at timestamptz;
  stored_name text;
  pulled_snapshot jsonb;
  unchanged_snapshot jsonb;
begin
  select auth_user.id into owner_id
  from auth.users as auth_user
  left join public.profiles as profile on profile.user_id = auth_user.id
  where profile.user_id is null
  order by auth_user.created_at
  limit 1;

  if owner_id is null then
    raise exception 'phase-5-test-requires-an-auth-user-without-a-profile';
  end if;

  start_operation := prefix || '-start';
  record_operation := prefix || '-record';
  edit_operation := prefix || '-edit';
  remove_operation := prefix || '-remove';
  undo_operation := prefix || '-undo';
  preferences_operation := prefix || '-preferences';
  invalid_operation := prefix || '-invalid';
  test_event_id := prefix || '-water';
  start_ms := pg_catalog.floor(extract(epoch from (pg_catalog.transaction_timestamp() - interval '5 minutes')) * 1000)::bigint;
  record_ms := start_ms + 60000;
  edit_ms := start_ms + 120000;
  remove_ms := start_ms + 180000;
  undo_ms := start_ms + 240000;
  preferences_ms := start_ms + 250000;
  invalid_ms := start_ms + 260000;

  insert into public.sync_operations (
    user_id, operation_id, operation_type, base_revision, client_created_at, payload
  ) values (
    owner_id,
    start_operation,
    'start',
    0,
    app_private.millis_at(start_ms),
    pg_catalog.jsonb_build_object(
      'version', 1,
      'local_revision', 1,
      'committed_at', start_ms,
      'command', pg_catalog.jsonb_build_object(
        'id', start_operation,
        'createdAt', start_ms,
        'type', 'start',
        'species', 'sprout',
        'draft', pg_catalog.jsonb_build_object(
          'preferredName', 'Prueba fase 5',
          'waterGoalMl', '2500',
          'sunscreenReapplications', 3,
          'waterTimes', pg_catalog.jsonb_build_array('08:00', '12:00', '16:00'),
          'sunscreenTimes', pg_catalog.jsonb_build_array('08:00', '11:00', '14:00', '17:00'),
          'timeZone', 'America/Cancun',
          'notifications', true,
          'notificationCap', 8,
          'quietPeriods', '[]'::jsonb,
          'tone', 'gentle',
          'reinforcedSound', false,
          'foregroundFlash', false
        )
      )
    )
  );

  select status into operation_status
  from public.sync_operations
  where user_id = owner_id and operation_id = start_operation;
  if operation_status <> 'applied'
    or not exists (select 1 from public.profiles where user_id = owner_id)
    or not exists (select 1 from public.user_preferences where user_id = owner_id)
    or not exists (select 1 from public.weekly_cycles where user_id = owner_id and status = 'active') then
    raise exception 'start-operation-was-not-projected';
  end if;

  initial_event := pg_catalog.jsonb_build_object(
    'id', test_event_id,
    'kind', 'water',
    'amount', 500,
    'at', record_ms
  );
  insert into public.sync_operations (
    user_id, operation_id, operation_type, base_revision, client_created_at, payload
  ) values (
    owner_id,
    record_operation,
    'record',
    1,
    app_private.millis_at(record_ms),
    pg_catalog.jsonb_build_object(
      'version', 1,
      'local_revision', 2,
      'committed_at', record_ms,
      'before', null,
      'after', initial_event,
      'event_revision', 1,
      'command', pg_catalog.jsonb_build_object(
        'id', record_operation,
        'createdAt', record_ms,
        'type', 'record',
        'eventId', test_event_id,
        'kind', 'water',
        'amount', 500,
        'dayStart', start_ms
      )
    )
  );

  select status into operation_status
  from public.sync_operations
  where user_id = owner_id and operation_id = record_operation;
  select amount, revision into stored_amount, stored_revision
  from public.habit_events as habit_event
  where habit_event.user_id = owner_id and habit_event.event_id = test_event_id;
  if operation_status <> 'applied' or stored_amount <> 500 or stored_revision <> 1 then
    raise exception 'record-operation-was-not-projected';
  end if;

  edited_event := initial_event || pg_catalog.jsonb_build_object('amount', 750, 'editedAt', edit_ms);
  insert into public.sync_operations (
    user_id, operation_id, operation_type, base_revision, client_created_at, payload
  ) values (
    owner_id,
    edit_operation,
    'edit',
    2,
    app_private.millis_at(edit_ms),
    pg_catalog.jsonb_build_object(
      'version', 1,
      'local_revision', 3,
      'committed_at', edit_ms,
      'before', initial_event,
      'after', edited_event,
      'event_revision', 2,
      'command', pg_catalog.jsonb_build_object(
        'id', edit_operation,
        'createdAt', edit_ms,
        'type', 'edit',
        'eventId', test_event_id,
        'amount', 750,
        'expectedRevision', 1,
        'dayStart', start_ms
      )
    )
  );

  select amount, revision into stored_amount, stored_revision
  from public.habit_events as habit_event
  where habit_event.user_id = owner_id and habit_event.event_id = test_event_id;
  if stored_amount <> 750 or stored_revision <> 2 then
    raise exception 'edit-operation-was-not-projected';
  end if;

  insert into public.sync_operations (
    user_id, operation_id, operation_type, base_revision, client_created_at, payload
  ) values (
    owner_id,
    remove_operation,
    'remove',
    3,
    app_private.millis_at(remove_ms),
    pg_catalog.jsonb_build_object(
      'version', 1,
      'local_revision', 4,
      'committed_at', remove_ms,
      'before', edited_event,
      'after', null,
      'event_revision', 3,
      'command', pg_catalog.jsonb_build_object(
        'id', remove_operation,
        'createdAt', remove_ms,
        'type', 'remove',
        'eventId', test_event_id,
        'expectedRevision', 2,
        'dayStart', start_ms
      )
    )
  );

  select deleted_at, revision into stored_deleted_at, stored_revision
  from public.habit_events as habit_event
  where habit_event.user_id = owner_id and habit_event.event_id = test_event_id;
  if stored_deleted_at is null or stored_revision <> 3 then
    raise exception 'remove-operation-was-not-projected';
  end if;

  insert into public.sync_operations (
    user_id, operation_id, operation_type, base_revision, client_created_at, payload
  ) values (
    owner_id,
    undo_operation,
    'undo',
    4,
    app_private.millis_at(undo_ms),
    pg_catalog.jsonb_build_object(
      'version', 1,
      'local_revision', 5,
      'committed_at', undo_ms,
      'before', null,
      'after', edited_event,
      'event_revision', 4,
      'command', pg_catalog.jsonb_build_object(
        'id', undo_operation,
        'createdAt', undo_ms,
        'type', 'undo',
        'targetOperationId', remove_operation,
        'expectedRevision', 3,
        'dayStart', start_ms
      )
    )
  );

  select deleted_at, revision into stored_deleted_at, stored_revision
  from public.habit_events as habit_event
  where habit_event.user_id = owner_id and habit_event.event_id = test_event_id;
  if stored_deleted_at is not null or stored_revision <> 4 then
    raise exception 'undo-operation-was-not-projected';
  end if;

  insert into public.sync_operations (
    user_id, operation_id, operation_type, base_revision, client_created_at, payload
  ) values (
    owner_id,
    preferences_operation,
    'preferences',
    5,
    app_private.millis_at(preferences_ms),
    pg_catalog.jsonb_build_object(
      'version', 1,
      'local_revision', 6,
      'committed_at', preferences_ms,
      'command', pg_catalog.jsonb_build_object(
        'id', preferences_operation,
        'createdAt', preferences_ms,
        'type', 'preferences',
        'expectedRevision', 1,
        'draft', pg_catalog.jsonb_build_object(
          'preferredName', 'Prueba sincronizada',
          'waterGoalMl', '3000',
          'sunscreenReapplications', 2,
          'waterTimes', pg_catalog.jsonb_build_array('07:30', '12:30', '18:30'),
          'sunscreenTimes', pg_catalog.jsonb_build_array('08:30', '12:30', '16:30'),
          'timeZone', 'America/Cancun',
          'notifications', true,
          'notificationCap', 6,
          'quietPeriods', pg_catalog.jsonb_build_array(
            pg_catalog.jsonb_build_object('from', '22:00', 'to', '07:00')
          ),
          'tone', 'medium',
          'reinforcedSound', true,
          'foregroundFlash', false
        )
      )
    )
  );

  select profile.preferred_name, preferences.revision
    into stored_name, stored_revision
  from public.profiles as profile
  join public.user_preferences as preferences on preferences.user_id = profile.user_id
  where profile.user_id = owner_id;
  if stored_name <> 'Prueba sincronizada' or stored_revision <> 2 then
    raise exception 'preferences-operation-was-not-projected';
  end if;

  insert into public.sync_operations (
    user_id, operation_id, operation_type, base_revision, client_created_at, payload
  ) values (
    owner_id,
    invalid_operation,
    'record',
    6,
    app_private.millis_at(invalid_ms),
    pg_catalog.jsonb_build_object(
      'version', 1,
      'local_revision', 7,
      'committed_at', invalid_ms,
      'command', pg_catalog.jsonb_build_object(
        'id', invalid_operation,
        'createdAt', invalid_ms,
        'type', 'record'
      )
    )
  );

  select status, failure_code into operation_status, operation_failure
  from public.sync_operations
  where user_id = owner_id and operation_id = invalid_operation;
  select server_revision into checkpoint
  from public.sync_checkpoints
  where user_id = owner_id;
  if operation_status <> 'rejected' or operation_failure <> 'invalid-record' or checkpoint <> 6 then
    raise exception 'invalid-operation-was-not-safely-rejected';
  end if;

  perform pg_catalog.set_config('request.jwt.claim.sub', owner_id::text, true);
  execute 'set local role authenticated';
  pulled_snapshot := public.pull_sync_snapshot(0);
  unchanged_snapshot := public.pull_sync_snapshot(6);
  execute 'reset role';

  if pulled_snapshot ->> 'unchanged' <> 'false'
    or (pulled_snapshot ->> 'server_revision')::bigint <> 6
    or pulled_snapshot -> 'profile' ->> 'preferred_name' <> 'Prueba sincronizada'
    or pg_catalog.jsonb_array_length(pulled_snapshot -> 'operations') <> 6
    or pg_catalog.jsonb_array_length(pulled_snapshot -> 'events') <> 1
    or pulled_snapshot::text ~* 'photo_(data|bytes)|image_base64'
    or unchanged_snapshot ->> 'unchanged' <> 'true'
    or unchanged_snapshot ? 'profile' then
    raise exception 'pull-snapshot-contract-failed';
  end if;
end;
$$;

rollback;

select 'phase-5-and-6-sync-passed' as result;
