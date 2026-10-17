 
 
 
function settingsList(key) {
    const items = (state.settings && state.settings[key]) || [];
    return `<div class="st-card"><h3>${LISTS[key]}</h3>
        <p class="st-hint">${key === 'categories' ? 'Shown in the booking form when someone books a venue.' : 'Shown when a committee registers.'}</p>
        <ul class="st-list">${items.map((t, i) => `<li><span>${escHtml(t)}</span><span class="st-actions">
            <button type="button" onclick="editListItem('${key}', ${i})" class="st-btn-sm" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button type="button" onclick="removeListItem('${key}', ${i})" class="st-btn-sm st-del" title="Delete"><i class="fa-solid fa-trash"></i></button></span></li>`).join('') || '<li class="st-hint">Nothing added yet.</li>'}</ul>
        <div class="st-row"><input id="st-new-${key}" placeholder="Add new" autocomplete="off" onkeydown="if(event.key==='Enter'){event.preventDefault();addListItem('${key}')}">
        <button type="button" onclick="addListItem('${key}')" class="st-btn">Add</button></div></div>`;
}
function viewSettings() {
    const admins = state.admins || [];
    return `<div class="st-wrap">
        <div class="st-grid">${settingsList('categories')}${settingsList('committeeTypes')}</div>

        <div class="st-card"><h3>Create Committee Account</h3>
            <p class="st-hint">The account is active immediately. Share the password with the committee in person.</p>
            <form onsubmit="createCommittee(event)" class="st-form">
                <label>Committee name<input id="nc-name" required maxlength="80" autocomplete="off"></label>
                <label>Committee type<select id="nc-type" required>${COMMITTEE_TYPES.map(t => `<option>${escHtml(t)}</option>`).join('')}</select></label>
                <label>In-charge name<input id="nc-inc" required maxlength="80" autocomplete="off"></label>
                <label>Contact number<input id="nc-phone" required type="tel" inputmode="numeric" maxlength="10" pattern="[0-9]{10}" title="10 digits" autocomplete="off"></label>
                <label>Password<input id="nc-pass" required type="password" minlength="6" autocomplete="new-password"></label>
                <div class="st-form-btn"><button class="st-btn">Create account</button></div>
            </form></div>

        <div class="st-card"><h3>Admin Accounts</h3>
            <div class="st-table-wrap"><table class="st-table"><thead><tr><th>Name</th><th>Username</th><th>Created</th><th>Role</th></tr></thead><tbody>
            ${admins.filter(a => a.status === 'approved').map(a => `<tr><td>${escHtml(a.name)}</td><td>${escHtml(a.username)}</td><td>${a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td><td>${a.isSuper ? 'Main admin' : 'Admin'}</td></tr>`).join('')}
            </tbody></table></div></div>

        ${viewAdminAccount()}

        ${deletedArchive()}

        ${viewReports()}
    </div>`;
}

 
function viewAdminAccount() {
    const me = (state.admins || []).find(a => a.id === state.currentUser.id) || {};
    return `<div class="st-card"><h3>My Account</h3>
        <p class="st-hint">${me.isSuper ? 'You are the main admin.' : 'You are an admin.'} Username: <b>${escHtml(me.username || '')}</b></p>
        <div class="st-form">
            <label>Name<input id="ma-name" maxlength="80" value="${escHtml(me.name || '')}" autocomplete="off"></label>
            <label>Phone number<input id="ma-phone" type="tel" inputmode="numeric" maxlength="10" value="${escHtml(me.phone || '')}" autocomplete="off"></label>
            <label>New password<input id="ma-pass" type="password" placeholder="Leave blank to keep current" autocomplete="new-password"></label>
            <div class="st-form-btn"><button type="button" class="st-btn" onclick="saveAdminProfile()">Save changes</button></div>
        </div>
        <div class="danger-card" style="margin-top:18px">
            <h3><i class="fa-solid fa-triangle-exclamation mr-2"></i>Delete my admin account</h3>
            <p>Your account will be removed. Bookings you made stay in the records with your name. ${me.isSuper ? 'Because you are the main admin, the oldest remaining admin becomes the main admin.' : ''} This needs a 2-step confirmation.</p>
            <button type="button" onclick="startDeleteAccount()" class="btn-danger">Delete my account</button>
        </div>
    </div>`;
}

 
function deletedArchive() {
    const list = (state.deletedAccounts || []).slice().reverse();
    return `<div class="st-card"><h3>Deleted Accounts (records)</h3>
        <p class="st-hint">People who deleted their own account. Their bookings are kept in All Bookings with their name.</p>
        <div class="st-table-wrap"><table class="st-table"><thead><tr><th>Name</th><th>Type</th><th>Deleted on</th><th>Bookings cancelled</th></tr></thead><tbody>
        ${list.map(d => `<tr><td>${escHtml(d.name)}</td><td>${escHtml(d.role === 'admin' ? d.type : 'Committee')}</td><td>${fmtStamp(d.deletedAt)}</td><td>${d.role === 'admin' ? '-' : escHtml(d.bookingsCancelled)}</td></tr>`).join('') || '<tr><td colspan="4" style="color:#94a3b8">No account has been deleted.</td></tr>'}
        </tbody></table></div></div>`;
}
