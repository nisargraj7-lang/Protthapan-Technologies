// POST /api/notify   body: { type: "welcome" | "task" | "project", id: "<firestore doc id>" }
// The recipient is read from Firestore on the server, so nobody can use this
// endpoint to send mail to an arbitrary address. Each doc is emailed only once.
const { admin, db, COLLECTIONS, STATUS_LABEL, sendMail, esc, layout, getMember } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { type, id } = req.body || {};
    console.log(`-------------${type}, ID-------:  ${id}`)
    if (!type || !id || typeof id !== 'string') return res.status(400).json({ error: 'type and id are required' });

    const firestore = db();
    const stamp = admin.firestore.FieldValue.serverTimestamp();

    // 1) New member added: "your email is connected"
    if (type === 'welcome') {
      const ref = firestore.collection(COLLECTIONS.members).doc(id);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: 'member not found' });
      const m = snap.data();
      if (!m.email) return res.json({ skipped: 'member has no email' });
      if (m.welcomeSentAt) return res.json({ skipped: 'already sent' });

      await sendMail({
        to: m.email,
        subject: 'Your email is now connected to Protthapan Technologies',
        html: layout(`Welcome, ${m.name || 'team member'}!`, `
          <p>Your email is now connected to the team website.</p>
          <p>You will get your daily work reminder, task confirmations and project assignments here.</p>
          ${m.role ? `<p><b>Role:</b> ${esc(m.role)}</p>` : ''}`),
      });
      await ref.update({ welcomeSentAt: stamp });
      return res.json({ ok: true });
    }

    // 2) Task update posted: confirmation to that member
    if (type === 'task') {
      const ref = firestore.collection(COLLECTIONS.tasks).doc(id);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: 'task not found' });
      const t = snap.data();
      if (t.emailSentAt) return res.json({ skipped: 'already sent' });

      const member = await getMember(firestore, t.memberId);
      if (!member || !member.email) return res.json({ skipped: 'no email for this member' });

      await sendMail({
        to: member.email,
        subject: `Task update saved: ${STATUS_LABEL[t.status] || t.status}`,
        html: layout(`Hi ${member.name}, your update was saved`, `
          <p><b>Status:</b> ${esc(STATUS_LABEL[t.status] || t.status)}</p>
          <p><b>Date:</b> ${esc(t.date)}</p>
          <p><b>Work:</b><br>${esc(t.task)}</p>`),
      });
      await ref.update({ emailSentAt: stamp });
      return res.json({ ok: true });
    }

    // 3) Project assigned to someone: email the owner
    if (type === 'project') {
      const ref = firestore.collection(COLLECTIONS.projects).doc(id);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: 'project not found' });
      const p = snap.data();
      if (p.emailSentAt) return res.json({ skipped: 'already sent' });

      const owner = await getMember(firestore, p.ownerId);
      if (!owner || !owner.email) return res.json({ skipped: 'owner has no email' });

      const kind = p.status === 'ongoing' ? 'an ongoing project' : 'an upcoming project';
      await sendMail({
        to: owner.email,
        subject: `You are assigned to: ${p.name}`,
        html: layout(`Hi ${owner.name}, you have new work`, `
          <p>You are the owner of ${kind}:</p>
          <p><b>${esc(p.name)}</b></p>
          ${p.description ? `<p>${esc(p.description)}</p>` : ''}`),
      });
      await ref.update({ emailSentAt: stamp });
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'unknown type' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'failed to send email' });
  }
};
