-- Trusted transactional processor for the append-only mobile outbox.
-- The filename matches the UTC migration version recorded by the HoneyFlower project.
-- The APK may only INSERT pending operations. This private trigger validates each payload,
-- updates canonical projections and acknowledges the operation in the same transaction.

create or replace function app_private.json_millis(value jsonb)
returns bigint
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  parsed numeric;
begin
  if value is null or pg_catalog.jsonb_typeof(value) <> 'number' then
    return null;
  end if;
  parsed := (value #>> '{}')::numeric;
  if parsed <> pg_catalog.trunc(parsed) or parsed < 0 or parsed > 8640000000000000 then
    return null;
  end if;
  return parsed::bigint;
exception when others then
  return null;
end;
$$;

create or replace function app_private.millis_at(value bigint)
returns timestamptz
language sql
immutable
security invoker
set search_path = ''
as $$
  select pg_catalog.to_timestamp(value::double precision / 1000.0);
$$;

create or replace function app_private.time_list_valid(value jsonb, minimum_count integer, maximum_count integer)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  item text;
  item_count integer;
  distinct_count integer;
begin
  if pg_catalog.jsonb_typeof(value) <> 'array'
    or pg_catalog.jsonb_array_length(value) < minimum_count
    or pg_catalog.jsonb_array_length(value) > maximum_count then
    return false;
  end if;
  select pg_catalog.count(*), pg_catalog.count(distinct entry)
    into item_count, distinct_count
  from pg_catalog.jsonb_array_elements_text(value) as list(entry);
  if item_count <> distinct_count then
    return false;
  end if;
  for item in select entry from pg_catalog.jsonb_array_elements_text(value) as list(entry) loop
    if item !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' then
      return false;
    end if;
  end loop;
  return true;
exception when others then
  return false;
end;
$$;

create or replace function app_private.json_times(value jsonb)
returns time[]
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    pg_catalog.array_agg(entry::time order by ordinal),
    '{}'::time[]
  )
  from pg_catalog.jsonb_array_elements_text(value) with ordinality as list(entry, ordinal);
$$;

create or replace function app_private.quiet_periods_valid(value jsonb)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  period jsonb;
  start_minute integer;
  end_minute integer;
  minute integer;
  occupied boolean[] := pg_catalog.array_fill(false, array[1440], array[0]);
begin
  if pg_catalog.jsonb_typeof(value) <> 'array'
    or pg_catalog.jsonb_array_length(value) > 4 then
    return false;
  end if;
  for period in select entry from pg_catalog.jsonb_array_elements(value) as list(entry) loop
    if pg_catalog.jsonb_typeof(period) <> 'object'
      or not (period ?& array['from', 'to'])
      or period - array['from', 'to'] <> '{}'::jsonb
      or (period ->> 'from') !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
      or (period ->> 'to') !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
      or period ->> 'from' = period ->> 'to' then
      return false;
    end if;
    start_minute := pg_catalog.split_part(period ->> 'from', ':', 1)::integer * 60
      + pg_catalog.split_part(period ->> 'from', ':', 2)::integer;
    end_minute := pg_catalog.split_part(period ->> 'to', ':', 1)::integer * 60
      + pg_catalog.split_part(period ->> 'to', ':', 2)::integer;
    for minute in 0..1439 loop
      if (
        (start_minute < end_minute and minute >= start_minute and minute < end_minute)
        or
        (start_minute > end_minute and (minute >= start_minute or minute < end_minute))
      ) then
        if occupied[minute] then
          return false;
        end if;
        occupied[minute] := true;
      end if;
    end loop;
  end loop;
  return true;
exception when others then
  return false;
end;
$$;

create or replace function app_private.preferences_valid(value jsonb)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  water_goal integer;
  reapplications integer;
  notification_cap integer;
  zone text;
begin
  if pg_catalog.jsonb_typeof(value) <> 'object'
    or not (value ?& array[
      'preferredName', 'waterGoalMl', 'sunscreenReapplications', 'waterTimes',
      'sunscreenTimes', 'timeZone', 'notifications', 'notificationCap',
      'quietPeriods', 'tone', 'reinforcedSound', 'foregroundFlash'
    ])
    or value - array[
      'preferredName', 'waterGoalMl', 'sunscreenReapplications', 'waterTimes',
      'sunscreenTimes', 'timeZone', 'notifications', 'notificationCap',
      'quietPeriods', 'tone', 'reinforcedSound', 'foregroundFlash'
    ] <> '{}'::jsonb
    or pg_catalog.jsonb_typeof(value -> 'preferredName') <> 'string'
    or pg_catalog.char_length(pg_catalog.btrim(value ->> 'preferredName')) not between 1 and 60
    or pg_catalog.jsonb_typeof(value -> 'waterGoalMl') <> 'string'
    or (value ->> 'waterGoalMl') !~ '^[0-9]+$'
    or pg_catalog.jsonb_typeof(value -> 'sunscreenReapplications') <> 'number'
    or pg_catalog.jsonb_typeof(value -> 'timeZone') <> 'string'
    or pg_catalog.jsonb_typeof(value -> 'notifications') <> 'boolean'
    or pg_catalog.jsonb_typeof(value -> 'notificationCap') <> 'number'
    or pg_catalog.jsonb_typeof(value -> 'tone') <> 'string'
    or value ->> 'tone' not in ('gentle', 'medium', 'intense')
    or pg_catalog.jsonb_typeof(value -> 'reinforcedSound') <> 'boolean'
    or pg_catalog.jsonb_typeof(value -> 'foregroundFlash') <> 'boolean' then
    return false;
  end if;
  water_goal := (value ->> 'waterGoalMl')::integer;
  reapplications := (value ->> 'sunscreenReapplications')::integer;
  notification_cap := (value ->> 'notificationCap')::integer;
  zone := value ->> 'timeZone';
  if water_goal not between 250 and 10000
    or (value ->> 'sunscreenReapplications')::numeric <> reapplications
    or reapplications not between 0 and 12
    or (value ->> 'notificationCap')::numeric <> notification_cap
    or notification_cap not between 1 and 24
    or not app_private.time_list_valid(value -> 'waterTimes', 1, 12)
    or not app_private.time_list_valid(value -> 'sunscreenTimes', 1, 13)
    or pg_catalog.jsonb_array_length(value -> 'sunscreenTimes') <> reapplications + 1
    or not app_private.quiet_periods_valid(value -> 'quietPeriods')
    or not exists (
      select 1 from pg_catalog.pg_timezone_names where name = zone
    ) then
    return false;
  end if;
  return true;
