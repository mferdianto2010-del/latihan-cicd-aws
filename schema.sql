create table if not exists files (
  id uuid primary key,
  name text not null,
  content_type text not null,
  size_bytes integer not null,
  s3_key text not null,
  created_at timestamptz not null default now()
);
