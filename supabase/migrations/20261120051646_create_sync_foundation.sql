-- HoneyFlower synchronization foundation.
-- Remote migration version: 20261120051646.
-- The mobile client appends idempotent operations; a trusted backend will validate them and
-- update the read-only projections in the same transaction. Temporary photos never reach SQL.

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = transaction_timestamp();
  return new;
end;
$$;

revoke all on function app_private.set_updated_at() from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_name text not null
    check (char_length(btrim(preferred_name)) between 1 and 60),
  started_at timestamptz not null,
  first_species text not null check (first_species in ('sprout', 'cactus')),
  collection_time_zone text not null
    check (char_length(collection_time_zone) between 1 and 100),
  state_version smallint not null default 1 check (state_version = 1),
  revision bigint not null default 1 check (revision >= 1),
  server_revision bigint not null default 0 check (server_revision >= 0),
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp()
);

comment on table public.profiles is
  'Account-owned profile and root metadata imported from the local HoneyFlower state.';
comment on column public.profiles.collection_time_zone is
  'Fixed IANA zone used to group completed plants; travel must not regroup history.';

create table public.user_preferences (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  water_goal_ml integer not null check (water_goal_ml between 250 and 10000),
  sunscreen_reapplications smallint not null
    check (sunscreen_reapplications between 0 and 12),
  water_times time[] not null,
  sunscreen_times time[] not null,
  time_zone text not null check (char_length(time_zone) between 1 and 100),
  notifications_enabled boolean not null default true,
  notification_cap smallint not null check (notification_cap between 1 and 24),
  quiet_periods jsonb not null default '[]'::jsonb,
  tone text not null check (tone in ('gentle', 'medium', 'intense')),
  reinforced_sound boolean not null default false,
  foreground_flash boolean not null default false,
  revision bigint not null default 1 check (revision >= 1),
  server_revision bigint not null default 0 check (server_revision >= 0),
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp(),
  constraint user_preferences_water_times_check check (
    cardinality(water_times) between 1 and 12
    and array_position(water_times, null) is null
  ),
  constraint user_preferences_sunscreen_times_check check (
    cardinality(sunscreen_times) = sunscreen_reapplications + 1
    and cardinality(sunscreen_times) between 1 and 13
    and array_position(sunscreen_times, null) is null
  ),
  constraint user_preferences_quiet_periods_check check (
    case
      when jsonb_typeof(quiet_periods) = 'array'
        then jsonb_array_length(quiet_periods) <= 4
      else false
    end
  )
);

comment on table public.user_preferences is
  'Current goals, schedules and notification choices. Historical changes live in the versioned tables.';

create table public.weekly_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  cycle_index integer not null check (cycle_index >= 0),
  species text not null check (species in ('sprout', 'cactus')),
  started_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'closed')),
  weekly_score numeric(6, 5),
  survived boolean,
  closed_at timestamptz,
  policy_version smallint not null default 1 check (policy_version >= 1),
  revision bigint not null default 1 check (revision >= 1),
  server_revision bigint not null default 0 check (server_revision >= 0),
  deleted_at timestamptz,
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp(),
  constraint weekly_cycles_user_index_unique unique (user_id, cycle_index),
  constraint weekly_cycles_user_id_unique unique (user_id, id),
  constraint weekly_cycles_duration_check check (ends_at = started_at + interval '7 days'),
  constraint weekly_cycles_result_check check (
    (
      status = 'active'
      and closed_at is null
      and weekly_score is null
      and survived is null
    )
    or
    (
      status = 'closed'
      and closed_at is not null
      and closed_at >= ends_at
      and weekly_score is not null
      and weekly_score between 0 and 1
      and survived is not null
    )
  ),
  constraint weekly_cycles_deleted_at_check check (
    deleted_at is null or deleted_at >= started_at
  )
);

create unique index weekly_cycles_one_active_per_user
  on public.weekly_cycles (user_id)
  where status = 'active' and deleted_at is null;

comment on table public.weekly_cycles is
  'Canonical weekly cycle projection. Scores and survival are server-confirmed, never trusted from the APK.';

create table public.goal_changes (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  day_index integer not null check (day_index >= 0),
  water_goal_ml integer not null check (water_goal_ml between 250 and 10000),
  sunscreen_goal_count smallint not null check (sunscreen_goal_count between 1 and 13),
  revision bigint not null default 1 check (revision >= 1),
  server_revision bigint not null default 0 check (server_revision >= 0),
  deleted_at timestamptz,
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp(),
  primary key (user_id, day_index)
);

comment on table public.goal_changes is
  'Effective goal history. Closed days continue using the goal that was active for that day.';

