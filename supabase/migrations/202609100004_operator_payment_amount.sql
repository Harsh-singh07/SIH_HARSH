-- Record the amount confirmed at the mandi counter when procurement payment is completed.
alter table public.bookings
  add column if not exists amount_paid numeric(12,2) check (amount_paid is null or amount_paid > 0),
  add column if not exists paid_at timestamptz;

create or replace function public.booking_notification() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if TG_OP='UPDATE' and (old.status is distinct from new.status or old.payment_status is distinct from new.payment_status) then
  insert into public.notifications(user_id,booking_id,message) values(new.farmer_id,new.id,
   case when old.payment_status is distinct from new.payment_status and new.payment_status='paid' and new.amount_paid is not null
          then 'Payment of ₹' || to_char(new.amount_paid,'FM99,99,99,990.00') || ' has been recorded for your procurement.'
        when old.payment_status is distinct from new.payment_status
          then 'Payment status updated to ' || replace(new.payment_status,'_',' ')
        else 'Your token status is now ' || replace(new.status,'_',' ') end);
 end if; return new;
end; $$;
