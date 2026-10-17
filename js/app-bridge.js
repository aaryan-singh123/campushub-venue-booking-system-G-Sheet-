 
 
 
 
const AUTH_VIEWS = ['login', 'signup', 'signup_success', 'admin_login', 'admin_signup', 'admin_signup_success'];
let pollTimer = null, lastSig = '';

const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = id => document.getElementById(id);
const val = id => (el(id) ? el(id).value : '');

 
function showFatal(msg) {
    el('app').innerHTML = `<div class="m-auto text-center p-8 max-w-md"><h2 class="text-xl font-bold text-slate-900 mb-2">We could not open the app</h2>
        <p class="text-slate-600 mb-4">${escHtml(msg)}</p>
        <button onclick="location.reload()" class="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold">Try again</button></div>`;
}
window.addEventListener('error', ev => {
    console.error('[CampusHub]', ev.message, ev.filename, ev.lineno);
    if (!el('app').children.length) showFatal('The application could not be loaded. Please refresh the page.');
});
window.addEventListener('unhandledrejection', ev => console.error('[CampusHub]', ev.reason));

function handleErr(e) {
    console.error('[CampusHub]', e.code || '', e.message);
    if (e.code === 'SESSION') { stopPolling(); API.setToken(''); state.currentUser = null; state.view = 'login'; renderApp(); }
    showPopup(e.message, e.code === 'PENDING' ? 'warning' : 'error');
}

 
function askModal(title, body, yes, onYes, no, danger) {
    const m = document.createElement('div');
    m.className = 'ch-modal-bg';
    m.innerHTML = `<div class="ch-modal"><h3>${escHtml(title)}</h3><div class="ch-body">${body}</div>
        <div class="ch-actions">${no === false ? '' : `<button data-no>${no || 'No'}</button>`}${yes ? `<button data-yes class="${danger ? 'ch-danger' : ''}">${yes}</button>` : ''}</div></div>`;
    document.body.appendChild(m);
    const n = m.querySelector('[data-no]'); if (n) n.onclick = () => m.remove();
    const y = m.querySelector('[data-yes]');
    if (y) y.onclick = () => { const r = onYes ? onYes(m) : null; if (r !== false) m.remove(); };
}
const byEventAsc = (a, b) => (a.date + a.start).localeCompare(b.date + b.start);
const byCreatedDesc = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
const slot = b => `${escHtml(b.title)} - ${formatDateLabel(b.date)}, ${formatTimeLabel(b.start)} to ${formatTimeLabel(b.end)} (${escHtml(b.by)}, ${escHtml(b.status)})`;
const bullets = (a, none) => a.length ? `<ul class="list-disc pl-5">${a.map(b => `<li>${slot(b)}</li>`).join('')}</ul>` : `<p class="text-slate-400">${none}</p>`;

 
function applySettings(s) {
    if (s.refreshSeconds) APP_CONFIG.REFRESH_SECONDS = s.refreshSeconds;
    CATEGORIES = s.categories || [];
    COMMITTEE_TYPES = s.committeeTypes || [];
    document.title = ASSETS.appName + ' - ' + ASSETS.tagline;
}
let lastUnread = null;
async function loadData(quiet) {
    const d = await API.call('bootstrap', {}, quiet);
    const { serverNow, ...rest } = d, sig = JSON.stringify(rest), changed = sig !== lastSig;
    lastSig = sig;
    applySettings(d.settings);
    state.settings = d.settings;
    state.venues = d.venues.map(v => ({ ...v, capacity: +v.capacity }));
    state.closures = d.closures;
    state.bookings = d.bookings.map(b => ({
        ...b, rejectReason: b.reason, attendees: +b.attendees || 0,
        resources: (b.resources || []).map(r => r.name ? `${r.name} x${r.qty}` : r)
    }));
    state.deletedAccounts = d.deletedAccounts || [];
    state.users = d.users.map(u => ({ ...u, role: 'user' }));
    state.admins = d.admins;
    state.notifications = d.notifications;
    state.chats = d.chats;
    state.logs = d.logs;
    const me = d.me.id, unread = d.chats.filter(c => c.toId === me && !c.read && !c.deleted);
    if (quiet && lastUnread !== null && unread.length > lastUnread) {
        const m = unread[unread.length - 1], p = d.role === 'admin' ? d.users.find(u => u.id === m.fromId) : d.admins.find(a => a.id === m.fromId);
        showToast('New message from ' + escHtml(p ? (p.committee || p.name) : 'a user') + '.', 'info');
    }
    lastUnread = unread.length;
    state.currentUser = d.role === 'admin' ? { id: d.me.id, committee: d.me.name, role: 'admin', isSuper: !!d.me.isSuper } : { ...d.me, role: 'user' };
    if (AUTH_VIEWS.includes(state.view)) state.view = d.role === 'admin' ? 'admin_dash' : 'user_dash';
    return changed;
}
async function syncFromServer() { await loadData(); renderApp(); }

