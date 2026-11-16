# Deploying BizzPal to the Google Cloud VM

BizzPal runs on one Compute Engine VM with PM2. The database is a single SQLite file kept **outside** the app folder, so a deploy never touches customer data.

## One-time setup on the VM

1. Install Node.js 22.13 or newer and PM2.
2. Create the app folder (`/home/it/bizzpal`) and the data folder (`/home/it/bizzpal-data`).
3. Create `/home/it/bizzpal/.env` with the settings listed in the README. On the live server it must contain at least:
   - `SUPERADMIN_PASSCODE`, `ADMIN_SESSION_SECRET`, `SECRETS_KEY`
   - `APP_URL` and `NEXT_PUBLIC_APP_URL`
   - `BIZZPAL_DATA_DIR=/home/it/bizzpal-data`
   - the Google sign-in settings, and the Razorpay keys for real payments
   - **not** `ALLOW_SIMULATED_PAYMENTS`
4. Start the app under PM2 the first time, then make it start on reboot:

   ```bash
   cd /home/it/bizzpal
   export PM2_HOME=/home/it/.pm2
   pm2 start npm --name bizzpal -- start
   pm2 save && pm2 startup     # run the one extra line it prints
   ```

5. Add the daily database backup:

   ```bash
   (crontab -l 2>/dev/null; echo "0 2 * * * cd /home/it/bizzpal && BIZZPAL_DATA_DIR=/home/it/bizzpal-data node scripts/backup-db.mjs >> /home/it/backup.log 2>&1") | crontab -
   ```

## Every deploy

On your computer, make an archive of the source (leaving out settings, data and build output):

```bash
tar -czf bizzpal_update.tar.gz --exclude=node_modules --exclude=.next --exclude=.git --exclude='.env*' --exclude=data --exclude='*.tar.gz' .
```

Upload `bizzpal_update.tar.gz` to the VM's home folder with the **Upload file** button in the SSH window, then run:

```bash
cd /home/it/bizzpal
tar -xzf ~/bizzpal_update.tar.gz -C /home/it/bizzpal
npm install --no-audit --no-fund
NODE_OPTIONS="--max-old-space-size=2048" npm run build
export PM2_HOME=/home/it/.pm2
pm2 restart bizzpal --update-env
pm2 status
```

Check it is up:

```bash
curl -s localhost:3000/api/health        # {"ok":true,...}
```

## Rolling back

Keep the previous `bizzpal_update.tar.gz` and repeat the deploy steps with it. The database is never replaced by a deploy. Daily backups are in `/home/it/bizzpal-data/backups`.

## Things to know

- Customers have to sign in again after a deploy that changes how sign-in works.
- Plan and credit purchases need real Razorpay keys on the live server.
- Google Drive needs `GOOGLE_PICKER_API_KEY` and `GOOGLE_PROJECT_NUMBER`; OneDrive needs the Microsoft settings.
- Back up `.env` somewhere safe. It is not in git and not in the deploy archive.
