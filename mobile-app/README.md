# LegalEase Mobile Applications (Android & iOS)

This standalone mobile project wraps **LegalEase** into native **Android** (`.aab` / `.apk`) and **iOS** (`.ipa` / Xcode Archive) applications ready for publication on **Google Play Store** and **Apple App Store**.

---

## 1. Project Structure

```text
legalproject/
├── mobile-app/
│   ├── android/              # Native Android Gradle Project (ready for Android Studio)
│   ├── ios/                  # Native iOS Xcode Project (ready for Xcode & App Store)
│   ├── www/                  # Mobile web runtime / offline bundle
│   ├── capacitor.config.ts   # Capacitor mobile bridge configuration
│   └── package.json
```

- **App Identifier (Package Name)**: `pk.legalease.app`
- **App Name**: `LegalEase`

---

## 2. Generating the Android File for Google Play Store (`.aab` / `.apk`)

Google Play Store requires an **Android App Bundle (`.aab`)** for new app submissions.

### Option A: Using Android Studio (Recommended)
1. Download and install **Android Studio** (with Android SDK & Java 17/21).
2. Open Android Studio and choose **Open an Existing Project**.
3. Select the folder: `legalproject/mobile-app/android`.
4. Wait for Gradle sync to complete.
5. In the top menu, click **Build > Generate Signed Bundle / APK**.
6. Select **Android App Bundle** and click **Next**.
7. Create or choose your release Keystore file:
   - Key alias: `legalease`
   - Password: Choose a secure password
8. Select build variant: **`release`**.
9. Click **Finish**.
10. Your release file will be created at:
    ```text
    mobile-app/android/app/release/app-release.aab
    ```
    👉 **Upload this `.aab` file directly to the Google Play Console under Production / Internal Testing.**

### Option B: Command Line (CLI)
Once Android SDK is configured on your machine:
```powershell
cd mobile-app/android
./gradlew bundleRelease
```

---

## 3. Generating the iOS File for Apple App Store (`.ipa` / TestFlight)

Apple requires building and signing on **macOS** with **Xcode** and an active **Apple Developer Account**.

### Steps in Xcode:
1. Copy the `mobile-app` directory (or git pull) to a Mac.
2. Open the Xcode workspace:
   ```bash
   open mobile-app/ios/App/App.xcworkspace
   ```
3. In Xcode, select the **App** project in the left navigator.
4. Go to **Signing & Capabilities**:
   - Check **Automatically manage signing**.
   - Select your registered **Apple Developer Team**.
   - Ensure the Bundle Identifier is `pk.legalease.app`.
5. Select target device: **Any iOS Device (arm64)**.
6. In the top menu, click **Product > Archive**.
7. Once the build finishes, the **Organizer** window appears.
8. Click **Distribute App**:
   - Select **App Store Connect**.
   - Click **Upload** to send directly to TestFlight and App Store Connect, or **Export** to save an `.ipa` file.

---

## 4. Production Domain Configuration

In `mobile-app/capacitor.config.ts`:
```typescript
server: {
  // Uncomment and set your live URL when your website is deployed:
  // url: 'https://legalease.pk',
  cleartext: true,
  androidScheme: 'https'
}
```
After updating any configuration, run:
```powershell
cd mobile-app
npx cap sync
```