const isTyping = () => /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '') || !!document.querySelector('.fixed.inset-0:not(.hidden)');
function stopPolling() { if (pollTimer) clearInterval(pollTimer); pollTimer = null; }
function startPolling() {
    stopPolling();
    pollTimer = setInterval(async () => {
        if (document.hidden || !state.currentUser) return;
        try { if (await loadData(true) && !isTyping()) renderApp(); } catch (e) { if (e.code === 'SESSION') handleErr(e); }
    }, (APP_CONFIG.REFRESH_SECONDS || 30) * 1000);
}

 
async function run(action, data, okMsg, after) {
    try {
        const r = await API.call(action, data);
        if (r && r.needConfirm) {
            askModal('Confirm action', `<p>${escHtml(r.message)}</p>${bullets(r.affected, '')}`, 'Continue', () => run(action, { ...data, confirm: true }, okMsg, after), 'Go back');
            return null;
        }
        if (okMsg) showToast(okMsg);
        await syncFromServer();
        if (after) after(r);
        return r || true;
    } catch (e) { handleErr(e); return null; }
}

 
async function init() {
    el('app').innerHTML = '<div class="m-auto text-slate-500 font-semibold">Loading...</div>';
    try {
        if (API.token) { try { await loadData(); renderApp(); startPolling(); return; } catch (e) { API.setToken(''); } }
        applySettings((await API.call('publicInfo')).settings);
        navigate('login');
    } catch (e) { showFatal(e.message); }
}

 
async function signIn(action, payload, view) {
    try { const r = await API.call(action, payload); API.setToken(r.token); state.view = view; await syncFromServer(); startPolling(); showToast('Signed in successfully.'); }
    catch (e) { handleErr(e); }
}
function doLogin(e) { e.preventDefault(); signIn('login', { committee: val('log-id'), password: val('log-pass') }, 'user_dash'); }
function doAdminLogin(e) { e.preventDefault(); signIn('adminLogin', { username: val('adm-log-id'), password: val('adm-log-pass') }, 'admin_dash'); }
async function doSignup(e) {
    e.preventDefault();
    if (val('reg-pass').length < 6) return showPopup('Password must be at least 6 characters long.', 'warning');
    if (val('reg-pass') !== val('reg-confirm')) return showPopup('Passwords do not match.', 'warning');
    try { await API.call('signup', { committee: val('reg-comm'), type: val('reg-type'), incharge: val('reg-incharge'), phone: val('reg-phone'), password: val('reg-pass') }); navigate('signup_success'); }
    catch (err) { handleErr(err); }
}
async function doAdminSignup(e) {
    e.preventDefault();
    if (val('adm-reg-pass').length < 6) return showPopup('Password must be at least 6 characters long.', 'warning');
    if (val('adm-reg-pass') !== val('adm-reg-confirm')) return showPopup('Passwords do not match.', 'warning');
    try {
        const r = await API.call('adminSignup', { name: val('adm-reg-name'), phone: val('adm-reg-phone'), username: val('adm-reg-username'), password: val('adm-reg-pass') });
        if (r.first) { showPopup('Main admin account created. Please sign in.', 'success'); navigate('admin_login'); } else navigate('admin_signup_success');
    }
    catch (err) { handleErr(err); }
}
async function doLogout() {
    try { await API.call('logout'); } catch (e) {   }
    stopPolling(); API.setToken(''); lastSig = ''; state.currentUser = null; navigate('login');
}
window.decideAdminRequest = (id, approve) => run('decideAdmin', { id, approve }, approve ? 'New admin approved.' : 'Request rejected.');

 
const toB64 = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => no(new Error('Could not read the image. Please try another one.')); r.readAsDataURL(f); });
const overCap = (vid, n) => { const v = state.venues.find(x => x.id === vid); return v && +n > v.capacity ? `This venue can hold up to ${v.capacity} people. Please enter ${v.capacity} or fewer attendees.` : ''; };
window.submitBooking = async e => {
    e.preventDefault();
    if (!val('b-date') || !val('b-start') || !val('b-end')) return showPopup('Please select a date, start time and end time.', 'warning');
    if (overCap(val('b-venueId'), val('b-att'))) return showPopup(overCap(val('b-venueId'), val('b-att')), 'warning');
    const r = await run('createBooking', { venueId: val('b-venueId'), title: val('b-title'), category: val('b-cat'), desc: val('b-desc'), date: val('b-date'),
        start: val('b-start'), end: val('b-end'), attendees: val('b-att'), resources: pickedResources('b-res-list') }, 'Booking request submitted. You will be notified once it is reviewed.');
    if (r) navigate('my_bookings');
};
window.submitAdminBooking = async e => {
    e.preventDefault();
    const forVal = val('ab-for'), external = forVal === '__external';
    if (!forVal) return showPopup('Select a committee, or choose External.', 'warning');
    if (!val('ab-date') || !val('ab-start') || !val('ab-end')) return showPopup('Please select a date, start time and end time.', 'warning');
    if (overCap(val('ab-venueId'), val('ab-att'))) return showPopup(overCap(val('ab-venueId'), val('ab-att')), 'warning');
    const data = { venueId: val('ab-venueId'), forType: external ? 'external' : 'committee', forUserId: external ? '' : forVal, bookedByName: external ? val('ab-bookedby').trim() : '', phone: external ? val('ab-phone').trim() : '',
        title: val('ab-title'), category: val('ab-cat'), desc: val('ab-desc'), date: val('ab-date'), start: val('ab-start'), end: val('ab-end'), attendees: val('ab-att'), resources: pickedResources('ab-res-list') };
    await run('createBooking', data, null, res => {
        const m = el('admin-book-modal'); if (m) m.classList.add('hidden');
        if (res && res.booking) askPrintAdminSlip(res.booking.id);
    });
};
window.handleBooking = async (id, status, reason = '') => {
    if (status === 'Rejected') return run('decideBooking', { id, status, reason }, 'Booking request rejected. The committee has been notified.');
    try {
        const p = await API.call('previewDecision', { id });
        if (!p.venue) return showPopup('This venue was removed, so the booking cannot be approved.', 'error');
        const closed = p.closures.length ? `<ul class="list-disc pl-5">${p.closures.map(c => `<li>${c.fullDay ? 'Closed the whole day' : 'Closed ' + c.ranges.map(r => formatTimeLabel(r.start) + ' to ' + formatTimeLabel(r.end)).join(', ')}</li>`).join('')}</ul>` : '<p class="text-slate-400">Not closed on this day.</p>';
        askModal('Approve this booking?', `<p><b>Venue:</b> ${escHtml(p.venue.name)} (open ${formatTimeLabel(p.venue.openTime)} to ${formatTimeLabel(p.venue.closeTime)})</p>
            <p><b>Request:</b> ${slot(p.booking)}</p>
            <p class="font-semibold">Closures on this date</p>${closed}
            <p class="font-semibold">Clashing bookings</p>${bullets(p.clashes, 'No clash.')}
            <p class="font-semibold">Other bookings at this venue on this date</p>${bullets(p.sameDay, 'None.')}`,
            'Approve', () => run('decideBooking', { id, status: 'Approved' }, 'Booking approved. The committee has been notified.'), 'Close');
    } catch (e) { handleErr(e); }
};
window.cancelBooking = id => {
    if (state.currentUser.role === 'admin') return showReasonPopup('Cancel Booking', 'Please tell the committee why this booking is cancelled:', r => run('cancelBooking', { id, reason: r }, 'Booking cancelled. The committee has been notified.'));
    askModal('Cancel booking', '<p>Are you sure you want to cancel this booking? This action cannot be undone.</p>', 'Cancel booking', () => run('cancelBooking', { id }, 'Booking cancelled.'), 'Keep booking', true);
};

 
window.saveVenue = async e => {
    e.preventDefault();
    const data = { id: editingVenueId || undefined, name: val('venue-name'), capacity: val('venue-cap'), location: val('venue-loc'), openTime: val('venue-open'), closeTime: val('venue-close'), resources: tempResources };
    try {
        const f = el('venue-photo-file').files[0];
        if (f) data.photo = (await API.call('uploadImage', { mime: f.type, data: await toB64(f) })).url;
    } catch (err) { return handleErr(err); }
    run('saveVenue', data, 'Venue saved.', () => closeVenueModal());
};
window.deleteVenue = id => askModal('Remove venue', '<p>This venue will be removed for all users. Committees with upcoming bookings here will be notified.</p>', 'Remove venue', () => run('deleteVenue', { id }, 'Venue removed.'), 'No');
window.saveClosure = dateStr => run('saveClosure', { venueId: state.calVenueId, date: dateStr, fullDay: closureModalFullMode, ranges: tempClosureRanges }, 'Closure saved.',
    () => { el('closure-modal')?.remove(); el('cal-day-modal')?.classList.add('hidden'); });