exception when others then
  return false;
end;
$$;

create or replace function app_private.verification_valid(value jsonb, occurred_ms bigint, day_start_ms bigint)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  captured_ms bigint;
begin
  if value is null then
    return true;
  end if;
  if pg_catalog.jsonb_typeof(value) <> 'object'
    or not (value ?& array['version', 'captureId', 'capturedAt', 'source', 'assessment'])
    or value - array['version', 'captureId', 'capturedAt', 'source', 'assessment', 'analyzer'] <> '{}'::jsonb
    or value ->> 'version' <> '1'
    or pg_catalog.jsonb_typeof(value -> 'captureId') <> 'string'
    or pg_catalog.char_length(value ->> 'captureId') not between 1 and 128
    or value ->> 'source' not in ('web', 'android')
    or value ->> 'assessment' not in ('uncertain', 'approved')
    or (value ? 'analyzer' and (
      pg_catalog.jsonb_typeof(value -> 'analyzer') <> 'string'
      or pg_catalog.char_length(value ->> 'analyzer') not between 1 and 128
    ))
    or (value ->> 'assessment' = 'approved' and not (value ? 'analyzer')) then
    return false;
  end if;
  captured_ms := app_private.json_millis(value -> 'capturedAt');
  return captured_ms is not null and captured_ms between day_start_ms and occurred_ms;
exception when others then
  return false;
end;
$$;

create or replace function app_private.appointment_valid(value jsonb, day_start_ms bigint)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  revision bigint;
begin
  if pg_catalog.jsonb_typeof(value) <> 'object'
    or not (value ?& array['scheduleRevision', 'dayStart', 'time'])
    or value - array['scheduleRevision', 'dayStart', 'time'] <> '{}'::jsonb
    or (value ->> 'time') !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' then
    return false;
  end if;
  revision := (value ->> 'scheduleRevision')::bigint;
  return revision >= 1
    and (value ->> 'scheduleRevision')::numeric = revision
    and app_private.json_millis(value -> 'dayStart') = day_start_ms;
exception when others then
  return false;
end;
$$;

