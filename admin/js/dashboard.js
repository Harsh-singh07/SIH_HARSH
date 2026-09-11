(function () {
  const state = { hours: 12, channel: null };
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const number = new Intl.NumberFormat('en-IN');
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);

  function since() {
    const date = new Date();
    date.setHours(date.getHours() - state.hours);
    return date.toISOString();
  }

  function setKpis(bookings) {
    const completed = bookings.filter((booking) => ['procured', 'paid'].includes(booking.status));
    const served = new Set(completed.map((booking) => booking.farmer_id)).size;
    const waits = completed.map((booking) => (new Date(booking.updated_at) - new Date(booking.created_at)) / 60000).filter(Number.isFinite);
    const averageWait = waits.length ? waits.reduce((sum, wait) => sum + wait, 0) / waits.length : 0;
    const noShows = bookings.filter((booking) => booking.status === 'no_show').length;
    const noShowRate = bookings.length ? (noShows / bookings.length) * 100 : 0;
    const volume = completed.reduce((sum, booking) => sum + Number(booking.quantity || 0), 0);
    const values = $$('.kpi-value');
    if (values[0]) values[0].textContent = number.format(served);
    if (values[1]) values[1].innerHTML = `${averageWait.toFixed(1)}<small style="font-size:14px"> mins</small>`;
    if (values[2]) values[2].textContent = `${noShowRate.toFixed(1)}%`;
    if (values[3]) values[3].innerHTML = `${number.format(volume)}<small style="font-size:14px"> Qtl</small>`;
    const metadata = $$('.kpi-meta');
    if (metadata[0]) metadata[0].innerHTML = `<span class="trend">Live Supabase count</span><span>Last ${state.hours} hours</span>`;
    if (metadata[1]) metadata[1].innerHTML = '<span class="trend">Completed visits</span><span>Booking to procurement</span>';
    if (metadata[2]) metadata[2].innerHTML = '<span class="trend">Live booking outcomes</span><span>Threshold: &lt;5%</span>';
    const paid = completed.filter((booking) => booking.payment_status === 'paid').length;
    const paidRate = completed.length ? Math.round((paid / completed.length) * 100) : 0;
    if (metadata[3]) metadata[3].innerHTML = `<span class="trend">Procured and paid</span><b style="color:#006c4a">${paidRate}% DBT Paid</b>`;
  }

  function setHourlyBars(bookings, slots) {
    const now = new Date();
    const points = $$('.bar-pair');
    const hours = points.map((_, index) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - points.length + index + 1));
    const actual = hours.map((hour) => bookings.filter((booking) => {
      const created = new Date(booking.created_at);
      return created.getFullYear() === hour.getFullYear() && created.getMonth() === hour.getMonth() && created.getDate() === hour.getDate() && created.getHours() === hour.getHours();
    }).length);
    const expected = hours.map((hour) => slots.filter((slot) => Number(String(slot.start_time).slice(0, 2)) === hour.getHours()).reduce((sum, slot) => sum + Number(slot.max_tokens || 0), 0));
    const maximum = Math.max(1, ...actual, ...expected);
    points.forEach((point, index) => {
      const bars = point.querySelectorAll('i');
      if (bars[0]) bars[0].style.height = `${Math.max(4, (expected[index] / maximum) * 100)}%`;
      if (bars[1]) bars[1].style.height = `${Math.max(4, (actual[index] / maximum) * 100)}%`;
      const label = point.querySelector('span');
      if (label) label.textContent = hours[index].toLocaleTimeString('en-IN', { hour: '2-digit', hour12: true });
      point.title = `${expected[index]} expected · ${actual[index]} arrivals`;
    });
  }

  function setCapacity(centres, slots) {
    const today = new Date().toISOString().slice(0, 10);
    const rows = centres.map((centre) => {
      const centreSlots = slots.filter((slot) => slot.centre_id === centre.id && slot.date === today);
      const maximum = centreSlots.reduce((sum, slot) => sum + Number(slot.max_tokens || 0), 0);
      const booked = centreSlots.reduce((sum, slot) => sum + Number(slot.tokens_booked || 0), 0);
      const percent = maximum ? Math.round((booked / maximum) * 100) : 0;
      const danger = percent >= 90;
      return `<div class="capacity"><div class="capacity-line"><span>${escapeHtml(centre.name)}</span><b${danger ? ' style="color:#dc2626"' : ''}>${percent}%</b></div><div class="meter${danger ? ' danger' : ''}"><i style="width:${percent}%"></i></div><small>${number.format(booked)} of ${number.format(maximum)} tokens booked today · ${escapeHtml(centre.district || '')}</small></div>`;
    }).join('');
    const container = $('.capacity-list');
    if (container) container.innerHTML = rows || '<p class="muted">No centre capacity has been configured.</p>';
  }

  function initials(name) {
    return String(name || 'Operator').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  function setStaff(staff) {
    const body = $('.ref-table tbody');
    if (!body) return;
    body.innerHTML = staff.map((operator) => {
      return `<tr><td><span class="avatar">${escapeHtml(initials(operator.name))}</span><b>${escapeHtml(operator.name)}</b></td><td>${escapeHtml(operator.phone)}</td><td>${escapeHtml(operator.centres?.name || 'Unassigned')}</td><td>${escapeHtml(operator.centre_id ? 'Mandi counter' : 'Not assigned')}</td><td><b>—</b></td><td><span class="${operator.status === 'active' ? 'trend' : 'chip booked'}">● ${escapeHtml(operator.status === 'active' ? 'Active' : 'Inactive')}</span></td></tr>`;
    }).join('') || '<tr><td colspan="6" class="muted">No operator accounts yet. Use “Add New Staff / Operator” to create one.</td></tr>';
  }

  async function loadDashboard() {
    const supabase = client();
    const [bookingsResult, slotsResult, centresResult, staffResult] = await Promise.all([
      supabase.from('bookings').select('id,farmer_id,status,quantity,payment_status,created_at,updated_at,slot_id').gte('created_at', since()),
      supabase.from('slots').select('id,centre_id,date,start_time,max_tokens,tokens_booked'),
      supabase.from('centres').select('id,name,district').order('name'),
      supabase.from('profiles').select('id,name,phone,status,centre_id,centres(name)').eq('role', 'operator').order('name')
    ]);
    const errors = [bookingsResult.error, slotsResult.error, centresResult.error, staffResult.error].filter(Boolean);
    if (errors.length) console.error('Dashboard data could not be fully loaded:', errors);
    const bookings = bookingsResult.data || [];
    const slots = slotsResult.data || [];
    const panelDescription = $('.ref-analytics .panel .panel-head p');
    if (panelDescription) panelDescription.textContent = `Live gate activity across ${(centresResult.data || []).length} configured mandi centres`;
    setKpis(bookings);
    setHourlyBars(bookings, slots);
    setCapacity(centresResult.data || [], slots);
    setStaff(staffResult.data || []);
  }

  async function initialise() {
    const admin = await guard('admin');
    if (!admin) return;
    $$('.segmented button').forEach((button, index) => button.addEventListener('click', () => {
      state.hours = index === 0 ? 12 : 24;
      $$('.segmented button').forEach((item) => item.classList.toggle('active', item === button));
      loadDashboard();
    }));
    await loadDashboard();
    state.channel = client().channel('admin-live-dashboard').on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, loadDashboard).subscribe();
  }

  initialise();
})();
