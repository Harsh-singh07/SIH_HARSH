# Kisan Setu — Ideation Context

## 1. Starting point

The idea began with a coordination problem around mandi procurement. Farmers may arrive without a predictable schedule, wait without clear visibility of their turn, and repeatedly ask staff for updates. Mandi teams must handle arrivals, capacity, records and status changes through disconnected or manual processes. Administrators also need a clear view of centres, slots, staff and bookings.

This led to the central question:

> How might we make a farmer's procurement visit predictable while giving mandi teams a practical way to manage capacity and queue progress?

## 2. Stakeholders identified

- **Farmer:** needs a simple way to choose a visit time, receive proof of booking and follow progress.
- **Mandi operator:** needs a centre-specific queue and clear actions for moving a booking through procurement.
- **Administrator:** needs to configure centres and capacity, generate slots, review bookings and manage staff access.
- **Government or procurement authority:** needs traceable booking and status records that can support operational review.

## 3. Problems selected for the first version

The first version focused on five connected problems:

1. Uncertain farmer arrival times.
2. Limited visibility of available procurement capacity.
3. No single booking record connecting the farmer, slot and procurement status.
4. Repeated enquiries about queue and payment status.
5. Separate administrative work for centres, slots, bookings and staff.

## 4. Solution concept

Kisan Setu was designed as a role-based web platform with one shared backend. Instead of treating booking, queue management and administration as separate products, the system connects them through the same procurement booking.

The proposed journey is:

**Admin configures a centre and its capacity → slots become available → farmer reserves a slot → system records a token and gate pass → operator advances procurement status → farmer receives updated information through the dashboard and inbox.**

## 5. Core product decisions

- Use a browser-based interface so the prototype can run without requiring a mobile application installation.
- Provide separate farmer, operator and administrator experiences because each role has different responsibilities.
- Keep centres and slots configurable instead of hard-coding one mandi schedule.
- Link every farmer visit to a slot, produce type, quantity, token and status.
- Create operator accounts through an administrator-controlled server-side function.
- Use database access policies to restrict data according to role and assigned centre.
- Use realtime subscriptions for booking and notification updates where supported by the current access rules.

## 6. Farmer experience conceived during ideation

The farmer journey was planned around clarity and minimum effort:

1. Register or sign in through a phone-oriented interface.
2. Select a mandi centre.
3. Choose a date and an available time slot.
4. Enter produce and estimated quantity.
5. Confirm the booking and receive a token.
6. View the booking, queue information and digital gate pass.
7. Follow procurement and recorded payment status.
8. Review notifications and previous bookings.

The present authentication implementation maps the phone-oriented login to an internal email identity in Supabase. It is not an SMS OTP system.

## 7. Administrative experience conceived during ideation

The administrative side was planned as an operational control area:

1. Create and update mandi centres.
2. Configure operating hours and active state.
3. Generate slots across a selected date range.
4. Set slot duration and maximum token capacity.
5. Review and filter all bookings.
6. Update supported booking statuses.
7. Create operators and assign them to a centre.
8. View operational summaries and utilisation information.

## 8. Operator experience conceived during ideation

The intended operator flow is:

**Sign in → see only the assigned centre → review the current queue → verify the arriving farmer → advance procurement → record completion and payment status when confirmed.**

The operator interface exists, while some actions still require complete end-to-end validation before a pilot.

## 9. Technical model selected

The prototype uses a static HTML, CSS and JavaScript frontend with Supabase as the backend. Supabase provides authentication, PostgreSQL storage, Row Level Security, realtime subscriptions and an Edge Function for secure staff creation.

Five main data entities support the idea:

- **profiles:** user identity, role and operator centre assignment.
- **centres:** mandi details and configuration.
- **slots:** centre, date, time and capacity.
- **bookings:** farmer, slot, produce, quantity, token and status.
- **notifications:** messages shown to the farmer.

The supported booking lifecycle is:

**booked → confirmed → in_queue → procured → paid**

A booking may also be marked **no_show**. The `paid` value records a payment status; the prototype does not transfer funds or integrate directly with a government DBT system.

## 10. How the concept evolved during implementation

The initial database and access model came first. Farmer, operator and administrator pages were then created around those roles. The supplied Stitch design package was used to strengthen the visual system and page structure. After the redesign, the interfaces were connected to live Supabase data.

Implementation exposed several issues that refined the idea:

- An invalid Supabase key showed the need for clearer configuration errors.
- Manual user creation exposed missing-profile assumptions in the signup trigger.
- Browser calls to staff creation required complete CORS handling in the Edge Function.
- Local date conversion shifted slot dates in India, so slot generation was changed to use safe calendar arithmetic.
- Empty and full slots needed explicit handling in the farmer form.
- Browser caching made old screens appear after redesign, so route and asset validation became part of the workflow.

These fixes moved Kisan Setu from a visual concept to a connected working prototype.

## 11. Current prototype scope

Implemented or substantially connected:

- Public landing, farmer registration and login.
- Farmer slot booking, dashboard, inbox, history and printable gate pass.
- Admin login, dashboard, centre management, slot generation, booking ledger and staff management.
- Supabase schema, authentication, role checks, Row Level Security and notification logic.
- Deployed Edge Function for administrator-controlled operator creation.
- Responsive pages running locally with a hosted Supabase backend.

## 12. Assumptions and boundaries

- The first pilot can begin with one mandi and a small operator group.
- Mandi staff will have intermittent but usable internet access.
- Administrators will configure realistic slot capacity for each centre.
- The system records procurement and payment progress but does not execute payments.
- Design-reference screens can contain sample values; they should not be presented as measured project results.

## 13. Production hardening identified during ideation and testing

- Allocate tokens and enforce capacity in one atomic database transaction.
- Complete and validate every operator action.
- Enforce inactive staff state throughout authentication and protected pages.
- Refresh farmer queue position when relevant bookings belonging to other farmers change.
- Add offline or cached access to essential gate-pass information.
- Add SMS or WhatsApp only after selecting and integrating a real messaging provider.
- Define allowed status transitions for each role.
- Conduct security, usability and load testing before a wider rollout.

## 14. Pilot hypothesis and measurement

The pilot hypothesis is that planned arrival windows and shared status visibility can improve the procurement experience for both farmers and mandi staff.

The pilot should measure:

- Median gate waiting time.
- Percentage of farmers arriving within the booked window.
- Slot utilisation and no-show rate.
- Time from arrival to procurement completion.
- Frequency of farmer status enquiries.
- Farmer and operator satisfaction.

No impact percentage should be claimed until baseline and pilot results are available.

## 15. One-paragraph idea summary

Kisan Setu is a digital mandi procurement coordination system that allows farmers to reserve arrival slots, receive tokens and gate passes, and follow their procurement status. Administrators configure centres, capacity, slots, bookings and staff, while centre-assigned operators manage the procurement queue. A shared Supabase backend connects these workflows through role-based access, structured booking records and notifications. The current result is a working prototype intended for hardening and controlled mandi pilot validation.

## 16. Short presentation pitch

Kisan Setu turns an uncertain mandi visit into a planned procurement journey. Farmers book an available arrival window and follow their token and status, while mandi teams manage capacity, bookings and staff from one connected system. The prototype demonstrates the complete coordination model and defines the remaining work required for a controlled pilot.
