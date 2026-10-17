# CampusHub - Google Sheet + Apps Script edition

Same UI and features as the Node.js / Express / MySQL edition. Database = Google Sheet, backend = `backend/Code.gs`.

## Setup
1. Create a Google Sheet (empty) and a Google Drive folder (for venue photos).
2. Apps Script (Extensions > Apps Script): paste `backend/Code.gs`.
3. Project Settings > Script properties: add `SHEET_ID` (the Sheet's ID) and `FOLDER_ID` (the Drive folder's ID).
4. Run `setup()` once from the editor and accept the permissions. It creates every tab and the starting lists.
5. Deploy > New deployment > Web app: Execute as **Me**, access **Anyone**. Copy the Web app URL.
6. Put the URL in `js/config.js` (`WEB_APP_URL`). Host the folder as a static site
   (Render: Build Command `node build.js`, Publish Directory `dist`, env var `WEB_APP_URL`).
7. Open the site and use **Admin sign up**: the first admin becomes the main admin.

After changing Code.gs, use Deploy > Manage deployments > Edit > New version.

## Sheet tabs
Settings, Users, Admins, DeletedAccounts, Venues, Closures, Bookings, Chats, Notifications, Logs, Sessions, Verifications.

## Notes
- Backup/Restore (main admin) = JSON of every tab except Sessions/Verifications. Venue photos are NOT included; upload again after a restore.
- Login/signup/forgot-password are limited to 20 tries per 10 minutes per account name (Apps Script cannot see IPs).
- All fonts and icons are in `assets/` (no CDN).
