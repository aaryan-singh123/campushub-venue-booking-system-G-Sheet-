/**
 * CampusHub backend (Google Apps Script + Google Sheet). All rules are checked here, not only in the browser.
 * First time: run setup() once from the editor, then Deploy > Web app.
 * Behaviour matches the Node.js / Express / MySQL edition of CampusHub.
 */
// The Sheet ID and Drive folder ID are NOT stored in the code.
// Add them in Apps Script > Project Settings > Script properties: SHEET_ID and FOLDER_ID.
const PROPS = PropertiesService.getScriptProperties();
const SHEET_ID = PROPS.getProperty('SHEET_ID');
const FOLDER_ID = PROPS.getProperty('FOLDER_ID');
const TZ = 'Asia/Kolkata';
const SESSION_HOURS = 12;
const REFRESH_SECONDS = 30;
const SCHEMA_VERSION = 2;

const T = {
  Settings: ['key', 'value'],
  Users: ['id', 'committee', 'type', 'incharge', 'phone', 'salt', 'hash', 'status', 'createdAt'],
  Admins: ['id', 'name', 'phone', 'username', 'salt', 'hash', 'status', 'isSuper', 'createdAt'],
  DeletedAccounts: ['id', 'role', 'name', 'username', 'type', 'incharge', 'phone', 'createdAt', 'deletedAt', 'bookingsCancelled'],
  Venues: ['id', 'name', 'capacity', 'location', 'photo', 'openTime', 'closeTime', 'resources'],
  Closures: ['id', 'venueId', 'date', 'fullDay', 'ranges'],
  Bookings: ['id', 'venueId', 'venueName', 'venueLocation', 'userId', 'bookedByRole', 'organizerKind', 'bookedByName',
    'inchargeName', 'inchargePhone', 'adminId', 'adminName', 'adminUsername', 'title', 'category', 'desc', 'date', 'start', 'end',
    'attendees', 'resources', 'status', 'reasonCode', 'reason', 'cancelledBy', 'createdAt', 'approvedAt', 'rejectedAt', 'cancelledAt'],
  Chats: ['id', 'fromId', 'toId', 'text', 'timestamp', 'read', 'deleted', 'deletedAt'],
  Notifications: ['id', 'userId', 'text', 'date', 'read', 'type', 'reqAdminId', 'resolved', 'refId'],
  Logs: ['id', 'date', 'action', 'by'],
  Sessions: ['token', 'userId', 'role', 'expires'],
  Verifications: ['id', 'userId', 'role', 'purpose', 'code', 'expires', 'tries']
};
// Tabs that go into a backup file (sessions and one-time codes never do).
const BACKUP_TABLES = Object.keys(T).filter(n => ['Sessions', 'Verifications'].indexOf(n) < 0);
const JSON_COLS = ['resources', 'ranges'];
const BOOL_COLS = ['fullDay', 'read', 'deleted', 'isSuper', 'resolved'];
const LIVE = ['Pending', 'Approved'];
const LIMITED = ['login', 'adminLogin', 'signup', 'adminSignup', 'forgotPassword'];
const PHOTO_URL = /^https:\/\/lh3\.googleusercontent\.com\/d\/[A-Za-z0-9_-]+$/;
const CODE_RE = /^CH-(\d{6})-(\d+)$/;
/**
 * Starting lists for a brand-new system. They are copied into the Settings sheet ONLY
 * (1) the first time setup() runs, and (2) after a Factory Reset.
 * After that the Settings sheet is the only source: whatever an admin adds, edits or deletes
 * there is permanent, and these values are never used again.
 */
const SEED = {
  categories: ['Seminar', 'Workshop', 'Meeting', 'Conference'],
  committeeTypes: ['Department', 'Committee', 'External']
};
function seedDefaults_(force) {
  Object.keys(SEED).forEach(k => {
    if (force || setting_(k) === '') setSetting_(k, JSON.stringify(SEED[k]));
  });
}

/* ---------- one-time setup (run from the editor) ---------- */
function setup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  Object.keys(T).forEach(n => {
    const s = ss.getSheetByName(n) || ss.insertSheet(n);
    s.getRange(1, 1, 1, T[n].length).setValues([T[n]]);
    s.getRange(1, 1, s.getMaxRows(), T[n].length).setNumberFormat('@'); // keep dates/times as text
    s.setFrozenRows(1);
  });
  const d = ss.getSheetByName('Sheet1');
  if (d && ss.getSheets().length > 1) ss.deleteSheet(d);
  seedDefaults_(false); // only fills a list that does not exist yet; never brings back deleted items
}

