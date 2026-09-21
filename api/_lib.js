// Shared helpers: Firebase Admin, Gmail sender, email template.
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Matches your Firestore collections in index.html
const COLLECTIONS = { members: 'members', tasks: 'tasks', projects: 'projects' };
const STATUS_LABEL = { inprogress: 'In progress', done: 'Completed', blocked: 'Blocked' };

function db() {
  if (!admin.apps.length) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  return admin.firestore();
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from: `"Protthapan Technologies" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

// Escape user-written text before putting it in HTML
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function layout(title, bodyHtml) {
  const site = process.env.SITE_URL || 'https://protthapan24.vercel.app';
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
    <div style="background:#1f2937;color:#fff;padding:16px 20px;font-size:18px">Protthapan Technologies</div>
    <div style="padding:20px;color:#111827;line-height:1.5">
      <h2 style="margin-top:0">${esc(title)}</h2>
      ${bodyHtml}
      <p style="margin-top:24px"><a href="${site}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open the website</a></p>
    </div>
  </div>`;
}

async function getMember(firestore, id) {
  if (!id) return null;
  const s = await firestore.collection(COLLECTIONS.members).doc(id).get();
  return s.exists ? { id: s.id, ...s.data() } : null;
}

module.exports = { admin, db, COLLECTIONS, STATUS_LABEL, sendMail, esc, layout, getMember };
