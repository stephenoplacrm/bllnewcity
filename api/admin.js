"use strict";
const { redis, HASH, TOWERS, ROLES, CHOICES, STATUSES, adminOk } = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (!adminOk(req)) return res.status(404).json({ ok: false });
  try {
    if (req.method === "GET") {
      const [vals] = await redis([["HVALS", HASH]]);
      const rows = (vals || []).map(v => { try { return JSON.parse(v); } catch { return null; } }).filter(Boolean)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return res.status(200).json({ statuses: STATUSES, roles: ROLES, choices: CHOICES, towers: TOWERS, rows });
    }
    if (req.method === "POST") {
      const d = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      if (typeof d.id !== "string" || !STATUSES[d.status]) return res.status(400).json({ ok: false });
      const [old] = await redis([["HGET", HASH, d.id]]);
      if (!old) return res.status(404).json({ ok: false });
      const rec = JSON.parse(old); rec.status = d.status; rec.updated_at = new Date().toISOString();
      await redis([["HSET", HASH, d.id, JSON.stringify(rec)]]);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ ok: false });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false });
  }
};
