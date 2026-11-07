# LegalEase React Native Application (Expo)

This folder contains the **React Native** cross-platform mobile application for **LegalEase**, ready to run on **Android** and **iOS** using the Expo SDK.

---

## 📁 Folder Structure

```text
legalproject/
├── react-native-app/
│   ├── App.tsx             # Main React Native application code & dynamic server bridge
│   ├── app.json            # Expo configuration (bundle identifier, Android package, permissions)
│   ├── index.js            # Expo root component registration
│   ├── package.json        # Dependencies & start scripts
│   └── README.md           # Setup and execution instructions
```

- **App Name**: `LegalEase`
- **Android Package**: `pk.legalease.app`
- **iOS Bundle Identifier**: `pk.legalease.app`

---

## 🚀 Running the App on Mobile

### 1. Install Dependencies
Navigate into this folder and install dependencies:
```bash
cd react-native-app
npm install --legacy-peer-deps
```

### 2. Start the Expo Development Server
```bash
npx expo start
```

### 3. Open on Your Phone
1. Install **Expo Go** from the **Google Play Store** (Android) or **Apple App Store** (iOS).
2. Scan the QR code shown in your terminal with your phone camera (iOS) or inside the Expo Go app (Android).
3. Ensure your phone is connected to the same Wi-Fi network as your development machine.

---

## 📱 Dynamic Server Connectivity
The app features an interactive connection launcher:
- **Local Wi-Fi Mode**: Connects to `http://192.168.1.36:3000` to interact with your local Next.js server, local Docker Supabase database, and live consultations.
- **Production Mode**: Connects directly to `https://legalease.pk`.
- You can change the server endpoint anytime using the **⚙ Server Settings** button at the top of the app.

---

## 📦 Building Standalone APK / AAB & IPA (App Stores)

To generate standalone production binaries for Google Play Store and Apple App Store:

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```
2. **Log into Expo**:
   ```bash
   eas login
   ```
3. **Configure Project**:
   ```bash
   eas build:configure
   ```
4. **Build Android APK / AAB**:
   ```bash
   # For test APK:
   eas build -p android --profile preview

   # For Google Play Store App Bundle (.aab):
   eas build -p android --profile production
   ```
5. **Build iOS IPA**:
   ```bash
   eas build -p ios --profile production
   ```

