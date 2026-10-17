         
         
         

        function viewAdminDash() {
            const todayStr = localDateStr();
            const todayEvents = state.bookings.filter(b => b.date === todayStr && ['Approved','Completed'].includes(b.status));
            const todayCompleted = todayEvents.filter(b => b.status === 'Completed').length;
            const todayRemaining = todayEvents.filter(b => b.status === 'Approved').length;
            const todayRequests = state.bookings.filter(b => (b.createdAt || '').split('T')[0] === todayStr);   
            const todayApprovedCount = state.bookings.filter(b => (b.approvedAt || '').split('T')[0] === todayStr).length;
            const todayPendingCount = todayRequests.filter(b => b.status === 'Pending').length;

            const commOptions = state.users.map(u => `<option value="${u.id}">${esc(u.committee)}</option>`).join('');
            const commChoices = state.users.filter(u => u.status === 'approved').map(u => `<option value="${u.id}">${esc(u.committee)}</option>`).join('');
            const venueOptions = state.venues.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('');

            return `
                <div class="space-y-6">
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        ${statCard("Today's Events", todayEvents.length, 'fa-calendar-day', 'blue')}
                        ${statCard('Completed', todayCompleted, 'fa-check-double', 'slate')}
                        ${statCard('Remaining', todayRemaining, 'fa-hourglass-half', 'indigo')}
                        ${statCard('Requests Today', todayRequests.length, 'fa-inbox', 'amber')}
                        ${statCard('Approved Today', todayApprovedCount, 'fa-check-circle', 'emerald')}
                        ${statCard('Pending', todayPendingCount, 'fa-clock', 'red')}
                    </div>
                    
                     
                    <div class="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
                        <div class="p-4 border-b flex flex-col md:flex-row justify-between items-center bg-slate-50 gap-4">
                            <h3 class="text-lg font-bold text-slate-800"><i class="fa-solid fa-calendar-day mr-2 text-indigo-500"></i> Today's Schedule</h3>
                            <button onclick="openAdminBookModal()" class="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition whitespace-nowrap"><i class="fa-solid fa-plus mr-2"></i> Manual Booking</button>
                        </div>
                        
                         
                        <div class="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                            <input type="text" id="df-search" placeholder="Search Title or ID..." onkeyup="applyDashFilters()" class="lg:col-span-1 px-3 py-2 rounded-lg border outline-none focus:border-indigo-500 text-sm shadow-sm">
                            <select id="df-comm" onchange="applyDashFilters()" class="px-3 py-2 rounded-lg border outline-none focus:border-indigo-500 text-sm bg-white shadow-sm">
                                <option value="">All Committees</option>
                                ${commOptions}
                            </select>
                            <select id="df-venue" onchange="applyDashFilters()" class="px-3 py-2 rounded-lg border outline-none focus:border-indigo-500 text-sm bg-white shadow-sm">
                                <option value="">All Venues</option>
                                ${venueOptions}
                            </select>
                            <select id="df-status" onchange="applyDashFilters()" class="px-3 py-2 rounded-lg border outline-none focus:border-indigo-500 text-sm bg-white shadow-sm">
                                <option value="">All Statuses</option>
                                <option value="Approved">Approved</option>
                                <option value="Completed">Completed</option>
                            </select>
                            <button type="button" onclick="clearDashFilters()" class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 text-sm font-bold hover:bg-slate-100 transition"><i class="fa-solid fa-filter-circle-xmark mr-2"></i>Clear Filters</button>
                        </div>

                         
                        <div class="p-4 bg-slate-50/50 min-h-[300px]">
                            <div id="dash-schedule-list" class="space-y-3"></div>
                            <div id="dash-schedule-empty" class="p-12 text-center text-slate-500 hidden">
                                <i class="fa-solid fa-folder-open text-4xl mb-3 text-slate-300"></i>
                                <p>No confirmed events found for today.</p>
                            </div>
                        </div>
                    </div>

                    ${(() => {
                        const pendAccs = state.users.filter(u => u.status === 'pending');
                        if(pendAccs.length === 0) return '';
                        return `
                        <div class="bg-amber-50 rounded-xl shadow-sm border border-amber-200 p-6 mt-6">
                            <div class="flex justify-between items-center mb-4">
                                <h3 class="text-lg font-bold text-amber-900"><i class="fa-solid fa-user-clock mr-2"></i> Action Required: Pending Accounts (${pendAccs.length})</h3>
                                <button onclick="navigate('admin_approvals')" class="text-sm font-bold text-amber-700 hover:underline">View All</button>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                ${pendAccs.slice(0,3).map(u => `
                                    <div class="flex flex-col justify-between bg-white p-4 rounded-lg border border-amber-100 shadow-sm">
                                        <div class="mb-3">
                                            <p class="font-bold text-slate-800">${u.committee}</p>
                                            <p class="text-xs text-slate-500">Incharge: ${u.incharge}</p>
                                        </div>
                                        <div class="flex gap-2">
                                            <button onclick="approveUser('${u.id}', true)" class="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-1.5 rounded text-xs font-bold hover:from-emerald-400 hover:to-teal-400 hover:-translate-y-0.5 transition-all duration-300 shadow">Approve</button>
                                            <button onclick="approveUser('${u.id}', false)" class="flex-1 bg-red-50 text-red-600 py-1.5 rounded text-xs font-bold hover:bg-red-100 transition border border-red-200">Reject</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        `;
                    })()}

                 
                <div id="admin-book-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto">
                        <div class="flex justify-between mb-4 border-b pb-3">
                            <h3 class="text-xl font-bold text-slate-800">Admin Manual Booking</h3>
                            <button onclick="document.getElementById('admin-book-modal').classList.add('hidden')" class="text-slate-400 hover:text-red-500"><i class="fa-solid fa-xmark text-xl"></i></button>
                        </div>
                        <form onsubmit="submitAdminBooking(event)" class="space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="bf-label">Booking for</label>
                                    <select id="ab-for" onchange="onAdminForChange()" required class="w-full p-2.5 border rounded-lg outline-none focus:border-indigo-500 bg-white">
                                        <option value="" disabled selected>-- Select committee or External --</option>
                                        ${commChoices}
                                        <option value="__external">External (other person / organisation)</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="bf-label">Select Venue</label>
                                    <select id="ab-venueId" onchange="updateAdminResourceCheckboxes()" required class="w-full p-2.5 border rounded-lg outline-none focus:border-indigo-500 bg-white">
                                        <option value="" disabled selected>-- Choose Venue --</option>
                                        ${venueOptions}
                                    </select>
                                </div>
                            </div>
                            <div id="ab-owner-committee" class="bf-panel hidden"></div>
                            <div id="ab-owner-external" class="hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="bf-label">Who is booking? (Name)</label>
                                    <input type="text" id="ab-bookedby" maxlength="80" placeholder="Enter the name of the person / organisation" class="w-full p-2.5 border rounded-lg outline-none focus:border-indigo-500">
                                </div>
                                <div>
                                    <label class="bf-label">Contact number (optional)</label>
                                    <input type="tel" id="ab-phone" maxlength="10" inputmode="numeric" placeholder="10-digit number" class="w-full p-2.5 border rounded-lg outline-none focus:border-indigo-500">
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label class="bf-label">Event Title</label><input type="text" id="ab-title" required maxlength="120" class="w-full p-2.5 border rounded-lg outline-none focus:border-indigo-500"></div>
                                <div><label class="bf-label">Category</label>
                                    <select id="ab-cat" required class="w-full p-2.5 border rounded-lg outline-none focus:border-indigo-500 bg-white">${CATEGORIES.map(c => `<option>${esc(c)}</option>`).join('')}</select>
                                </div>
                            </div>

                            <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-lg px-3 py-2 flex items-center gap-2">
                                <i class="fa-solid fa-circle-info"></i> Please check the Master Calendar before booking to confirm this slot is free.
                                <button type="button" onclick="navigate('calendar')" class="ml-auto underline font-bold whitespace-nowrap">Check Calendar</button>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 border-y border-slate-100 py-4">
                                <div>
                                    <label class="bf-label">Date</label>
                                    <input type="hidden" id="ab-date">
                                    <button type="button" id="ab-date-btn" onclick="openDatePicker('ab-date', localDateStr())" class="picker-trigger w-full p-2.5 border rounded-lg outline-none focus:border-indigo-500 bg-white flex items-center justify-between text-left hover:border-indigo-400 transition">
                                        <span id="ab-date-label" class="text-slate-400 text-sm">Select date</span><i class="fa-solid fa-calendar-days text-indigo-500"></i>
                                    </button>
                                </div>
                                <div>
                                    <label class="bf-label">Start Time</label>
                                    <input type="hidden" id="ab-start">
                                    <button type="button" id="ab-start-btn" onclick="(function(){ const t=getSelectedVenueTimes('ab-venueId'); openTimePicker('ab-start', t.open, t.close); })()" class="picker-trigger w-full p-2.5 border rounded-lg outline-none focus:border-indigo-500 bg-white flex items-center justify-between text-left hover:border-indigo-400 transition">
                                        <span id="ab-start-label" class="text-slate-400 text-sm">Select time</span><i class="fa-regular fa-clock text-indigo-500"></i>
                                    </button>
                                </div>
                                <div>
                                    <label class="bf-label">End Time</label>
                                    <input type="hidden" id="ab-end">
                                    <button type="button" id="ab-end-btn" onclick="(function(){ const t=getSelectedVenueTimes('ab-venueId'); openTimePicker('ab-end', t.open, t.close); })()" class="picker-trigger w-full p-2.5 border rounded-lg outline-none focus:border-indigo-500 bg-white flex items-center justify-between text-left hover:border-indigo-400 transition">
                                        <span id="ab-end-label" class="text-slate-400 text-sm">Select time</span><i class="fa-regular fa-clock text-indigo-500"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label class="bf-label">Description</label><textarea id="ab-desc" required maxlength="500" rows="2" class="w-full p-2.5 border rounded-lg outline-none focus:border-indigo-500"></textarea></div>
                                <div><label class="bf-label">Attendees</label><input type="number" id="ab-att" required min="1" class="w-full p-2.5 border rounded-lg outline-none focus:border-indigo-500"></div>
                            </div>
                            <div>
                                <label class="bf-label">Required Resources (Optional)</label>
                                <div id="ab-res-list"><div class="rp-empty">Select a venue first</div></div>
                            </div>

                            <div class="flex justify-end pt-2">
                                <button type="submit" class="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition">Confirm Booking</button>
                            </div>
                        </form>
                    </div>
                </div>
                </div>
            `;
        }

        window.applyDashFilters = () => {
            const container = document.getElementById('dash-schedule-list');
            const empty = document.getElementById('dash-schedule-empty');
            if(!container) return;

            const todayStr = localDateStr();
            const search = (document.getElementById('df-search')?.value || '').toLowerCase();
            const comm = document.getElementById('df-comm')?.value || '';
            const venue = document.getElementById('df-venue')?.value || '';
            const status = document.getElementById('df-status')?.value || '';

            let filtered = state.bookings.slice().sort(byEventAsc).filter(b => {
                const bId = bookingCode(b).toLowerCase();
                const bTitle = (b.title || '').toLowerCase();
                const matchSearch = search === '' || bId.includes(search) || bTitle.includes(search);
                const matchDate = b.date === todayStr && ['Approved', 'Completed'].includes(b.status);  
                const matchComm = comm === '' || b.userId === comm;
                const matchVenue = venue === '' || b.venueId === venue;
                const matchStatus = status === '' || b.status === status;

                return matchSearch && matchDate && matchComm && matchVenue && matchStatus;
            });

            if (filtered.length === 0) {
                container.innerHTML = '';
                empty.classList.remove('hidden');
            } else {
                empty.classList.add('hidden');
                container.innerHTML = filtered.map(b => {
                    const c = organizerName(b);
                    const a = state.venues.find(x=>x.id===b.venueId)?.name || b.venueName || '-';
                    const statColor = b.status==='Approved'?'bg-emerald-100 text-emerald-800':b.status==='Rejected'?'bg-red-100 text-red-800':b.status==='Completed'?'bg-slate-200 text-slate-800':b.status==='Cancelled'?'bg-slate-200 text-slate-600':'bg-amber-100 text-amber-800';
                    const isGood = b.status === 'Approved' || b.status === 'Completed';
                    const isBad = b.status === 'Rejected' || b.status === 'Cancelled';
                    const statusIcon = isGood
                        ? `<i class="fa-solid fa-circle-check text-emerald-500 text-lg"></i>`
                        : isBad
                            ? `<i class="fa-solid fa-circle-xmark text-red-500 text-lg"></i>`
                            : `<i class="fa-regular fa-clock text-amber-500 text-lg"></i>`;
                    return `
                    <div data-bk="${b.id}" title="Click to see full details" class="flex items-center justify-between gap-3 p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition cursor-pointer">
                        <div class="shrink-0">${statusIcon}</div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1 flex-wrap">
                                <p class="font-bold text-slate-900 truncate">${esc(b.title)}</p>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${statColor}">${b.status}</span>${bookedByAdmin(b) ? `<span class="by-admin"><i class="fa-solid fa-user-shield"></i>Booked by ${esc(adminTag(b))}</span>` : ''}
                            </div>
                            <p class="text-sm text-slate-500 truncate"><i class="fa-solid fa-users mr-1"></i> ${esc(c)} • <i class="fa-solid fa-location-dot mx-1"></i> ${esc(a)}</p>
                        </div>
                        <div class="text-right shrink-0">
                            <span class="inline-block bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded font-bold border border-indigo-100">${formatTimeLabel(b.start)} - ${formatTimeLabel(b.end)}</span>
                        </div>
                    </div>`
                }).join('');
            }
        };

        window.clearDashFilters = () => {
            const search = document.getElementById('df-search'); if(search) search.value = '';
            const comm = document.getElementById('df-comm'); if(comm) comm.value = '';
            const venue = document.getElementById('df-venue'); if(venue) venue.value = '';
            const status = document.getElementById('df-status'); if(status) status.value = '';
            applyDashFilters();
        };

        window.updateAdminResourceCheckboxes = () => {
            const venue = state.venues.find(a => a.id === el('ab-venueId').value);
            el('ab-res-list').innerHTML = venue ? resourcePicker(venue) : '<div class="rp-empty">Select a venue first</div>';
        };

         
        window.onAdminForChange = () => {
            const v = el('ab-for').value, ext = v === '__external';
            el('ab-owner-external').classList.toggle('hidden', !ext);
            el('ab-bookedby').required = ext;
            const box = el('ab-owner-committee'), u = state.users.find(x => x.id === v);
            box.classList.toggle('hidden', !u);
            if (u) box.innerHTML = `<i class="fa-solid fa-user-check mr-1"></i> Booking will be made for <b>${esc(u.committee)}</b>. Booked by (In-charge): <b>${esc(u.incharge)}</b> &nbsp;|&nbsp; Contact: <b>${esc(u.phone)}</b><br><span style="font-size:12px">The booking will also appear in this committee's portal as "Booked by Admin".</span>`;
        };

        window.openAdminBookModal = () => {
            const modal = el('admin-book-modal');
            const form = modal.querySelector('form');
            if (form) form.reset();
            ['ab-date', 'ab-start', 'ab-end'].forEach(id => setPicker(id, '', id === 'ab-date' ? 'Select date' : 'Select time'));
            el('ab-res-list').innerHTML = '<div class="rp-empty">Select a venue first</div>';
            onAdminForChange();
            modal.classList.remove('hidden');
        };

        function statCard(title, val, icon, color) {
            return `
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 flex items-center">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-${color}-400 to-${color}-600 flex items-center justify-center text-white shadow-lg shadow-${color}-200 mr-4">
                        <i class="fa-solid ${icon} text-xl"></i>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-slate-500">${title}</p>
                        <p class="text-2xl font-bold text-slate-900">${val}</p>
                    </div>
                </div>
            `;
        }

         
        window.filterVenueCards = (q) => {
            const term = (q || '').trim().toLowerCase();
            let visible = 0;
            document.querySelectorAll('.venue-card').forEach(card => {
                const match = !term || (card.getAttribute('data-venue-name') || '').includes(term);
                card.style.display = match ? '' : 'none';
                if (match) visible++;
            });
            const empty = document.getElementById('venue-search-empty');
            if (empty) empty.style.display = (visible === 0 && document.querySelectorAll('.venue-card').length > 0) ? '' : 'none';
        };

        function viewAdminVenues() {
            let html = `
                <div class="flex justify-between items-center mb-6 flex-wrap gap-3">
                    <h3 class="text-lg font-bold text-slate-800">Manage Spaces</h3>
                    <div class="ch-search mx-4" style="flex:1"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="venue-search" placeholder="Search venue by name..." oninput="filterVenueCards(this.value)" autocomplete="off"></div>
                    <button onclick="openVenueModal()" class="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-md"><i class="fa-solid fa-plus mr-2"></i> Add Venue</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            `;
            
            if(state.venues.length === 0) {
                html += `<div class="col-span-full p-12 text-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl">No venues added yet. Click 'Add Venue' to begin.</div>`;
            }

            state.venues.forEach(venue => {
                html += `
                    <div class="venue-card bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col" data-venue-name="${esc(venue.name.toLowerCase())}">
                        <div class="h-40 bg-slate-200 relative">${venue.photo ? `<img src="${esc(venue.photo)}" class="w-full h-full object-cover" data-vname="${esc(venue.name)}" onerror="venueImgFail(this)">` : venueThumb(venue.name)}</div>
                        <div class="p-5 flex-1">
                            <h4 class="font-bold text-lg text-slate-900">${venue.name}</h4>
                            <p class="text-sm text-slate-500 mb-2"><i class="fa-solid fa-location-dot mr-1 text-slate-400"></i> ${venue.location}</p>
                            <p class="text-sm text-slate-700 mb-1"><i class="fa-solid fa-users mr-1 text-slate-400"></i> Capacity: <strong>${venue.capacity}</strong></p>
                            ${venue.openTime && venue.closeTime ? `<p class="text-sm text-slate-700 mb-3"><i class="fa-regular fa-clock mr-1 text-slate-400"></i> Hours: <strong>${formatTimeLabel(venue.openTime)} - ${formatTimeLabel(venue.closeTime)}</strong></p>` : `<p class="mb-3"></p>`}
                            
                            <div class="mb-4">
                                <p class="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Resources</p>
                                <div class="flex flex-wrap gap-1">
                                    ${venue.resources.map(r => `<span class="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded border border-slate-200">${r.name} (${r.qty})</span>`).join('')}
                                    ${venue.resources.length === 0 ? `<span class="text-xs text-slate-400 italic">No resources added</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between">
                            <button onclick="openVenueModal('${venue.id}')" class="text-sm text-indigo-600 hover:text-indigo-800 font-medium"><i class="fa-solid fa-pen mr-1"></i> Edit</button>
                            <button onclick="deleteVenue('${venue.id}')" class="text-sm text-red-600 hover:text-red-800 font-medium">Delete</button>
                        </div>
                    </div>
                `;
            });
            
            html += `<div id="venue-search-empty" class="col-span-full p-12 text-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl" style="display:none"><i class="fa-solid fa-magnifying-glass text-3xl mb-3 block"></i>No venue found with that name.</div></div>
                 
                <div id="add-venue-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
                        <div class="flex justify-between mb-4">
                            <h3 id="venue-modal-title" class="text-xl font-bold">Add New Space</h3>
                            <button onclick="closeVenueModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark text-xl"></i></button>
                        </div>
                        <form id="venue-form" onsubmit="saveVenue(event)" class="space-y-4">
                            <div><label class="block text-sm font-medium mb-1">Name</label><input type="text" id="venue-name" required class="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"></div>
                            <div class="grid grid-cols-2 gap-4">
                                <div><label class="block text-sm font-medium mb-1">Capacity</label><input type="number" id="venue-cap" required class="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"></div>
                                <div><label class="block text-sm font-medium mb-1">Location</label><input type="text" id="venue-loc" required class="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"></div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium mb-1">Opening Time</label>
                                    <input type="hidden" id="venue-open">
                                    <button type="button" id="venue-open-btn" onclick="openTimePicker('venue-open', '00:00', '23:59')" class="picker-trigger w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex items-center justify-between text-left hover:border-indigo-400 transition">
                                        <span id="venue-open-label" class="text-slate-400 text-sm">Select time</span>
                                        <i class="fa-regular fa-clock text-indigo-500"></i>
                                    </button>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-1">Closing Time</label>
                                    <input type="hidden" id="venue-close">
                                    <button type="button" id="venue-close-btn" onclick="openTimePicker('venue-close', '00:00', '23:59')" class="picker-trigger w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex items-center justify-between text-left hover:border-indigo-400 transition">
                                        <span id="venue-close-label" class="text-slate-400 text-sm">Select time</span>
                                        <i class="fa-regular fa-clock text-indigo-500"></i>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Upload Photo (PC)</label>
                                <input type="file" id="venue-photo-file" accept="image/*" class="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                                <p id="venue-photo-current-note" class="text-xs text-slate-400 mt-1"></p>
                            </div>
                            
                            <div class="border-t pt-4">
                                <label class="block text-sm font-medium mb-2">Available Resources</label>
                                <div id="res-list" class="space-y-2 mb-2"></div>
                                <div class="flex gap-2">
                                    <input type="text" id="res-name-inp" placeholder="Resource Name (e.g. Mic)" class="flex-1 p-2 border rounded-lg text-sm">
                                    <input type="number" id="res-qty-inp" placeholder="Qty" class="w-20 p-2 border rounded-lg text-sm" min="1">
                                    <button type="button" onclick="addTempResource()" class="bg-slate-200 px-3 rounded-lg hover:bg-slate-300 text-sm font-bold">+</button>
                                </div>
                            </div>
                            
                            <div class="flex justify-end pt-4 gap-3">
                                <button type="button" onclick="closeVenueModal()" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg">Cancel</button>
                                <button type="submit" id="venue-modal-submit-btn" class="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-bold hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 transition-all duration-300 shadow-md">Save Space</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            return html;
        }

         
        let tempResources = [];
        let editingVenueId = null;
        window.openVenueModal = (id) => {
            editingVenueId = id || null;
            const venue = editingVenueId ? state.venues.find(a => a.id === editingVenueId) : null;
            tempResources = venue ? venue.resources.map(r => ({...r})) : [];
            updateResUI();
            document.getElementById('add-venue-modal').classList.remove('hidden');
            document.getElementById('venue-form').reset();
            document.getElementById('venue-modal-title').textContent = venue ? `Edit ${venue.name}` : 'Add New Space';
            document.getElementById('venue-modal-submit-btn').textContent = venue ? 'Update Space' : 'Save Space';
            document.getElementById('venue-name').value = venue ? venue.name : '';
            document.getElementById('venue-cap').value = venue ? venue.capacity : '';
            document.getElementById('venue-loc').value = venue ? venue.location : '';
            const photoNote = document.getElementById('venue-photo-current-note');
            if (photoNote) photoNote.textContent = venue && venue.photo ? 'A photo is already set. Upload a new file only if you want to replace it.' : '';
            ['venue-open', 'venue-close'].forEach(fid => {
                const hidden = document.getElementById(fid);
                const val = venue ? (fid === 'venue-open' ? venue.openTime : venue.closeTime) : '';
                if (hidden) hidden.value = val || '';
                const lbl = document.getElementById(fid + '-label');
                if (lbl) {
                    if (val) { lbl.textContent = formatTimeLabel(val); lbl.classList.remove('text-slate-400'); lbl.classList.add('text-slate-800'); }
                    else { lbl.textContent = 'Select time'; lbl.classList.add('text-slate-400'); lbl.classList.remove('text-slate-800'); }
                }
            });
        };
        window.closeVenueModal = () => { editingVenueId = null; document.getElementById('add-venue-modal').classList.add('hidden'); };
        window.addTempResource = () => {
            const name = document.getElementById('res-name-inp').value;
            const qty = document.getElementById('res-qty-inp').value;
            if(name && qty) { tempResources.push({name, qty: parseInt(qty)}); updateResUI(); document.getElementById('res-name-inp').value=''; document.getElementById('res-qty-inp').value=''; }
        };
        window.removeTempResource = (idx) => { tempResources.splice(idx,1); updateResUI(); };
        function updateResUI() {
            document.getElementById('res-list').innerHTML = tempResources.map((r, i) => `
                <div class="flex justify-between items-center bg-slate-50 p-2 rounded border text-sm">
                    <span>${r.name} <span class="text-slate-500 text-xs">x${r.qty}</span></span>
                    <button type="button" onclick="removeTempResource(${i})" class="text-red-500"><i class="fa-solid fa-trash"></i></button>
                </div>`).join('');
        }
        function viewAdminApprovals() {
            const pending = state.users.filter(u => u.status === 'pending');
            if(pending.length === 0) return `<div class="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">No pending account approvals.</div>`;
            
            return `
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
                    <table class="min-w-full divide-y divide-slate-200">
                        <thead class="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                            <tr><th class="px-6 py-4 text-left">Committee Details</th><th class="px-6 py-4 text-left">Incharge</th><th class="px-6 py-4 text-right">Actions</th></tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200">
                            ${pending.map(u => `
                                <tr>
                                    <td class="px-6 py-4"><p class="font-bold text-slate-900">${u.committee}</p><p class="text-sm text-slate-500">${u.type}</p></td>
                                    <td class="px-6 py-4"><p class="text-sm text-slate-800">${u.incharge}</p><p class="text-xs text-slate-500">${u.phone}</p></td>
                                    <td class="px-6 py-4 text-right">
                                        <button onclick="approveUser('${u.id}', true)" class="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded text-sm font-bold mr-2 transition">Approve</button>
                                        <button onclick="approveUser('${u.id}', false)" class="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded text-sm font-bold transition">Reject</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        function viewAdminRequests() {
            const pending = [...state.bookings].filter(b => b.status === 'Pending').sort((a,b)=> new Date(a.date) - new Date(b.date));
            if(pending.length === 0) return `<div class="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">No pending booking requests.</div>`;
            
            return `<div class="space-y-4">` + pending.map(b => {
                const venue = state.venues.find(a=>a.id===b.venueId);
                const user = state.users.find(u=>u.id===b.userId);
                return `
                <div data-bk="${b.id}" title="Click to see full details" class="cursor-pointer bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 p-6 flex flex-col md:flex-row justify-between md:items-center gap-4 border-l-4 border-amber-400">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded font-bold">${b.category}</span>
                            <h4 class="text-lg font-bold text-slate-900">${esc(b.title)}</h4>
                        </div>
                        <p class="text-sm text-slate-600 mb-2">${esc(b.desc)}</p>
                        <div class="text-sm text-slate-500 flex flex-wrap gap-4">
                            <span><i class="fa-solid fa-users mr-1"></i> ${esc(organizerName(b))}</span>
                            <span><i class="fa-solid fa-location-dot mr-1"></i> ${venue?.name || 'Unknown'}</span>
                            <span class="font-semibold text-indigo-600"><i class="fa-regular fa-calendar mr-1"></i> ${b.date} | ${formatTimeLabel(b.start)} - ${formatTimeLabel(b.end)}</span>
                            <span><i class="fa-solid fa-person mr-1"></i> ${b.attendees} pax</span>
                        </div>
                        ${b.resources.length ? `<div class="mt-2 text-xs text-slate-500">Requested: ${esc(b.resources.join(', '))}</div>` : ''}
                    </div>
                    <div class="flex md:flex-col gap-2 shrink-0">
                        <button onclick="handleBooking('${b.id}', 'Approved')" class="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 hover:-translate-y-0.5 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition"><i class="fa-solid fa-check mr-1"></i> Approve</button>
                        <button onclick="rejectBookingPrompt('${b.id}')" class="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-bold transition">Reject</button>
                    </div>
                </div>
            `}).join('') + `</div>`;
        }

        window.rejectBookingPrompt = (id) => {
            showReasonPopup('Reject Booking', 'Please provide a reason for rejecting this booking:', (reason) => {
                if(reason && reason.trim()) handleBooking(id, 'Rejected', reason.trim());
                else showPopup('Please enter a reason.', 'warning');
            });
        };

        function viewAdminAllBookings() {
            const totalBookingsAll = state.bookings.length;
            const totalCompletedAll = state.bookings.filter(b => b.status === 'Completed').length;
            const totalCancelledAll = state.bookings.filter(b => b.status === 'Cancelled').length;
            const totalRejectedAll = state.bookings.filter(b => b.status === 'Rejected').length;
            return `
                <div class="ch-stat-grid">
                    ${statCard('Total Bookings', totalBookingsAll, 'fa-book', 'blue')}
                    ${statCard('Total Completed', totalCompletedAll, 'fa-check-double', 'emerald')}
                    ${statCard('Total Cancelled', totalCancelledAll, 'fa-ban', 'slate')}
                    ${statCard('Total Rejected', totalRejectedAll, 'fa-circle-xmark', 'red')}
                </div>
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
                    <div class="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
                        <input type="text" id="f-search" placeholder="Search Title or ID (e.g. CH-)..." onkeyup="applyAdminFilters()" class="col-span-1 md:col-span-2 px-3 py-2 rounded-lg border outline-none focus:border-indigo-500 text-sm shadow-sm">
                        <div>
                            <input type="hidden" id="f-from" onchange="applyAdminFilters()">
                            <button type="button" id="f-from-btn" onclick="openDatePicker('f-from')" title="From Date" class="picker-trigger w-full px-3 py-2 rounded-lg border outline-none focus:border-indigo-500 text-sm shadow-sm bg-white flex items-center gap-2 hover:border-indigo-400 transition">
                                <i class="fa-solid fa-calendar-days text-indigo-500 text-xs"></i>
                                <span id="f-from-label" class="text-slate-400 truncate">From date</span>
                            </button>
                        </div>
                        <div>
                            <input type="hidden" id="f-to" onchange="applyAdminFilters()">
                            <button type="button" id="f-to-btn" onclick="openDatePicker('f-to')" title="To Date" class="picker-trigger w-full px-3 py-2 rounded-lg border outline-none focus:border-indigo-500 text-sm shadow-sm bg-white flex items-center gap-2 hover:border-indigo-400 transition">
                                <i class="fa-solid fa-calendar-days text-indigo-500 text-xs"></i>
                                <span id="f-to-label" class="text-slate-400 truncate">To date</span>
                            </button>
                        </div>
                        <select id="f-comm" onchange="applyAdminFilters()" class="px-3 py-2 rounded-lg border outline-none focus:border-indigo-500 text-sm bg-white shadow-sm">
                            <option value="">All Committees</option>
                            ${state.users.map(u=>`<option value="${u.id}">${esc(u.committee)}</option>`).join('')}
                        </select>
                        <select id="f-venue" onchange="applyAdminFilters()" class="px-3 py-2 rounded-lg border outline-none focus:border-indigo-500 text-sm bg-white shadow-sm">
                            <option value="">All Venues</option>
                            ${state.venues.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}
                        </select>
                        <select id="f-status" onchange="applyAdminFilters()" class="px-3 py-2 rounded-lg border outline-none focus:border-indigo-500 text-sm bg-white shadow-sm">
                            <option value="">All Statuses</option>
                            <option>Pending</option><option>Approved</option><option>Rejected</option><option>Completed</option><option>Cancelled</option>
                        </select>
                        <button type="button" onclick="clearAdminFilters()" class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 text-sm font-bold hover:bg-slate-100 transition"><i class="fa-solid fa-filter-circle-xmark mr-2"></i>Clear Filters</button>
                    </div>
                    <div class="overflow-x-auto min-h-[300px]">
                        <table class="min-w-full divide-y divide-slate-200">
                            <thead class="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                                <tr><th class="px-6 py-3 text-left">ID & Event</th><th class="px-6 py-3 text-left">Committee</th><th class="px-6 py-3 text-left">Space & Time</th><th class="px-6 py-3 text-left">Status</th><th class="px-6 py-3 text-right">Actions</th></tr>
                            </thead>
                            <tbody id="admin-bookings-tbody" class="divide-y divide-slate-200 bg-white text-sm">
                                 
                            </tbody>
                        </table>
                        <div id="admin-bookings-empty" class="p-12 text-center text-slate-500 hidden">
                            <i class="fa-solid fa-folder-open text-4xl mb-3 text-slate-300"></i>
                            <p>No bookings match your current filters.</p>
                        </div>
                    </div>
                </div>
            `;
        }

        window.applyAdminFilters = () => {
            const tbody = document.getElementById('admin-bookings-tbody');
            const empty = document.getElementById('admin-bookings-empty');
            if(!tbody) return;

            const search = (document.getElementById('f-search')?.value || '').toLowerCase();
            const from = document.getElementById('f-from')?.value || '';
            const to = document.getElementById('f-to')?.value || '';
            const comm = document.getElementById('f-comm')?.value || '';
            const venue = document.getElementById('f-venue')?.value || '';
            const status = document.getElementById('f-status')?.value || '';

            let filtered = state.bookings.slice().sort(byCreatedDesc).filter(b => {
                const bId = bookingCode(b).toLowerCase();
                const bTitle = (b.title || '').toLowerCase();
                const matchSearch = search === '' || bId.includes(search) || bTitle.includes(search);
                 
                let matchDate;
                if (from && to) matchDate = b.date >= from && b.date <= to;
                else if (from && !to) matchDate = b.date === from;
                else if (!from && to) matchDate = b.date === to;
                else matchDate = true;
                const matchComm = comm === '' || b.userId === comm;
                const matchVenue = venue === '' || b.venueId === venue;
                const matchStatus = status === '' || b.status === status;

                return matchSearch && matchDate && matchComm && matchVenue && matchStatus;
            });

            if (filtered.length === 0) {
                tbody.innerHTML = '';
                empty.classList.remove('hidden');
            } else {
                empty.classList.add('hidden');
                tbody.innerHTML = filtered.map(b => {
                    const c = organizerName(b);
                    const a = state.venues.find(x=>x.id===b.venueId)?.name || b.venueName || '-';
                    const statColor = b.status==='Approved'?'bg-emerald-100 text-emerald-800':b.status==='Rejected'?'bg-red-100 text-red-800':b.status==='Completed'?'bg-slate-200 text-slate-800':b.status==='Cancelled'?'bg-slate-800 text-white':'bg-amber-100 text-amber-800';
                    return `
                    <tr data-bk="${b.id}" title="Click to see full details" class="hover:bg-slate-50 transition cursor-pointer">
                        <td class="px-6 py-4">
                            <span class="text-[10px] text-indigo-500 font-bold tracking-wider uppercase block mb-1">${esc(bookingCode(b))}</span>
                            <span class="font-bold text-slate-900">${escHtml(b.title)}</span>
                            ${reasonBox(b)}
                        </td>
                        <td class="px-6 py-4 text-slate-700 font-medium">${esc(c)}${b.organizerKind === 'external' ? ' <span class="text-[10px] text-slate-400">(External)</span>' : ''}${bookedByAdmin(b) ? `<br><span class="by-admin"><i class="fa-solid fa-user-shield"></i>Booked by ${esc(adminTag(b))}</span>` : ''}</td>
                        <td class="px-6 py-4 text-slate-600">
                            <span class="font-semibold text-slate-800"><i class="fa-solid fa-location-dot text-slate-400 mr-1"></i> ${esc(a)}</span><br>
                            <span class="text-xs text-slate-500"><i class="fa-regular fa-calendar text-slate-400 mr-1"></i> ${esc(b.date)} | ${formatTimeLabel(b.start)} - ${formatTimeLabel(b.end)}</span>
                        </td>
                        <td class="px-6 py-4"><span class="px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border border-slate-200 ${statColor}">${b.status}</span></td>
                        <td class="px-6 py-4 text-right">${['Pending', 'Approved'].includes(b.status) ? `<button onclick="cancelBooking('${b.id}')" class="text-red-600 hover:text-red-800 text-xs font-bold hover:underline">Cancel</button>` : ''}</td>
                    </tr>`
                }).join('');
            }
        };

        window.clearAdminFilters = () => {
            const search = document.getElementById('f-search'); if(search) search.value = '';
            ['f-from','f-to'].forEach((id,i) => {
                const hidden = document.getElementById(id); if(hidden) hidden.value = '';
                const lbl = document.getElementById(id+'-label');
                if(lbl) { lbl.textContent = i===0 ? 'From date' : 'To date'; lbl.classList.add('text-slate-400'); lbl.classList.remove('text-slate-800'); }
            });
            ['f-comm','f-venue','f-status'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
            applyAdminFilters();
        };

        window.filterCommittees = (q) => {
            const term = (q || '').trim().toLowerCase();
            let visible = 0, total = 0;
            document.querySelectorAll('#comm-table tbody tr[data-comm]').forEach(tr => {
                total++;
                const match = !term || tr.getAttribute('data-comm').includes(term);
                tr.style.display = match ? '' : 'none';
                if (match) visible++;
            });
            const empty = document.getElementById('comm-search-empty');
            if (empty) empty.style.display = (total > 0 && visible === 0) ? '' : 'none';
        };

        function viewAdminCommittees() {
            return `
                <div class="flex justify-between items-center mb-4 flex-wrap gap-3">
                    <h3 class="text-lg font-bold text-slate-800">Registered Committees</h3>
                    <div class="ch-search"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="comm-search" placeholder="Search committee by name..." oninput="filterCommittees(this.value)" autocomplete="off"></div>
                </div>
                 <div class="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
                    <table class="min-w-full divide-y divide-slate-200" id="comm-table">
                        <thead class="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                            <tr><th class="px-6 py-3 text-left">Committee</th><th class="px-6 py-3 text-left">Incharge</th><th class="px-6 py-3 text-left">Status</th><th class="px-6 py-3 text-right">Action</th></tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200 bg-white text-sm">
                            ${state.users.map(u => `
                                <tr data-comm="${esc((u.committee + ' ' + (u.incharge || '')).toLowerCase())}">
                                    <td class="px-6 py-4"><div class="font-bold text-slate-900">${esc(u.committee)}</div><div class="text-xs text-slate-500">${esc(u.type)}</div></td>
                                    <td class="px-6 py-4"><div class="text-slate-800">${esc(u.incharge)}</div><div class="text-xs text-slate-500">${esc(u.phone)}</div></td>
                                    <td class="px-6 py-4"><span class="px-2 py-1 rounded text-xs font-bold ${u.status==='approved'?'bg-emerald-100 text-emerald-800':u.status==='blocked'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-800'}">${u.status}</span></td>
                                    <td class="px-6 py-4 text-right">
                                        ${u.status === 'approved' ? `<button onclick="toggleBlock('${u.id}')" class="text-red-600 hover:underline text-xs font-bold">Block</button>` 
                                        : u.status === 'blocked' ? `<button onclick="toggleBlock('${u.id}')" class="text-emerald-600 hover:underline text-xs font-bold">Unblock</button>`:''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div id="comm-search-empty" class="p-12 text-center text-slate-400" style="display:none"><i class="fa-solid fa-magnifying-glass text-3xl mb-3 block"></i>No committee found with that name.</div>
                </div>
            `;
        }
        function viewReports() {
            const sup = state.currentUser.isSuper;
            return `
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 mb-6">
                    <h3 class="font-bold text-lg text-slate-900 mb-1">Export System Data</h3>
                    <p class="text-sm text-slate-500 mb-4">Download the booking list as a CSV file, or the booking report as a PDF.</p>
                    <div class="flex flex-wrap gap-3">
                        <button onclick="exportCSV()" class="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-bold shadow hover:bg-emerald-700 transition flex items-center"><i class="fa-solid fa-file-csv mr-2"></i> CSV</button>
                        <button onclick="openReportRangeModal()" class="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 text-white px-5 py-2.5 rounded-lg font-bold shadow-md transition flex items-center"><i class="fa-solid fa-file-pdf mr-2"></i> PDF Report</button>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                    <h3 class="font-bold text-lg text-slate-900 mb-1"><i class="fa-solid fa-file-code mr-2 text-indigo-500"></i>Full Backup (JSON)</h3>
                    <p class="text-sm text-slate-500 mb-3">Downloads all the data of the software in one JSON file - keep it as a safe copy or use it to move to a new Google Sheet. Venue photos are not included; upload them again after restoring.</p>
                    ${sup ? `<div class="flex flex-wrap gap-3">
                        <button onclick="downloadBackup()" class="bg-slate-800 text-white px-5 py-2.5 rounded-lg font-bold shadow hover:bg-slate-900 transition flex items-center"><i class="fa-solid fa-file-code mr-2"></i> Download full backup</button>
                        <button onclick="startRestore()" class="btn-soft"><i class="fa-solid fa-folder-open mr-2"></i>Restore from backup file</button>
                    </div>
                    <p class="text-xs font-bold text-red-600 mt-3"><i class="fa-solid fa-circle-exclamation mr-1"></i>Restore accepts only a JSON (.json) backup file.</p>` : `<p class="text-sm font-semibold text-slate-500"><i class="fa-solid fa-user-shield mr-1"></i>Only the main admin can download or restore the full backup.</p>`}
                </div>

                ${sup ? `<div class="bg-red-50 border border-red-200 rounded-xl p-6 mt-6">
                    <h3 class="font-bold text-red-800 mb-1"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Danger Zone</h3>
                    <p class="text-sm text-red-700 mb-3">Permanently erase all data and make the system new again. This cannot be undone. Download a backup first.</p>
                    <button onclick="factoryReset()" class="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-700 transition">Factory Reset</button>
                </div>` : ''}
            `;
        }

        window.exportCSV = () => {
            let csv = "ID,Title,Organizer,Booked By,Venue,Date,Start,End,Status,Reason\n";
            state.bookings.forEach(b => {
                const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
                const a = state.venues.find(x=>x.id===b.venueId)?.name || b.venueName || '';
                csv += [q(bookingCode(b)), q(b.title), q(organizerName(b)), q(bookedByText(b)), q(a), b.date, q(formatTimeLabel(b.start)), q(formatTimeLabel(b.end)), b.status, q(b.rejectReason || '')].join(',') + '\n';
            });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('href', url);
            a.setAttribute('download', 'bookings_report.csv');
            a.click();
        }

        window.openReportRangeModal = () => {
            let modal = document.getElementById('report-range-modal');
            if (modal) modal.remove();
            modal = document.createElement('div');
            modal.id = 'report-range-modal';
            modal.className = 'fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in';
            const todayStr = localDateStr();
            modal.innerHTML = `
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
                    <h3 class="text-lg font-bold text-slate-800 mb-1">Generate PDF Report</h3>
                    <p class="text-sm text-slate-500 mb-4">Choose a date range, or click <b>Full Report</b> for all the data from start to end.</p>
                    <div class="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label class="block text-xs font-semibold mb-1">From</label>
                            <input type="hidden" id="rep-from" value="${todayStr}">
                            <button type="button" id="rep-from-btn" onclick="openDatePicker('rep-from')" class="picker-trigger w-full p-2 border rounded-lg text-sm bg-white flex items-center justify-between text-left hover:border-indigo-400 transition">
                                <span id="rep-from-label" class="text-slate-800">${formatDateLabel(todayStr)}</span>
                                <i class="fa-solid fa-calendar-days text-indigo-500 text-xs"></i>
                            </button>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold mb-1">To</label>
                            <input type="hidden" id="rep-to" value="${todayStr}">
                            <button type="button" id="rep-to-btn" onclick="openDatePicker('rep-to')" class="picker-trigger w-full p-2 border rounded-lg text-sm bg-white flex items-center justify-between text-left hover:border-indigo-400 transition">
                                <span id="rep-to-label" class="text-slate-800">${formatDateLabel(todayStr)}</span>
                                <i class="fa-solid fa-calendar-days text-indigo-500 text-xs"></i>
                            </button>
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 flex-wrap">
                        <button type="button" onclick="document.getElementById('report-range-modal').remove()" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold">Cancel</button>
                        <button type="button" onclick="generatePDFReport(true)" title="Report of every booking, from the first to the last" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow transition"><i class="fa-solid fa-list mr-1"></i>Full Report</button>
                        <button type="button" onclick="generatePDFReport()" class="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg text-sm font-bold shadow hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 transition-all duration-300">Generate</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        };

         
        function pdfDate(d) {
            const dt = (typeof d === 'string') ? new Date(d.length <= 10 ? d + 'T00:00:00' : d) : d;
            return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        function pdfNow() {
            const n = new Date();
            return `${pdfDate(n)}, ${formatTimeLabel(String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'))}`;
        }
        function pdfLetterhead() {
            return `
                <div class="pdf-letterhead">
                    ${logoImg('modelLogo', '', 'data-keep="1"')}
                    <div class="pdf-collegebox"><div class="pdf-college">${ASSETS.collegeShort}</div><div class="pdf-college-tag">${ASSETS.collegeTag}</div></div>
                    ${logoImg('samajamLogo', '', 'data-keep="1"')}
                </div>
                <div class="pdf-brand">
                    ${logoImg('appLogo')}
                    <span class="pdf-brand-txt"><b>${ASSETS.appName}</b><small>${ASSETS.tagline}</small></span>
                </div>`;
        }
        function pdfFooter() {
            return `<div class="pdf-footer">This is a system generated document by ${ASSETS.appName} - ${ASSETS.tagline}.<br>${ASSETS.developer}</div>`;
        }
         
         
         
        function fitOnePage(root) {
            const card = root.querySelector('.pdf-slip-card'), frame = root.querySelector('.pdf-frame');
            if (!card || !frame) return;
            const saved = root.style.cssText;
            root.style.cssText = 'display:block;position:absolute;left:-10000px;top:0;width:210mm;visibility:hidden';    
            const limit = 290 * 96 / 25.4;    
            const tall = () => frame.getBoundingClientRect().height > limit;
            let s = 1, g = 1;    
            const apply = () => { card.style.setProperty('--dfs', s); card.style.setProperty('--dg', g); };
            apply();
            while (tall() && s > 0.8) { s = Math.round((s - 0.03) * 100) / 100; apply(); }    
            while (tall() && g > 0.35) { g = Math.round((g - 0.05) * 100) / 100; apply(); }   
            while (tall() && s > 0.3) { s = Math.round((s - 0.03) * 100) / 100; apply(); }    
            root.style.cssText = saved;
        }
        function printDocument(contentHtml, fileTitle, opts) {
            let root = document.getElementById('print-root');
            if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
            root.innerHTML = `
                ${logoImg('appLogo', 'pdf-watermark')}
                <table class="pdf-frame">
                    <thead><tr><td><div class="pdf-spacer"></div></td></tr></thead>
                    <tbody><tr><td class="pdf-body">${pdfLetterhead()}${contentHtml}</td></tr></tbody>
                    <tfoot><tr><td><div class="pdf-spacer bottom"></div></td></tr></tfoot>
                </table>
                ${pdfFooter()}`;
            const imgs = Array.from(root.querySelectorAll('img'));
            const loaded = Promise.all(imgs.map(im => (im.complete && im.naturalWidth > 0) ? Promise.resolve() : new Promise(res => {
                im.addEventListener('load', res, { once: true });
                im.addEventListener('error', () => setTimeout(res, 150), { once: true });
            })));
            const timeout = new Promise(res => setTimeout(res, 2500));
            Promise.race([loaded, timeout]).then(() => {
                if (opts && opts.onePage) fitOnePage(root);
                const oldTitle = document.title;
                document.title = fileTitle;  
                const restore = () => { document.title = oldTitle; window.removeEventListener('afterprint', restore); };
                window.addEventListener('afterprint', restore);
                window.print();
            });
        }

         
         
        window.generatePDFReport = (full) => {
            let from = document.getElementById('rep-from').value;
            let to = document.getElementById('rep-to').value;
            if (full === true) {
                if (!state.bookings.length) { showToast('There are no bookings to include in the report yet.', 'error'); return; }
                 
                const dates = state.bookings.map(b => b.date).filter(Boolean).sort();
                from = dates[0]; to = dates[dates.length - 1];
            } else if (!from || !to || from > to) { showToast('Please select a valid date range.', 'error'); return; }

            const filtered = state.bookings.filter(b => full === true || (b.date >= from && b.date <= to)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
            const byVenue = {}, byComm = {};
            const cnt = { Approved: 0, Completed: 0, Pending: 0, Rejected: 0, Cancelled: 0 };
            filtered.forEach(b => {
                const venueName = state.venues.find(a => a.id === b.venueId)?.name || b.venueName || 'Unknown Venue';
                const commName = (organizerName(b) || 'Unknown') + (b.organizerKind === 'external' ? ' (External)' : '');
                byVenue[venueName] = (byVenue[venueName] || 0) + 1;
                byComm[commName] = (byComm[commName] || 0) + 1;
                if (cnt[b.status] !== undefined) cnt[b.status]++;
            });
            const summaryTable = (head, obj) => `
                <table class="pdf-table">
                    <thead><tr><th>${head}</th><th class="c" style="width:25%">Bookings</th></tr></thead>
                    <tbody>${Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="c">${v}</td></tr>`).join('') || '<tr><td colspan="2" class="pdf-nodata">No data</td></tr>'}</tbody>
                </table>`;
            const periodText = (full === true ? 'Full Report - ' : '') + (from === to ? pdfDate(from) : `${pdfDate(from)} &nbsp;to&nbsp; ${pdfDate(to)}`);

            const content = `
                <div class="pdf-title">Venue Bookings Report</div>
                <p class="pdf-sub">Official booking summary for the selected period</p>

                <table class="pdf-meta">
                    <tr><td class="k">Report Period</td><td>${periodText}</td></tr>
                    <tr><td class="k">Generated On</td><td>${pdfNow()}</td></tr>
                </table>

                <div class="pdf-stats">
                    <div class="pdf-stat"><b>${filtered.length}</b><span>Total Bookings</span></div>
                    <div class="pdf-stat"><b>${cnt.Completed}</b><span>Total Completed</span></div>
                    <div class="pdf-stat"><b>${cnt.Cancelled}</b><span>Total Cancelled</span></div>
                    <div class="pdf-stat"><b>${cnt.Rejected}</b><span>Total Rejected</span></div>
                </div>

                <div class="pdf-h2">Bookings by Venue</div>
                ${summaryTable('Venue', byVenue)}

                <div class="pdf-h2">Bookings by Committee</div>
                ${summaryTable('Committee', byComm)}

                <div class="pdf-h2">Detailed Bookings</div>
                <table class="pdf-table">
                    <thead><tr>
                        <th class="c" style="width:4%">#</th><th style="width:13%">Booking ID</th><th style="width:13%">Date</th><th>Event</th><th>Booked By</th><th>Venue</th><th style="width:15%">Time</th><th class="c" style="width:10%">Status</th>
                    </tr></thead>
                    <tbody>
                    ${filtered.map((b, i) => `<tr>
                        <td class="c">${i + 1}</td>
                        <td style="white-space:nowrap">${esc(bookingCode(b))}</td>
                        <td style="white-space:nowrap">${pdfDate(b.date)}</td>
                        <td>${esc(b.title)}</td>
                        <td>${esc(bookedByText(b))}</td>
                        <td>${esc(state.venues.find(a => a.id === b.venueId)?.name || b.venueName || '-')}</td>
                        <td>${formatTimeLabel(b.start)} - ${formatTimeLabel(b.end)}</td>
                        <td class="c">${b.status}</td>
                    </tr>`).join('') || `<tr><td colspan="8" class="pdf-nodata">No bookings in this range.</td></tr>`}
                    </tbody>
                </table>
            `;
            document.getElementById('report-range-modal')?.remove();
            addLog(`Generated ${full === true ? 'full ' : ''}PDF report (${from} to ${to})`, 'Admin');
            printDocument(content, `CampusHub_${full === true ? 'Full_' : ''}Booking_Report_${from}_to_${to}`);
        };

        
