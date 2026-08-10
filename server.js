// server.js
// The core idea of a "dynamic" QR code: the QR image encodes a link to
// THIS server (e.g. https://yourdomain.com/r/abc123), never the real
// destination directly. When someone scans the code, this server looks
// up "abc123" and 302-redirects them to whatever URL you currently have
// saved. Because the QR always points at the same /r/abc123 link, you
// can change the destination as many times as you want and the QR
// image itself never has to change or be reprinted.

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { customAlphabet } = require("nanoid");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// Short, URL-safe, unambiguous codes (no 0/O/1/l confusion)
const nanoid = customAlphabet(
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz",
  7
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
// Serve the QR styling library locally (no CDN dependency, works even
// with no internet / blocked CDNs once npm install has run once).
app.use(
  "/vendor/qr-code-styling",
  express.static(path.join(__dirname, "node_modules", "qr-code-styling", "lib"))
);

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// ---------- API ----------

// Create a new dynamic QR "link". Returns the code + a secret ownerToken.
// SAVE the ownerToken client-side (we store it in localStorage) — it's
// required to edit or delete the link later. There are no user accounts;
// this keeps the project dead simple to self-host.
app.post("/api/links", (req, res) => {
  const { targetUrl } = req.body || {};
  if (!targetUrl || !isValidUrl(targetUrl)) {
    return res.status(400).json({ error: "Please provide a valid http(s) URL." });
  }
  const code = nanoid();
  const ownerToken = crypto.randomBytes(24).toString("hex");
  const entry = db.createCode(code, targetUrl, ownerToken);
  res.json({
    code: entry.code,
    targetUrl: entry.targetUrl,
    ownerToken,
    redirectUrl: `${req.protocol}://${req.get("host")}/r/${code}`
  });
});

// Look up current info for a code (no secret needed, read-only)
app.get("/api/links/:code", (req, res) => {
  const entry = db.getCode(req.params.code);
  if (!entry) return res.status(404).json({ error: "not_found" });
  res.json({
    code: entry.code,
    targetUrl: entry.targetUrl,
    visits: entry.visits,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  });
});

// Update the destination URL — this is what lets the QR "stay the same"
// while the place it sends people changes.
app.put("/api/links/:code", (req, res) => {
  const { targetUrl, ownerToken } = req.body || {};
  if (!targetUrl || !isValidUrl(targetUrl)) {
    return res.status(400).json({ error: "Please provide a valid http(s) URL." });
  }
  const result = db.updateCode(req.params.code, targetUrl, ownerToken);
  if (result.error === "not_found") return res.status(404).json({ error: "not_found" });
  if (result.error === "forbidden") return res.status(403).json({ error: "forbidden" });
  res.json({ code: result.entry.code, targetUrl: result.entry.targetUrl });
});

app.delete("/api/links/:code", (req, res) => {
  const { ownerToken } = req.body || {};
  const result = db.deleteCode(req.params.code, ownerToken);
  if (result.error === "not_found") return res.status(404).json({ error: "not_found" });
  if (result.error === "forbidden") return res.status(403).json({ error: "forbidden" });
  res.json({ ok: true });
});

// ---------- Redirect (this is what the QR code actually points to) ----------
app.get("/r/:code", (req, res) => {
  const entry = db.getCode(req.params.code);
  if (!entry) return res.status(404).send("This QR link does not exist or was deleted.");
  db.incrementVisit(req.params.code);
  res.redirect(302, entry.targetUrl);
});

app.listen(PORT, () => {
  console.log(`Dynamic QR server running at http://localhost:${PORT}`);
});
