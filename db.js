// db.js
// Tiny file-based JSON "database". No external DB required — good enough
// for personal use / small projects. Swap this out for real SQL/Mongo
// later if you need it; every function here is async already so the
// swap is a drop-in.

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "data", "codes.json");

function ensureDb() {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
  }
}

function readAll() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  try {
    return JSON.parse(raw || "{}");
  } catch (e) {
    return {};
  }
}

function writeAll(data) {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Create a new code entry
function createCode(code, targetUrl, ownerToken) {
  const all = readAll();
  all[code] = {
    code,
    targetUrl,
    ownerToken, // simple secret required to edit/delete this code later
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    visits: 0
  };
  writeAll(all);
  return all[code];
}

function getCode(code) {
  const all = readAll();
  return all[code] || null;
}

// Update the destination URL for an existing code (this is the whole point:
// the QR image encodes /r/<code> and never has to be regenerated)
function updateCode(code, targetUrl, ownerToken) {
  const all = readAll();
  const entry = all[code];
  if (!entry) return { error: "not_found" };
  if (entry.ownerToken !== ownerToken) return { error: "forbidden" };
  entry.targetUrl = targetUrl;
  entry.updatedAt = new Date().toISOString();
  writeAll(all);
  return { entry };
}

function deleteCode(code, ownerToken) {
  const all = readAll();
  const entry = all[code];
  if (!entry) return { error: "not_found" };
  if (entry.ownerToken !== ownerToken) return { error: "forbidden" };
  delete all[code];
  writeAll(all);
  return { ok: true };
}

function incrementVisit(code) {
  const all = readAll();
  if (all[code]) {
    all[code].visits = (all[code].visits || 0) + 1;
    writeAll(all);
  }
}

module.exports = {
  createCode,
  getCode,
  updateCode,
  deleteCode,
  incrementVisit
};
