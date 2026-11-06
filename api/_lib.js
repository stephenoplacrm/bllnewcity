// Dùng chung cho các hàm API: nói chuyện với Upstash Redis qua REST, kiểm tra dữ liệu, kiểm tra khóa quản trị.
"use strict";
const crypto = require("node:crypto");

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const HASH = "bll:regs";

const TOWERS = ["Babylon", "Venice", "Hawaii", "Bali"];
const ROLES = { chu_so_huu: "Chủ sở hữu", nguoi_thue: "Người thuê" };
const CHOICES = { ung_ho: "Đồng ý ủng hộ", can_tim_hieu: "Cần tìm hiểu thêm" };
const STATUSES = { moi: "Mới", da_lien_he: "Đã liên hệ", da_ky_giay: "Đã ký phiếu giấy" };

async function redis(commands) {
  if (!URL_ || !TOKEN) throw new Error("Chưa kết nối cơ sở dữ liệu (thiếu biến môi trường Upstash).");
  const r = await fetch(URL_.replace(/\/$/, "") + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error("Redis " + r.status);
  const out = await r.json();
  return out.map(x => { if (x.error) throw new Error(x.error); return x.result; });
}

function clean(s, max) { return String(s ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max); }
function normPhone(s) {
  let p = String(s ?? "").replace(/[\s.\-()]/g, "");
  if (p.startsWith("+84")) p = "0" + p.slice(3);
  else if (p.startsWith("84") && p.length === 11) p = "0" + p.slice(2);
  return /^0\d{9}$/.test(p) ? p : null;
}
function adminOk(req) {
  const given = String(req.headers["x-admin-key"] || "");
  const want = String(process.env.ADMIN_KEY || "");
  if (want.length < 16) return false;
  const a = Buffer.from(given), b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function clientIp(req) { return String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || String(req.headers["x-real-ip"] || "") || "?"; }

module.exports = { redis, HASH, TOWERS, ROLES, CHOICES, STATUSES, clean, normPhone, adminOk, clientIp };
