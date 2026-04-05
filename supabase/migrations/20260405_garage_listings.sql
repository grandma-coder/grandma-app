-- ─── GARAGE LISTINGS ────────────────────────────────────────────────────────
-- Marketplace for parents to sell, trade, or give away baby/kid items.

create table if not exists garage_listings (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  title         text not null,
  description   text,
  category      text not null check (category in (
                  'Clothing', 'Toys', 'Gear', 'Furniture', 'Books',
                  'Maternity Wear', 'Prenatal Supplies', 'Nursery Setup',
                  'Baby Gear', 'Other'
                )),
  condition     text check (condition in ('New', 'Like New', 'Good', 'Fair', 'Well Loved')),
  price         numeric(10,2) default 0,
  is_free       boolean default false,
  size_range    text,              -- e.g. '0-3 months', '2T-3T'
  age_range     text,              -- e.g. '0-6 months', '1-3 years'
  photos        text[] default '{}',
  location      text,
  status        text default 'active' check (status in ('active', 'sold', 'reserved', 'archived')),
  created_at    timestamptz default now()
);

alter table garage_listings enable row level security;

-- Anyone can read active listings
create policy "Anyone can read active listings"
  on garage_listings for select
  using (status = 'active' or auth.uid() = user_id);

-- Owner can manage own listings
create policy "Owner can manage own listings"
  on garage_listings for all
  using (auth.uid() = user_id);

create index if not exists idx_garage_listings_user on garage_listings(user_id);
create index if not exists idx_garage_listings_category on garage_listings(category);
create index if not exists idx_garage_listings_status on garage_listings(status);

-- Storage bucket for listing photos (create via dashboard or CLI)
-- insert into storage.buckets (id, name, public) values ('garage-photos', 'garage-photos', true);
