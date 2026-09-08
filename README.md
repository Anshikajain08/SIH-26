<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/089a8fd1-b8d8-481e-91d2-ab7329ef827c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` to your Gemini API key. The key is read only by the local Express server.
3. Start the AI proxy in one terminal:
   `npm run server:dev`
4. Start the app in another terminal:
   `npm run dev`

The browser app uses Gemini for structured field-event extraction through `http://localhost:3001`. If the AI server or key is unavailable, custom-text ingestion falls back to the deterministic parser. The existing matching engine remains the schedule-governance gate.
