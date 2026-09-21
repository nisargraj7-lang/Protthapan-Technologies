# Email setup for protthapan24.vercel.app

Files in this folder (put ALL of them in the root of your Vercel project):
- index.html        (your website, already wired to send emails)
- api/              (3 server files)
- package.json, vercel.json

## 1. Gmail App Password (the sender account)
1. Pick the Gmail account that will send the mails.
2. Google Account -> Security -> turn ON 2-Step Verification.
3. Google Account -> Security -> App passwords -> create one -> copy the 16-character password.

## 2. Firebase service account
Firebase Console (project: protthapan-website) -> Project settings -> Service accounts
-> Generate new private key. A .json file downloads. Keep it private, never upload it to GitHub.

## 3. Vercel environment variables
Vercel project -> Settings -> Environment Variables. Add:
- GMAIL_USER               = the sender Gmail address
- GMAIL_APP_PASSWORD       = the 16-character app password
- FIREBASE_SERVICE_ACCOUNT = the ENTIRE contents of the .json file
- CRON_SECRET              = any long random string
- SITE_URL                 = https://protthapan24.vercel.app (optional)

## 4. Deploy
Replace your old index.html with this one, add api/, package.json, vercel.json, then redeploy
(git push, or `vercel --prod`).

## 5. Test
- Team Members -> add a member with your own email -> welcome email arrives in seconds.
- Daily Log -> post an update -> confirmation email arrives.
- Project Report -> add a project with an owner -> the owner gets an email.
- Daily mail: Vercel -> project -> Settings -> Cron Jobs -> Run.

## When emails are sent
- Member added with email  -> "your email is now connected"
- Task update posted       -> confirmation to that member
- Project given an owner   -> "you are assigned" to the owner
- Every day 9:00 AM IST    -> "your work to do today" (open tasks + owned projects)

Notes
- Daily time is set in vercel.json (30 3 * * * = 3:30 UTC = 9:00 AM IST). On the free plan a cron
  runs once a day, at some point within that hour.
- Gmail's free limit is about 500 emails per day.
