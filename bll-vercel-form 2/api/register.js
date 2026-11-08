"use strict";
const { redis, HASH, TOWERS, ROLES, CHOICES, clean, normPhone, clientIp } = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  try {
    const d = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    if (d.website) return res.status(200).json({ ok: true }); // ô bẫy chống bot

    // Giới hạn tần suất: 10 lượt / 10 phút cho mỗi IP
    const rlKey = "bll:rl:" + clientIp(req);
    const [count] = await redis([["INCR", rlKey], ["EXPIRE", rlKey, 600, "NX"]]);
    if (count > 10) return res.status(429).json({ ok: false, error: "Bạn gửi quá nhiều lần, vui lòng thử lại sau ít phút." });

    const full_name = clean(d.full_name, 80);
    const phone = normPhone(d.phone);
    const tower = clean(d.tower, 20);
    const floor = clean(d.floor, 3);
    const unit = clean(d.unit, 10).toUpperCase();
    const role = clean(d.role, 20);
    const choice = clean(d.choice, 20);
    const note = clean(d.note, 300);
    if (full_name.length < 2) return res.status(400).json({ ok: false, error: "Vui lòng nhập họ và tên." });
    if (!phone) return res.status(400).json({ ok: false, error: "Số điện thoại chưa đúng (10 số, bắt đầu bằng 0)." });
    if (!TOWERS.includes(tower)) return res.status(400).json({ ok: false, error: "Vui lòng chọn tháp." });
    if (!/^\d{1,2}$/.test(floor) || Number(floor) < 1) return res.status(400).json({ ok: false, error: "Vui lòng nhập tầng bằng số (ví dụ: 12)." });
    if (!unit) return res.status(400).json({ ok: false, error: "Vui lòng nhập số căn hộ (ví dụ: 05)." });
    if (!ROLES[role]) return res.status(400).json({ ok: false, error: "Vui lòng chọn chủ sở hữu hoặc người thuê." });
    if (!CHOICES[choice]) return res.status(400).json({ ok: false, error: "Vui lòng chọn một lựa chọn." });
    if (d.consent !== true) return res.status(400).json({ ok: false, error: "Vui lòng đồng ý cho Ban Liên Lạc dùng thông tin để liên hệ." });

    // Mỗi số điện thoại một dòng: đăng ký lại thì cập nhật, giữ nguyên trạng thái và thời điểm đầu.
    const [old] = await redis([["HGET", HASH, phone]]);
    let prev = null; try { prev = old ? JSON.parse(old) : null; } catch {}
    const now = new Date().toISOString();
    const rec = {
      id: phone, created_at: prev ? prev.created_at : now, updated_at: now,
      full_name, phone, tower, floor: String(Number(floor)), unit, role, choice, note, status: prev ? prev.status : "moi",
    };
    await redis([["HSET", HASH, phone, JSON.stringify(rec)]]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Chưa gửi được, vui lòng thử lại hoặc gọi cho Ban Liên Lạc." });
  }
};