/* ---------- sheet helpers ---------- */
function sh_(n) { return SpreadsheetApp.openById(SHEET_ID).getSheetByName(n); }
function enc_(k, x) { return JSON_COLS.indexOf(k) > -1 ? JSON.stringify(x || []) : (x == null ? '' : String(x)); }
function rows_(n) {
  const v = sh_(n).getDataRange().getValues(), h = v[0];
  return v.slice(1).filter(r => r[0] !== '').map(r => {
    const o = {};
    h.forEach((k, i) => {
      let x = r[i];
      if (JSON_COLS.indexOf(k) > -1) { try { x = x === '' ? [] : JSON.parse(x); } catch (e) { x = []; } }
      else if (BOOL_COLS.indexOf(k) > -1) x = x === true || x === 'true';
      o[k] = x;
    });
    return o;
  });
}
function rowsBy_(n, where) {
  const k = Object.keys(where);
  return rows_(n).filter(r => k.every(c => r[c] === where[c]));
}
function one_(n, where) { return rowsBy_(n, where)[0]; }
function add_(n, o) {
  if (T[n][0] === 'id' && !o.id) o.id = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
  const s = sh_(n), r = s.getLastRow() + 1, c = T[n].length;
  if (r > s.getMaxRows()) s.insertRowsAfter(s.getMaxRows(), 100);
  const g = s.getRange(r, 1, 1, c);
  g.setNumberFormat('@');
  g.setValues([T[n].map(k => enc_(k, o[k]))]);
  return o;
}
function upd_(n, id, p) {
  const s = sh_(n), v = s.getDataRange().getValues(), c = T[n].length;
  for (let i = 1; i < v.length; i++) {
    if (v[i][0] === id) {
      T[n].forEach((k, j) => { if (k in p) v[i][j] = enc_(k, p[k]); });
      s.getRange(i + 1, 1, 1, c).setValues([v[i].slice(0, c)]);
      return true;
    }
  }
  return false;
}
/** Updates every row where the column equals the value (one read, one write per row). */
function updWhere_(n, where, p) {
  const s = sh_(n), v = s.getDataRange().getValues(), c = T[n].length, ks = Object.keys(where);
  for (let i = 1; i < v.length; i++) {
    if (v[i][0] !== '' && ks.every(k => v[i][T[n].indexOf(k)] === where[k] || (typeof where[k] === 'boolean' && (v[i][T[n].indexOf(k)] === where[k] || String(v[i][T[n].indexOf(k)]) === String(where[k]))))) {
      T[n].forEach((k, j) => { if (k in p) v[i][j] = enc_(k, p[k]); });
      s.getRange(i + 1, 1, 1, c).setValues([v[i].slice(0, c)]);
    }
  }
}
function delWhere_(n, col, val) {
  const s = sh_(n), v = s.getDataRange().getValues(), ci = T[n].indexOf(col);
  for (let i = v.length - 1; i >= 1; i--) if (v[i][ci] === val) s.deleteRow(i + 1);
}
function clearSheet_(n) {
  const s = sh_(n), rows = s.getMaxRows() - 1;
  if (rows > 0) s.getRange(2, 1, rows, T[n].length).clearContent();
}
/** Writes many rows in one go (used by restore). */
function bulk_(n, list) {
  if (!list.length) return;
  const s = sh_(n), c = T[n].length, need = list.length + 1;
  if (s.getMaxRows() < need) s.insertRowsAfter(s.getMaxRows(), need - s.getMaxRows());
  const g = s.getRange(2, 1, list.length, c);
  g.setNumberFormat('@');
  g.setValues(list.map(o => T[n].map(k => enc_(k, o[k]))));
}
function setting_(k) { const r = rows_('Settings').filter(x => x.key === k)[0]; return r ? r.value : ''; }
function setSetting_(k, val) {
  if (!upd_('Settings', k, { value: val })) add_('Settings', { key: k, value: val });
}
function settings_() {
  const o = {};
  rows_('Settings').forEach(r => o[r.key] = r.value);
  ['categories', 'committeeTypes'].forEach(k => { try { o[k] = JSON.parse(o[k] || '[]'); } catch (e) { o[k] = []; } });
  o.refreshSeconds = REFRESH_SECONDS;
  return o;
}

/* ---------- small utilities ---------- */
function fail_(m, code) { const e = new Error(m); e.user = true; e.code = code || ''; throw e; }
function nowIST_() {
  const p = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm').split(' ');
  return { date: p[0], min: mins_(p[1]) };
}
function iso_() { return new Date().toISOString(); }
function mins_(t) { const a = String(t).split(':'); return +a[0] * 60 + +a[1]; }
function fmt_(t) { const m = mins_(t), h = Math.floor(m / 60); return (h % 12 || 12) + ':' + ('0' + (m % 60)).slice(-2) + (h >= 12 ? ' PM' : ' AM'); }
function hash_(pw, salt) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + pw)
    .map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
}
function newPw_(pw) {
  if (String(pw || '').length < 6) fail_('Password must be at least 6 characters long.');
  const salt = Utilities.getUuid(); return { salt: salt, hash: hash_(pw, salt) };
}
function checkPw_(pw, rec) { return !!rec && hash_(String(pw || ''), rec.salt) === rec.hash; }
function log_(a, by) { add_('Logs', { date: iso_(), action: a, by: by }); }
function note_(uid, text, extra) {
  add_('Notifications', Object.assign({ userId: uid, text: text, date: iso_(), read: false }, extra || {}));
}
function clean_(o) { const c = Object.assign({}, o); delete c.salt; delete c.hash; return c; }
function overlap_(s1, e1, s2, e2) { return Math.max(mins_(s1), mins_(s2)) < Math.min(mins_(e1), mins_(e2)); }
function hasText_(v, label, max) {
  const s = String(v || '').trim();
  if (!s) fail_('Enter ' + label + '.');
  return s.slice(0, max || 200);
}
function list_(a, label) {
  const seen = {}, out = [];
  (a || []).forEach(x => { const t = String(x).trim().slice(0, 60), k = t.toLowerCase(); if (t && !seen[k]) { seen[k] = 1; out.push(t); } });
  if (!out.length) fail_('Keep at least one item in ' + label + '.');
  return out.slice(0, 30);
}
function phone_(p) { if (!/^[0-9]{10}$/.test(String(p || ''))) fail_('Enter a valid 10-digit phone number.'); return String(p); }
function adminLabel_(rec) { return (rec.name || 'Admin') + ' (Admin)'; }

/* ---------- rate limit (per account name, because Apps Script cannot see the visitor's IP) ---------- */
function tooMany_(action, d) {
  const who = String(d.committee || d.username || '').trim().toLowerCase().slice(0, 80);
  const cache = CacheService.getScriptCache(), key = 'rl:' + action + ':' + Utilities.base64EncodeWebSafe(who).slice(0, 80);
  const now = Date.now();
  let list = []; try { list = JSON.parse(cache.get(key) || '[]'); } catch (e) { list = []; }
  list = list.filter(t => now - t < 600000);
  list.push(now);
  cache.put(key, JSON.stringify(list), 600);
  return list.length > 20;
}