window.removeClosure = dateStr => run('removeClosure', { venueId: state.calVenueId, date: dateStr }, 'Closure removed.', () => { el('closure-modal')?.remove(); el('cal-day-modal')?.classList.add('hidden'); });

 
window.approveUser = (id, ok) => run('setUserStatus', { id, status: ok ? 'approved' : 'rejected' }, ok ? 'Account approved.' : 'Account rejected.');
window.toggleBlock = id => {
    const u = state.users.find(x => x.id === id); if (!u) return;
    if (u.status === 'blocked') return run('setUserStatus', { id, status: 'approved' }, 'Account unblocked.');
    askModal('Block committee', `<p>${escHtml(u.committee)} will be signed out and all upcoming bookings will be cancelled.</p>`, 'Block', () => run('setUserStatus', { id, status: 'blocked' }, 'Account blocked.'), 'No');
};

 
window.saveProfile = () => run('saveProfile', { incharge: val('prof-in'), phone: val('prof-ph'), password: val('prof-pwd') }, 'Profile updated.');
window.sendMessage = async (e, toId) => {
    e.preventDefault();
    const t = val('chat-input').trim(); if (!t) return;
    el('chat-input').value = '';
    await run('sendChat', { toId, text: t });
};
window.saveAdminProfile = () => run('saveProfile', { name: val('ma-name'), phone: val('ma-phone'), password: val('ma-pass') }, 'Your account was updated.');

 
window.factoryReset = () => {
    if (!state.currentUser.isSuper) return showPopup('Only the main admin can reset the system.', 'warning');
    askModal('Reset the entire system?', `<p>This will permanently delete <b>all</b> venues, bookings, committees, admins, messages, notifications, logs and uploaded images. The system will be as new.</p><p class="font-semibold text-red-600">This action cannot be undone.</p>`,
        'Continue', () => {
            setTimeout(() => askModal('Final confirmation', `<p>Type <b>RESET</b> and enter your admin password to confirm.</p>
                <input id="fr-phrase" placeholder="Type RESET" autocomplete="off"><input id="fr-pass" type="password" placeholder="Your password" autocomplete="current-password">
                <p id="fr-err" class="ch-err"></p>`, 'Erase everything', m => {
                const phrase = m.querySelector('#fr-phrase').value.trim(), password = m.querySelector('#fr-pass').value;
                if (phrase !== 'RESET') { m.querySelector('#fr-err').textContent = 'Type RESET exactly as shown.'; return false; }
                if (!password) { m.querySelector('#fr-err').textContent = 'Enter your password.'; return false; }
                API.call('factoryReset', { phrase, password }).then(() => {
                    stopPolling(); API.setToken(''); lastSig = ''; lastUnread = null; state.currentUser = null; navigate('login');
                    showPopup('All data has been erased. Register the main admin from the Admin Register page to start again.', 'success');
                }).catch(handleErr);
            }, 'Cancel', true), 0);
        }, 'Cancel', true);
};

 
window.openForgot = () => askModal('Forgot password', `<p>Enter your details. The admin will verify them and reset your password.</p>
    <input id="fp-c" placeholder="Committee name" autocomplete="off"><input id="fp-i" placeholder="In-charge name" autocomplete="off">
    <input id="fp-p" type="tel" inputmode="numeric" maxlength="10" placeholder="In-charge contact number" autocomplete="off"><p id="fp-err" class="ch-err"></p>`, 'Submit', m => {
    const d = { committee: m.querySelector('#fp-c').value.trim(), incharge: m.querySelector('#fp-i').value.trim(), phone: m.querySelector('#fp-p').value.trim() };
    const err = m.querySelector('#fp-err');
    if (!d.committee || !d.incharge || !d.phone) { err.textContent = 'Fill in all the fields.'; return false; }
    API.call('forgotPassword', d).then(() => { m.remove(); askModal('Request submitted', '<p>Please meet the admin to complete your password reset.</p>', 'OK', null, false); })
        .catch(e => {
        if (e.code === 'NO_MATCH') askModal('Details do not match', '<p>The details you entered do not match any account. Please check the committee name, in-charge name and contact number and try again.</p>', 'OK', null, false);
        else err.textContent = e.message;
    });
    return false;
}, 'Cancel');

 
window.openResetPw = userId => askModal('Change password', `<p>Enter a new password for this committee.</p>
    <input id="rp-n" type="password" placeholder="New password" autocomplete="new-password"><input id="rp-c" type="password" placeholder="Confirm password" autocomplete="new-password"><p id="rp-err" class="ch-err"></p>`, 'Save', m => {
    const n = m.querySelector('#rp-n').value, c = m.querySelector('#rp-c').value, err = m.querySelector('#rp-err');
    if (n.length < 6) { err.textContent = 'Password must be at least 6 characters long.'; return false; }
    if (n !== c) { err.textContent = 'Passwords do not match.'; return false; }
    API.call('resetUserPassword', { id: userId, password: n }).then(() => { m.remove(); showToast('Password updated.'); syncFromServer(); })
        .catch(e => { err.textContent = e.message; });
    return false;
}, 'Cancel');
window.ignoreResetRequest = id => run('ignoreNotification', { id }, 'Request ignored.');

 
const LISTS = { categories: 'Event categories', committeeTypes: 'Committee types' };
window.addListItem = key => {
    const v = val('st-new-' + key).trim(); if (!v) return showPopup('Enter a name first.', 'warning');
    run('saveSettings', { [key]: [...state.settings[key], v] }, 'Saved.');
};
window.editListItem = (key, i) => {
    askModal('Edit item', `<input id="st-edit" value="${escHtml(state.settings[key][i])}" autocomplete="off"><p id="st-err" class="ch-err"></p>`, 'Save', m => {
        const v = m.querySelector('#st-edit').value.trim(); if (!v) { m.querySelector('#st-err').textContent = 'Enter a name.'; return false; }
        const list = state.settings[key].slice(); list[i] = v; run('saveSettings', { [key]: list }, 'Saved.');
    }, 'Cancel');
};
window.removeListItem = (key, i) => {
    const name = state.settings[key][i];
    askModal('Remove item', `<p>Remove <b>${escHtml(name)}</b> from the list? Existing records keep their current value.</p>`, 'Remove',
        () => run('saveSettings', { [key]: state.settings[key].filter((_, x) => x !== i) }, 'Removed.'), 'Cancel', true);
};
window.createCommittee = async e => {
    e.preventDefault();
    if (val('nc-pass').length < 6) return showPopup('Password must be at least 6 characters long.', 'warning');
    const ok = await run('createUser', { committee: val('nc-name'), type: val('nc-type'), incharge: val('nc-inc'), phone: val('nc-phone'), password: val('nc-pass') }, 'Committee account created.');
    if (ok) e.target.reset();
};

 
 
