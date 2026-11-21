-- Authenticated, RLS-scoped download for the offline-first mobile projection.
-- The client passes only its last committed cursor. A changed cursor returns one
-- transactionally consistent snapshot; an unchanged cursor avoids a redundant download.

create or replace function public.pull_sync_snapshot(p_since_revision bigint default 0)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  current_revision bigint := 0;
  current_operation_id text;
  profile_row public.profiles%rowtype;
  preferences_row public.user_preferences%rowtype;
begin
  if owner_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_since_revision is null or p_since_revision < 0 then
    raise exception using errcode = '22023', message = 'invalid sync cursor';
  end if;

  select checkpoint.server_revision, checkpoint.last_operation_id
    into current_revision, current_operation_id
  from public.sync_checkpoints as checkpoint
  where checkpoint.user_id = owner_id;
  current_revision := coalesce(current_revision, 0);

  if p_since_revision > current_revision then
    raise exception using errcode = '22023', message = 'sync cursor is ahead of server';
  end if;
  if p_since_revision = current_revision then
    return pg_catalog.jsonb_build_object(
      'version', 1,
      'server_revision', current_revision,
      'last_operation_id', current_operation_id,
      'unchanged', true
    );
  end if;

  select profile.* into profile_row
  from public.profiles as profile
  where profile.user_id = owner_id;
  select preferences.* into preferences_row
  from public.user_preferences as preferences
  where preferences.user_id = owner_id;

  if profile_row.user_id is null or preferences_row.user_id is null then
    raise exception using errcode = 'P0001', message = 'canonical profile is incomplete';
  end if;

  return pg_catalog.jsonb_build_object(
    'version', 1,
    'server_revision', current_revision,
    'last_operation_id', current_operation_id,
    'unchanged', false,
    'profile', pg_catalog.jsonb_build_object(
      'preferred_name', profile_row.preferred_name,
      'started_at', (extract(epoch from profile_row.started_at) * 1000)::bigint,
      'first_species', profile_row.first_species,
      'collection_time_zone', profile_row.collection_time_zone
    ),
    'preferences', pg_catalog.jsonb_build_object(
      'water_goal_ml', preferences_row.water_goal_ml,
      'sunscreen_reapplications', preferences_row.sunscreen_reapplications,
      'water_times', (
        select coalesce(
          pg_catalog.jsonb_agg(pg_catalog.to_char(item, 'HH24:MI') order by ordinal),
          '[]'::jsonb
        )
        from pg_catalog.unnest(preferences_row.water_times)
          with ordinality as listed(item, ordinal)
      ),
      'sunscreen_times', (
        select coalesce(
          pg_catalog.jsonb_agg(pg_catalog.to_char(item, 'HH24:MI') order by ordinal),
          '[]'::jsonb
        )
        from pg_catalog.unnest(preferences_row.sunscreen_times)
          with ordinality as listed(item, ordinal)
      ),
      'time_zone', preferences_row.time_zone,
      'notifications_enabled', preferences_row.notifications_enabled,
      'notification_cap', preferences_row.notification_cap,
      'quiet_periods', preferences_row.quiet_periods,
      'tone', preferences_row.tone,
      'reinforced_sound', preferences_row.reinforced_sound,
      'foreground_flash', preferences_row.foreground_flash,
      'revision', preferences_row.revision
    ),
    'cycles', (
      select coalesce(pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'cycle_index', cycle.cycle_index,
          'species', cycle.species,
          'started_at', (extract(epoch from cycle.started_at) * 1000)::bigint,
          'ends_at', (extract(epoch from cycle.ends_at) * 1000)::bigint,
          'status', cycle.status,
          'revision', cycle.revision
        ) order by cycle.cycle_index
      ), '[]'::jsonb)
      from public.weekly_cycles as cycle
      where cycle.user_id = owner_id and cycle.deleted_at is null
    ),
    'goals', (
      select coalesce(pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'day_index', goal.day_index,
          'water_goal_ml', goal.water_goal_ml,
          'sunscreen_goal_count', goal.sunscreen_goal_count,
          'revision', goal.revision
        ) order by goal.day_index
      ), '[]'::jsonb)
      from public.goal_changes as goal
      where goal.user_id = owner_id and goal.deleted_at is null
    ),
    'schedules', (
      select coalesce(pg_catalog.jsonb_agg(
        pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
          'habit', schedule.habit,
          'schedule_revision', schedule.schedule_revision,
          'from_day', schedule.from_day,
          'effective_at', case when schedule.effective_at is null then null
            else (extract(epoch from schedule.effective_at) * 1000)::bigint end,
          'time_zone', schedule.time_zone,
          'times', (
            select coalesce(
              pg_catalog.jsonb_agg(pg_catalog.to_char(item, 'HH24:MI') order by ordinal),
              '[]'::jsonb
            )
            from pg_catalog.unnest(schedule.times)
              with ordinality as listed(item, ordinal)
          ),
          'policy_version', schedule.policy_version,
          'window_minutes', schedule.window_minutes,
          'context_fraction', schedule.context_fraction,
          'revision', schedule.revision
        )) order by schedule.habit, schedule.from_day,
          schedule.effective_at nulls first, schedule.schedule_revision
      ), '[]'::jsonb)
      from public.schedule_changes as schedule
      where schedule.user_id = owner_id and schedule.deleted_at is null
    ),
    'schedule_revisions', pg_catalog.jsonb_build_object(
      'water', coalesce((
        select pg_catalog.max(schedule.schedule_revision)
        from public.schedule_changes as schedule
        where schedule.user_id = owner_id and schedule.habit = 'water'
      ), 1),
      'sunscreen', coalesce((
        select pg_catalog.max(schedule.schedule_revision)
        from public.schedule_changes as schedule
        where schedule.user_id = owner_id and schedule.habit = 'sunscreen'
      ), 1)
    ),
    'events', (
      select coalesce(pg_catalog.jsonb_agg(
        pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
          'id', event.event_id,
          'kind', event.habit,
          'amount', event.amount,
          'at', (extract(epoch from event.occurred_at) * 1000)::bigint,
          'edited_at', case when event.edited_at is null then null
            else (extract(epoch from event.edited_at) * 1000)::bigint end,
          'revision', event.revision,
          'deleted', event.deleted_at is not null,
          'verification', case when event.verification_capture_id is null then null else
            pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
              'version', 1,
              'captureId', event.verification_capture_id,
              'capturedAt', (extract(epoch from event.verification_captured_at) * 1000)::bigint,
              'source', event.verification_source,
              'assessment', event.verification_assessment,
              'analyzer', event.verification_analyzer
            )) end,
          'appointment', case when event.appointment_schedule_revision is null then null else
            pg_catalog.jsonb_build_object(
              'scheduleRevision', event.appointment_schedule_revision,
              'dayStart', (extract(epoch from event.appointment_day_start) * 1000)::bigint,
              'time', pg_catalog.to_char(event.appointment_time, 'HH24:MI')
            ) end
        )) order by event.occurred_at, event.event_id
      ), '[]'::jsonb)
      from public.habit_events as event
      where event.user_id = owner_id
    ),
    'operations', (
      select coalesce(pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'payload', operation.payload,
          'applied_server_revision', operation.applied_server_revision
        ) order by operation.applied_server_revision, operation.operation_id
      ), '[]'::jsonb)
      from public.sync_operations as operation
      where operation.user_id = owner_id and operation.status = 'applied'
    )
  );
end;
$$;

revoke all on function public.pull_sync_snapshot(bigint) from public, anon;
grant execute on function public.pull_sync_snapshot(bigint) to authenticated;

comment on function public.pull_sync_snapshot(bigint) is
  'RLS-scoped canonical snapshot for an authenticated HoneyFlower installation. Returns no photo bytes or file paths.';
