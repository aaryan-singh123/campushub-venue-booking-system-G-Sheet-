 
 
 
 
 
 

 
const timeRange = b => `${formatTimeLabel(b.start)} - ${formatTimeLabel(b.end)}`;
 
const fmtClock = d => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
const fmtStamp = d => { if (!d) return '-'; const x = new Date(d); return isNaN(x) ? '-' : `${pdfDate(x)}, ${fmtClock(x)}`; };
const durationText = b => {
    const m = timeToMinutes(b.end) - timeToMinutes(b.start); if (!(m > 0)) return '-';
    const h = Math.floor(m / 60), r = m % 60;
    return (h ? h + (h === 1 ? ' hour' : ' hours') : '') + (h && r ? ' ' : '') + (r ? r + ' min' : '');
};

 
 
 
const VT_PALETTES = [['#4338ca', '#7c3aed'], ['#0f766e', '#10b981'], ['#be123c', '#f97316'], ['#0369a1', '#3b82f6'],
    ['#b45309', '#ef4444'], ['#a21caf', '#6366f1'], ['#1e293b', '#4f46e5'], ['#0e7490', '#14b8a6']];
function venueThumb(name) {
    const t = String(name || 'Venue').trim() || 'Venue';
    let h = 0; for (const ch of t.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;    
    const pal = VT_PALETTES[h % VT_PALETTES.length], n = t.length;
    const size = n <= 12 ? 26 : n <= 20 ? 22 : n <= 32 ? 18 : n <= 48 ? 15 : 13;
    return `<div class="vthumb" style="--a:${pal[0]};--b:${pal[1]};--s:${size}px" role="img" aria-label="${esc(t)}"><span class="vt-c1"></span><span class="vt-c2"></span>
        <div class="vt-in"><span class="vt-ic"><i class="fa-solid fa-building"></i></span><div class="vt-name">${esc(t)}</div><span class="vt-line"></span></div></div>`;
}
window.venueImgFail = img => {
    const box = img.parentElement;
    if (box && img.dataset.vname) { box.innerHTML = venueThumb(img.dataset.vname); return; }    
    if (box) box.innerHTML = '<div class="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs"><i class="fa-regular fa-image text-3xl mb-1"></i>Photo not available</div>';
};

 
const STATUS_PILL = {
    Pending: 'bg-amber-100 text-amber-800', Approved: 'bg-emerald-100 text-emerald-800', Rejected: 'bg-red-100 text-red-800',
    Completed: 'bg-slate-200 text-slate-700', Cancelled: 'bg-slate-800 text-white'
};
const bkRow = (k, v) => `<div class="bk-row"><div class="bk-k">${k}</div><div class="bk-v">${v}</div></div>`;
const bkSection = (icon, title, body) => `<div class="bk-sec"><div class="bk-sec-h"><i class="fa-solid ${icon}"></i>${title}</div><div class="bk-sec-b">${body}</div></div>`;
const chips = (list, none) => list.length ? `<div class="bk-chips">${list.map(r => `<span class="bk-chip"><i class="fa-solid fa-circle-check"></i> ${esc(r)}</span>`).join('')}</div>` : `<span class="text-slate-400">${none}</span>`;
const goneTag = id => (state.deletedAccounts || []).some(d => d.id === id) ? '<span class="bk-gone">account deleted</span>' : '';

window.openBookingDetails = id => {
    const b = state.bookings.find(x => x.id === id); if (!b) return;
    const me = state.currentUser, admin = me.role === 'admin';
    const venue = state.venues.find(v => v.id === b.venueId);
    const user = state.users.find(u => u.id === b.userId);
    const byAdmin = bookedByAdmin(b), who = adminTag(b);

     
    const vName = venue ? venue.name : (b.venueName || 'Unknown venue'), vLoc = venue ? venue.location : b.venueLocation;
    const vRes = venue ? (venue.resources || []).map(r => `${r.name} x${r.qty}`) : [];
    const venueHtml = (venue && venue.photo ? `<div style="height:130px"><img class="bk-photo" src="${esc(venue.photo)}" alt="" onerror="venueImgFail(this)"></div>` : '')
        + bkRow('Venue', `<b>${esc(vName)}</b>`)
        + bkRow('Location', esc(vLoc || '-'))
        + (venue ? bkRow('Capacity', esc(venue.capacity) + ' people') + bkRow('Open hours', `${formatTimeLabel(venue.openTime)} - ${formatTimeLabel(venue.closeTime)}`)
            + bkRow('Resources available', chips(vRes, 'No resources listed')) : `<div class="bk-note bad"><div>This venue has been removed from the system. Only its name and location from the time of booking are shown.</div></div>`);

     
    let people = '';
    if (admin) {
        people = bkRow('Organizer', esc(organizerName(b)) + (b.organizerKind === 'external' ? ' <span class="text-slate-400">(External)</span>' : '') + (b.userId && !user ? goneTag(b.userId) : ''))
            + (user && user.type ? bkRow('Committee type', esc(user.type)) : '')
            + (b.inchargeName ? bkRow('In-charge', esc(b.inchargeName)) : '')
            + (b.inchargePhone ? bkRow('Contact', esc(b.inchargePhone)) : '')
            + bkRow('Booked by', byAdmin ? `<b>${esc(who)}</b>${b.adminId && !state.admins.some(a => a.id === b.adminId) ? goneTag(b.adminId) : ''}` : esc(organizerName(b)));
    }
    const bookingHtml = bkRow('Booking ID', esc(bookingCode(b)))
        + bkRow('Category', esc(b.category || '-'))
        + bkRow('Description', b.desc ? esc(b.desc) : '-')
        + bkRow('Date', esc(formatDateLabel(b.date)))
        + bkRow('Time', `<b>${formatTimeLabel(b.start)}</b> to <b>${formatTimeLabel(b.end)}</b> <span class="text-slate-400">(${durationText(b)})</span>`)
        + bkRow('Expected attendees', esc(b.attendees || '-'))
        + bkRow('Resources required', chips(b.resources || [], 'No extra resources requested'))
        + people;

     
    const ev = [];
    if (byAdmin) ev.push({ cls: 'ok', t: 'Booked by ' + esc(who) + (admin ? '' : ' for your committee'), s: 'Confirmed automatically - no approval was needed.', at: b.createdAt });
    else {
        ev.push({ cls: '', t: 'Booking requested', s: admin ? 'By ' + esc(organizerName(b)) : '', at: b.createdAt });
        if (b.approvedAt) ev.push({ cls: 'ok', t: 'Approved', s: admin && b.adminName ? 'By ' + esc(adminTag(b)) : '', at: b.approvedAt });
        else if (b.status === 'Pending') ev.push({ cls: '', t: 'Waiting for admin approval', s: '', at: '' });
    }
     
    if (b.status === 'Rejected') ev.push({ cls: 'bad', t: esc(REASON_TITLE[b.reasonCode] || 'Rejected'), s: esc(b.rejectReason || ''), at: b.rejectedAt || b.cancelledAt, none: 'Rejected' });
    if (b.status === 'Cancelled') ev.push({ cls: 'bad', t: esc(REASON_TITLE[b.reasonCode] || 'Cancelled'), s: esc(b.rejectReason || ''), at: b.cancelledAt || b.rejectedAt, none: 'Cancelled' });
    if (b.status === 'Completed') ev.push({ cls: 'done', t: 'Event completed', s: esc(formatDateLabel(b.date)) + ', ' + formatTimeLabel(b.end), at: '' });
    const histHtml = `<ul class="tl">${ev.map(e => `<li class="${e.cls}"><b>${e.t}</b>${e.at ? `<small class="tl-when"><i class="fa-regular fa-clock"></i>${e.none ? e.none + ' on ' : ''}${fmtStamp(e.at)}</small>` : (e.none ? `<small class="tl-when"><i class="fa-regular fa-clock"></i>${e.none} date and time not recorded</small>` : '')}${e.s ? `<small>${e.s}</small>` : ''}</li>`).join('')}</ul>`;

    const now = new Date(), nowStr = localDateStr() + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const notStarted = (b.date + ' ' + b.start) > nowStr;
    const canCancel = ['Pending', 'Approved'].includes(b.status) && (admin || (b.userId === me.id && notStarted));
    const canPrint = ['Approved', 'Completed'].includes(b.status);

    const html = `
        <div class="bk-head">
            <div style="min-width:0"><div class="bk-id">${esc(bookingCode(b))}</div><h3 class="bk-title">${esc(b.title)}</h3></div>
            <span class="px-3 py-1 rounded-lg text-xs font-bold ${STATUS_PILL[b.status] || ''}">${esc(b.status)}</span>
        </div>
        ${byAdmin ? `<div class="bk-note admin"><i class="fa-solid fa-user-shield" style="margin-top:2px"></i><div><b>Booked by ${esc(who)}</b>${admin ? 'This booking was entered directly by an admin and is confirmed automatically.' : 'An admin made this booking for your committee. You can print the slip or cancel it from here.'}</div></div>` : ''}
        ${reasonBox(b)}
        ${bkSection('fa-building', 'Venue Detail', venueHtml)}
        ${bkSection('fa-book', 'Booking Detail', bookingHtml)}
        ${bkSection('fa-clock-rotate-left', 'History', histHtml)}`;

    const m = document.createElement('div');
    m.className = 'ch-modal-bg'; m.id = 'booking-detail-modal';
    m.innerHTML = `<div class="ch-modal bk-modal" style="max-width:620px">
        <div class="bk-body">${html}</div>
        <div class="ch-actions">
            ${canCancel ? '<button data-cancel style="color:#b91c1c">Cancel event</button>' : ''}
            ${canPrint ? '<button data-print><i class="fa-solid fa-print" style="margin-right:6px"></i>Print slip</button>' : ''}
            <button data-yes>Close</button>
        </div></div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    m.querySelector('[data-yes]').onclick = () => m.remove();
    const p = m.querySelector('[data-print]'); if (p) p.onclick = () => { m.remove(); generatePDF(b.id); };
    const c = m.querySelector('[data-cancel]'); if (c) c.onclick = () => { m.remove(); cancelBooking(b.id); };
};
 
document.addEventListener('click', e => {
    const row = e.target.closest('[data-bk]');
    if (!row || e.target.closest('button, a, input, select, textarea, label')) return;
    openBookingDetails(row.getAttribute('data-bk'));
});

 
 
 
window.printSlip = id => generatePDF(id);

 
window.askPrintAdminSlip = id => {
    askModal('Booking added', '<p style="font-size:15px;color:#0f172a;font-weight:600"><i class="fa-solid fa-circle-check" style="color:#10b981;margin-right:6px"></i>Booking added. Print slip?</p><p>The slip can be printed or saved as a PDF.</p>',
        'Print Slip', () => generatePDF(id), 'Not now');
};
