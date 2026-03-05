# Card Game Companion App

This is a mobile-first web application designed as a companion for a physical card game. Players scan QR codes on cards to play specific music or videos.

## Features

- **QR Scanning**: Uses the device camera to scan QR codes.
- **Card Mapping**: Maps card IDs to YouTube video IDs via a server-side database.
- **Minimal Player**: Plays videos in a clean, distraction-free interface.
- **Mobile-First**: Optimized for iOS Safari and Android Chrome.

## How it Works

1. **Home**: Click "START PLAYING" to open the scanner.
2. **Scan**: Point your camera at a card's QR code.
3. **Play**: The app detects the card ID and automatically loads the associated YouTube video.
4. **Repeat**: Click "Scan Next Card" to return to the scanner.

## QR Code Format

Generate QR codes containing URLs in the following format:
`https://<your-domain>/c/<card_id>`

Example:
- `https://mysite.com/c/1`
- `https://mysite.com/c/142`

The app also supports scanning just the numeric ID if the QR code only contains the number.

## Adding New Cards

Cards are stored in a SQLite database (`cards.db`). You can add new mappings in `server.ts` or by interacting with the database directly.

Example mapping in `server.ts`:
```typescript
db.prepare("INSERT INTO cards (id, youtube_id) VALUES (?, ?)").run("142", "dQw4w9WgXcQ");
```

## Local Development

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Open `http://localhost:3000` in your browser.

## Deployment

The app is built as a full-stack Express + Vite application.
1. Run `npm run build` to generate the frontend assets.
2. Ensure `NODE_ENV=production` is set.
3. Start the server: `npm start` (or `node server.ts`).
