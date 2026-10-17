         
         
         

         
        function venueCombo() {
            const sel = state.venues.find(a => a.id === state.calVenueId);
            return `
                <div class="ch-combo" id="venue-combo">
                    <div class="ch-combo-field">
                        <i class="fa-solid fa-building lead"></i>
                        <input type="text" id="venue-combo-input" value="${esc(sel ? sel.name : '')}" placeholder="Search & select venue..." autocomplete="off"
                            onfocus="venueComboOpen()" onclick="venueComboOpen()" oninput="venueComboFilter(this.value)" onkeydown="venueComboKey(event)" onblur="venueComboClose()">
                        <i class="fa-solid fa-chevron-down caret"></i>
                    </div>
                    <div class="ch-combo-list" id="venue-combo-list" style="display:none">
                        ${state.venues.map(a => `<div class="ch-combo-item ${a.id === state.calVenueId ? 'sel' : ''}" data-id="${a.id}" data-name="${esc(a.name.toLowerCase())}" onmousedown="event.preventDefault(); venueComboPick('${a.id}')">${esc(a.name)}</div>`).join('')}
                        <div class="ch-combo-empty" id="venue-combo-empty" style="display:none">No venue found</div>
                    </div>
                </div>`;
        }
        window.venueComboOpen = () => {
            const inp = document.getElementById('venue-combo-input');
            const list = document.getElementById('venue-combo-list');
            if (!inp || !list) return;
            list.style.display = '';
            if (!list.dataset.open) { list.dataset.open = '1'; inp.select(); venueComboFilter(''); }
        };
        window.venueComboClose = () => {
            const inp = document.getElementById('venue-combo-input');
            const list = document.getElementById('venue-combo-list');
            if (!inp || !list) return;
            list.style.display = 'none';
            delete list.dataset.open;
            const sel = state.venues.find(a => a.id === state.calVenueId);
            inp.value = sel ? sel.name : '';
        };
        window.venueComboFilter = (q) => {
            const term = (q || '').trim().toLowerCase();
            let visible = 0, first = null;
            document.querySelectorAll('#venue-combo-list .ch-combo-item').forEach(it => {
                const m = !term || it.getAttribute('data-name').includes(term);
                it.style.display = m ? '' : 'none';
                it.classList.remove('active');
                if (m) { visible++; if (!first) first = it; }
            });
            if (first && term) first.classList.add('active');
            const empty = document.getElementById('venue-combo-empty');
            if (empty) empty.style.display = visible === 0 ? '' : 'none';
        };
        window.venueComboKey = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const target = document.querySelector('#venue-combo-list .ch-combo-item.active') ||
                    Array.from(document.querySelectorAll('#venue-combo-list .ch-combo-item')).find(it => it.style.display !== 'none');
                if (target) venueComboPick(target.getAttribute('data-id'));
            } else if (e.key === 'Escape') {
                e.target.blur();
            }
        };
        window.venueComboPick = (id) => {
            state.calVenueId = id;
            renderApp();
        };

         
        function dayInfo(venue, dateStr) {
            const open = timeToMinutes(venue.openTime || '00:00'), close = timeToMinutes(venue.closeTime || '23:59');
            const books = state.bookings.filter(b => b.venueId === venue.id && b.date === dateStr && ['Pending', 'Approved', 'Completed'].includes(b.status));
            const clo = state.closures.find(c => c.venueId === venue.id && c.date === dateStr);
            const closedAll = !!(clo && clo.fullDay), ranges = (clo && !clo.fullDay) ? (clo.ranges || []) : [];
            const spans = books.map(b => [timeToMinutes(b.start), timeToMinutes(b.end)]).concat(ranges.map(r => [timeToMinutes(r.start), timeToMinutes(r.end)]))
                .map(x => [Math.max(open, x[0]), Math.min(close, x[1])]).filter(x => x[0] < x[1]).sort((x, y) => x[0] - y[0]);
            let used = 0, end = -1;
            spans.forEach(x => { const st = Math.max(x[0], end); if (x[1] > st) { used += x[1] - st; end = x[1]; } });
            return { books, clo, closedAll, ranges, free: (close - open) - used };
        }

        function viewCalendar() {
            if (state.venues.length === 0) {
                return `<div class="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">No venues configured yet. Calendar unavailable.</div>`;
            }
            if (!state.calVenueId || !state.venues.find(a => a.id === state.calVenueId)) state.calVenueId = state.venues[0].id;  
            const venue = state.venues.find(a => a.id === state.calVenueId);
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const firstDay = new Date(state.calYear, state.calMonth, 1).getDay();
            const daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();
            const isUser = state.currentUser.role !== 'admin';

            let html = `
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[600px]">
                    <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b pb-4">
                        <div class="flex items-center gap-4 flex-wrap justify-center">
                            <button onclick="changeCalMonth(-1)" class="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 shadow-sm transition"><i class="fa-solid fa-chevron-left"></i></button>
                            <h2 class="text-2xl font-bold text-slate-800 w-48 text-center">${monthNames[state.calMonth]} ${state.calYear}</h2>
                            <button onclick="changeCalMonth(1)" class="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 shadow-sm transition"><i class="fa-solid fa-chevron-right"></i></button>
                            ${isUser ? `<button onclick="bookFromCalendar()" class="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition whitespace-nowrap"><i class="fa-solid fa-plus mr-2"></i> Book ${esc(venue.name)}</button>` : ''}
                        </div>
                        <div class="w-full md:w-auto">${venueCombo()}</div>
                    </div>

                    <div class="cal-legend">
                        <div><span class="cal-sw cal-avail"></span><span><b>All Available</b>No booking, every slot is free</span></div>
                        <div><span class="cal-sw cal-some"></span><span><b>Some Slots Booked</b>Some events are booked, free time is left</span></div>
                        <div><span class="cal-sw cal-pclosed"></span><span><b>Partly Closed</b>Venue closed for some hours only</span></div>
                        <div><span class="cal-sw cal-closed"></span><span><b>Closed all day</b>Venue closed the whole day</span></div>
                        <div><span class="cal-sw cal-full"></span><span><b>Full Booked</b>Events fill the whole day, no free slot</span></div>
                        <div><span class="cal-sw cal-past"></span><span><b>Past Date</b>Cannot be booked</span></div>
                    </div>

                    <div class="grid grid-cols-7 gap-2 flex-1">
                        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="text-center font-bold text-slate-400 py-2 uppercase text-xs tracking-wider">${d}</div>`).join('')}
            `;
            for (let i = 0; i < firstDay; i++) html += `<div></div>`;

            const todayStr = localDateStr();
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${state.calYear}-${String(state.calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const info = dayInfo(venue, dateStr), n = info.books.length;
                let cls = 'cal-avail', txt = 'All Available';
                if (dateStr < todayStr) { cls = 'cal-past'; txt = n ? `${n} event${n > 1 ? 's' : ''}` : 'Passed'; }
                else if (info.closedAll) { cls = 'cal-closed'; txt = 'Closed all day'; }
                else if (info.free <= 0) { cls = 'cal-full'; txt = 'Full Booked'; }
                else if (info.ranges.length) {
                    const r = info.ranges.map(x => `${formatTimeLabel(x.start)}-${formatTimeLabel(x.end)}`);
                    cls = 'cal-pclosed'; txt = `Closed ${r[0]}${r.length > 1 ? ` +${r.length - 1} more` : ''}`;
                } else if (n > 0) { cls = 'cal-some'; txt = `Some Slots Booked (${n})`; }
                html += `
                    <div onclick="openCalDayModal('${dateStr}')" class="cal-cell ${cls} ${dateStr === todayStr ? 'cal-today' : ''}">
                        <div class="cal-num">${day}</div>
                        <div class="cal-txt">${esc(txt)}</div>
                    </div>`;
            }
            return html + `</div></div>`;
        }

         
        window.bookFromCalendar = (dateStr) => {
            const vid = state.calVenueId;
            const m = el('cal-day-modal'); if (m) m.remove();
            navigate('book_venue');
            selectVenue(vid, dateStr);
        };

        window.changeCalMonth = (dir) => {
            state.calMonth += dir;
            if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
            else if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
            renderApp();
        };

        window.openCalDayModal = (dateStr) => {
            const dayBooks = state.bookings.filter(b => b.venueId === state.calVenueId && b.date === dateStr && ['Pending', 'Approved', 'Completed'].includes(b.status));
            dayBooks.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
            let modal = el('cal-day-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'cal-day-modal';
                modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity';
                el('app').appendChild(modal);
            }
            const venue = state.venues.find(a => a.id === state.calVenueId) || {};
            const displayDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const isAdmin = state.currentUser.role === 'admin';
            const closure = getClosureInfo(state.calVenueId, dateStr);
            const canBook = !isAdmin && dateStr >= localDateStr() && !(closure && closure.fullDay);

            modal.innerHTML = `
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 m-4 relative animate-fade-in border border-slate-200">
                    <button onclick="document.getElementById('cal-day-modal').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-red-500 text-xl transition bg-slate-100 hover:bg-red-50 rounded-full w-8 h-8 flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button>
                    <h3 class="text-2xl font-black text-slate-900 mb-1 pr-10">${displayDate}</h3>
                    <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 gap-2 flex-wrap">
                        <p class="text-sm font-bold text-indigo-600"><i class="fa-solid fa-location-dot mr-1"></i> ${esc(venue.name || '')} <span class="text-slate-400 font-semibold">(${formatTimeLabel(venue.openTime)} - ${formatTimeLabel(venue.closeTime)})</span></p>
                        ${isAdmin ? `<button onclick="openCloseVenueModal('${dateStr}')" class="text-xs font-bold px-3 py-1.5 rounded-lg border transition ${closure ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}"><i class="fa-solid fa-ban mr-1"></i>${closure ? 'Edit Closure' : 'Close Venue'}</button>` : ''}
                    </div>
                    ${closure ? `
                        <div class="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-lg px-4 py-3 mb-4">
                            <i class="fa-solid fa-triangle-exclamation mr-2"></i>
                            ${closure.fullDay ? 'This venue is closed for the whole day.' : `This venue is closed during: ${(closure.ranges || []).map(r => `${formatTimeLabel(r.start)}–${formatTimeLabel(r.end)}`).join(', ')}.`}
                        </div>` : ''}
                    <div class="space-y-3 max-h-[50vh] overflow-y-auto pr-2 hide-scrollbar">
                        ${dayBooks.length === 0 ? `
                            <div class="flex flex-col items-center justify-center py-10 text-slate-400">
                                <i class="fa-regular fa-calendar-check text-5xl mb-4 text-slate-300"></i>
                                <p class="font-medium text-lg">No events scheduled.</p>
                            </div>` : ''}
                        ${dayBooks.map(b => {
                            const mine = isAdmin || b.userId === state.currentUser.id;
                            return `
                                <div class="p-4 rounded-xl border-2 ${mine ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'} shadow-sm">
                                    <div class="flex justify-between items-start mb-2 gap-2">
                                        <h4 class="font-bold text-slate-900 pr-2 text-lg leading-tight"><i class="fa-solid fa-bookmark ${mine ? 'text-indigo-500' : 'text-slate-400'} mr-2"></i>${esc(b.title || 'Booked')}</h4>
                                        <span class="bg-white px-3 py-1.5 rounded-lg text-xs font-black border border-slate-200 shadow-sm whitespace-nowrap text-indigo-700">${formatTimeLabel(b.start)} - ${formatTimeLabel(b.end)}</span>
                                    </div>
                                    <p class="text-sm font-medium text-slate-600"><i class="fa-solid fa-users mr-2 text-slate-400"></i>${esc(organizerName(b))}${b.status === 'Pending' ? ' <span class="text-amber-600 text-xs font-bold">(awaiting approval)</span>' : ''}</p>
                                </div>`;
                        }).join('')}
                    </div>
                    ${canBook ? `<div class="cal-daymodal-actions"><button onclick="bookFromCalendar('${dateStr}')" class="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-2.5 rounded-xl shadow-md transition"><i class="fa-solid fa-plus mr-2"></i>Book this venue on this date</button></div>` : ''}
                </div>
            `;
            modal.classList.remove('hidden');
        };

         
        let closureModalFullMode = true;
        let tempClosureRanges = [];
        window.openCloseVenueModal = (dateStr) => {
            const venue = state.venues.find(a => a.id === state.calVenueId);
            const existing = getClosureInfo(state.calVenueId, dateStr);
            closureModalFullMode = !existing || existing.fullDay;
            tempClosureRanges = (existing && !existing.fullDay && existing.ranges) ? existing.ranges.map(r => ({...r})) : [];

            let modal = document.getElementById('closure-modal');
            if (modal) modal.remove();
            modal = document.createElement('div');
            modal.id = 'closure-modal';
            modal.className = 'fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 m-4 max-h-[90vh] overflow-y-auto">
                    <h3 class="text-lg font-bold text-slate-800 mb-1">Close ${venue ? venue.name : 'Venue'}</h3>
                    <p class="text-sm text-slate-500 mb-4">${dateStr}</p>
                    <div class="flex gap-2 mb-4">
                        <button type="button" id="close-mode-full" onclick="setCloseMode(true)" class="flex-1 py-2 rounded-lg text-sm font-bold border-2 transition"></button>
                        <button type="button" id="close-mode-range" onclick="setCloseMode(false)" class="flex-1 py-2 rounded-lg text-sm font-bold border-2 transition"></button>
                    </div>
                    <div id="close-range-fields" class="mb-4">
                        <label class="block text-xs font-semibold mb-1 text-slate-500 uppercase tracking-wide">Closed Time Ranges</label>
                        <div id="close-ranges-list" class="space-y-2 mb-3"></div>
                        <div class="grid grid-cols-2 gap-3 mb-2">
                            <div>
                                <label class="block text-xs font-semibold mb-1">From</label>
                                <input type="hidden" id="close-start" value="">
                                <button type="button" id="close-start-btn" onclick="openTimePicker('close-start', '00:00', '23:59')" class="picker-trigger w-full p-2 border rounded-lg text-sm bg-white flex items-center justify-between text-left hover:border-indigo-400 transition">
                                    <span id="close-start-label" class="text-slate-400">Select time</span>
                                    <i class="fa-regular fa-clock text-indigo-500 text-xs"></i>
                                </button>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold mb-1">To</label>
                                <input type="hidden" id="close-end" value="">
                                <button type="button" id="close-end-btn" onclick="openTimePicker('close-end', '00:00', '23:59')" class="picker-trigger w-full p-2 border rounded-lg text-sm bg-white flex items-center justify-between text-left hover:border-indigo-400 transition">
                                    <span id="close-end-label" class="text-slate-400">Select time</span>
                                    <i class="fa-regular fa-clock text-indigo-500 text-xs"></i>
                                </button>
                            </div>
                        </div>
                        <button type="button" onclick="addTempClosureRange()" class="w-full py-2 rounded-lg border-2 border-dashed border-indigo-300 text-indigo-600 text-sm font-bold hover:bg-indigo-50 transition"><i class="fa-solid fa-plus mr-1"></i> Add Range</button>
                    </div>
                    <div class="flex justify-between gap-3 mt-2">
                        ${existing ? `<button type="button" onclick="removeClosure('${dateStr}')" class="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100">Remove Closure</button>` : `<span></span>`}
                        <div class="flex gap-2">
                            <button type="button" onclick="document.getElementById('closure-modal').remove()" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold">Cancel</button>
                            <button type="button" onclick="saveClosure('${dateStr}')" class="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg text-sm font-bold shadow hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 transition-all duration-300">Save</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            updateCloseModeUI();
            renderTempClosureRanges();
        };

        function renderTempClosureRanges() {
            const c = document.getElementById('close-ranges-list');
            if (!c) return;
            if (tempClosureRanges.length === 0) {
                c.innerHTML = `<p class="text-xs text-slate-400 italic">No time ranges added yet.</p>`;
                return;
            }
            c.innerHTML = tempClosureRanges.map((r, i) => `
                <div class="flex justify-between items-center bg-red-50 border border-red-200 p-2 rounded-lg text-sm">
                    <span class="font-semibold text-red-700"><i class="fa-regular fa-clock mr-1"></i> ${formatTimeLabel(r.start)} - ${formatTimeLabel(r.end)}</span>
                    <button type="button" onclick="removeTempClosureRange(${i})" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-trash"></i></button>
                </div>`).join('');
        }

        window.addTempClosureRange = () => {
            const start = document.getElementById('close-start').value;
            const end = document.getElementById('close-end').value;
            if (!start || !end || timeToMinutes(start) >= timeToMinutes(end)) {
                showToast('Please pick a valid From/To time before adding.', 'error');
                return;
            }
            const ns = timeToMinutes(start), ne = timeToMinutes(end);
            const overlapsExisting = tempClosureRanges.some(r => Math.max(ns, timeToMinutes(r.start)) < Math.min(ne, timeToMinutes(r.end)));
            if (overlapsExisting) {
                showToast('This range overlaps with a range you already added.', 'error');
                return;
            }
            tempClosureRanges.push({ start, end });
            ['close-start', 'close-end'].forEach(id => {
                const hidden = document.getElementById(id);
                if (hidden) hidden.value = '';
                const lbl = document.getElementById(id + '-label');
                if (lbl) { lbl.textContent = 'Select time'; lbl.classList.add('text-slate-400'); lbl.classList.remove('text-slate-800'); }
            });
            renderTempClosureRanges();
        };
        window.removeTempClosureRange = (idx) => { tempClosureRanges.splice(idx, 1); renderTempClosureRanges(); };

        function updateCloseModeUI() {
            const fullBtn = document.getElementById('close-mode-full');
            const rangeBtn = document.getElementById('close-mode-range');
            const rangeFields = document.getElementById('close-range-fields');
            if (!fullBtn || !rangeBtn) return;
            fullBtn.textContent = 'Full Day';
            rangeBtn.textContent = 'Time Range(s)';
            fullBtn.className = `flex-1 py-2 rounded-lg text-sm font-bold border-2 transition ${closureModalFullMode ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'}`;
            rangeBtn.className = `flex-1 py-2 rounded-lg text-sm font-bold border-2 transition ${!closureModalFullMode ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'}`;
            if (rangeFields) rangeFields.classList.toggle('hidden', closureModalFullMode);
        }

        window.setCloseMode = (isFull) => {
            closureModalFullMode = isFull;
            updateCloseModeUI();
        };

         
        function chatDayLabel(ts) {
            const d = new Date(ts); if (isNaN(d)) return '';
            const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
            const diff = Math.round((day(new Date()) - day(d)) / 864e5);
            if (diff === 0) return 'Today';
            if (diff === 1) return 'Yesterday';
            if (diff > 1 && diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        }
        const chatDayKey = ts => { const d = new Date(ts); return isNaN(d) ? '' : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

        function viewChat() {
            const me = state.currentUser, isAdmin = me.role === 'admin';
            const chatPartnerId = isAdmin ? state.activeChat : (state.admins.length === 1 ? state.admins[0].id : state.activeChat);
            const chatPartner = isAdmin ? state.users.find(u => u.id === chatPartnerId)
                : (state.admins.find(a => a.id === chatPartnerId) ? { committee: state.admins.find(a => a.id === chatPartnerId).name } : null);

             
            if (chatPartner && state.chats.some(c => c.fromId === chatPartnerId && c.toId === me.id && !c.read)) {
                state.chats.forEach(c => { if (c.fromId === chatPartnerId && c.toId === me.id) c.read = true; });
                setTimeout(() => { refreshSidebar(); API.call('markChatRead', { withId: chatPartnerId }, true).catch(() => { }); }, 0);
            }

            let html = `<div class="flex h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">`;
            if (isAdmin || state.admins.length > 1) {
                const comms = isAdmin ? state.users.filter(u => u.status === 'approved') : state.admins.map(a => ({ id: a.id, committee: a.name, incharge: 'Admin' }));
                html += `
                    <div class="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50">
                        <div class="p-4 bg-white border-b font-bold text-slate-800 shrink-0">${isAdmin ? 'Committees' : 'Admins'}</div>
                        <div class="flex-1 overflow-y-auto">
                            ${comms.length === 0 ? `<div class="p-4 text-sm text-slate-500">No users registered.</div>` : ''}
                            ${comms.map(u => {
                                const unread = state.chats.filter(c => c.fromId === u.id && c.toId === me.id && !c.read && !c.deleted).length;
                                return `
                                <div onclick="state.activeChat='${u.id}'; renderApp();" class="p-4 border-b cursor-pointer hover:bg-slate-100 flex justify-between items-center ${state.activeChat === u.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}">
                                    <div>
                                        <div class="font-bold text-sm text-slate-900">${esc(u.committee)}</div>
                                        <div class="text-xs text-slate-500">${esc(u.incharge)}</div>
                                    </div>
                                    ${unread > 0 ? `<span class="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow">${unread}</span>` : ''}
                                </div>`;
                            }).join('')}
                        </div>
                    </div>`;
            }

            if (!chatPartnerId || !chatPartner) {
                html += `<div class="flex-1 flex items-center justify-center text-slate-400 bg-slate-50"><p>Select a conversation to start messaging</p></div>`;
            } else {
                const messages = state.chats.filter(c => (c.fromId === me.id && c.toId === chatPartnerId) || (c.fromId === chatPartnerId && c.toId === me.id))
                    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
                let lastDay = '';
                html += `
                    <div class="flex-1 flex flex-col bg-[#efeae2]">
                        <div class="p-4 bg-white shadow-sm flex items-center gap-3 shrink-0 z-10">
                            <div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600"><i class="fa-solid ${isAdmin ? 'fa-users' : 'fa-user-shield'}"></i></div>
                            <div class="font-bold text-slate-900">${esc(chatPartner.committee)}</div>
                            ${isAdmin ? `<button type="button" onclick="closeChat()" title="Close chat" class="ch-chat-close"><i class="fa-solid fa-xmark"></i></button>` : ''}
                        </div>
                        <div class="flex-1 overflow-y-auto p-4 space-y-3" id="chat-box">
                            <div class="chat-notice"><i class="fa-solid fa-circle-info"></i> Messages in this chat are not end-to-end encrypted.</div>
                            ${messages.map(m => {
                                const isMine = m.fromId === me.id, time = fmtClock(m.timestamp);
                                const key = chatDayKey(m.timestamp);
                                const sep = key !== lastDay ? `<div class="chat-day"><span>${esc(chatDayLabel(m.timestamp))}</span></div>` : '';
                                lastDay = key;
                                if (m.deleted) {
                                    const delAt = m.deletedAt ? new Date(m.deletedAt) : new Date(m.timestamp);
                                    return `${sep}
                                    <div class="flex ${isMine ? 'justify-end' : 'justify-start'}">
                                        <div class="max-w-[75%] min-w-[120px] rounded-xl px-4 py-2 shadow-sm relative ${isMine ? 'bg-[#d9fdd3]' : 'bg-white'} pb-7 border border-slate-100" title="Deleted on ${esc(fmtStamp(delAt))}">
                                            <div class="ch-msg-deleted"><i class="fa-solid fa-ban"></i> ${isMine ? 'You deleted this message' : 'This message was deleted'}</div>
                                            <div class="text-[10px] text-slate-500 absolute bottom-1 right-2 font-bold">${fmtClock(delAt)}</div>
                                        </div>
                                    </div>`;
                                }
                                return `${sep}
                                <div class="flex ${isMine ? 'justify-end' : 'justify-start'}">
                                    <div class="ch-msg max-w-[75%] min-w-[120px] rounded-xl px-4 py-2 text-sm shadow-sm relative ${isMine ? 'bg-[#d9fdd3]' : 'bg-white'} pb-7 border border-slate-100">
                                        ${isMine ? `<button type="button" class="ch-msg-del" title="Delete message" onclick="askDeleteMessage('${m.id}')"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                                        <div class="text-slate-800 break-words font-medium" style="${isMine ? 'padding-right:14px' : ''}">${esc(m.text)}</div>
                                        <div class="text-[10px] text-slate-500 absolute bottom-1 right-2 flex items-center gap-1 font-bold">
                                            ${time}
                                            ${isMine ? `<i class="fa-solid fa-check-double ${m.read ? 'text-blue-500' : 'text-slate-400'}"></i>` : ''}
                                        </div>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                        <form onsubmit="sendMessage(event, '${chatPartnerId}')" class="p-3 bg-[#f0f2f5] flex gap-2 shrink-0 border-t border-slate-200">
                            <input type="text" id="chat-input" required maxlength="1000" placeholder="Type a message" class="flex-1 rounded-full px-5 py-3 outline-none border-none shadow-sm text-sm font-medium" autocomplete="off">
                            <button type="submit" class="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition shadow-md"><i class="fa-solid fa-paper-plane text-lg"></i></button>
                        </form>
                    </div>`;
            }
            html += `</div>`;
            setTimeout(() => { const box = el('chat-box'); if (box) box.scrollTop = box.scrollHeight; }, 0);
            return html;
        }

         
        window.closeChat = () => { state.activeChat = null; renderApp(); };

         
        window.askDeleteMessage = (msgId) => {
            askModal('Delete message?', '<p>This message will be deleted for everyone in this chat.</p>', 'Delete', () => run('deleteChat', { id: msgId }), 'Cancel', true);
        };
