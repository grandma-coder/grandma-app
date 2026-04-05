-- ─── CHANNEL POSTS (social feed style) ──────────────────────────────────────
-- Posts within channels — text + photos, reactions, comments.
-- Complements existing channel_threads for a more social feed experience.

create table if not exists channel_posts (
  id            uuid primary key default uuid_generate_v4(),
  channel_id    uuid not null,
  author_id     uuid references auth.users(id) on delete cascade not null,
  content       text not null,
  photos        text[] default '{}',
  is_pinned     boolean default false,
  reaction_count int default 0,
  comment_count  int default 0,
  created_at    timestamptz default now()
);

alter table channel_posts enable row level security;

create policy "Anyone can read channel posts"
  on channel_posts for select using (true);

create policy "Authenticated users can create posts"
  on channel_posts for insert
  with check (auth.uid() = author_id);

create policy "Authors can update own posts"
  on channel_posts for update
  using (auth.uid() = author_id);

create index if not exists idx_channel_posts_channel on channel_posts(channel_id, created_at desc);
create index if not exists idx_channel_posts_author on channel_posts(author_id);

-- ─── POST REACTIONS ─────────────────────────────────────────────────────────

create table if not exists post_reactions (
  id            uuid primary key default uuid_generate_v4(),
  post_id       uuid references channel_posts(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,
  reaction      text not null default 'heart' check (reaction in ('heart', 'like', 'celebrate', 'support')),
  created_at    timestamptz default now(),
  constraint unique_post_reaction unique (post_id, user_id)
);

alter table post_reactions enable row level security;

create policy "Anyone can read reactions" on post_reactions for select using (true);
create policy "Users can manage own reactions" on post_reactions for all using (auth.uid() = user_id);

-- ─── POST COMMENTS ──────────────────────────────────────────────────────────

create table if not exists post_comments (
  id            uuid primary key default uuid_generate_v4(),
  post_id       uuid references channel_posts(id) on delete cascade not null,
  author_id     uuid references auth.users(id) on delete cascade not null,
  content       text not null,
  created_at    timestamptz default now()
);

alter table post_comments enable row level security;

create policy "Anyone can read comments" on post_comments for select using (true);
create policy "Users can create comments" on post_comments for insert with check (auth.uid() = author_id);

create index if not exists idx_post_comments_post on post_comments(post_id, created_at);

-- ─── CHANNEL MEMBERSHIPS ────────────────────────────────────────────────────

create table if not exists channel_members (
  id            uuid primary key default uuid_generate_v4(),
  channel_id    uuid not null,
  user_id       uuid references auth.users(id) on delete cascade not null,
  joined_at     timestamptz default now(),
  constraint unique_channel_member unique (channel_id, user_id)
);

alter table channel_members enable row level security;

create policy "Anyone can read memberships" on channel_members for select using (true);
create policy "Users can manage own membership" on channel_members for all using (auth.uid() = user_id);

create index if not exists idx_channel_members_user on channel_members(user_id);
create index if not exists idx_channel_members_channel on channel_members(channel_id);