create table public.schedule_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  habit text not null check (habit in ('water', 'sunscreen')),
  schedule_revision bigint not null check (schedule_revision >= 1),
  from_day integer not null check (from_day >= 0),
  effective_at timestamptz,
  time_zone text not null check (char_length(time_zone) between 1 and 100),
  times time[] not null,
  policy_version smallint,
  window_minutes smallint,
  context_fraction numeric(4, 3),
  revision bigint not null default 1 check (revision >= 1),
  server_revision bigint not null default 0 check (server_revision >= 0),
  deleted_at timestamptz,
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp(),
  constraint schedule_changes_user_revision_unique
    unique (user_id, habit, schedule_revision),
  constraint schedule_changes_times_check check (
    cardinality(times) between 1 and
      case when habit = 'water' then 12 else 13 end
    and array_position(times, null) is null
  ),
  constraint schedule_changes_policy_check check (
    (
      habit = 'water'
      and policy_version is null
      and window_minutes is null
      and context_fraction is null
    )
    or
    (
      habit = 'sunscreen'
      and policy_version is not null
      and policy_version >= 1
      and window_minutes is not null
      and window_minutes between 1 and 1440
      and context_fraction is not null
      and context_fraction > 0
      and context_fraction < 1
    )
  )
);

create unique index schedule_changes_effective_version_unique
  on public.schedule_changes (user_id, habit, from_day, effective_at) nulls not distinct
  where deleted_at is null;

comment on table public.schedule_changes is
  'Versioned water and sunscreen schedules, including same-day effective edits.';

create table public.habit_events (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  event_id text not null check (char_length(event_id) between 1 and 128),
  cycle_id uuid not null,
  day_index smallint not null check (day_index between 0 and 6),
  habit text not null check (habit in ('water', 'sunscreen')),
  amount integer not null,
  occurred_at timestamptz not null,
  edited_at timestamptz,
  verification_capture_id text,
  verification_captured_at timestamptz,
  verification_source text,
  verification_assessment text,
  verification_analyzer text,
  appointment_schedule_revision bigint,
  appointment_day_start timestamptz,
  appointment_time time,
  revision bigint not null default 1 check (revision >= 1),
  server_revision bigint not null default 0 check (server_revision >= 0),
  last_operation_id text,
  deleted_at timestamptz,
  server_received_at timestamptz not null default transaction_timestamp(),
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp(),
  primary key (user_id, event_id),
  constraint habit_events_cycle_owner_fk
    foreign key (user_id, cycle_id)
    references public.weekly_cycles(user_id, id)
    on delete cascade,
  constraint habit_events_amount_check check (
    (habit = 'water' and amount between 1 and 10000)
    or (habit = 'sunscreen' and amount = 1)
  ),
  constraint habit_events_edited_at_check check (
    edited_at is null or edited_at >= occurred_at
  ),
  constraint habit_events_deleted_at_check check (
    deleted_at is null or deleted_at >= occurred_at
  ),
  constraint habit_events_verification_check check (
    (
      verification_capture_id is null
      and verification_captured_at is null
      and verification_source is null
      and verification_assessment is null
      and verification_analyzer is null
    )
    or
    (
      habit = 'water'
      and char_length(verification_capture_id) between 1 and 128
      and verification_captured_at is not null
      and verification_captured_at <= occurred_at
      and verification_source in ('web', 'android')
      and verification_assessment in ('uncertain', 'approved')
      and (
        verification_analyzer is null
        or char_length(verification_analyzer) between 1 and 128
      )
      and (
        verification_assessment = 'uncertain'
        or char_length(verification_analyzer) between 1 and 128
      )
    )
  ),
  constraint habit_events_appointment_check check (
    (
      appointment_schedule_revision is null
      and appointment_day_start is null
      and appointment_time is null
    )
    or
    (
      habit = 'sunscreen'
      and appointment_schedule_revision is not null
      and appointment_schedule_revision >= 1
      and appointment_day_start is not null
      and appointment_time is not null
    )
  )
);

create index habit_events_cycle_index
  on public.habit_events (user_id, cycle_id, occurred_at)
  where deleted_at is null;
create index habit_events_updated_index
  on public.habit_events (user_id, server_revision);

comment on table public.habit_events is
  'Canonical habit records with tombstones and revisions. Camera bytes and file paths are intentionally excluded.';

create table public.sync_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id text not null check (char_length(operation_id) between 1 and 128),
  device_id uuid,
  operation_type text not null
    check (operation_type in ('start', 'record', 'edit', 'remove', 'undo', 'preferences')),
  base_revision bigint not null check (base_revision >= 0),
  client_created_at timestamptz not null,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'applied', 'rejected', 'conflict')),
  applied_server_revision bigint check (applied_server_revision >= 0),
  processed_at timestamptz,
  result jsonb,
  failure_code text,
  server_received_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp(),
  primary key (user_id, operation_id),
  constraint sync_operations_payload_check check (jsonb_typeof(payload) = 'object'),
  constraint sync_operations_status_consistency_check check (
    (
      status = 'pending'
      and processed_at is null
      and applied_server_revision is null
      and result is null
      and failure_code is null
    )
    or
    (
      status = 'applied'
      and processed_at is not null
      and applied_server_revision is not null
      and failure_code is null
    )
    or
    (
      status in ('rejected', 'conflict')
      and processed_at is not null
      and applied_server_revision is null
    )
  )
);