/* ---------- booking rules ---------- */
function ended_(b) { const n = nowIST_(); return b.date < n.date || (b.date === n.date && mins_(b.end) <= n.min); }
function isFuture_(b) { const n = nowIST_(); return !(b.date < n.date || (b.date === n.date && mins_(b.start) <= n.min)); }
function refresh_() {
  rows_('Bookings').forEach(b => { if (b.status === 'Approved' && ended_(b)) upd_('Bookings', b.id, { status: 'Completed' }); });
}
function ddmmyy_(date) { return String(date).slice(8, 10) + String(date).slice(5, 7) + String(date).slice(2, 4); }
function codeOf_(date, n) { return 'CH-' + ddmmyy_(date) + '-' + ('0' + n).slice(-2); }
function lastBookingNumber_() {
  let max = 0;
  rows_('Bookings').forEach(b => { const m = CODE_RE.exec(String(b.id)); if (m && +m[2] > max) max = +m[2]; });
  return max;
}
function nextBookingId_(date) { return codeOf_(date, lastBookingNumber_() + 1); }
/** Gives old-style booking IDs (from an older backup) the CH-DDMMYY-NN format. */
function convertOldIds_() {
  const old = rows_('Bookings').filter(b => !CODE_RE.test(String(b.id)) && /^\d{4}-\d{2}-\d{2}$/.test(b.date));
  if (!old.length) return 0;
  let n = lastBookingNumber_();
  old.map((b, i) => ({ b: b, i: i })).sort((x, y) => String(x.b.createdAt || '').localeCompare(String(y.b.createdAt || '')) || x.i - y.i)
    .forEach(x => upd_('Bookings', x.b.id, { id: codeOf_(x.b.date, ++n) }));
  return old.length;
}
function closureHit_(vid, date, s, e) {
  return rowsBy_('Closures', { venueId: vid, date: date }).some(c => c.fullDay || c.ranges.some(r => overlap_(s, e, r.start, r.end)));
}
function clash_(vid, date, s, e, skip) {
  return rowsBy_('Bookings', { venueId: vid, date: date }).filter(b => b.id !== skip && LIVE.indexOf(b.status) > -1 && overlap_(s, e, b.start, b.end));
}
function checkSlot_(b, v, skip) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date) || !/^\d{2}:\d{2}$/.test(b.start) || !/^\d{2}:\d{2}$/.test(b.end)) fail_('Select a date, start time and end time.');
  if (mins_(b.start) >= mins_(b.end)) fail_('End time must be later than start time.');
  if (mins_(b.start) < mins_(v.openTime) || mins_(b.end) > mins_(v.closeTime)) fail_('This venue is available only from ' + fmt_(v.openTime) + ' to ' + fmt_(v.closeTime) + '.');
  const n = nowIST_();
  if (b.date < n.date || (b.date === n.date && mins_(b.start) <= n.min)) fail_('The selected time has already passed. Select a later time.');
  if (closureHit_(v.id, b.date, b.start, b.end)) fail_('The venue is closed at the selected date or time.');
  if (clash_(v.id, b.date, b.start, b.end, skip).length) fail_('This time slot is already booked. Select a different time.');
}
function checkRes_(req, v) {
  const seen = {};
  return (req || []).map(r => {
    const a = v.resources.filter(x => x.name === r.name)[0], q = parseInt(r.qty, 10);
    if (!a) fail_('"' + r.name + '" is not available at this venue.');
    if (seen[a.name]) fail_('"' + a.name + '" is selected twice.');
    seen[a.name] = 1;
    if (!(q >= 1)) fail_('Enter the quantity required for "' + a.name + '".');
    if (q > parseInt(a.qty, 10)) fail_('Only ' + a.qty + ' ' + a.name + ' available at this venue. Requested: ' + q + '.');
    return { name: a.name, qty: q };
  });
}
function organizerOf_(b, who) { return b.bookedByName || (b.userId && who && who[b.userId]) || 'Admin'; }
function brief_(b) {
  const u = b.userId ? one_('Users', { id: b.userId }) : null;
  return { id: b.id, title: b.title, date: b.date, start: b.start, end: b.end, status: b.status, by: b.bookedByName || (u ? u.committee : 'Admin') };
}
const REASON_TAIL = {
  ACCOUNT_BLOCKED: 'because the committee account was blocked by the administration.',
  ACCOUNT_DELETED: 'because the committee account was deleted.',
  VENUE_CLOSED: 'because the venue is closed on the selected date.',
  VENUE_REMOVED: 'because the venue was removed from the system.',
  VENUE_TIMING: 'because the venue timings were changed.'
};
function autoReason_(code, verb, extra) { return verb + ' automatically ' + REASON_TAIL[code] + (extra ? ' ' + extra : ''); }
/** Cancels or rejects bookings and tells each person why. */
function clear_(list, code, by, opts) {
  const o = opts || {};
  list.forEach(b => {
    const rejected = b.status === 'Pending' && !o.force, st = rejected ? 'Rejected' : 'Cancelled';
    const reason = autoReason_(code, st, o.extra);
    const patch = { status: st, reason: reason, reasonCode: code, cancelledBy: 'System' };
    patch[rejected ? 'rejectedAt' : 'cancelledAt'] = iso_();
    upd_('Bookings', b.id, patch);
    if (b.userId && !o.silent) note_(b.userId, 'Your booking "' + b.title + '" on ' + b.date + ' (' + fmt_(b.start) + ' - ' + fmt_(b.end) + '): ' + reason);
    log_(st + ' booking "' + b.title + '" - ' + code, by);
  });
}
function liveFuture_(fn) { return rows_('Bookings').filter(b => LIVE.indexOf(b.status) > -1 && !ended_(b) && fn(b)); }
/** Returns {needConfirm} first; only acts after the admin confirms. */
function confirmOrClear_(affected, d, code, extra, by, what) {
  if (affected.length && !d.confirm) {
    return { needConfirm: true, affected: affected.map(brief_), message: what + ' ' + affected.length + ' booking(s) are affected. Do you want to reject or cancel them? The people who booked will be notified.' };
  }
  clear_(affected, code, by, { extra: extra });
  return null;
}

/* ---------- venue photos (Google Drive) ---------- */
function removeUpload_(url) {
  const m = /^https:\/\/lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]+)$/.exec(String(url || ''));
  if (!m || !FOLDER_ID) return;
  try {
    const f = DriveApp.getFileById(m[1]), ps = f.getParents();
    while (ps.hasNext()) if (ps.next().getId() === FOLDER_ID) { f.setTrashed(true); return; }
  } catch (e) { /* the file is already gone */ }
}

