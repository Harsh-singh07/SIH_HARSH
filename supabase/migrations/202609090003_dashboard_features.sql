-- Live dashboard permissions and a privacy-safe farmer queue summary.
create policy profile_admin_read
on public.profiles for select to authenticated
using (public.current_role() = 'admin');

create policy profile_admin_update
on public.profiles for update to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create or replace function public.queue_snapshot(p_slot_id uuid, p_token_number integer)
returns table(now_serving integer, farmers_ahead integer)
language sql
stable
security definer
set search_path = public
as $$
  with authorised as (
    select 1
    from public.bookings
    where farmer_id = auth.uid()
      and slot_id = p_slot_id
      and token_number = p_token_number
  ), active_tokens as (
    select token_number
    from public.bookings
    where slot_id = p_slot_id
      and status in ('booked', 'confirmed', 'in_queue')
  )
  select
    coalesce((select min(token_number) from active_tokens), p_token_number),
    (select count(*)::integer from active_tokens where token_number < p_token_number)
  where exists (select 1 from authorised);
$$;

revoke all on function public.queue_snapshot(uuid, integer) from public;
grant execute on function public.queue_snapshot(uuid, integer) to authenticated;