create index sync_operations_pending_index
  on public.sync_operations (server_received_at)
  where status = 'pending';
create index sync_operations_user_revision_index
  on public.sync_operations (user_id, applied_server_revision)
  where status = 'applied';

comment on table public.sync_operations is
  'Append-only idempotent outbox received from clients. Authenticated clients cannot acknowledge or rewrite operations.';

create table public.sync_checkpoints (
  user_id uuid primary key references auth.users(id) on delete cascade,
  server_revision bigint not null default 0 check (server_revision >= 0),
  last_operation_id text,
  updated_at timestamptz not null default transaction_timestamp()
);

comment on table public.sync_checkpoints is
  'Per-account authoritative revision used for incremental pulls and conflict checks.';

create table public.sync_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  platform text not null check (platform in ('android', 'web')),
  app_version text not null check (char_length(app_version) between 1 and 32),
  last_pulled_revision bigint not null default 0 check (last_pulled_revision >= 0),
  last_pushed_at timestamptz,
  last_seen_at timestamptz not null default transaction_timestamp(),
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp(),
  primary key (user_id, device_id)
);

comment on table public.sync_devices is
  'Client-owned sync cursor and installation metadata; it contains no hardware identifier or secret.';

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function app_private.set_updated_at();
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function app_private.set_updated_at();
create trigger weekly_cycles_set_updated_at
before update on public.weekly_cycles
for each row execute function app_private.set_updated_at();
create trigger goal_changes_set_updated_at
before update on public.goal_changes
for each row execute function app_private.set_updated_at();
create trigger schedule_changes_set_updated_at
before update on public.schedule_changes
for each row execute function app_private.set_updated_at();
create trigger habit_events_set_updated_at
before update on public.habit_events
for each row execute function app_private.set_updated_at();
create trigger sync_operations_set_updated_at
before update on public.sync_operations
for each row execute function app_private.set_updated_at();
create trigger sync_devices_set_updated_at
before update on public.sync_devices
for each row execute function app_private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.weekly_cycles enable row level security;
alter table public.goal_changes enable row level security;
alter table public.schedule_changes enable row level security;
alter table public.habit_events enable row level security;
alter table public.sync_operations enable row level security;
alter table public.sync_checkpoints enable row level security;
alter table public.sync_devices enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_preferences from anon, authenticated;
revoke all on table public.weekly_cycles from anon, authenticated;
revoke all on table public.goal_changes from anon, authenticated;
revoke all on table public.schedule_changes from anon, authenticated;
revoke all on table public.habit_events from anon, authenticated;
revoke all on table public.sync_operations from anon, authenticated;
revoke all on table public.sync_checkpoints from anon, authenticated;
revoke all on table public.sync_devices from anon, authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.user_preferences to authenticated;
grant select on table public.weekly_cycles to authenticated;
grant select on table public.goal_changes to authenticated;
grant select on table public.schedule_changes to authenticated;
grant select on table public.habit_events to authenticated;
grant select, insert on table public.sync_operations to authenticated;
grant select on table public.sync_checkpoints to authenticated;
grant select, insert, update, delete on table public.sync_devices to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.user_preferences to service_role;
grant all on table public.weekly_cycles to service_role;
grant all on table public.goal_changes to service_role;
grant all on table public.schedule_changes to service_role;
grant all on table public.habit_events to service_role;
grant all on table public.sync_operations to service_role;
grant all on table public.sync_checkpoints to service_role;
grant all on table public.sync_devices to service_role;

create policy profiles_select_own
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy user_preferences_select_own
on public.user_preferences for select to authenticated
using ((select auth.uid()) = user_id);

create policy weekly_cycles_select_own
on public.weekly_cycles for select to authenticated
using ((select auth.uid()) = user_id);

create policy goal_changes_select_own
on public.goal_changes for select to authenticated
using ((select auth.uid()) = user_id);

create policy schedule_changes_select_own
on public.schedule_changes for select to authenticated
using ((select auth.uid()) = user_id);

create policy habit_events_select_own
on public.habit_events for select to authenticated
using ((select auth.uid()) = user_id);

create policy sync_operations_select_own
on public.sync_operations for select to authenticated
using ((select auth.uid()) = user_id);

create policy sync_operations_insert_own_pending
on public.sync_operations for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'pending'
  and processed_at is null
  and applied_server_revision is null
  and result is null
  and failure_code is null
);

create policy sync_checkpoints_select_own
on public.sync_checkpoints for select to authenticated
using ((select auth.uid()) = user_id);

create policy sync_devices_select_own
on public.sync_devices for select to authenticated
using ((select auth.uid()) = user_id);

create policy sync_devices_insert_own
on public.sync_devices for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy sync_devices_update_own
on public.sync_devices for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy sync_devices_delete_own
on public.sync_devices for delete to authenticated
using ((select auth.uid()) = user_id);