/* ---------- sessions ---------- */
function startSession_(id, role) {
  const s = sh_('Sessions'), v = s.getDataRange().getValues(), now = Date.now();
  for (let i = v.length - 1; i >= 1; i--) if (v[i][0] !== '' && +v[i][3] < now) s.deleteRow(i + 1);
  const token = Utilities.getUuid() + Utilities.getUuid();
  add_('Sessions', { token: token, userId: id, role: role, expires: now + SESSION_HOURS * 3600000 });
  return token;
}
function auth_(token) {
  const s = token ? one_('Sessions', { token: token }) : null;
  if (!s || +s.expires < Date.now()) fail_('Your session has expired. Please sign in again.', 'SESSION');
  const rec = one_(s.role === 'admin' ? 'Admins' : 'Users', { id: s.userId });
  if (!rec) fail_('Your session has expired. Please sign in again.', 'SESSION');
  if (s.role === 'user' && rec.status !== 'approved') { delWhere_('Sessions', 'userId', rec.id); fail_('Your account is not active. Please contact the admin.', 'SESSION'); }
  if (s.role === 'admin' && rec.status !== 'approved') fail_('Your session has expired. Please sign in again.', 'SESSION');
  return { role: s.role, id: rec.id, rec: rec, name: s.role === 'admin' ? rec.name : rec.committee };
}

/* ---------- account deletion helpers ---------- */
function otherAdmins_(exceptId) { return rows_('Admins').filter(a => a.status === 'approved' && a.id !== exceptId); }
function deleteGuard_(c) {
  if (c.role === 'admin' && !otherAdmins_(c.id).length) fail_('You are the only administrator. Add and approve another admin before deleting this account.');
}
function archive_(c, extra) {
  const r = c.rec, isAdmin = c.role === 'admin';
  add_('DeletedAccounts', { id: r.id, role: c.role, name: isAdmin ? r.name : r.committee, username: isAdmin ? r.username : '', type: isAdmin ? (r.isSuper ? 'Main admin' : 'Admin') : r.type,
    incharge: isAdmin ? '' : r.incharge, phone: r.phone, createdAt: r.createdAt, deletedAt: iso_(), bookingsCancelled: extra || 0 });
}

