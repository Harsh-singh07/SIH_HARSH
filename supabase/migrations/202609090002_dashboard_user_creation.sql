-- Allow manually-created dashboard users while preserving server-side farmer role assignment.
-- For 9876543210@kisansetu.local, the phone becomes 9876543210 automatically.
create or replace function public.create_farmer_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  derived_phone text;
  derived_name text;
begin
  derived_phone := coalesce(
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  if derived_phone = '' then
    raise exception 'A phone number is required in user metadata or the email local part';
  end if;

  derived_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'name', ''),
    'Farmer ' || right(derived_phone, 4)
  );

  insert into public.profiles (id, name, phone, role, status)
  values (new.id, derived_name, derived_phone, 'farmer', 'active')
  on conflict (id) do nothing;

  return new;
end;
$$;
