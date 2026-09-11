-- Kisan Setu schema, security policies, and notification automation
create extension if not exists pgcrypto;

create table public.centres (
  id uuid primary key default gen_random_uuid(), name text not null, location text not null,
  district text not null, capacity_per_slot integer not null check (capacity_per_slot > 0),
  operating_hours text not null, created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, name text not null,
  phone text unique not null, role text not null check (role in ('farmer','operator','admin')),
  centre_id uuid references public.centres(id), district text, status text not null default 'active'
    check (status in ('active','inactive')), created_at timestamptz not null default now()
);
create table public.slots (
 id uuid primary key default gen_random_uuid(), centre_id uuid not null references public.centres(id) on delete cascade,
 date date not null, start_time time not null, end_time time not null, max_tokens integer not null check(max_tokens > 0),
 tokens_booked integer not null default 0 check(tokens_booked >= 0 and tokens_booked <= max_tokens), created_at timestamptz not null default now(),
 unique(centre_id,date,start_time)
);
create table public.bookings (
 id uuid primary key default gen_random_uuid(), farmer_id uuid not null references public.profiles(id),
 slot_id uuid not null references public.slots(id), token_number integer not null check(token_number > 0),
 status text not null default 'booked' check(status in ('booked','confirmed','in_queue','procured','paid','no_show')),
 produce_type text, quantity numeric check(quantity > 0), payment_status text not null default 'pending'
   check(payment_status in ('pending','processing','paid')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(slot_id,token_number)
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
 booking_id uuid references public.bookings(id) on delete set null, message text not null,
 is_read boolean not null default false, sent_at timestamptz not null default now()
);
create index bookings_farmer_idx on public.bookings(farmer_id); create index bookings_slot_idx on public.bookings(slot_id);

-- Signup metadata is deliberately limited to name/phone; role is always assigned server-side.
create or replace function public.create_farmer_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if coalesce(new.raw_user_meta_data->>'name','') = '' or coalesce(new.raw_user_meta_data->>'phone','') = '' then
    raise exception 'Name and phone are required';
  end if;
  insert into public.profiles(id,name,phone,role) values (new.id,new.raw_user_meta_data->>'name',new.raw_user_meta_data->>'phone','farmer');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.create_farmer_profile();

create or replace function public.touch_booking() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
create trigger booking_touch before update on public.bookings for each row execute procedure public.touch_booking();
create or replace function public.booking_notification() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if TG_OP='UPDATE' and (old.status is distinct from new.status or old.payment_status is distinct from new.payment_status) then
  insert into public.notifications(user_id,booking_id,message) values(new.farmer_id,new.id,
   case when old.payment_status is distinct from new.payment_status then 'Payment status updated to ' || replace(new.payment_status,'_',' ')
        else 'Your token status is now ' || replace(new.status,'_',' ') end);
 end if; return new;
end; $$;
create trigger booking_notify after update on public.bookings for each row execute procedure public.booking_notification();

alter table public.profiles enable row level security; alter table public.centres enable row level security;
alter table public.slots enable row level security; alter table public.bookings enable row level security; alter table public.notifications enable row level security;
create or replace function public.current_role() returns text language sql stable security definer set search_path=public as $$ select role from public.profiles where id=auth.uid() $$;
create or replace function public.current_centre() returns uuid language sql stable security definer set search_path=public as $$ select centre_id from public.profiles where id=auth.uid() $$;
create policy profile_self_read on public.profiles for select to authenticated using(id=auth.uid());
create policy centre_public_read on public.centres for select using(true);
create policy centre_admin_manage on public.centres for all to authenticated using(public.current_role()='admin') with check(public.current_role()='admin');
create policy slots_public_read on public.slots for select using(true);
create policy slots_admin_manage on public.slots for all to authenticated using(public.current_role()='admin') with check(public.current_role()='admin');
create policy booking_farmer_read on public.bookings for select to authenticated using(farmer_id=auth.uid());
create policy booking_farmer_insert on public.bookings for insert to authenticated with check(farmer_id=auth.uid() and public.current_role()='farmer');
create policy booking_operator_read on public.bookings for select to authenticated using(exists(select 1 from public.slots s where s.id=slot_id and s.centre_id=public.current_centre()) and public.current_role()='operator');
create policy booking_operator_update on public.bookings for update to authenticated using(exists(select 1 from public.slots s where s.id=slot_id and s.centre_id=public.current_centre()) and public.current_role()='operator') with check(exists(select 1 from public.slots s where s.id=slot_id and s.centre_id=public.current_centre()));
create policy booking_admin_all on public.bookings for all to authenticated using(public.current_role()='admin') with check(public.current_role()='admin');
create policy notification_self_read on public.notifications for select to authenticated using(user_id=auth.uid());
create policy notification_self_update on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
-- Required for browser realtime subscriptions; publication does not weaken RLS.
alter publication supabase_realtime add table public.bookings;
