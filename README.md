# Dynamic QR Code Generator

Generate a QR code whose **destination URL you can change anytime** —
the printed/downloaded QR image itself never changes. Also includes a
full visual design editor: logo embedding, dot shapes, corner styles,
colors/gradients, transparent background, and export as PNG / JPEG /
WebP / SVG.

## How the "dynamic" part works

A QR code just encodes text — usually a URL. Once you print it, that
text is fixed forever. So instead of encoding your real destination
directly, this app encodes a short link that points **to itself**:

```
Your printed QR  →  https://yourdomain.com/r/abc123
                          │
                          ▼
                  server looks up "abc123"
                          │
                          ▼
                 redirects to whatever URL
                 you currently have saved
```

You can update the "abc123 → destination" mapping as many times as
you like from the web UI. The QR image is untouched — because it only
ever pointed at `/r/abc123`, not at the real destination.

## Features

- Create a dynamic short link and its QR code in one click
- Update the destination URL anytime without regenerating the QR
- Upload a logo to embed in the center of the QR code
- Choose dot style: square, dots, rounded, classy, classy-rounded, extra-rounded
- Choose corner square & corner dot styles independently
- Custom colors, gradient fill, transparent background
- Export as PNG, JPEG, WebP, or scalable SVG
- No database setup — uses a simple JSON file for storage
- No user accounts — each link gets a private "owner token" stored in
  your browser so only you can edit it

## Getting started

```bash
git clone <this-repo-url>
cd dynamic-qr-generator
npm install
npm start
```

Then open `http://localhost:3000`.

## Deploying

This is a plain Node/Express app, so it runs on Render, Railway, Fly.io,
a VPS, etc. Just make sure:

1. The `data/` folder is writable (or swap `db.js` for a real database —
   every function is already `async`-shaped for an easy swap).
2. You set `PORT` if your host requires it (defaults to `3000`).
3. Your domain is what gets embedded in the QR, since the redirect
   route is `/r/:code` on whatever host you deploy to.

## API

| Method | Route             | Body                                | Notes                                  |
|--------|-------------------|--------------------------------------|-----------------------------------------|
| POST   | `/api/links`       | `{ targetUrl }`                     | Creates a link, returns `code` + `ownerToken` |
| GET    | `/api/links/:code` | –                                    | Public info (no secret required)        |
| PUT    | `/api/links/:code` | `{ targetUrl, ownerToken }`         | Updates the destination                 |
| DELETE | `/api/links/:code` | `{ ownerToken }`                    | Deletes the link                        |
| GET    | `/r/:code`          | –                                    | Redirects to the current destination    |

**Keep your `ownerToken` safe** — it's the only thing that lets you
edit or delete a link later. The web UI stores it in `localStorage`
automatically.

## Tech stack

- Backend: Node.js + Express, JSON file storage (`db.js`)
- Frontend: plain HTML/CSS/JS + [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) for rendering/customizing the QR code client-side

## License

MIT — do whatever you want with it.