/* ---------- actions ---------- */
const A = {
  publicInfo: { pub: 1, fn: () => ({ settings: { committeeTypes: settings_().committeeTypes, refreshSeconds: REFRESH_SECONDS } }) },

  signup: { pub: 1, fn: d => {
    const name = hasText_(d.committee, 'the committee name', 80), pw = newPw_(d.password);
    if (settings_().committeeTypes.indexOf(d.type) < 0) fail_('Select a valid committee type.');
    if (rows_('Users').some(u => u.committee.toLowerCase() === name.toLowerCase())) fail_('This committee name is already registered.');
    add_('Users', { committee: name, type: d.type, incharge: hasText_(d.incharge, 'the in-charge name', 80),
      phone: phone_(d.phone), salt: pw.salt, hash: pw.hash, status: 'pending', createdAt: iso_() });
    log_('New account request: ' + name, 'System');
    return true;
  } },

  login: { pub: 1, fn: d => {
    const u = rows_('Users').filter(x => x.committee.toLowerCase() === String(d.committee || '').trim().toLowerCase())[0];
    if (!u || !checkPw_(d.password, u)) fail_('Incorrect committee name or password.');
    if (u.status === 'pending') fail_('Your account is pending admin approval.', 'PENDING');
    if (u.status === 'rejected') fail_('Your registration was rejected. Please contact the admin.', 'REJECTED');
    if (u.status === 'blocked') fail_('Your account has been blocked. Please contact the admin.', 'BLOCKED');
    return { token: startSession_(u.id, 'user') };
  } },

  adminSignup: { pub: 1, fn: d => {
    const name = hasText_(d.name, 'your name', 80), un = hasText_(d.username, 'a username', 40), pw = newPw_(d.password), phone = phone_(d.phone);
    const admins = rows_('Admins');
    if (admins.some(a => a.username.toLowerCase() === un.toLowerCase())) fail_('This username is already taken.');
    const first = admins.length === 0; // the very first admin becomes the main admin
    const a = add_('Admins', { name: name, phone: phone, username: un, salt: pw.salt, hash: pw.hash, status: first ? 'approved' : 'pending', isSuper: first, createdAt: iso_() });
    if (first) { log_('Main admin created: ' + name, 'System'); return { first: true }; }
    const sup = admins.filter(x => x.isSuper)[0];
    if (sup) note_(sup.id, 'New admin request from "' + name + '" (username: ' + un + '). Please accept or reject.', { type: 'admin_request', reqAdminId: a.id, resolved: false });
    log_('New admin request: ' + name, 'System');
    return { first: false };
  } },

  adminLogin: { pub: 1, fn: d => {
    const a = rows_('Admins').filter(x => x.username.toLowerCase() === String(d.username || '').trim().toLowerCase())[0];
    if (!a || !checkPw_(d.password, a)) fail_('Incorrect username or password.');
    if (a.status !== 'approved') fail_('Your admin account is pending approval from the main admin.', 'PENDING');
    return { token: startSession_(a.id, 'admin') };
  } },

  logout: { fn: (d, c, token) => { delWhere_('Sessions', 'token', token); return true; } },

  bootstrap: { fn: (d, c) => {
    refresh_();
    const adm = c.role === 'admin', uid = c.id, who = {};
    const bk = rows_('Bookings'), users = rows_('Users'), admins = rows_('Admins');
    users.forEach(u => { who[u.id] = u.committee; });
    const full = b => Object.assign({}, b, { bookedByRole: b.bookedByRole || (b.userId ? 'committee' : 'admin'), bookedByName: organizerOf_(b, who) });
    return {
      role: c.role, me: clean_(c.rec), settings: settings_(), venues: rows_('Venues'), closures: rows_('Closures'),
      bookings: adm ? bk.map(full) : bk.filter(b => b.userId === uid || ['Pending', 'Approved', 'Completed'].indexOf(b.status) > -1)
        .map(b => b.userId === uid ? full(b) : { id: b.id, venueId: b.venueId, date: b.date, start: b.start, end: b.end, status: b.status, title: b.title, by: organizerOf_(b, who) }),
      users: adm ? users.map(clean_) : [],
      admins: admins.filter(a => adm || a.status === 'approved').map(a => adm ? clean_(a) : { id: a.id, name: a.name }),
      deletedAccounts: adm ? rows_('DeletedAccounts').map(x => ({ id: x.id, role: x.role, name: x.name, username: x.username, type: x.type, deletedAt: x.deletedAt, bookingsCancelled: x.bookingsCancelled })) : [],
      notifications: rowsBy_('Notifications', { userId: uid }),
      chats: rows_('Chats').filter(m => m.fromId === uid || m.toId === uid),
      logs: adm ? rows_('Logs').slice(-300) : [],
      serverNow: nowIST_()
    };
  } },

  /* bookings */
  createBooking: { fn: (d, c) => {
    const v = one_('Venues', { id: d.venueId });
    if (!v) fail_('This venue is no longer available.');
    const b = { venueId: v.id, venueName: v.name, venueLocation: v.location, title: hasText_(d.title, 'the event title', 120), category: String(d.category || '').slice(0, 60),
      desc: String(d.desc || '').slice(0, 500), date: d.date, start: d.start, end: d.end, attendees: parseInt(d.attendees, 10) || 0 };
    if (b.attendees < 1) fail_('Enter the number of expected attendees.');
    if (b.attendees > parseInt(v.capacity, 10)) fail_('This venue can hold up to ' + v.capacity + ' people. Please enter ' + v.capacity + ' or fewer attendees.');
    checkSlot_(b, v);
    b.resources = checkRes_(d.resources, v);
    let owner = null;
    if (c.role === 'admin') {
      Object.assign(b, { bookedByRole: 'admin', status: 'Approved', approvedAt: iso_(), adminId: c.id, adminName: String(c.rec.name || 'Admin').slice(0, 80), adminUsername: String(c.rec.username || '').slice(0, 40) });
      if (d.forType === 'external') {
        Object.assign(b, { userId: '', organizerKind: 'external', bookedByName: hasText_(d.bookedByName, 'the name of who is booking', 80), inchargeName: '', inchargePhone: '' });
        if (d.phone) b.inchargePhone = phone_(d.phone);
      } else {
        owner = one_('Users', { id: d.forUserId });
        if (!owner || owner.status !== 'approved') fail_('Select a committee from the list, or choose External.');
        Object.assign(b, { userId: owner.id, organizerKind: 'committee', bookedByName: owner.committee, inchargeName: owner.incharge, inchargePhone: owner.phone });
      }
    } else {
      Object.assign(b, { bookedByRole: 'committee', organizerKind: 'committee', userId: c.id, bookedByName: c.rec.committee, inchargeName: c.rec.incharge, inchargePhone: c.rec.phone, status: 'Pending' });
    }
    b.id = nextBookingId_(b.date);
    b.createdAt = iso_();
    add_('Bookings', b);
    if (owner) note_(owner.id, adminLabel_(c.rec) + ' booked "' + b.title + '" for your committee at ' + v.name + ' on ' + b.date + ' (' + fmt_(b.start) + ' - ' + fmt_(b.end) + '). You can view, print or cancel it from My History.');
    log_('Booking ' + (c.role === 'admin' ? 'added by admin for ' + b.bookedByName : 'requested') + ': ' + b.title, c.name);
    return { booking: b };
  } },

  /** Everything an admin must see before approving. */
  previewDecision: { admin: 1, fn: d => {
    const b = one_('Bookings', { id: d.id }); if (!b) fail_('This booking was not found.');
    const v = one_('Venues', { id: b.venueId });
    return { booking: brief_(b), venue: v ? { name: v.name, capacity: v.capacity, openTime: v.openTime, closeTime: v.closeTime } : null,
      closures: rowsBy_('Closures', { venueId: b.venueId, date: b.date }),
      sameDay: rowsBy_('Bookings', { venueId: b.venueId, date: b.date }).filter(x => x.id !== b.id && LIVE.indexOf(x.status) > -1).map(brief_),
      clashes: clash_(b.venueId, b.date, b.start, b.end, b.id).map(brief_),
      attendees: b.attendees };
  } },

  decideBooking: { admin: 1, fn: (d, c) => {
    const b = one_('Bookings', { id: d.id });
    if (!b || b.status !== 'Pending') fail_('This request has already been handled.');
    if (d.status === 'Rejected') {
      const r = hasText_(d.reason, 'a reason for rejecting', 300), reason = 'Rejected by ' + adminLabel_(c.rec) + '. Reason: ' + r;
      upd_('Bookings', b.id, { status: 'Rejected', reason: reason, reasonCode: 'ADMIN_REJECTED', cancelledBy: adminLabel_(c.rec), rejectedAt: iso_() });
      if (b.userId) note_(b.userId, 'Your booking "' + b.title + '" was rejected. Reason: ' + r);
    } else {
      const v = one_('Venues', { id: b.venueId });
      if (!v) fail_('This venue no longer exists, so the booking cannot be approved.');
      checkSlot_(b, v, b.id);
      upd_('Bookings', b.id, { status: 'Approved', approvedAt: iso_(), adminId: c.id, adminName: c.rec.name, adminUsername: c.rec.username });
      if (b.userId) note_(b.userId, 'Your booking "' + b.title + '" on ' + b.date + ' was approved.');
    }
    log_(d.status + ' booking "' + b.title + '"', c.name);
    return true;
  } },

  cancelBooking: { fn: (d, c) => {
    const b = one_('Bookings', { id: d.id }); if (!b) fail_('This booking was not found.');
    if (b.status === 'Completed') fail_('A completed event cannot be cancelled.');
    if (LIVE.indexOf(b.status) < 0) fail_('This booking is already closed.');
    if (c.role === 'user') {
      if (b.userId !== c.id) fail_('You can cancel only your own bookings.');
      if (!isFuture_(b)) fail_('This event has already started, so it cannot be cancelled.');
      upd_('Bookings', b.id, { status: 'Cancelled', reasonCode: 'USER_CANCELLED', cancelledBy: 'Organizer', cancelledAt: iso_(), reason: 'Cancelled by the organizer (' + c.rec.committee + ').' });
      if (b.bookedByRole === 'admin' && b.adminId) note_(b.adminId, c.rec.committee + ' cancelled the booking "' + b.title + '" on ' + b.date + ' that was made by ' + (b.adminName || 'an admin') + '.');
    } else {
      const r = hasText_(d.reason, 'a reason for cancelling', 300);
      upd_('Bookings', b.id, { status: 'Cancelled', reasonCode: 'ADMIN_CANCELLED', cancelledBy: adminLabel_(c.rec), cancelledAt: iso_(), reason: 'Cancelled by ' + adminLabel_(c.rec) + '. Reason: ' + r });
      if (b.userId) note_(b.userId, 'Your booking "' + b.title + '" on ' + b.date + ' was cancelled by ' + adminLabel_(c.rec) + '. Reason: ' + r);
    }
    log_('Cancelled booking "' + b.title + '"', c.name);
    return true;
  } },

  /* venues and closures */
  saveVenue: { admin: 1, fn: (d, c) => {
    const v = { name: hasText_(d.name, 'the venue name', 100), capacity: parseInt(d.capacity, 10), location: hasText_(d.location, 'the location', 150),
      openTime: d.openTime, closeTime: d.closeTime, resources: (d.resources || []).map(r => ({ name: hasText_(r.name, 'the resource name', 60), qty: parseInt(r.qty, 10) })) };
    if (!(v.capacity >= 1)) fail_('Enter the venue capacity.');
    if (v.resources.some(r => !(r.qty >= 1))) fail_('Every resource needs a quantity of 1 or more.');
    if (!/^\d{2}:\d{2}$/.test(d.openTime || '') || !/^\d{2}:\d{2}$/.test(d.closeTime || '') || mins_(d.openTime) >= mins_(d.closeTime)) fail_('The closing time must be later than the opening time.');
    if (d.photo) { if (!PHOTO_URL.test(String(d.photo))) fail_('Select a PNG, JPG or WEBP image.'); v.photo = String(d.photo); }
    if (!d.id) { v.photo = v.photo || ''; add_('Venues', v); log_('Added venue: ' + v.name, c.name); return { saved: true }; }
    const old = one_('Venues', { id: d.id }); if (!old) fail_('This venue was not found.');
    const out = liveFuture_(b => b.venueId === old.id && (mins_(b.start) < mins_(v.openTime) || mins_(b.end) > mins_(v.closeTime)));
    const ask = confirmOrClear_(out, d, 'VENUE_TIMING', 'New timing: ' + fmt_(v.openTime) + ' to ' + fmt_(v.closeTime) + '.', c.name, 'The new timing does not fit.');
    if (ask) return ask;
    upd_('Venues', old.id, v);
    if (v.photo && v.photo !== old.photo) removeUpload_(old.photo);
    if (old.name !== v.name || old.location !== v.location) updWhere_('Bookings', { venueId: old.id }, { venueName: v.name, venueLocation: v.location });
    log_('Updated venue: ' + v.name, c.name);
    return { saved: true };
  } },

  deleteVenue: { admin: 1, fn: (d, c) => {
    const v = one_('Venues', { id: d.id }); if (!v) fail_('This venue was not found.');
    const aff = liveFuture_(b => b.venueId === v.id);
    const ask = confirmOrClear_(aff, d, 'VENUE_REMOVED', '', c.name, 'You are removing "' + v.name + '".');
    if (ask) return ask;
    delWhere_('Venues', 'id', v.id); delWhere_('Closures', 'venueId', v.id); removeUpload_(v.photo);
    log_('Removed venue: ' + v.name, c.name);
    return { deleted: true };
  } },

  saveClosure: { admin: 1, fn: (d, c) => {
    const v = one_('Venues', { id: d.venueId }); if (!v) fail_('This venue was not found.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date || '')) fail_('Select a date.');
    const full = !!d.fullDay, rg = full ? [] : (d.ranges || []).filter(r => r.start && r.end && mins_(r.start) < mins_(r.end));
    if (!full && !rg.length) fail_('Add at least one time range, or choose the full day.');
    const aff = liveFuture_(b => b.venueId === v.id && b.date === d.date && (full || rg.some(r => overlap_(b.start, b.end, r.start, r.end))));
    const ask = confirmOrClear_(aff, d, 'VENUE_CLOSED', 'Closed on ' + d.date + '.', c.name, 'The venue will be closed.');
    if (ask) return ask;
    rowsBy_('Closures', { venueId: v.id, date: d.date }).forEach(x => delWhere_('Closures', 'id', x.id));
    add_('Closures', { venueId: v.id, date: d.date, fullDay: full, ranges: rg });
    log_('Closed "' + v.name + '" on ' + d.date, c.name);
    return { saved: true };
  } },
  removeClosure: { admin: 1, fn: (d, c) => {
    rowsBy_('Closures', { venueId: d.venueId, date: d.date }).forEach(x => delWhere_('Closures', 'id', x.id));
    log_('Removed closure on ' + d.date, c.name); return true;
  } },

  /* committees and admins */
  setUserStatus: { admin: 1, fn: (d, c) => {
    const u = one_('Users', { id: d.id }); if (!u) fail_('This committee was not found.');
    if (['approved', 'blocked', 'rejected'].indexOf(d.status) < 0) fail_('Something went wrong. Please try again.');
    if (d.status === 'blocked') {
      clear_(liveFuture_(b => b.userId === u.id), 'ACCOUNT_BLOCKED', c.name, { force: true });
      delWhere_('Sessions', 'userId', u.id);
    }
    upd_('Users', u.id, { status: d.status });
    note_(u.id, d.status === 'approved' ? 'The admin approved your account.' : d.status === 'blocked' ? 'The admin blocked your account. Please contact the admin.' : 'The admin rejected your account request.');
    log_('Committee "' + u.committee + '" set to ' + d.status, c.name);
    return true;
  } },

  decideAdmin: { admin: 1, fn: (d, c) => {
    if (!c.rec.isSuper) fail_('Only the main admin can do this.');
    const a = one_('Admins', { id: d.id }); if (!a || a.status !== 'pending') fail_('This request has already been handled.');
    if (d.approve) upd_('Admins', a.id, { status: 'approved' }); else delWhere_('Admins', 'id', a.id);
    updWhere_('Notifications', { reqAdminId: a.id }, { resolved: true });
    log_((d.approve ? 'Approved' : 'Rejected') + ' admin: ' + a.name, c.name);
    return true;
  } },

  createUser: { admin: 1, fn: (d, c) => {
    const name = hasText_(d.committee, 'the committee name', 80), pw = newPw_(d.password);
    if (settings_().committeeTypes.indexOf(d.type) < 0) fail_('Select a valid committee type.');
    if (rows_('Users').some(u => u.committee.toLowerCase() === name.toLowerCase())) fail_('This committee name is already registered.');
    add_('Users', { committee: name, type: d.type, incharge: hasText_(d.incharge, 'the in-charge name', 80), phone: phone_(d.phone),
      salt: pw.salt, hash: pw.hash, status: 'approved', createdAt: iso_() });
    log_('Created committee account: ' + name, c.name);
    return true;
  } },

  forgotPassword: { pub: 1, fn: d => {
    const name = hasText_(d.committee, 'the committee name', 80), inc = hasText_(d.incharge, 'the in-charge name', 80), ph = phone_(d.phone);
    const u = rows_('Users').filter(x => x.committee.toLowerCase() === name.toLowerCase() &&
      x.incharge.toLowerCase() === inc.toLowerCase() && String(x.phone) === ph)[0];
    if (!u) fail_('The details you entered do not match any account.', 'NO_MATCH');
    const sup = rows_('Admins').filter(a => a.isSuper)[0];
    const open = rowsBy_('Notifications', { refId: u.id }).some(n => n.type === 'password_reset' && !n.resolved);
    if (sup && !open) {
      note_(sup.id, 'Password reset request. Committee: ' + u.committee + ' | In-charge: ' + u.incharge + ' | Contact: ' + u.phone + '.',
        { type: 'password_reset', refId: u.id, resolved: false });
    }
    return true;
  } },

  resetUserPassword: { admin: 1, fn: (d, c) => {
    const u = one_('Users', { id: d.id }); if (!u) fail_('This committee was not found.');
    const pw = newPw_(d.password);
    upd_('Users', u.id, { salt: pw.salt, hash: pw.hash });
    delWhere_('Sessions', 'userId', u.id);
    updWhere_('Notifications', { type: 'password_reset', refId: u.id }, { resolved: true });
    note_(u.id, 'Your password was changed by the admin.');
    log_('Password reset for "' + u.committee + '"', c.name);
    return true;
  } },

  ignoreNotification: { admin: 1, fn: (d, c) => {
    const n = one_('Notifications', { id: d.id }); if (!n || n.userId !== c.id) fail_('This notification was not found.');
    upd_('Notifications', n.id, { resolved: true }); return true;
  } },

  /* chat, notifications, profile */
  sendChat: { fn: (d, c) => {
    const text = String(d.text || '').trim().slice(0, 1000); if (!text) fail_('Enter a message.');
    const ok = c.role === 'user' ? rowsBy_('Admins', { id: d.toId }).some(a => a.status === 'approved') : !!one_('Users', { id: d.toId });
    if (!ok) fail_('This person cannot be reached right now.');
    add_('Chats', { fromId: c.id, toId: d.toId, text: text, timestamp: iso_(), read: false, deleted: false });
    return true;
  } },
  markChatRead: { fn: (d, c) => { updWhere_('Chats', { fromId: d.withId, toId: c.id, read: false }, { read: true }); return true; } },
  deleteChat: { fn: (d, c) => {
    const m = one_('Chats', { id: d.id });
    if (!m || m.fromId !== c.id) fail_('You can delete only your own messages.');
    upd_('Chats', m.id, { text: '', deleted: true, deletedAt: iso_() }); return true;
  } },
  markNotificationsRead: { fn: (d, c) => { updWhere_('Notifications', { userId: c.id, read: false }, { read: true }); return true; } },

  saveProfile: { fn: (d, c) => {
    const p = {};
    if (c.role === 'user') { p.incharge = hasText_(d.incharge, 'the in-charge name', 80); p.phone = phone_(d.phone); }
    else { p.name = hasText_(d.name, 'your name', 80); if (d.phone) p.phone = phone_(d.phone); }
    if (d.password) { const pw = newPw_(d.password); p.salt = pw.salt; p.hash = pw.hash; }
    upd_(c.role === 'admin' ? 'Admins' : 'Users', c.id, p); return true;
  } },

  /* delete my own account: step 1 (password) then step 2 (code + the word DELETE) */
  requestDeleteAccount: { fn: (d, c) => {
    if (!checkPw_(d.password, c.rec)) fail_('Incorrect password.');
    deleteGuard_(c);
    const code = String(Math.floor(100000 + Math.random() * 900000)), id = c.role + ':' + c.id;
    delWhere_('Verifications', 'id', id);
    add_('Verifications', { id: id, userId: c.id, role: c.role, purpose: 'delete', code: code, expires: Date.now() + 300000, tries: 0 });
    return { code: code, seconds: 300, affected: c.role === 'user' ? liveFuture_(b => b.userId === c.id).length : 0 };
  } },

  deleteAccount: { fn: (d, c) => {
    const id = c.role + ':' + c.id, v = one_('Verifications', { id: id });
    if (!v || +v.expires < Date.now()) { if (v) delWhere_('Verifications', 'id', id); fail_('The confirmation has expired. Please start again.', 'EXPIRED'); }
    if (String(d.code || '').trim() !== String(v.code)) {
      if (+v.tries + 1 >= 5) { delWhere_('Verifications', 'id', id); fail_('Too many wrong codes. Please start again.', 'EXPIRED'); }
      upd_('Verifications', id, { tries: +v.tries + 1 }); fail_('The confirmation code is incorrect.');
    }
    if (String(d.phrase || '').trim() !== 'DELETE') fail_('Type DELETE exactly as shown.');
    deleteGuard_(c);
    const name = c.name;
    if (c.role === 'user') {
      const aff = liveFuture_(b => b.userId === c.id);
      clear_(aff, 'ACCOUNT_DELETED', name, { force: true, silent: true });
      archive_(c, aff.length);
      otherAdmins_('').forEach(a => note_(a.id, 'Committee "' + name + '" deleted its account.' + (aff.length ? ' ' + aff.length + ' upcoming booking(s) were cancelled automatically (reason: account deleted).' : ' It had no upcoming bookings.'), { type: 'account_deleted' }));
      delWhere_('Users', 'id', c.id);
    } else {
      archive_(c, 0);
      const rest = otherAdmins_(c.id);
      if (c.rec.isSuper) {
        const next = rest[0];
        upd_('Admins', next.id, { isSuper: true });
        rowsBy_('Notifications', { userId: c.id }).forEach(n => { if (!n.resolved && ['admin_request', 'password_reset'].indexOf(n.type) > -1) upd_('Notifications', n.id, { userId: next.id }); });
        note_(next.id, 'The previous main admin deleted their account. You are now the main admin.', { type: 'account_deleted' });
      }
      rest.forEach(a => note_(a.id, 'Admin "' + name + '" deleted their account. Their past bookings are kept in the records.', { type: 'account_deleted' }));
      delWhere_('Admins', 'id', c.id);
    }
    delWhere_('Sessions', 'userId', c.id);
    delWhere_('Notifications', 'userId', c.id);
    delWhere_('Verifications', 'id', id);
    log_((c.role === 'admin' ? 'Admin' : 'Committee') + ' account deleted by the owner: ' + name, name);
    return true;
  } },

  saveSettings: { admin: 1, fn: (d, c) => {
    if (Array.isArray(d.categories)) setSetting_('categories', JSON.stringify(list_(d.categories, 'event categories')));
    if (Array.isArray(d.committeeTypes)) setSetting_('committeeTypes', JSON.stringify(list_(d.committeeTypes, 'committee types')));
    log_('Updated settings', c.name); return true;
  } },

  uploadImage: { admin: 1, fn: d => {
    if (['image/png', 'image/jpeg', 'image/webp'].indexOf(d.mime) < 0) fail_('Select a PNG, JPG or WEBP image.');
    if (!d.data || d.data.length > 3500000) fail_('This image is too big. Select an image under 2.5 MB.');
    const f = DriveApp.getFolderById(FOLDER_ID).createFile(Utilities.newBlob(Utilities.base64Decode(d.data), d.mime, 'img_' + Date.now()));
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { url: 'https://lh3.googleusercontent.com/d/' + f.getId() };
  } },

  /* backup: data only (every Sheet tab except sessions). Venue photos are NOT included; upload them again later. */
  exportBackup: { admin: 1, fn: (d, c) => {
    if (!c.rec.isSuper) fail_('Only the main admin can download the full backup.');
    const tables = {}, counts = {};
    BACKUP_TABLES.forEach(n => {
      tables[n] = rows_(n);
      if (n === 'Venues') tables[n].forEach(v => { v.photo = ''; });
      counts[n] = tables[n].length;
    });
    log_('Downloaded full JSON backup', c.name);
    return { meta: { app: 'CampusHub-Backup', schemaVersion: SCHEMA_VERSION, exportedAt: iso_(), exportedBy: c.name, counts: counts, photosIncluded: false }, tables: tables, files: {} };
  } },

  restoreBackup: { admin: 1, fn: (d, c) => {
    if (!c.rec.isSuper) fail_('Only the main admin can restore a backup.');
    if (d.phrase !== 'RESTORE') fail_('Type RESTORE to confirm.');
    if (!checkPw_(d.password, c.rec)) fail_('Incorrect password.');
    const bk = d.backup;
    if (!bk || !bk.meta || bk.meta.app !== 'CampusHub-Backup' || !bk.tables || typeof bk.tables !== 'object') fail_('This is not a CampusHub backup file.');
    const data = {};
    BACKUP_TABLES.forEach(n => {
      const list = bk.tables[n] === undefined ? [] : bk.tables[n];
      if (!Array.isArray(list) || list.some(r => !r || typeof r !== 'object' || Array.isArray(r))) fail_('The backup file is damaged (table ' + n + ').');
      data[n] = list;
    });
    if (!data.Admins.some(a => a.status === 'approved' && a.isSuper)) fail_('The backup has no main admin account, so it cannot be restored.');
    data.Venues.forEach(v => { v.photo = ''; }); // photos are never restored
    Object.keys(T).forEach(clearSheet_); // also signs everyone out
    BACKUP_TABLES.forEach(n => bulk_(n, data[n]));
    seedDefaults_(false);
    convertOldIds_();
    return true;
  } },

  factoryReset: { admin: 1, fn: (d, c) => {
    if (!c.rec.isSuper) fail_('Only the main admin can reset the system.');
    if (d.phrase !== 'RESET') fail_('Type RESET to confirm.');
    if (!checkPw_(d.password, c.rec)) fail_('Incorrect password.');
    Object.keys(T).forEach(clearSheet_);
    seedDefaults_(true); // the system is new again, so the starting lists return
    const files = DriveApp.getFolderById(FOLDER_ID).getFiles();
    while (files.hasNext()) files.next().setTrashed(true);
    return true;
  } }
};
/* ---------- entry points ---------- */
function doGet() { return ContentService.createTextOutput('CampusHub is running.'); }
function doPost(e) {
  let out; const lock = LockService.getScriptLock();
  try {
    const r = JSON.parse(e.postData.contents), a = Object.prototype.hasOwnProperty.call(A, r.action) ? A[r.action] : null;
    if (!a) fail_('Something went wrong. Please try again.');
    lock.waitLock(25000);
    if (LIMITED.indexOf(r.action) > -1 && tooMany_(r.action, r.data || {})) fail_('Too many attempts. Please wait a few minutes and try again.');
    const c = a.pub ? null : auth_(r.token);
    if (a.admin && c.role !== 'admin') fail_('Only an admin can do this.');
    out = { ok: true, data: a.fn(r.data || {}, c, r.token) };
  } catch (err) {
    if (!err.user) Logger.log(err && err.stack || err);
    out = { ok: false, error: err.user ? err.message : 'Something went wrong. Please try again.', code: err.code || '' };
  } finally { try { lock.releaseLock(); } catch (x) { } }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