create or replace function app_private.event_valid(value jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  amount integer;
  occurred_ms bigint;
  edited_ms bigint;
begin
  if pg_catalog.jsonb_typeof(value) <> 'object'
    or not (value ?& array['id', 'kind', 'amount', 'at'])
    or value - array['id', 'kind', 'amount', 'at', 'editedAt', 'verification', 'appointment'] <> '{}'::jsonb
    or pg_catalog.jsonb_typeof(value -> 'id') <> 'string'
    or pg_catalog.char_length(value ->> 'id') not between 1 and 128
    or value ->> 'kind' not in ('water', 'sunscreen') then
    return false;
  end if;
  amount := (value ->> 'amount')::integer;
  occurred_ms := app_private.json_millis(value -> 'at');
  if occurred_ms is null
    or (value ->> 'amount')::numeric <> amount
    or (value ->> 'kind' = 'water' and amount not between 1 and 10000)
    or (value ->> 'kind' = 'sunscreen' and amount <> 1) then
    return false;
  end if;
  if value ? 'editedAt' then
    edited_ms := app_private.json_millis(value -> 'editedAt');
    if edited_ms is null or edited_ms < occurred_ms then
      return false;
    end if;
  end if;
  return true;
exception when others then
  return false;
end;
$$;

revoke all on function app_private.json_millis(jsonb) from public, anon, authenticated;
revoke all on function app_private.millis_at(bigint) from public, anon, authenticated;
revoke all on function app_private.time_list_valid(jsonb, integer, integer) from public, anon, authenticated;
revoke all on function app_private.json_times(jsonb) from public, anon, authenticated;
revoke all on function app_private.quiet_periods_valid(jsonb) from public, anon, authenticated;
revoke all on function app_private.preferences_valid(jsonb) from public, anon, authenticated;
revoke all on function app_private.verification_valid(jsonb, bigint, bigint) from public, anon, authenticated;
revoke all on function app_private.appointment_valid(jsonb, bigint) from public, anon, authenticated;
revoke all on function app_private.event_valid(jsonb) from public, anon, authenticated;

create or replace function app_private.cycle_score(owner_id uuid, requested_cycle_id uuid, requested_cycle_index integer)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  with days as (
    select day_offset, requested_cycle_index * 7 + day_offset as global_day
    from pg_catalog.generate_series(0, 6) as day(day_offset)
  ), values_by_day as (
    select
      days.day_offset,
      goals.water_goal_ml,
      goals.sunscreen_goal_count,
      coalesce(events.water_amount, 0) as water_amount,
      coalesce(events.sunscreen_count, 0) as sunscreen_count
    from days
    left join lateral (
      select goal.water_goal_ml, goal.sunscreen_goal_count
      from public.goal_changes as goal
      where goal.user_id = owner_id
        and goal.day_index <= days.global_day
        and goal.deleted_at is null
      order by goal.day_index desc
      limit 1
    ) as goals on true
    left join lateral (
      select
        coalesce(pg_catalog.sum(event.amount) filter (where event.habit = 'water'), 0) as water_amount,
        pg_catalog.count(*) filter (where event.habit = 'sunscreen') as sunscreen_count
      from public.habit_events as event
      where event.user_id = owner_id
        and event.cycle_id = requested_cycle_id
        and event.day_index = days.day_offset
        and event.deleted_at is null
    ) as events on true
  )
  select pg_catalog.avg(
    (
      least(1::numeric, water_amount::numeric / nullif(water_goal_ml, 0))
      + least(1::numeric, sunscreen_count::numeric / nullif(sunscreen_goal_count, 0))
    ) / 2
  )
  from values_by_day;
$$;

create or replace function app_private.ensure_active_cycle(owner_id uuid, operation_at timestamptz, applied_revision bigint)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_cycle public.weekly_cycles%rowtype;
  profile_species text;
  next_species text;
  score numeric;
  next_id uuid;
begin
  select * into active_cycle
  from public.weekly_cycles
  where user_id = owner_id and status = 'active' and deleted_at is null
  for update;
  if not found or operation_at < active_cycle.started_at then
    return null;
  end if;
  if operation_at < active_cycle.ends_at then
    return active_cycle.id;
  end if;

  score := app_private.cycle_score(owner_id, active_cycle.id, active_cycle.cycle_index);
  if score is null then
    return null;
  end if;
  update public.weekly_cycles
  set status = 'closed',
      weekly_score = score,
      survived = score >= 0.8,
      closed_at = greatest(operation_at, active_cycle.ends_at),
      revision = revision + 1,
      server_revision = applied_revision
  where user_id = owner_id and id = active_cycle.id;

  select first_species into profile_species
  from public.profiles where user_id = owner_id;
  next_species := case
    when (active_cycle.cycle_index + 1) % 2 = 0 then profile_species
    when profile_species = 'sprout' then 'cactus'
    else 'sprout'
  end;
  insert into public.weekly_cycles (
    user_id, cycle_index, species, started_at, ends_at, status,
    policy_version, revision, server_revision
  ) values (
    owner_id, active_cycle.cycle_index + 1, next_species,
    operation_at, operation_at + interval '7 days', 'active', 1, 1, applied_revision
  ) returning id into next_id;
  return next_id;
end;
$$;

create or replace function app_private.water_verification_required(owner_id uuid, current_global_day integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with latest_verified as (
    select coalesce(pg_catalog.max(occurred_at), '-infinity'::timestamptz) as at
    from public.habit_events
    where user_id = owner_id
      and habit = 'water'
      and verification_capture_id is not null
      and deleted_at is null
  ), previous_days as (
    select global_day
    from pg_catalog.generate_series(0, current_global_day - 1) as day(global_day)
  )
  select exists (
    select 1
    from previous_days
    join public.weekly_cycles as cycle
      on cycle.user_id = owner_id
     and cycle.cycle_index = pg_catalog.floor(previous_days.global_day / 7.0)::integer
     and cycle.deleted_at is null
    left join lateral (
      select goal.water_goal_ml
      from public.goal_changes as goal
      where goal.user_id = owner_id
        and goal.day_index <= previous_days.global_day
        and goal.deleted_at is null
      order by goal.day_index desc
      limit 1
    ) as goals on true
    left join lateral (
      select coalesce(pg_catalog.sum(event.amount), 0) as amount
      from public.habit_events as event
      where event.user_id = owner_id
        and event.cycle_id = cycle.id
        and event.day_index = previous_days.global_day % 7
        and event.habit = 'water'
        and event.deleted_at is null
    ) as water on true
    cross join latest_verified
    where cycle.started_at + ((previous_days.global_day % 7) + 1) * interval '1 day' > latest_verified.at
      and water.amount < goals.water_goal_ml
  );
$$;

create or replace function app_private.sunscreen_window_valid(
  p_owner_id uuid,
  p_schedule_revision bigint,
  p_global_day integer,
  p_plant_day_start timestamptz,
  p_appointment_time time,
  p_created_at timestamptz,
  p_committed_at timestamptz
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  schedule public.schedule_changes%rowtype;
  opens_at timestamptz;
  closes_at timestamptz;
  next_at timestamptz;
begin
  select * into schedule
  from public.schedule_changes
  where user_id = p_owner_id
    and habit = 'sunscreen'
    and schedule_changes.schedule_revision = p_schedule_revision
    and from_day <= p_global_day
    and deleted_at is null;
  if not found or not (p_appointment_time = any(schedule.times)) then
    return false;
  end if;
  select candidate into opens_at
  from pg_catalog.generate_series(
    p_plant_day_start,
    p_plant_day_start + interval '1 day' - interval '1 minute',
    interval '1 minute'
  ) as occurrence(candidate)
  where (candidate at time zone schedule.time_zone)::time = p_appointment_time
  order by candidate
  limit 1;
  if opens_at is null then
    return false;
  end if;
  select candidate into next_at
  from pg_catalog.generate_series(
    opens_at + interval '1 minute',
    p_plant_day_start + interval '1 day' - interval '1 minute',
    interval '1 minute'
  ) as occurrence(candidate)
  where (candidate at time zone schedule.time_zone)::time = any(schedule.times)
  order by candidate
  limit 1;
  closes_at := least(
    opens_at + pg_catalog.make_interval(mins => schedule.window_minutes),
    coalesce(next_at, p_plant_day_start + interval '1 day'),
    p_plant_day_start + interval '1 day'
  );
  return p_created_at >= opens_at and p_created_at < closes_at
    and p_committed_at >= opens_at and p_committed_at < closes_at;
exception when others then
  return false;
end;
$$;

revoke all on function app_private.cycle_score(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function app_private.ensure_active_cycle(uuid, timestamptz, bigint) from public, anon, authenticated;
revoke all on function app_private.water_verification_required(uuid, integer) from public, anon, authenticated;
revoke all on function app_private.sunscreen_window_valid(uuid, bigint, integer, timestamptz, time, timestamptz, timestamptz) from public, anon, authenticated;

create unique index if not exists habit_events_active_appointment_unique
  on public.habit_events (
    user_id, appointment_schedule_revision, appointment_day_start, appointment_time
  )
  where habit = 'sunscreen' and deleted_at is null and appointment_schedule_revision is not null;

create or replace function app_private.process_sync_operation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  command jsonb;
  draft jsonb;
  before_event jsonb;
  after_event jsonb;
  target_operation public.sync_operations%rowtype;
  canonical_event public.habit_events%rowtype;
  active_cycle public.weekly_cycles%rowtype;
  active_cycle_id uuid;
  current_revision bigint;
  applied_revision bigint;
  created_ms bigint;
  committed_ms bigint;
  day_start_ms bigint;
  occurred_ms bigint;
  edited_ms bigint;
  captured_ms bigint;
  current_day integer;
  global_day integer;
  expected_revision bigint;
  event_revision bigint;
  operation_amount integer;
  old_water_goal integer;
  old_sunscreen_goal integer;
  new_water_goal integer;
  new_sunscreen_goal integer;
  current_sunscreen_count integer;
  schedule_revision bigint;
  desired_from_day integer;
  desired_effective_at timestamptz;
  previous_zone text;
  previous_times time[];
  operation_at timestamptz;
  created_at timestamptz;
  plant_day_start timestamptz;
  verification jsonb;
  appointment jsonb;
  target_event_id text;
  outcome text := 'rejected';
  failure text := 'invalid-operation';
begin
  begin
    if pg_catalog.jsonb_typeof(new.payload) <> 'object'
      or not (new.payload ?& array['version', 'local_revision', 'command', 'committed_at'])
      or new.payload - array[
        'version', 'local_revision', 'command', 'committed_at',
        'before', 'after', 'event_revision'
      ] <> '{}'::jsonb
      or new.payload ->> 'version' <> '1'
      or pg_catalog.jsonb_typeof(new.payload -> 'local_revision') <> 'number'
      or (new.payload ->> 'local_revision')::numeric < 1
      or (new.payload ->> 'local_revision')::numeric
        <> pg_catalog.trunc((new.payload ->> 'local_revision')::numeric)
      or pg_catalog.jsonb_typeof(new.payload -> 'command') <> 'object' then
      failure := 'invalid-envelope';
      raise exception 'invalid-envelope';
    end if;
    command := new.payload -> 'command';
    created_ms := app_private.json_millis(command -> 'createdAt');
    committed_ms := app_private.json_millis(new.payload -> 'committed_at');
    if created_ms is null
      or committed_ms is null
      or committed_ms < created_ms
      or command ->> 'id' <> new.operation_id
      or command ->> 'type' <> new.operation_type
      or pg_catalog.char_length(command ->> 'id') not between 1 and 128 then
      failure := 'invalid-envelope';
      raise exception 'invalid-envelope';
    end if;
    created_at := app_private.millis_at(created_ms);
    operation_at := app_private.millis_at(committed_ms);
    if pg_catalog.abs(extract(epoch from new.client_created_at - created_at)) > 0.001
      or created_at > new.server_received_at + interval '5 minutes'
      or operation_at > new.server_received_at + interval '5 minutes' then
      failure := 'invalid-client-time';
      raise exception 'invalid-client-time';
    end if;

    insert into public.sync_checkpoints (user_id, server_revision)
    values (new.user_id, 0)
    on conflict (user_id) do nothing;
    select server_revision into current_revision
    from public.sync_checkpoints
    where user_id = new.user_id
    for update;
    if new.base_revision > current_revision then
      outcome := 'conflict';
      failure := 'future-base-revision';
      raise exception 'future-base-revision';
    end if;
    applied_revision := current_revision + 1;

    if new.operation_type = 'start' then
      if command - array['id', 'createdAt', 'type', 'species', 'draft'] <> '{}'::jsonb
        or not (command ?& array['id', 'createdAt', 'type', 'species', 'draft'])
        or command ->> 'species' not in ('sprout', 'cactus')
        or new.payload ? 'before'
        or new.payload ? 'after'
        or new.payload ? 'event_revision'
        or not app_private.preferences_valid(command -> 'draft') then
        failure := 'invalid-start';
        raise exception 'invalid-start';
      end if;
      if exists (select 1 from public.profiles where user_id = new.user_id) then
        outcome := 'conflict';
        failure := 'profile-exists';
        raise exception 'profile-exists';
      end if;
      draft := command -> 'draft';
      insert into public.profiles (
        user_id, preferred_name, started_at, first_species, collection_time_zone,
        state_version, revision, server_revision
      ) values (
        new.user_id, pg_catalog.btrim(draft ->> 'preferredName'), operation_at,
        command ->> 'species', draft ->> 'timeZone', 1, 1, applied_revision
      );
      insert into public.user_preferences (
        user_id, water_goal_ml, sunscreen_reapplications, water_times, sunscreen_times,
        time_zone, notifications_enabled, notification_cap, quiet_periods, tone,
        reinforced_sound, foreground_flash, revision, server_revision
      ) values (
        new.user_id, (draft ->> 'waterGoalMl')::integer,
        (draft ->> 'sunscreenReapplications')::smallint,
        app_private.json_times(draft -> 'waterTimes'),
        app_private.json_times(draft -> 'sunscreenTimes'),
        draft ->> 'timeZone', (draft ->> 'notifications')::boolean,
        (draft ->> 'notificationCap')::smallint, draft -> 'quietPeriods',
        draft ->> 'tone', (draft ->> 'reinforcedSound')::boolean,
        (draft ->> 'foregroundFlash')::boolean, 1, applied_revision
      );
      insert into public.weekly_cycles (
        user_id, cycle_index, species, started_at, ends_at, status,
        policy_version, revision, server_revision
      ) values (
        new.user_id, 0, command ->> 'species', operation_at,
        operation_at + interval '7 days', 'active', 1, 1, applied_revision
      );
      insert into public.goal_changes (
        user_id, day_index, water_goal_ml, sunscreen_goal_count, revision, server_revision
      ) values (
        new.user_id, 0, (draft ->> 'waterGoalMl')::integer,
        ((draft ->> 'sunscreenReapplications')::integer + 1)::smallint, 1, applied_revision
      );
      insert into public.schedule_changes (
        user_id, habit, schedule_revision, from_day, effective_at, time_zone,
        times, revision, server_revision
      ) values (
        new.user_id, 'water', 1, 0, null, draft ->> 'timeZone',
        app_private.json_times(draft -> 'waterTimes'), 1, applied_revision
      );
      insert into public.schedule_changes (
        user_id, habit, schedule_revision, from_day, effective_at, time_zone,
        times, policy_version, window_minutes, context_fraction, revision, server_revision
      ) values (
        new.user_id, 'sunscreen', 1, 0, null, draft ->> 'timeZone',
        app_private.json_times(draft -> 'sunscreenTimes'), 1, 60, 0.5, 1, applied_revision
      );

    elsif new.operation_type = 'preferences' then
      if command - array['id', 'createdAt', 'type', 'draft', 'expectedRevision'] <> '{}'::jsonb
        or not (command ?& array['id', 'createdAt', 'type', 'draft', 'expectedRevision'])
        or new.payload ? 'before'
        or new.payload ? 'after'
        or new.payload ? 'event_revision'
        or not app_private.preferences_valid(command -> 'draft') then
        failure := 'invalid-preferences';
        raise exception 'invalid-preferences';
      end if;
      expected_revision := (command ->> 'expectedRevision')::bigint;
      if expected_revision < 1
        or (command ->> 'expectedRevision')::numeric <> expected_revision then
        failure := 'invalid-preferences-revision';
        raise exception 'invalid-preferences-revision';
      end if;
      select revision into event_revision
      from public.user_preferences
      where user_id = new.user_id
      for update;
      if not found then
        outcome := 'conflict';
        failure := 'profile-missing';
        raise exception 'profile-missing';
      end if;
      if event_revision <> expected_revision then
        outcome := 'conflict';
        failure := 'preferences-revision';
        raise exception 'preferences-revision';
      end if;
      active_cycle_id := app_private.ensure_active_cycle(new.user_id, operation_at, applied_revision);
      if active_cycle_id is null then
        outcome := 'conflict';
        failure := 'stale-cycle';
        raise exception 'stale-cycle';
      end if;
      select * into active_cycle from public.weekly_cycles
      where user_id = new.user_id and id = active_cycle_id;
      current_day := pg_catalog.floor(
        extract(epoch from operation_at - active_cycle.started_at) / 86400
      )::integer;
      current_day := greatest(0, least(6, current_day));
      global_day := active_cycle.cycle_index * 7 + current_day;
      select water_goal_ml, sunscreen_goal_count
        into old_water_goal, old_sunscreen_goal
      from public.goal_changes
      where user_id = new.user_id and day_index <= global_day and deleted_at is null
      order by day_index desc
      limit 1;
      if not found then
        failure := 'goal-history-missing';
        raise exception 'goal-history-missing';
      end if;
      draft := command -> 'draft';
      new_water_goal := (draft ->> 'waterGoalMl')::integer;
      new_sunscreen_goal := (draft ->> 'sunscreenReapplications')::integer + 1;
      if old_water_goal <> new_water_goal or old_sunscreen_goal <> new_sunscreen_goal then
        insert into public.goal_changes (
          user_id, day_index, water_goal_ml, sunscreen_goal_count,
          revision, server_revision, deleted_at
        ) values (
          new.user_id, global_day + 1, new_water_goal, new_sunscreen_goal, 1, applied_revision, null
        )
        on conflict (user_id, day_index) do update set
          water_goal_ml = excluded.water_goal_ml,
          sunscreen_goal_count = excluded.sunscreen_goal_count,
          revision = public.goal_changes.revision + 1,
          server_revision = excluded.server_revision,
          deleted_at = null;
      end if;

      -- Water schedules replace only future openings from the same plant day.
      desired_from_day := global_day;
      desired_effective_at := operation_at;
      update public.schedule_changes
      set deleted_at = operation_at, revision = revision + 1, server_revision = applied_revision
      where user_id = new.user_id and habit = 'water' and deleted_at is null
        and (
          from_day > desired_from_day
          or (from_day = desired_from_day
            and coalesce(effective_at, '-infinity'::timestamptz) >= desired_effective_at)
        );
      select time_zone, times into previous_zone, previous_times
      from public.schedule_changes
      where user_id = new.user_id and habit = 'water' and deleted_at is null
      order by from_day desc, effective_at desc nulls first
      limit 1;
      if not found
        or previous_zone <> draft ->> 'timeZone'
        or previous_times <> app_private.json_times(draft -> 'waterTimes') then
        select coalesce(pg_catalog.max(change.schedule_revision), 0) + 1
          into schedule_revision
        from public.schedule_changes as change
        where user_id = new.user_id and habit = 'water';
        insert into public.schedule_changes (
          user_id, habit, schedule_revision, from_day, effective_at,
          time_zone, times, revision, server_revision
        ) values (
          new.user_id, 'water', schedule_revision, desired_from_day, desired_effective_at,
          draft ->> 'timeZone', app_private.json_times(draft -> 'waterTimes'), 1, applied_revision
        );
      end if;

      -- Protector changes start tomorrow when its goal changes; otherwise they replace future slots today.
      desired_from_day := case
        when old_sunscreen_goal <> new_sunscreen_goal then global_day + 1
        else global_day
      end;
      desired_effective_at := case
        when old_sunscreen_goal <> new_sunscreen_goal then null
        else operation_at
      end;
      update public.schedule_changes
      set deleted_at = operation_at, revision = revision + 1, server_revision = applied_revision
      where user_id = new.user_id and habit = 'sunscreen' and deleted_at is null
        and (
          from_day > desired_from_day
          or (
            from_day = desired_from_day and (
              desired_effective_at is null
              or coalesce(effective_at, '-infinity'::timestamptz) >= desired_effective_at
            )
          )
        );
      select time_zone, times into previous_zone, previous_times
      from public.schedule_changes
      where user_id = new.user_id and habit = 'sunscreen' and deleted_at is null
      order by from_day desc, effective_at desc nulls first
      limit 1;
      if not found
        or previous_zone <> draft ->> 'timeZone'
        or previous_times <> app_private.json_times(draft -> 'sunscreenTimes') then
        select coalesce(pg_catalog.max(change.schedule_revision), 0) + 1
          into schedule_revision
        from public.schedule_changes as change
        where user_id = new.user_id and habit = 'sunscreen';
        insert into public.schedule_changes (
          user_id, habit, schedule_revision, from_day, effective_at, time_zone,
          times, policy_version, window_minutes, context_fraction, revision, server_revision
        ) values (
          new.user_id, 'sunscreen', schedule_revision, desired_from_day,
          desired_effective_at, draft ->> 'timeZone',
          app_private.json_times(draft -> 'sunscreenTimes'), 1, 60, 0.5, 1, applied_revision
        );
      end if;

      update public.user_preferences
      set water_goal_ml = new_water_goal,
          sunscreen_reapplications = (new_sunscreen_goal - 1)::smallint,
          water_times = app_private.json_times(draft -> 'waterTimes'),
          sunscreen_times = app_private.json_times(draft -> 'sunscreenTimes'),
          time_zone = draft ->> 'timeZone',
          notifications_enabled = (draft ->> 'notifications')::boolean,
          notification_cap = (draft ->> 'notificationCap')::smallint,
          quiet_periods = draft -> 'quietPeriods',
          tone = draft ->> 'tone',
          reinforced_sound = (draft ->> 'reinforcedSound')::boolean,
          foreground_flash = (draft ->> 'foregroundFlash')::boolean,
          revision = revision + 1,
          server_revision = applied_revision
      where user_id = new.user_id;
      update public.profiles
      set preferred_name = pg_catalog.btrim(draft ->> 'preferredName'),
          revision = revision + 1,
          server_revision = applied_revision
      where user_id = new.user_id
        and preferred_name is distinct from pg_catalog.btrim(draft ->> 'preferredName');

    elsif new.operation_type = 'record' then
      if command - array[
        'id', 'createdAt', 'type', 'eventId', 'kind', 'amount', 'dayStart',
        'verification', 'appointment'
      ] <> '{}'::jsonb
        or not (command ?& array['id', 'createdAt', 'type', 'eventId', 'kind', 'amount', 'dayStart'])
        or not (new.payload ?& array['before', 'after', 'event_revision'])
        or pg_catalog.jsonb_typeof(new.payload -> 'before') <> 'null'
        or new.payload ->> 'event_revision' <> '1'
        or not app_private.event_valid(new.payload -> 'after') then
        failure := 'invalid-record';
        raise exception 'invalid-record';
      end if;
      day_start_ms := app_private.json_millis(command -> 'dayStart');
      operation_amount := (command ->> 'amount')::integer;
      if day_start_ms is null
        or pg_catalog.jsonb_typeof(command -> 'eventId') <> 'string'
        or pg_catalog.char_length(command ->> 'eventId') not between 1 and 128
        or command ->> 'kind' not in ('water', 'sunscreen')
        or (command ->> 'amount')::numeric <> operation_amount
        or (command ->> 'kind' = 'water' and operation_amount not between 1 and 10000)
        or (command ->> 'kind' = 'sunscreen' and operation_amount <> 1)
        or new.payload -> 'after' ->> 'id' <> command ->> 'eventId'
        or new.payload -> 'after' ->> 'kind' <> command ->> 'kind'
        or (new.payload -> 'after' ->> 'amount')::integer <> operation_amount
        or app_private.json_millis(new.payload -> 'after' -> 'at') <> created_ms
        or (new.payload -> 'after' -> 'verification') is distinct from (command -> 'verification')
        or (new.payload -> 'after' -> 'appointment') is distinct from (command -> 'appointment') then
        failure := 'invalid-record';
        raise exception 'invalid-record';
      end if;
      active_cycle_id := app_private.ensure_active_cycle(new.user_id, operation_at, applied_revision);
      if active_cycle_id is null then
        outcome := 'conflict';
        failure := 'stale-cycle';
        raise exception 'stale-cycle';
      end if;
      select * into active_cycle from public.weekly_cycles
      where user_id = new.user_id and id = active_cycle_id;
      current_day := pg_catalog.floor(
        extract(epoch from operation_at - active_cycle.started_at) / 86400
      )::integer;
      current_day := greatest(0, least(6, current_day));
      global_day := active_cycle.cycle_index * 7 + current_day;
      plant_day_start := active_cycle.started_at + current_day * interval '1 day';
      if day_start_ms <> (extract(epoch from plant_day_start) * 1000)::bigint
        or created_at < plant_day_start
        or created_at >= plant_day_start + interval '1 day'
        or created_at > operation_at then
        outcome := 'conflict';
        failure := 'day-closed';
        raise exception 'day-closed';
      end if;
      if exists (
        select 1 from public.habit_events
        where user_id = new.user_id and event_id = command ->> 'eventId'
      ) then
        outcome := 'conflict';
        failure := 'event-exists';
        raise exception 'event-exists';
      end if;
      verification := command -> 'verification';
      appointment := command -> 'appointment';
      if command ->> 'kind' = 'water' then
        if appointment is not null
          or not app_private.verification_valid(verification, created_ms, day_start_ms)
          or (
            app_private.water_verification_required(new.user_id, global_day)
            and verification is null
          ) then
          failure := case
            when verification is null then 'capture-required'
            else 'invalid-verification'
          end;
          raise exception 'invalid-verification';
        end if;
      else
        if verification is not null
          or not app_private.appointment_valid(appointment, day_start_ms)
          or not app_private.sunscreen_window_valid(
            new.user_id,
            (appointment ->> 'scheduleRevision')::bigint,
            global_day,
            plant_day_start,
            (appointment ->> 'time')::time,
            created_at,
            operation_at
          ) then
          outcome := 'conflict';
          failure := 'appointment-expired';
          raise exception 'appointment-expired';
        end if;
        select sunscreen_goal_count into new_sunscreen_goal
        from public.goal_changes
        where user_id = new.user_id and day_index <= global_day and deleted_at is null
        order by day_index desc
        limit 1;
        select pg_catalog.count(*) into current_sunscreen_count
        from public.habit_events
        where user_id = new.user_id and cycle_id = active_cycle_id
          and day_index = current_day and habit = 'sunscreen' and deleted_at is null;
        if current_sunscreen_count >= new_sunscreen_goal then
          outcome := 'conflict';
          failure := 'sunscreen-complete';
          raise exception 'sunscreen-complete';
        end if;
      end if;
      captured_ms := app_private.json_millis(verification -> 'capturedAt');
      insert into public.habit_events (
        user_id, event_id, cycle_id, day_index, habit, amount, occurred_at,
        verification_capture_id, verification_captured_at, verification_source,
        verification_assessment, verification_analyzer, appointment_schedule_revision,
        appointment_day_start, appointment_time, revision, server_revision, last_operation_id
      ) values (
        new.user_id, command ->> 'eventId', active_cycle_id, current_day,
        command ->> 'kind', operation_amount, created_at,
        verification ->> 'captureId',
        case when captured_ms is null then null else app_private.millis_at(captured_ms) end,
        verification ->> 'source', verification ->> 'assessment', verification ->> 'analyzer',
        case when appointment is null then null else (appointment ->> 'scheduleRevision')::bigint end,
        case when appointment is null then null else plant_day_start end,
        case when appointment is null then null else (appointment ->> 'time')::time end,
        1, applied_revision, new.operation_id
      );

    elsif new.operation_type in ('edit', 'remove') then
      if not (new.payload ?& array['before', 'after', 'event_revision'])
        or command - (case when new.operation_type = 'edit'
          then array['id', 'createdAt', 'type', 'eventId', 'amount', 'expectedRevision', 'dayStart']
          else array['id', 'createdAt', 'type', 'eventId', 'expectedRevision', 'dayStart']
        end) <> '{}'::jsonb
        or not (command ?& array['id', 'createdAt', 'type', 'eventId', 'expectedRevision', 'dayStart'])
        or not app_private.event_valid(new.payload -> 'before') then
        failure := 'invalid-change';
        raise exception 'invalid-change';
      end if;
      expected_revision := (command ->> 'expectedRevision')::bigint;
      event_revision := (new.payload ->> 'event_revision')::bigint;
      day_start_ms := app_private.json_millis(command -> 'dayStart');
      if expected_revision < 1
        or (command ->> 'expectedRevision')::numeric <> expected_revision
        or event_revision <> expected_revision + 1
        or new.payload -> 'before' ->> 'id' <> command ->> 'eventId'
        or day_start_ms is null then
        failure := 'invalid-change';
        raise exception 'invalid-change';
      end if;
      active_cycle_id := app_private.ensure_active_cycle(new.user_id, operation_at, applied_revision);
      if active_cycle_id is null then
        outcome := 'conflict';
        failure := 'stale-cycle';
        raise exception 'stale-cycle';
      end if;
      select * into active_cycle from public.weekly_cycles
      where user_id = new.user_id and id = active_cycle_id;
      current_day := pg_catalog.floor(
        extract(epoch from operation_at - active_cycle.started_at) / 86400
      )::integer;
      current_day := greatest(0, least(6, current_day));
      plant_day_start := active_cycle.started_at + current_day * interval '1 day';
      if day_start_ms <> (extract(epoch from plant_day_start) * 1000)::bigint then
        outcome := 'conflict';
        failure := 'day-closed';
        raise exception 'day-closed';
      end if;
      select * into canonical_event
      from public.habit_events
      where user_id = new.user_id and event_id = command ->> 'eventId'
      for update;
      if not found or canonical_event.deleted_at is not null then
        outcome := 'conflict';
        failure := 'event-missing';
        raise exception 'event-missing';
      end if;
      if canonical_event.revision <> expected_revision then
        outcome := 'conflict';
        failure := 'event-revision';
        raise exception 'event-revision';
      end if;
      if canonical_event.cycle_id <> active_cycle_id
        or canonical_event.day_index <> current_day
        or canonical_event.occurred_at < plant_day_start then
        outcome := 'conflict';
        failure := 'day-closed';
        raise exception 'day-closed';
      end if;
      if new.operation_type = 'edit' then
        operation_amount := (command ->> 'amount')::integer;
        after_event := new.payload -> 'after';
        if canonical_event.habit <> 'water'
          or operation_amount not between 1 and 10000
          or (command ->> 'amount')::numeric <> operation_amount
          or not app_private.event_valid(after_event)
          or after_event ->> 'id' <> canonical_event.event_id
          or after_event ->> 'kind' <> 'water'
          or (after_event ->> 'amount')::integer <> operation_amount
          or app_private.json_millis(after_event -> 'at')
            <> (extract(epoch from canonical_event.occurred_at) * 1000)::bigint
          or app_private.json_millis(after_event -> 'editedAt') <> committed_ms then
          failure := 'invalid-edit';
          raise exception 'invalid-edit';
        end if;
        update public.habit_events
        set amount = operation_amount,
            edited_at = operation_at,
            revision = revision + 1,
            server_revision = applied_revision,
            last_operation_id = new.operation_id
        where user_id = new.user_id and event_id = canonical_event.event_id;
      else
        if pg_catalog.jsonb_typeof(new.payload -> 'after') <> 'null' then
          failure := 'invalid-remove';
          raise exception 'invalid-remove';
        end if;
        update public.habit_events
        set deleted_at = operation_at,
            revision = revision + 1,
            server_revision = applied_revision,
            last_operation_id = new.operation_id
        where user_id = new.user_id and event_id = canonical_event.event_id;
      end if;

    elsif new.operation_type = 'undo' then
      if command - array[
        'id', 'createdAt', 'type', 'targetOperationId', 'expectedRevision', 'dayStart'
      ] <> '{}'::jsonb
        or not (command ?& array[
          'id', 'createdAt', 'type', 'targetOperationId', 'expectedRevision', 'dayStart'
        ])
        or not (new.payload ?& array['before', 'after', 'event_revision']) then
        failure := 'invalid-undo';
        raise exception 'invalid-undo';
      end if;
      expected_revision := (command ->> 'expectedRevision')::bigint;
      event_revision := (new.payload ->> 'event_revision')::bigint;
      day_start_ms := app_private.json_millis(command -> 'dayStart');
      if expected_revision < 1
        or (command ->> 'expectedRevision')::numeric <> expected_revision
        or event_revision <> expected_revision + 1
        or day_start_ms is null then
        failure := 'invalid-undo';
        raise exception 'invalid-undo';
      end if;
      select * into target_operation
      from public.sync_operations
      where user_id = new.user_id
        and operation_id = command ->> 'targetOperationId'
        and status = 'applied';
      if not found or target_operation.operation_type in ('start', 'preferences', 'undo') then
        outcome := 'conflict';
        failure := 'undo-target';
        raise exception 'undo-target';
      end if;
      if exists (
        select 1
        from public.sync_operations as previous_undo
        where previous_undo.user_id = new.user_id
          and previous_undo.status = 'applied'
          and previous_undo.operation_type = 'undo'
          and previous_undo.payload -> 'command' ->> 'targetOperationId'
            = command ->> 'targetOperationId'
      ) then
        outcome := 'conflict';
        failure := 'already-undone';
        raise exception 'already-undone';
      end if;
      target_event_id := coalesce(
        target_operation.payload -> 'after' ->> 'id',
        target_operation.payload -> 'before' ->> 'id'
      );
      if target_event_id is null then
        outcome := 'conflict';
        failure := 'undo-target';
        raise exception 'undo-target';
      end if;
      active_cycle_id := app_private.ensure_active_cycle(new.user_id, operation_at, applied_revision);
      if active_cycle_id is null then
        outcome := 'conflict';
        failure := 'stale-cycle';
        raise exception 'stale-cycle';
      end if;
      select * into active_cycle from public.weekly_cycles
      where user_id = new.user_id and id = active_cycle_id;
      current_day := pg_catalog.floor(
        extract(epoch from operation_at - active_cycle.started_at) / 86400
      )::integer;
      current_day := greatest(0, least(6, current_day));
      plant_day_start := active_cycle.started_at + current_day * interval '1 day';
      if day_start_ms <> (extract(epoch from plant_day_start) * 1000)::bigint then
        outcome := 'conflict';
        failure := 'day-closed';
        raise exception 'day-closed';
      end if;
      select * into canonical_event
      from public.habit_events
      where user_id = new.user_id and event_id = target_event_id
      for update;
      if not found or canonical_event.revision <> expected_revision
        or canonical_event.cycle_id <> active_cycle_id
        or canonical_event.day_index <> current_day then
        outcome := 'conflict';
        failure := 'event-revision';
        raise exception 'event-revision';
      end if;
      after_event := new.payload -> 'after';
      if pg_catalog.jsonb_typeof(after_event) = 'null' then
        if canonical_event.deleted_at is not null then
          outcome := 'conflict';
          failure := 'event-missing';
          raise exception 'event-missing';
        end if;
        update public.habit_events
        set deleted_at = operation_at,
            revision = revision + 1,
            server_revision = applied_revision,
            last_operation_id = new.operation_id
        where user_id = new.user_id and event_id = target_event_id;
      else
        if not app_private.event_valid(after_event)
          or after_event ->> 'id' <> target_event_id
          or after_event ->> 'kind' <> canonical_event.habit
          or app_private.json_millis(after_event -> 'at')
            <> (extract(epoch from canonical_event.occurred_at) * 1000)::bigint then
          failure := 'invalid-undo-result';
          raise exception 'invalid-undo-result';
        end if;
        operation_amount := (after_event ->> 'amount')::integer;
        verification := after_event -> 'verification';
        appointment := after_event -> 'appointment';
        if canonical_event.habit = 'water' then
          if appointment is not null
            or not app_private.verification_valid(
              verification,
              app_private.json_millis(after_event -> 'at'),
              day_start_ms
            ) then
            failure := 'invalid-undo-result';
            raise exception 'invalid-undo-result';
          end if;
        else
          if verification is not null
            or not app_private.appointment_valid(appointment, day_start_ms) then
            failure := 'invalid-undo-result';
            raise exception 'invalid-undo-result';
          end if;
        end if;
        edited_ms := app_private.json_millis(after_event -> 'editedAt');
        captured_ms := app_private.json_millis(verification -> 'capturedAt');
        update public.habit_events
        set amount = operation_amount,
            edited_at = case when edited_ms is null then null else app_private.millis_at(edited_ms) end,
            verification_capture_id = verification ->> 'captureId',
            verification_captured_at = case
              when captured_ms is null then null else app_private.millis_at(captured_ms)
            end,
            verification_source = verification ->> 'source',
            verification_assessment = verification ->> 'assessment',
            verification_analyzer = verification ->> 'analyzer',
            appointment_schedule_revision = case
              when appointment is null then null else (appointment ->> 'scheduleRevision')::bigint
            end,
            appointment_day_start = case when appointment is null then null else plant_day_start end,
            appointment_time = case
              when appointment is null then null else (appointment ->> 'time')::time
            end,
            deleted_at = null,
            revision = revision + 1,
            server_revision = applied_revision,
            last_operation_id = new.operation_id
        where user_id = new.user_id and event_id = target_event_id;
      end if;
    else
      failure := 'unsupported-operation';
      raise exception 'unsupported-operation';
    end if;

    update public.sync_checkpoints
    set server_revision = applied_revision,
        last_operation_id = new.operation_id,
        updated_at = pg_catalog.transaction_timestamp()
    where user_id = new.user_id;
    update public.sync_operations
    set status = 'applied',
        applied_server_revision = applied_revision,
        processed_at = pg_catalog.clock_timestamp(),
        result = pg_catalog.jsonb_build_object(
          'version', 1,
          'operation_type', new.operation_type,
          'server_revision', applied_revision
        ),
        failure_code = null
    where user_id = new.user_id and operation_id = new.operation_id;

  exception
    when raise_exception then
      update public.sync_operations
      set status = outcome,
          applied_server_revision = null,
          processed_at = pg_catalog.clock_timestamp(),
          result = pg_catalog.jsonb_build_object('version', 1, 'failure_code', failure),
          failure_code = failure
      where user_id = new.user_id and operation_id = new.operation_id;
    when unique_violation or foreign_key_violation or check_violation
      or invalid_text_representation or numeric_value_out_of_range then
      update public.sync_operations
      set status = 'rejected',
          applied_server_revision = null,
          processed_at = pg_catalog.clock_timestamp(),
          result = pg_catalog.jsonb_build_object('version', 1, 'failure_code', 'invalid-payload'),
          failure_code = 'invalid-payload'
      where user_id = new.user_id and operation_id = new.operation_id;
    when others then
      update public.sync_operations
      set status = 'rejected',
          applied_server_revision = null,
          processed_at = pg_catalog.clock_timestamp(),
          result = pg_catalog.jsonb_build_object('version', 1, 'failure_code', 'processor-error'),
          failure_code = 'processor-error'
      where user_id = new.user_id and operation_id = new.operation_id;
  end;
  return new;
end;
$$;

revoke all on function app_private.process_sync_operation() from public, anon, authenticated;

create trigger process_sync_operation_after_insert
after insert on public.sync_operations
for each row
when (new.status = 'pending')
execute function app_private.process_sync_operation();

comment on function app_private.process_sync_operation() is
  'Private transactional processor. It validates one immutable client operation and either advances canonical projections and the checkpoint, or records a safe rejection/conflict.';
