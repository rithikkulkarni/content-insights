create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('thumbnails', 'thumbnails', false)
on conflict (id) do nothing;

create policy "Users can view own thumbnails"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'thumbnails'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can upload own thumbnails"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'thumbnails'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update own thumbnails"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'thumbnails'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'thumbnails'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete own thumbnails"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'thumbnails'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create table if not exists public.entries (
  entry_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thumbnail_path text,
  title text not null,
  tags text[] not null default '{}',
  topic text,
  subscriber_count integer,
  created_at timestamptz not null default now()
);

create index if not exists entries_user_id_idx
on public.entries(user_id);

create index if not exists entries_created_at_idx
on public.entries(created_at desc);

alter table public.entries enable row level security;

create policy "Users can view own entries"
on public.entries
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own entries"
on public.entries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own entries"
on public.entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own entries"
on public.entries
for delete
to authenticated
using (auth.uid() = user_id);


create table if not exists public.feedback (
  feedback_id uuid primary key default gen_random_uuid(),
  entry_id uuid not null unique references public.entries(entry_id) on delete cascade,
  score integer not null check (score >= 0 and score <= 100),
  thumbnail_feedback text,
  title_feedback text,
  tag_feedback text[] not null default '{}'
);

create index if not exists feedback_entry_id_idx
on public.feedback(entry_id);

alter table public.feedback enable row level security;

create policy "Users can view own feedback"
on public.feedback
for select
to authenticated
using (
  exists (
    select 1
    from public.entries e
    where e.entry_id = feedback.entry_id
      and e.user_id = auth.uid()
  )
);

create policy "Users can insert own feedback"
on public.feedback
for insert
to authenticated
with check (
  exists (
    select 1
    from public.entries e
    where e.entry_id = feedback.entry_id
      and e.user_id = auth.uid()
  )
);

create policy "Users can update own feedback"
on public.feedback
for update
to authenticated
using (
  exists (
    select 1
    from public.entries e
    where e.entry_id = feedback.entry_id
      and e.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.entries e
    where e.entry_id = feedback.entry_id
      and e.user_id = auth.uid()
  )
);

create policy "Users can delete own feedback"
on public.feedback
for delete
to authenticated
using (
  exists (
    select 1
    from public.entries e
    where e.entry_id = feedback.entry_id
      and e.user_id = auth.uid()
  )
);


create table if not exists public.thumbnail_replacements (
  thumbnail_replacement_id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback(feedback_id) on delete cascade,
  photo_replacement_path text not null
);

create index if not exists thumbnail_replacements_feedback_id_idx
on public.thumbnail_replacements(feedback_id);

alter table public.thumbnail_replacements enable row level security;

create policy "Users can view own thumbnail replacements"
on public.thumbnail_replacements
for select
to authenticated
using (
  exists (
    select 1
    from public.feedback f
    join public.entries e on e.entry_id = f.entry_id
    where f.feedback_id = thumbnail_replacements.feedback_id
      and e.user_id = auth.uid()
  )
);

create policy "Users can insert own thumbnail replacements"
on public.thumbnail_replacements
for insert
to authenticated
with check (
  exists (
    select 1
    from public.feedback f
    join public.entries e on e.entry_id = f.entry_id
    where f.feedback_id = thumbnail_replacements.feedback_id
      and e.user_id = auth.uid()
  )
);

create policy "Users can update own thumbnail replacements"
on public.thumbnail_replacements
for update
to authenticated
using (
  exists (
    select 1
    from public.feedback f
    join public.entries e on e.entry_id = f.entry_id
    where f.feedback_id = thumbnail_replacements.feedback_id
      and e.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.feedback f
    join public.entries e on e.entry_id = f.entry_id
    where f.feedback_id = thumbnail_replacements.feedback_id
      and e.user_id = auth.uid()
  )
);

create policy "Users can delete own thumbnail replacements"
on public.thumbnail_replacements
for delete
to authenticated
using (
  exists (
    select 1
    from public.feedback f
    join public.entries e on e.entry_id = f.entry_id
    where f.feedback_id = thumbnail_replacements.feedback_id
      and e.user_id = auth.uid()
  )
);


create table if not exists public.title_replacements (
  title_replacement_id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback(feedback_id) on delete cascade,
  title_replacement text not null
);

create index if not exists title_replacements_feedback_id_idx
on public.title_replacements(feedback_id);

alter table public.title_replacements enable row level security;

create policy "Users can view own title replacements"
on public.title_replacements
for select
to authenticated
using (
  exists (
    select 1
    from public.feedback f
    join public.entries e on e.entry_id = f.entry_id
    where f.feedback_id = title_replacements.feedback_id
      and e.user_id = auth.uid()
  )
);

create policy "Users can insert own title replacements"
on public.title_replacements
for insert
to authenticated
with check (
  exists (
    select 1
    from public.feedback f
    join public.entries e on e.entry_id = f.entry_id
    where f.feedback_id = title_replacements.feedback_id
      and e.user_id = auth.uid()
  )
);

create policy "Users can update own title replacements"
on public.title_replacements
for update
to authenticated
using (
  exists (
    select 1
    from public.feedback f
    join public.entries e on e.entry_id = f.entry_id
    where f.feedback_id = title_replacements.feedback_id
      and e.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.feedback f
    join public.entries e on e.entry_id = f.entry_id
    where f.feedback_id = title_replacements.feedback_id
      and e.user_id = auth.uid()
  )
);

create policy "Users can delete own title replacements"
on public.title_replacements
for delete
to authenticated
using (
  exists (
    select 1
    from public.feedback f
    join public.entries e on e.entry_id = f.entry_id
    where f.feedback_id = title_replacements.feedback_id
      and e.user_id = auth.uid()
  )
);


create table if not exists public.tags_replacements (
  tags_replacement_id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback(feedback_id) on delete cascade,
  tags_replacement text[] not null default '{}'
);

create index if not exists tags_replacements_feedback_id_idx
on public.tags_replacements(feedback_id);

alter table public.tags_replacements enable row level security;

create policy "Users can view own tag replacements"
on public.tags_replacements
for select
to authenticated
using (
  exists (
    select 1
    from public.feedback f
    join public.entries e on e.entry_id = f.entry_id
    where f.feedback_id = tags_replacements.feedback_id
      and e.user_id = auth.uid()
  )
);

create policy "Users can insert own tag replacements"
on public.tags_replacements
for insert
to authenticated
with check (
  exists (
    select 1
    from public.feedback f
    join public.entries e on e.entry_id = f.entry_id
    where f.feedback_id = tags_replacements.feedback_id
      and e.user_id = auth.uid()
  )
);

create policy "Users can update own tag replacements"
on public.tags_replacements
for update
to authenticated
using (
  exists (
    select 1
    from public.feedback f
    join public.entries e on e.entry_id = f.entry_id
    where f.feedback_id = tags_replacements.feedback_id
      and e.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.feedback f
    join public.entries e on e.entry_id = f.entry_id
    where f.feedback_id = tags_replacements.feedback_id
      and e.user_id = auth.uid()
  )
);

create policy "Users can delete own tag replacements"
on public.tags_replacements
for delete
to authenticated
using (
  exists (
    select 1
    from public.feedback f
    join public.entries e on e.entry_id = f.entry_id
    where f.feedback_id = tags_replacements.feedback_id
      and e.user_id = auth.uid()
  )
);
