<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/12b18e17-1ac0-44e3-ac43-d145fea1de65

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Android APK build

The GitHub Actions workflow at `.github/workflows/android.yml` builds the Vite app,
creates the Capacitor Android project, forces the Android activity to landscape,
and uploads `app-debug.apk` as the `Tartaros-APK` artifact.