function afterAccountDeleted() {
    stopPolling(); API.setToken(''); lastSig = ''; lastUnread = null; state.currentUser = null; state.activeChat = null;
    navigate('login');
    showPopup('Your account has been deleted. Thank you for using CampusHub.', 'success');
}
window.startDeleteAccount = () => {
    const admin = state.currentUser.role === 'admin';
    askModal('Delete my account (step 1 of 2)',
        `<p>${admin ? 'Your admin account will be deleted. Bookings you made stay in the records with your name.' : 'Your account will be deleted and your upcoming events that are not completed will be cancelled automatically.'}</p>
         <p><b>Enter your password to continue.</b></p>
         <input id="da-pass" type="password" class="ch-input" placeholder="Your password" autocomplete="current-password">
         <p id="da-err" class="ch-err"></p>`,
        'Continue', m => {
            const err = m.querySelector('#da-err'), password = m.querySelector('#da-pass').value;
            if (!password) { err.textContent = 'Enter your password.'; return false; }
            API.call('requestDeleteAccount', { password }, true).then(r => { m.remove(); deleteStep2(r); }).catch(e => { err.textContent = e.message; });
            return false;
        }, 'Cancel', true);
};
function deleteStep2(r) {
    askModal('Confirm deletion (step 2 of 2)',
        `<p>Your confirmation code (valid for 5 minutes):</p><span class="code-box">${escHtml(r.code)}</span>
         ${r.affected ? `<p style="color:#b91c1c"><b>${r.affected}</b> upcoming booking(s) will be cancelled (reason: account deleted).</p>` : ''}
         <p>Type the code above and the word <b>DELETE</b> to delete your account <b>permanently</b>.</p>
         <input id="da-code" class="ch-input" inputmode="numeric" maxlength="6" placeholder="6-digit code" autocomplete="off">
         <input id="da-word" class="ch-input" placeholder="Type DELETE" autocomplete="off">
         <p id="da-err" class="ch-err"></p>`,
        'Delete my account permanently', m => {
            const err = m.querySelector('#da-err');
            API.call('deleteAccount', { code: m.querySelector('#da-code').value, phrase: m.querySelector('#da-word').value }, true)
                .then(() => { m.remove(); afterAccountDeleted(); }).catch(e => { err.textContent = e.message; if (e.code === 'EXPIRED') setTimeout(() => m.remove(), 1500); });
            return false;
        }, 'Cancel', true);
}

 
window.downloadBackup = async () => {
    try {
        showToast('Preparing the backup...', 'info');
        const data = await API.call('exportBackup');
        const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `campushub_full_backup_${localDateStr()}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        showToast('Backup downloaded. Keep this file private.');
    } catch (e) { handleErr(e); }
};
window.startRestore = () => {
    askModal('Restore from backup',
        `<p style="color:#b91c1c"><b>This replaces ALL current data</b> (venues, committees, admins, bookings, messages, settings) with the data in the backup file. Everyone will be signed out.</p>
         <p style="color:#b91c1c;font-weight:700;font-size:13px"><i class="fa-solid fa-file-code" style="margin-right:6px"></i>Only JSON (.json) file is allowed.</p>
         <input id="rs-file" type="file" accept=".json,application/json" class="ch-input">
         <input id="rs-pass" type="password" class="ch-input" placeholder="Your password" autocomplete="current-password">
         <input id="rs-word" class="ch-input" placeholder="Type RESTORE" autocomplete="off">
         <p id="rs-err" class="ch-err"></p>`,
        'Restore now', m => {
            const err = m.querySelector('#rs-err'), f = m.querySelector('#rs-file').files[0];
            if (!f) { err.textContent = 'Select the backup (.json) file.'; return false; }
            if (!/\.json$/i.test(f.name)) { err.textContent = 'Only a JSON (.json) file is allowed.'; return false; }
            err.textContent = 'Restoring... please wait.';
            f.text().then(t => {
                let backup; try { backup = JSON.parse(t); } catch (x) { throw new Error('This file is not a valid backup.'); }
                return API.call('restoreBackup', { backup, password: m.querySelector('#rs-pass').value, phrase: m.querySelector('#rs-word').value }, true);
            }).then(() => { m.remove(); stopPolling(); API.setToken(''); lastSig = ''; state.currentUser = null; navigate('login'); showPopup('Backup restored. Please sign in again.', 'success'); })
              .catch(e => { err.textContent = e.message; });
            return false;
        }, 'Cancel', true);
};
