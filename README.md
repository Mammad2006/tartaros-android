# Tartaros Android Build

This project is configured for GitHub Actions + Capacitor Android.

## Build APK on GitHub

1. Create a GitHub repository (for example `tartaros-android`).
2. Upload the contents of this project to the repository root.
3. Push to the `main` branch.
4. Open **Actions** in GitHub and select **Build Tartaros Android APK**.
5. Wait for the workflow to finish successfully.
6. Open the completed workflow run and scroll to **Artifacts**.
7. Download **Tartaros-APK** and extract `app-debug.apk`.

You can also start the build manually from:
**Actions → Build Tartaros Android APK → Run workflow**.

## Android behavior

- Landscape orientation is forced.
- Android status/navigation system bars are hidden with immersive full-screen mode.
- The game uses the full screen area on supported Android devices.
- The Tartaros launcher icon is generated from `resources/icon.png` for all Android densities.
- The in-game Exit button calls Capacitor's native `exitApp()` on Android, so the application closes instead of returning to the intro screen.

## Important

The GitHub workflow creates the native `android/` project during the build, so you do **not** need to commit the generated `android/` folder.
