         
         
         
        
        function localDateStr() {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

         
        const bookingCode = b => { const id = String(b.id || ''); return /^CH-/.test(id) ? id : '#EVT-' + id.toUpperCase(); };

        function generateId() {
            return Math.random().toString(36).substr(2, 9);
        }

        function navigate(view) {
            state.view = view;
            state.sidebarOpen = false;  
            if (view === 'chat') state.activeChat = null;  
            if (view === 'calendar') {
                 
                const now = new Date();
                state.calMonth = now.getMonth();
                state.calYear = now.getFullYear();
            }
            renderApp();
        }

        window.toggleSidebar = () => {
            state.sidebarOpen = !state.sidebarOpen;
            renderApp();
        };

         
        function showToast(message, type = 'success') {
            showPopup(message, type);
        }

        function showPopup(message, type = 'info', opts = {}) {
            const existing = document.getElementById('generic-popup');
            if (existing) existing.remove();
            const icons = {
                success: 'fa-circle-check text-emerald-500',
                error: 'fa-circle-exclamation text-red-500',
                info: 'fa-circle-info text-blue-500',
                warning: 'fa-triangle-exclamation text-amber-500'
            };
            const div = document.createElement('div');
            div.id = 'generic-popup';
            div.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in';
            div.innerHTML = `
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 m-4 text-center animate-fade-in">
                    <div class="text-5xl mb-4"><i class="fa-solid ${icons[type] || icons.info}"></i></div>
                    <p class="text-slate-800 font-semibold text-base leading-relaxed">${message}</p>
                    <button id="generic-popup-ok" class="mt-6 w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 text-white rounded-lg font-bold shadow-md transition">OK</button>
                </div>`;
            document.body.appendChild(div);
            document.getElementById('generic-popup-ok').onclick = () => { div.remove(); if (opts.onOk) opts.onOk(); };
        }

         
        function showReasonPopup(title, label, onSubmit) {
            const existing = document.getElementById('reason-popup');
            if (existing) existing.remove();
            const div = document.createElement('div');
            div.id = 'reason-popup';
            div.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in';
            div.innerHTML = `
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4 animate-fade-in">
                    <h3 class="text-lg font-bold text-slate-800 mb-2">${title}</h3>
                    <p class="text-sm text-slate-500 mb-3">${label}</p>
                    <textarea id="reason-popup-input" rows="3" class="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Type reason here..."></textarea>
                    <div class="flex justify-end gap-3 mt-4">
                        <button id="reason-popup-cancel" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold">Cancel</button>
                        <button id="reason-popup-ok" class="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 hover:-translate-y-0.5 text-white rounded-lg font-bold shadow">Submit</button>
                    </div>
                </div>`;
            document.body.appendChild(div);
            document.getElementById('reason-popup-cancel').onclick = () => div.remove();
            document.getElementById('reason-popup-ok').onclick = () => {
                const val = document.getElementById('reason-popup-input').value;
                div.remove();
                onSubmit(val);
            };
        }

        function addLog(action, byName) {
            state.logs.push({
                id: generateId(),
                date: new Date().toISOString(),
                action: action,
                by: byName
            });
        }

        function notifyUser(userId, text) {
            state.notifications.push({
                id: generateId(),
                userId: userId,
                text: text,
                date: new Date().toISOString(),
                read: false
            });
        }


        function timeToMinutes(timeStr) {
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        }

        function isOverlap(venueId, date, newStart, newEnd) {
            const nStart = timeToMinutes(newStart);
            const nEnd = timeToMinutes(newEnd);
            
            return state.bookings.some(b => {
                if (b.venueId === venueId && b.date === date && ['Pending', 'Approved'].includes(b.status)) {
                    const eStart = timeToMinutes(b.start);
                    const eEnd = timeToMinutes(b.end);
                     
                    return Math.max(nStart, eStart) < Math.min(nEnd, eEnd);
                }
                return false;
            });
        }

         
         
         
        let activePicker = null;
        function closeActivePicker() {
            if (activePicker) { activePicker.remove(); activePicker = null; }
            document.removeEventListener('click', closeActivePickerOutside, true);
        }
        function closeActivePickerOutside(e) {
            if (activePicker && !activePicker.contains(e.target) && !e.target.closest('.picker-trigger')) {
                closeActivePicker();
            }
        }

        function formatDateLabel(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr + 'T00:00:00');
            return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        }

        function formatTimeLabel(t) {
            if (!t) return '';
            const [h, m] = t.split(':').map(Number);
            const period = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 === 0 ? 12 : h % 12;
            return `${h12}:${String(m).padStart(2, '0')} ${period}`;
        }

        window.openDatePicker = function(inputId, minDate) {
            closeActivePicker();
            const hidden = document.getElementById(inputId);
            const trigger = document.getElementById(inputId + '-btn');
            if (!hidden || !trigger) return;
            let base = hidden.value ? new Date(hidden.value + 'T00:00:00') : new Date();
            let vy = base.getFullYear(), vm = base.getMonth();
            const minD = minDate ? new Date(minDate + 'T00:00:00') : null;

            const pop = document.createElement('div');
            pop.className = 'fixed z-[200] bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-72 animate-fade-in';
            document.body.appendChild(pop);
            activePicker = pop;

            function positionPop() {
                const r = trigger.getBoundingClientRect();
                let top = r.bottom + 6, left = r.left;
                if (left + 288 > window.innerWidth) left = window.innerWidth - 296;
                pop.style.top = top + 'px';
                pop.style.left = Math.max(8, left) + 'px';
            }

            function draw() {
                const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                const firstDay = new Date(vy, vm, 1).getDay();
                const daysInMonth = new Date(vy, vm + 1, 0).getDate();
                let cells = '';
                for (let i = 0; i < firstDay; i++) cells += `<div></div>`;
                for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${vy}-${String(vm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const cellDate = new Date(vy, vm, d);
                    const disabled = minD && cellDate < minD;
                    const isSel = hidden.value === dateStr;
                    cells += `<button type="button" ${disabled ? 'disabled' : ''} data-date="${dateStr}" class="h-8 w-8 rounded-lg text-xs font-bold flex items-center justify-center transition ${disabled ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-indigo-100 text-slate-700 cursor-pointer'} ${isSel ? '!bg-indigo-600 !text-white' : ''}">${d}</button>`;
                }
                pop.innerHTML = `
                    <div class="flex items-center justify-between mb-3">
                        <button type="button" data-nav="-1" class="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-500"><i class="fa-solid fa-chevron-left text-xs"></i></button>
                        <span class="font-bold text-sm text-slate-800">${monthNames[vm]} ${vy}</span>
                        <button type="button" data-nav="1" class="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-500"><i class="fa-solid fa-chevron-right text-xs"></i></button>
                    </div>
                    <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">${['S','M','T','W','T','F','S'].map(x => `<div>${x}</div>`).join('')}</div>
                    <div class="grid grid-cols-7 gap-1">${cells}</div>
                `;
                pop.querySelector('[data-nav="-1"]').onclick = () => { vm--; if (vm < 0) { vm = 11; vy--; } draw(); };
                pop.querySelector('[data-nav="1"]').onclick = () => { vm++; if (vm > 11) { vm = 0; vy++; } draw(); };
                pop.querySelectorAll('button[data-date]').forEach(btn => {
                    if (!btn.disabled) btn.onclick = () => {
                        hidden.value = btn.getAttribute('data-date');
                        const lbl = document.getElementById(inputId + '-label');
                        if (lbl) { lbl.textContent = formatDateLabel(hidden.value); lbl.classList.remove('text-slate-400'); lbl.classList.add('text-slate-800'); }
                        closeActivePicker();
                        if (hidden.onchange) hidden.onchange();
                    };
                });
            }
            draw();
            positionPop();
            setTimeout(() => document.addEventListener('click', closeActivePickerOutside, true), 0);
        };

        window.openTimePicker = function(inputId, minTime, maxTime) {
            closeActivePicker();
            const hidden = document.getElementById(inputId);
            const trigger = document.getElementById(inputId + '-btn');
            if (!hidden || !trigger) return;

            const startM = minTime ? timeToMinutes(minTime) : 0;
            const endM = maxTime ? timeToMinutes(maxTime) : (23 * 60 + 59);

            let curMin = hidden.value ? timeToMinutes(hidden.value) : startM;
            if (curMin < startM) curMin = startM;
            if (curMin > endM) curMin = endM;
            let hour24 = Math.floor(curMin / 60);
            let minute = Math.round((curMin % 60) / 5) * 5 % 60;
            let period = hour24 >= 12 ? 'PM' : 'AM';
            let hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
            let mode = 'hour';  

            const pop = document.createElement('div');
            pop.className = 'fixed z-[200] bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 w-[300px] animate-pop';
            document.body.appendChild(pop);
            activePicker = pop;

            function to24(h12, per) { let h = h12 % 12; if (per === 'PM') h += 12; return h; }
            function totalMinutes() { return to24(hour12, period) * 60 + minute; }
            function inRange(mins) { return mins >= startM && mins <= endM; }

            function positionPop() {
                const r = trigger.getBoundingClientRect();
                let left = r.left;
                if (left + 300 > window.innerWidth) left = window.innerWidth - 310;
                let top = r.bottom + 6;
                if (top + 420 > window.innerHeight) top = Math.max(8, r.top - 426);
                pop.style.top = top + 'px';
                pop.style.left = Math.max(8, left) + 'px';
            }

            function draw() {
                const R = 92, CX = 120, CY = 120;
                let numbersHtml = '';
                if (mode === 'hour') {
                    for (let n = 1; n <= 12; n++) {
                        const angle = (n % 12) * 30 - 90;
                        const rad = angle * Math.PI / 180;
                        const x = CX + R * Math.cos(rad);
                        const y = CY + R * Math.sin(rad);
                        const hFor = to24(n, period);
                        const disabled = (hFor * 60 + 59) < startM || (hFor * 60) > endM;
                        const isSel = hour12 === n;
                        numbersHtml += `<button type="button" ${disabled ? 'disabled' : ''} data-hour="${n}" style="left:${x - 18}px; top:${y - 18}px;" class="absolute w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${disabled ? 'text-slate-300 cursor-not-allowed' : (isSel ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg scale-110' : 'hover:bg-indigo-100 text-slate-700 cursor-pointer')}">${n}</button>`;
                    }
                } else {
                    for (let i = 0; i < 12; i++) {
                        const m = i * 5;
                        const angle = i * 30 - 90;
                        const rad = angle * Math.PI / 180;
                        const x = CX + R * Math.cos(rad);
                        const y = CY + R * Math.sin(rad);
                        const testMins = to24(hour12, period) * 60 + m;
                        const disabled = !inRange(testMins);
                        const isSel = minute === m;
                        numbersHtml += `<button type="button" ${disabled ? 'disabled' : ''} data-min="${m}" style="left:${x - 18}px; top:${y - 18}px;" class="absolute w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${disabled ? 'text-slate-300 cursor-not-allowed' : (isSel ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg scale-110' : 'hover:bg-indigo-100 text-slate-700 cursor-pointer')}">${String(m).padStart(2, '0')}</button>`;
                    }
                }

                let handAngle = (mode === 'hour') ? ((hour12 % 12) * 30 - 90) : ((minute / 5) * 30 - 90);
                const handRad = handAngle * Math.PI / 180;
                const handLen = R - 22;

                pop.innerHTML = `
                    <div class="flex items-center justify-center gap-1 mb-4">
                        <button type="button" data-seg="hour" class="text-3xl font-black px-2 py-1 rounded-lg transition ${mode === 'hour' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-800 hover:bg-slate-100'}">${String(hour12).padStart(2, '0')}</button>
                        <span class="text-3xl font-black text-slate-300">:</span>
                        <button type="button" data-seg="minute" class="text-3xl font-black px-2 py-1 rounded-lg transition ${mode === 'minute' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-800 hover:bg-slate-100'}">${String(minute).padStart(2, '0')}</button>
                        <div class="flex flex-col ml-2 gap-1">
                            <button type="button" data-period="AM" class="px-2 py-0.5 rounded text-xs font-bold border transition ${period === 'AM' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow' : 'border-slate-200 text-slate-500 hover:border-indigo-300'}">AM</button>
                            <button type="button" data-period="PM" class="px-2 py-0.5 rounded text-xs font-bold border transition ${period === 'PM' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow' : 'border-slate-200 text-slate-500 hover:border-indigo-300'}">PM</button>
                        </div>
                    </div>
                    <div class="relative mx-auto bg-gradient-to-br from-slate-50 to-indigo-50 rounded-full border border-slate-200 shadow-inner" style="width:240px;height:240px;">
                        <div class="absolute bg-gradient-to-br from-indigo-600 to-violet-600 rounded-full" style="width:8px;height:8px;left:116px;top:116px;z-index:2;"></div>
                        <div class="absolute bg-gradient-to-r from-indigo-500 to-violet-500 origin-left rounded-full" style="height:3px; width:${handLen}px; left:120px; top:120px; transform: rotate(${handAngle}deg);"></div>
                        ${numbersHtml}
                    </div>
                    <p class="text-xs text-slate-400 text-center mt-3">Tap an hour, then a minute. Available ${formatTimeLabel(minTime || '00:00')} – ${formatTimeLabel(maxTime || '23:59')}</p>
                    <div class="flex justify-end gap-2 mt-3">
                        <button type="button" data-action="cancel" class="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100 transition">Cancel</button>
                        <button type="button" data-action="ok" class="px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 transition-all duration-300 shadow">OK</button>
                    </div>
                `;

                pop.querySelectorAll('button[data-hour]').forEach(btn => {
                    if (!btn.disabled) btn.onclick = () => { hour12 = parseInt(btn.getAttribute('data-hour')); mode = 'minute'; draw(); };
                });
                pop.querySelectorAll('button[data-min]').forEach(btn => {
                    if (!btn.disabled) btn.onclick = () => { minute = parseInt(btn.getAttribute('data-min')); draw(); };
                });
                pop.querySelectorAll('button[data-seg]').forEach(btn => {
                    btn.onclick = () => { mode = btn.getAttribute('data-seg'); draw(); };
                });
                pop.querySelectorAll('button[data-period]').forEach(btn => {
                    btn.onclick = () => { period = btn.getAttribute('data-period'); draw(); };
                });
                pop.querySelector('[data-action="cancel"]').onclick = () => closeActivePicker();
                pop.querySelector('[data-action="ok"]').onclick = () => {
                    const mins = totalMinutes();
                    if (!inRange(mins)) {
                        showToast(`Please choose a time between ${formatTimeLabel(minTime || '00:00')} and ${formatTimeLabel(maxTime || '23:59')}.`, 'error');
                        return;
                    }
                    const hh = String(to24(hour12, period)).padStart(2, '0');
                    const mm = String(minute).padStart(2, '0');
                    hidden.value = `${hh}:${mm}`;
                    const lbl = document.getElementById(inputId + '-label');
                    if (lbl) { lbl.textContent = formatTimeLabel(hidden.value); lbl.classList.remove('text-slate-400'); lbl.classList.add('text-slate-800'); }
                    closeActivePicker();
                    if (hidden.onchange) hidden.onchange();
                };
            }
            draw();
            positionPop();
            setTimeout(() => document.addEventListener('click', closeActivePickerOutside, true), 0);
        };

        function isClosed(venueId, date, start, end) {
            return state.closures.some(c => {
                if (c.venueId !== venueId || c.date !== date) return false;
                if (c.fullDay) return true;
                const ns = timeToMinutes(start), ne = timeToMinutes(end);
                return (c.ranges || []).some(r => Math.max(ns, timeToMinutes(r.start)) < Math.min(ne, timeToMinutes(r.end)));
            });
        }

        function getClosureInfo(venueId, date) {
            return state.closures.find(c => c.venueId === venueId && c.date === date);
        }

         
         
         

         
        const bookedByAdmin = b => b.bookedByRole ? b.bookedByRole === 'admin' : !b.userId;
        const organizerName = b => b.bookedByName || (state.users.find(u => u.id === b.userId) || {}).committee || b.by || 'Admin';
           const adminTag = b => (b.adminName || 'Admin') + ' (Admin)';
         
        const bookedByText = b => bookedByAdmin(b) ? adminTag(b) : organizerName(b);

        const REASON_TITLE = {
            USER_CANCELLED: 'Cancelled by the organizer', ADMIN_CANCELLED: 'Cancelled by an admin', ADMIN_REJECTED: 'Rejected by an admin',
            ACCOUNT_BLOCKED: 'Account blocked', ACCOUNT_DELETED: 'Account deleted', VENUE_CLOSED: 'Venue closed',
            VENUE_REMOVED: 'Venue removed', VENUE_TIMING: 'Venue timing changed'
        };
         
        function reasonBox(b) {
            if (!b.rejectReason || !['Rejected', 'Cancelled'].includes(b.status)) return '';
            return `<div class="reason-box"><b>${esc(REASON_TITLE[b.reasonCode] || b.status)}</b>${esc(b.rejectReason)}</div>`;
        }

         
        function resourcePicker(venue) {
            if (!venue || !venue.resources || !venue.resources.length) return '<div class="rp-empty">No special resources listed for this venue.</div>';
            return `<div class="rp-grid">` + venue.resources.map(r => `
                <div class="rp-card" data-name="${esc(r.name)}">
                    <label class="rp-head">
                        <input type="checkbox" class="rp-cb">
                        <span class="rp-name">${esc(r.name)}</span>
                        <span class="rp-avail">${esc(r.qty)} available</span>
                    </label>
                    <div class="rp-qty">
                        <span class="rp-qlabel">Quantity needed</span>
                        <span class="rp-step"><button type="button" data-d="-1" aria-label="Less">&minus;</button><input type="number" class="rp-n" min="1" max="${esc(r.qty)}" value="1" inputmode="numeric"><button type="button" data-d="1" aria-label="More">+</button></span>
                    </div>
                </div>`).join('') + `</div>`;
        }
         
        const pickedResources = listId => [...document.querySelectorAll(`#${listId} .rp-card.rp-on`)].map(c => ({ name: c.dataset.name, qty: +c.querySelector('.rp-n').value }));
        document.addEventListener('change', e => {
            if (e.target.classList && e.target.classList.contains('rp-cb')) e.target.closest('.rp-card').classList.toggle('rp-on', e.target.checked);
            if (e.target.classList && e.target.classList.contains('rp-n')) clampQty(e.target);
        });
        document.addEventListener('click', e => {
            const btn = e.target.closest('.rp-step button'); if (!btn) return;
            const inp = btn.parentElement.querySelector('.rp-n');
            inp.value = (+inp.value || 1) + (+btn.dataset.d); clampQty(inp);
        });
        function clampQty(inp) {
            const max = +inp.max || 1; let v = parseInt(inp.value, 10);
            if (!(v >= 1)) v = 1; if (v > max) v = max;
            inp.value = v;
        }

         
        function refreshSidebar() {
            const w = document.getElementById('sidebar-wrap');
            if (w && state.currentUser) w.innerHTML = renderSidebar();
        }
        const unreadChatCount = () => state.currentUser ? state.chats.filter(c => c.toId === state.currentUser.id && !c.read && !c.deleted).length : 0;
        const unreadNotifCount = () => state.currentUser ? state.notifications.filter(n => n.userId === state.currentUser.id && !n.read).length : 0;
