let currentProfile,farmerChannel;
async function renderDashboard(){
 currentProfile=await guard('farmer');if(!currentProfile)return;
 document.querySelector('#farmerName').textContent=currentProfile.name;
 const passFarmer=document.querySelector('#passFarmer');if(passFarmer)passFarmer.textContent=currentProfile.name;
 const bookings=await myBookings(),activeBooking=bookings.find(x=>!['paid','no_show'].includes(x.status));
 const historyHead=document.querySelector('#history')?.closest('table')?.querySelector('thead tr');if(historyHead&&!historyHead.querySelector('[data-payment-column]'))historyHead.insertAdjacentHTML('beforeend','<th data-payment-column>Amount paid</th>');
 document.querySelector('#history').innerHTML=bookings.map(x=>`<tr><td>${x.slots?.centres?.name||'—'}</td><td>${x.produce_type||'—'}</td><td class="tabular"><b>#${x.token_number}</b></td><td>${statusChip(x.status)}</td><td><b>${x.amount_paid?`₹${Number(x.amount_paid).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'—'}</b></td></tr>`).join('')||'<tr><td colspan="5" class="muted">No bookings yet.</td></tr>';
 if(!activeBooking){document.querySelector('#empty').classList.remove('hidden');document.querySelector('#active').classList.add('hidden');return}
 document.querySelector('#empty').classList.add('hidden');document.querySelector('#active').classList.remove('hidden');
 document.querySelector('#token').textContent=String(activeBooking.token_number).padStart(2,'0');
 document.querySelector('#bookingStatus').innerHTML=statusChip(activeBooking.status);
 document.querySelector('#centre').textContent=activeBooking.slots?.centres?.name||'Mandi centre';
 document.querySelector('#slot').textContent=`${activeBooking.slots?.date||''} · ${activeBooking.slots?.start_time?.slice(0,5)||''}`;
 const produce=document.querySelector('.queue-title h2');if(produce)produce.textContent=activeBooking.produce_type||'Declared produce';
 const reference=document.querySelector('.queue-title .muted');if(reference)reference.textContent=`Gate Entry Pass: KST-${String(activeBooking.id||'').slice(0,8).toUpperCase()}`;
 const miniValues=document.querySelectorAll('.queue-details .mini-grid b');
 if(miniValues[0])miniValues[0].textContent=`${activeBooking.quantity||'—'} Quintals`;
 const paymentTile=document.querySelectorAll('.queue-details .mini-grid div')[1];if(paymentTile?.firstChild)paymentTile.firstChild.textContent='Payment amount';
 if(miniValues[1])miniValues[1].textContent=activeBooking.amount_paid?`₹${Number(activeBooking.amount_paid).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'Pending';
 if(miniValues[2])miniValues[2].textContent='Not recorded';
 if(miniValues[3])miniValues[3].textContent=activeBooking.slots?.centres?.name||'Assigned mandi';
 const passRows=document.querySelectorAll('.gate-pass .pass-row b');if(passRows[2])passRows[2].textContent=`${activeBooking.quantity||'—'} Quintals`;
 const printButton=document.querySelector('.gate-pass .btn');if(printButton)printButton.onclick=()=>window.print();
 const stages=['booked','confirmed','in_queue','procured','paid'];
 const currentStatus=activeBooking.payment_status==='paid'?'paid':activeBooking.status;
 const currentIndex=stages.indexOf(currentStatus);
 document.querySelectorAll('.journey-step').forEach((step,index)=>{step.classList.toggle('done',currentIndex>=0&&index<currentIndex);step.classList.toggle('active',index===currentIndex)});
 const{data:snapshot}=await client().rpc('queue_snapshot',{p_slot_id:activeBooking.slot_id,p_token_number:activeBooking.token_number});
 const queue=snapshot?.[0],nowServing=queue?.now_serving??activeBooking.token_number,ahead=queue?.farmers_ahead??0;
 const counters=document.querySelectorAll('.counter-row .counter-num');if(counters[0])counters[0].textContent=`#${String(nowServing).padStart(2,'0')}`;if(counters[1])counters[1].textContent=`#${String(activeBooking.token_number).padStart(2,'0')}`;
 const aheadLabel=document.querySelector('.counter-row > div:nth-child(2) small');if(aheadLabel)aheadLabel.textContent=`${ahead} ahead`;
 const queueMeter=document.querySelector('.detail-panel .meter i');if(queueMeter)queueMeter.style.width=`${Math.max(8,Math.min(100,100-(ahead*10)))}%`;
 const waitLabel=document.querySelector('.detail-panel .meter + small');if(waitLabel)waitLabel.textContent=ahead?`Estimated wait: ~${ahead*5} minutes`:'Please proceed when called';
 if(!farmerChannel)farmerChannel=client().channel('farmer-'+currentProfile.id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'bookings',filter:'farmer_id=eq.'+currentProfile.id},renderDashboard).subscribe();
}
async function initBooking(){if(!await guard('farmer'))return;const cs=await centres();document.querySelector('#centreSelect').innerHTML='<option value="">Select mandi centre</option>'+cs.map(c=>`<option value="${c.id}">${c.name} — ${c.district}</option>`).join('');const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;document.querySelector('#date').min=today}
async function loadSlots(){const c=centreSelect.value,d=date.value,submit=document.querySelector('form button[type="submit"],form button:not([type])');if(!c||!d){slot.disabled=true;slot.innerHTML='<option value="">Choose a centre and date</option>';if(submit)submit.disabled=true;return}const rows=await slotsFor(c,d),ss=rows.filter(s=>Number(s.tokens_booked)<Number(s.max_tokens));slot.disabled=!ss.length;if(submit)submit.disabled=!ss.length;slot.innerHTML=ss.map(s=>`<option value="${s.id}">${s.start_time.slice(0,5)}–${s.end_time.slice(0,5)} (${s.max_tokens-s.tokens_booked} places)</option>`).join('')||'<option value="">No available slots for this date</option>'}
async function book(e){e.preventDefault();const f=new FormData(e.target),id=f.get('slot_id'),{data:s,error:se}=await client().from('slots').select('*').eq('id',id).single();if(se||s.tokens_booked>=s.max_tokens)return alert('This slot is no longer available. Please choose another.');const{data:next}=await client().from('bookings').select('token_number').eq('slot_id',id).order('token_number',{ascending:false}).limit(1);const{error}=await client().from('bookings').insert({farmer_id:(await profile()).id,slot_id:id,token_number:(next?.[0]?.token_number||0)+1,produce_type:f.get('produce'),quantity:f.get('quantity'),status:'booked'});if(error)return alert(error.message);await client().from('slots').update({tokens_booked:s.tokens_booked+1}).eq('id',id);location.href='/public/farmer-dashboard.html'}
async function inbox(){if(!await guard('farmer'))return;const{data=[]}=await client().from('notifications').select('*').order('sent_at',{ascending:false});document.querySelector('#notifications').innerHTML=data.map(n=>`<article class="card"><strong>${n.message}</strong><div class="muted">${new Date(n.sent_at).toLocaleString()}</div></article>`).join('')||'<p class="muted">No updates yet.</p>'}
