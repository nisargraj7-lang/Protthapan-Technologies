// Runs every morning via Vercel Cron (see vercel.json).
// Emails each member "your work to do today": open tasks + projects they own.
const { db, COLLECTIONS, STATUS_LABEL, sendMail, esc, layout } = require('./_lib');

module.exports = async (req, res) => {
  // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const firestore = db();
    const [membersSnap, tasksSnap, projectsSnap] = await Promise.all([
      firestore.collection(COLLECTIONS.members).get(),
      firestore.collection(COLLECTIONS.tasks).get(),
      firestore.collection(COLLECTIONS.projects).get(),
    ]);

    const openTasks = tasksSnap.docs
      .map((d) => d.data())
      .filter((t) => t.status === 'inprogress' || t.status === 'blocked')
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const projects = projectsSnap.docs.map((d) => d.data());

    let sent = 0;
    for (const doc of membersSnap.docs) {
      const m = { id: doc.id, ...doc.data() };
      if (!m.email) continue;

      const myTasks = openTasks.filter((t) => t.memberId === m.id).slice(0, 10);
      const myOngoing = projects.filter((p) => p.ownerId === m.id && p.status === 'ongoing');
      const myUpcoming = projects.filter((p) => p.ownerId === m.id && p.status === 'upcoming');

      let body = '';
      if (myTasks.length) {
        body += `<h3>Open tasks</h3><ul>${myTasks.map((t) =>
          `<li><b>${esc(STATUS_LABEL[t.status])}:</b> ${esc(t.task)}</li>`).join('')}</ul>`;
      }
      if (myOngoing.length) {
        body += `<h3>Ongoing projects you own</h3><ul>${myOngoing.map((p) => `<li>${esc(p.name)}</li>`).join('')}</ul>`;
      }
      if (myUpcoming.length) {
        body += `<h3>Upcoming projects</h3><ul>${myUpcoming.map((p) => `<li>${esc(p.name)}</li>`).join('')}</ul>`;
      }
      if (!body) body = `<p>Nothing is assigned to you right now. Please post today's plan in the Daily Log.</p>`;

      await sendMail({
        to: m.email,
        subject: `Your work to do today, ${m.name}`,
        html: layout(`Good morning, ${m.name}`, `<p>Here is your work for today:</p>${body}`),
      });
      sent++;
    }
    return res.json({ ok: true, sent });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'reminder failed' });
  }
};
