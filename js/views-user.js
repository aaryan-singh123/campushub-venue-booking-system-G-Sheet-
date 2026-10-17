         
         
         

        function viewUserDash() {
            const myb = state.bookings.filter(b => b.userId === state.currentUser.id);
            const upc = myb.filter(b => b.status === 'Approved').sort(byEventAsc);
            return `
                <div class="rounded-2xl p-8 text-white shadow-xl mb-8" style="background-image: url('assets/images/cubes.svg'), linear-gradient(135deg, #4f46e5, #4f46e5, #6d28d9);">
                    <h2 class="text-3xl font-bold mb-2">Welcome, ${esc(state.currentUser.committee)}!</h2>
                    <p class="text-indigo-100">Plan and manage your events efficiently.</p>
                    <button onclick="navigate('book_venue')" class="mt-6 bg-white text-indigo-600 px-6 py-2.5 rounded-lg font-bold shadow-md hover:bg-slate-50 transition">Book a Space Now</button>
                </div>

                <h3 class="text-lg font-bold text-slate-800 mb-4">Your Upcoming Approved Events</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${upc.length === 0 ? `<div class="col-span-full p-8 bg-white rounded-xl border border-slate-200 text-center text-slate-500">No upcoming events.</div>` : ''}
                    ${upc.map(b => {
                        const a = state.venues.find(x => x.id === b.venueId);
                        return `
                        <div data-bk="${b.id}" title="Click to see full details" class="cursor-pointer bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 p-5 relative overflow-hidden group">
                            <div class="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                            <h4 class="font-bold text-lg text-slate-900 truncate">${esc(b.title)}</h4>
                            <p class="text-sm text-slate-500 mb-3">${esc(a ? a.name : b.venueName)}${bookedByAdmin(b) ? ` <span class="by-admin"><i class="fa-solid fa-user-shield"></i>Booked by ${esc(adminTag(b))}</span>` : ''}</p>
                            <div class="bg-slate-50 p-3 rounded-lg flex items-center justify-between text-sm font-semibold text-slate-700">
                                <span><i class="fa-regular fa-calendar text-indigo-500 mr-1"></i> ${esc(b.date)}</span>
                                <span><i class="fa-regular fa-clock text-indigo-500 mr-1"></i> ${formatTimeLabel(b.start)} - ${formatTimeLabel(b.end)}</span>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            `;
        }

        function viewBookVenue() {
            if (state.venues.length === 0) {
                return `<div class="text-center p-12 bg-white rounded-xl shadow-sm">
                    <i class="fa-solid fa-person-digging text-5xl text-slate-300 mb-4"></i>
                    <h3 class="text-lg font-bold text-slate-700">No Venues Available</h3>
                    <p class="text-slate-500">The admin hasn't added any venues yet.</p>
                </div>`;
            }
            const picker = (id, label, icon) => `
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">${label}</label>
                    <input type="hidden" id="${id}">
                    <button type="button" id="${id}-btn" onclick="${id === 'b-date' ? "openDatePicker('b-date', localDateStr())" : `(function(){ const t=getSelectedVenueTimes('b-venueId'); openTimePicker('${id}', t.open, t.close); })()`}" class="picker-trigger w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:border-indigo-500 bg-white flex items-center justify-between text-left hover:border-indigo-400 transition">
                        <span id="${id}-label" class="text-slate-400 text-sm">${id === 'b-date' ? 'Select date' : 'Select time'}</span>
                        <i class="${icon} text-indigo-500"></i>
                    </button>
                </div>`;
            return `
                <div id="step-1">
                    <div class="flex justify-between items-center mb-4 flex-wrap gap-3">
                        <h3 class="text-lg font-bold text-slate-800">Select a Venue</h3>
                        <div class="ch-search"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="venue-search" placeholder="Search venue by name..." oninput="filterVenueCards(this.value)" autocomplete="off"></div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        ${state.venues.map(venue => `
                            <div class="venue-card bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer hover:border-indigo-300" data-venue-name="${esc(venue.name.toLowerCase())}" onclick="selectVenue('${venue.id}')">
                                <div class="h-32 bg-slate-200">${venue.photo ? `<img src="${esc(venue.photo)}" class="w-full h-full object-cover" data-vname="${esc(venue.name)}" onerror="venueImgFail(this)">` : venueThumb(venue.name)}</div>
                                <div class="p-4">
                                    <h4 class="font-bold text-slate-900">${esc(venue.name)}</h4>
                                    <p class="text-sm text-slate-500">Cap: ${esc(venue.capacity)} | ${esc(venue.location)}</p>
                                    ${venue.openTime && venue.closeTime ? `<p class="text-xs text-indigo-500 font-semibold mt-1"><i class="fa-regular fa-clock mr-1"></i>${formatTimeLabel(venue.openTime)} - ${formatTimeLabel(venue.closeTime)}</p>` : ''}
                                    <p class="text-xs text-slate-400 mt-2 line-clamp-1">${esc(venue.resources.map(r => r.name).join(', '))}</p>
                                </div>
                            </div>
                        `).join('')}
                        <div id="venue-search-empty" class="col-span-full p-12 text-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl bg-white" style="display:none"><i class="fa-solid fa-magnifying-glass text-3xl mb-3 block"></i>No venue found with that name.</div>
                    </div>
                </div>
                <div id="step-2" class="hidden max-w-2xl bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <button onclick="backToVenues()" class="text-sm text-indigo-600 font-bold mb-4 hover:underline"><i class="fa-solid fa-arrow-left mr-1"></i> Back to Venues</button>
                    <h3 class="text-xl font-bold text-slate-900 mb-6" id="sel-venue-name">Book</h3>
                    <form onsubmit="submitBooking(event)" class="space-y-4">
                        <input type="hidden" id="b-venueId">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label class="block text-sm font-medium text-slate-700 mb-1">Event Title</label><input type="text" id="b-title" required maxlength="120" class="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:border-indigo-500"></div>
                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                <select id="b-cat" required class="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:border-indigo-500 bg-white">${CATEGORIES.map(c => `<option>${esc(c)}</option>`).join('')}</select>
                            </div>
                        </div>
                        <div><label class="block text-sm font-medium text-slate-700 mb-1">Purpose/Description</label><textarea id="b-desc" required maxlength="500" rows="2" class="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:border-indigo-500"></textarea></div>
                        <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-lg px-3 py-2 flex items-center gap-2">
                            <i class="fa-solid fa-circle-info"></i> Please check the Calendar before booking to confirm this slot is free.
                            <button type="button" onclick="navigate('calendar')" class="ml-auto underline font-bold whitespace-nowrap">Check Calendar</button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 border-y border-slate-100 py-4 my-4">
                            ${picker('b-date', 'Date', 'fa-solid fa-calendar-days')}${picker('b-start', 'Start Time', 'fa-regular fa-clock')}${picker('b-end', 'End Time', 'fa-regular fa-clock')}
                        </div>
                        <p id="b-venue-hours-note" class="text-xs text-slate-400 -mt-2"></p>
                        <div><label class="block text-sm font-medium text-slate-700 mb-1">Expected Attendees</label><input type="number" id="b-att" required min="1" class="w-full md:w-1/3 p-2.5 border rounded-lg outline-none focus:ring-2 focus:border-indigo-500"></div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">Required Resources (Optional)</label>
                            <div id="b-res-list"></div>
                        </div>
                        <button type="submit" class="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-3 rounded-lg mt-4 shadow-lg hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 transition-all duration-300">Submit Booking Request</button>
                    </form>
                </div>
            `;
        }

        window.backToVenues = () => { el('step-2').classList.add('hidden'); el('step-1').classList.remove('hidden'); };

         
        window.selectVenue = (id, dateStr) => {
            const venue = state.venues.find(a => a.id === id);
            if (!venue) return;
            el('b-venueId').value = venue.id;
            el('sel-venue-name').innerText = `Book ${venue.name}`;
            el('b-res-list').innerHTML = resourcePicker(venue);
            ['b-date', 'b-start', 'b-end'].forEach(fid => setPicker(fid, '', fid === 'b-date' ? 'Select date' : 'Select time'));
            if (dateStr) setPicker('b-date', dateStr, formatDateLabel(dateStr));
            const note = el('b-venue-hours-note');
            if (note) note.textContent = (venue.openTime && venue.closeTime) ? `Available between ${formatTimeLabel(venue.openTime)} and ${formatTimeLabel(venue.closeTime)}.` : '';
            el('step-1').classList.add('hidden');
            el('step-2').classList.remove('hidden');
        };
         
        function setPicker(id, value, label) {
            const h = el(id); if (h) h.value = value;
            const l = el(id + '-label');
            if (l) { l.textContent = label; l.classList.toggle('text-slate-400', !value); l.classList.toggle('text-slate-800', !!value); }
        }

         
        function getSelectedVenueTimes(venueFieldId) {
            const venue = state.venues.find(a => a.id === (el(venueFieldId) || {}).value);
            return venue ? { open: venue.openTime, close: venue.closeTime } : { open: null, close: null };
        }

        const STATUS_COLORS = { Pending: 'bg-amber-100 text-amber-800', Approved: 'bg-emerald-100 text-emerald-800', Rejected: 'bg-red-100 text-red-800', Completed: 'bg-slate-200 text-slate-700', Cancelled: 'bg-slate-800 text-white' };

        function viewMyBookings() {
            const myb = state.bookings.filter(b => b.userId === state.currentUser.id).sort(byCreatedDesc);
            if (myb.length === 0) return `<div class="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">You haven't made any bookings yet.</div>`;
            return `<div class="space-y-4">` + myb.map(b => {
                const venue = (state.venues.find(a => a.id === b.venueId) || {}).name || b.venueName || 'Unknown';
                return `
                <div data-bk="${b.id}" title="Click to see full details" class="cursor-pointer bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all duration-300 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 class="text-lg font-bold text-slate-900">${esc(b.title)}</h4>
                            <span class="px-2 py-0.5 rounded text-xs font-bold ${STATUS_COLORS[b.status] || ''}">${esc(b.status)}</span>
                            ${bookedByAdmin(b) ? `<span class="by-admin"><i class="fa-solid fa-user-shield"></i>Booked by ${esc(adminTag(b))}</span>` : ''}
                        </div>
                        <p class="text-sm font-medium text-slate-700"><i class="fa-solid fa-location-dot text-slate-400 mr-1"></i> ${esc(venue)}</p>
                        <p class="text-sm text-slate-500"><i class="fa-regular fa-calendar text-slate-400 mr-1"></i> ${esc(b.date)} | ${formatTimeLabel(b.start)} - ${formatTimeLabel(b.end)}</p>
                        ${reasonBox(b)}
                    </div>
                    <div class="flex gap-2 shrink-0 flex-wrap">
                        ${['Approved', 'Completed'].includes(b.status) ? `<button onclick="generatePDF('${b.id}')" class="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-sm font-bold transition"><i class="fa-solid fa-print mr-1"></i> Print Slip</button>` : ''}
                        ${['Pending', 'Approved'].includes(b.status) ? `<button onclick="cancelBooking('${b.id}')" class="bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700 px-3 py-1.5 rounded-lg text-sm font-bold transition">Cancel Event</button>` : ''}
                    </div>
                </div>`;
            }).join('') + `</div>`;
        }

         
         
        window.generatePDF = (id) => {
            const b = state.bookings.find(x => x.id === id);
            if (!b) return;
            const venue = state.venues.find(a => a.id === b.venueId);
            const venueName = (venue && venue.name) || b.venueName || 'Unknown', venueLoc = (venue && venue.location) || b.venueLocation || '';
            const row = (k, v) => `<tr><td class="k">${k}</td><td>${v}</td></tr>`;
            const content = `
                <div class="pdf-title">Venue Booking Confirmation</div>
                <p class="pdf-sub">Official booking slip &nbsp;|&nbsp; Generated on ${pdfNow()}</p>

                <div class="pdf-slip-card">
                    <h2 class="pdf-slip-event">${esc(b.title)}</h2>
                    <div class="pdf-slip-status"><span class="pdf-pill">${b.status === 'Completed' ? 'COMPLETED' : 'APPROVED'}</span></div>
                    <table class="pdf-slip-table">
                        ${row('Booking ID', esc(bookingCode(b)))}
                        ${row('Booked By', esc(bookedByText(b)))}
                        ${bookedByAdmin(b) ? row('Booked For', esc(organizerName(b)) + (b.organizerKind === 'external' ? ' (External)' : '')) : ''}
                        ${row('Category', esc(b.category || '-'))}
                        ${row('Venue', esc(venueName) + (venueLoc ? ' (' + esc(venueLoc) + ')' : ''))}
                        ${row('Date', pdfDate(b.date))}
                        ${row('Time Slot', `${formatTimeLabel(b.start)} to ${formatTimeLabel(b.end)}`)}
                        ${row('Expected Attendees', 'Approx. ' + esc(b.attendees || '-'))}
                        ${row('Resources', (b.resources && b.resources.length) ? b.resources.map(esc).join(', ') : 'None requested')}
                    </table>
                    <div class="pdf-sign"><div>Organizer Signature</div><div>Administrator / Authorised Signatory</div></div>
                </div>
                <p class="pdf-note">Please present this slip if requested by security or management.</p>
            `;
            printDocument(content, `CampusHub_Booking_Slip_${String(b.id).toUpperCase()}`, { onePage: true });
        };

        function viewProfile() {
            const u = state.currentUser;
            return `
                <div class="max-w-2xl bg-white p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
                    <h3 class="text-xl font-bold mb-6">Profile Settings</h3>
                    <div class="space-y-4">
                        <div><label class="block text-sm font-medium text-slate-500">Committee Name (Fixed)</label><div class="p-3 bg-slate-50 rounded border font-semibold">${esc(u.committee)}</div></div>
                        <div><label class="block text-sm font-medium text-slate-500">Incharge Name</label><input type="text" id="prof-in" value="${esc(u.incharge)}" class="w-full p-2 border rounded outline-none focus:border-indigo-500"></div>
                        <div><label class="block text-sm font-medium text-slate-500">Phone Number</label><input type="text" id="prof-ph" value="${esc(u.phone)}" class="w-full p-2 border rounded outline-none focus:border-indigo-500"></div>
                        <hr class="my-4">
                        <div><label class="block text-sm font-medium text-slate-500">New Password</label><input type="password" id="prof-pwd" placeholder="Leave blank to keep current" class="w-full p-2 border rounded outline-none focus:border-indigo-500"></div>
                        <button onclick="saveProfile()" class="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold px-6 py-2 rounded-lg mt-4 shadow hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 transition-all duration-300">Save Changes</button>
                    </div>
                </div>
                <div class="danger-card max-w-2xl mt-6">
                    <h3><i class="fa-solid fa-triangle-exclamation mr-2"></i>Delete my account</h3>
                    <p>Your account will be removed and you will not be able to sign in again. Your upcoming events that are not yet completed will be cancelled automatically (reason: account deleted). Past booking records are kept by the college. This needs a 2-step confirmation.</p>
                    <button onclick="startDeleteAccount()" class="btn-danger">Delete my account</button>
                </div>
            `;
        }

         
        function viewNotifications() {
            const me = state.currentUser, notifs = state.notifications.filter(n => n.userId === me.id).slice().reverse();
            const hadUnread = notifs.some(n => !n.read);
            if (hadUnread) {
                notifs.forEach(n => { n.read = true; });
                setTimeout(() => { refreshSidebar(); API.call('markNotificationsRead', {}, true).catch(() => { }); }, 0);
            }
            if (notifs.length === 0) return `<div class="p-8 text-center bg-white rounded-xl text-slate-500 border border-slate-200">No new notifications.</div>`;
            const icon = n => n.type === 'admin_request' ? 'fa-user-shield' : n.type === 'password_reset' ? 'fa-key' : n.type === 'account_deleted' ? 'fa-triangle-exclamation' : 'fa-bell';
            return `<div class="space-y-2 max-w-3xl">` + notifs.map(n => `
                <div class="p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex items-start gap-3">
                    <div class="text-indigo-500 mt-1"><i class="fa-solid ${icon(n)}"></i></div>
                    <div class="flex-1">
                        <p class="text-slate-800 font-medium">${escHtml(n.text)}</p>
                        <p class="text-xs text-slate-400 mt-1">${fmtStamp(n.date)}</p>
                        ${n.type === 'admin_request' && !n.resolved && me.role === 'admin' ? `
                        <div class="flex gap-2 mt-3">
                            <button onclick="decideAdminRequest('${n.reqAdminId}', true)" class="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow">Accept</button>
                            <button onclick="decideAdminRequest('${n.reqAdminId}', false)" class="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200">Reject</button>
                        </div>` : n.type === 'password_reset' && !n.resolved && me.role === 'admin' ? `
                        <div class="flex gap-2 mt-3">
                            ${n.refId ? `<button onclick="openResetPw('${n.refId}')" class="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Change</button>` : ''}
                            <button onclick="ignoreResetRequest('${n.id}')" class="bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200">Ignore</button>
                        </div>` : n.type === 'admin_request' && n.resolved ? `<p class="text-xs font-bold text-slate-400 mt-2"><i class="fa-solid fa-check mr-1"></i> Request already handled</p>`
                        : n.type === 'password_reset' && n.resolved ? `<p class="text-xs font-bold text-slate-400 mt-2"><i class="fa-solid fa-check mr-1"></i> Request closed</p>` : ''}
                    </div>
                </div>`).join('') + `</div>`;
        }
