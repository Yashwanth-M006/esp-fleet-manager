# ESP Fleet Management Dashboard

A full-stack web application designed to manage fleets of ESP32/ESP8266 devices. Monitor real-time telemetry and manage OTA firmwares dynamically over MQTT (WebSockets).

## Features
- **Project-based Access**: Group your devices logically by project.
- **Firebase Auth & Firestore**: Secure email/password login and persistent device storage.
- **Dynamic MQTT Configuration**: Connect to any MQTT broker over Secure WebSockets (`wss://`).
- **Real-time Telemetry**: Custom sensor fields stream dynamically to the dashboard.
- **OTA Updates**: Push firmware update URLs directly from the UI to your devices.
- **Offline Detection**: Devices are marked offline automatically if no status message is received for 10 seconds.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS, `lucide-react`
- **Backend/DB**: Firebase Authentication, Cloud Firestore
- **Real-time**: `mqtt` (MQTT.js)

## Setup Instructions

### 1. Firebase Setup
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. Enable **Authentication** (Email/Password provider).
4. Enable **Firestore Database** and set up security rules.
5. Get your Firebase config object from the Project Settings.

### 2. MQTT Broker Setup
You'll need an MQTT broker that supports WebSockets (e.g., HiveMQ Cloud, Mosquitto, EMQX).
- **Protocol**: `wss://`
- **Port**: Typically `8883` or `443` for secure WebSockets.

### 3. Local Environment variables
Create a `.env.local` file in the root of the project and replace the placeholders with your Firebase credentials:

```ini
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Running Locally
Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to explore the dashboard.

## Firestore Security Rules Example
To ensure users only read/write their own data, use rules like:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      // Also allow creation if setting own userId
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    match /devices/{deviceId} {
      // Basic rule: must be logged in. In production, ensure device belongs to user's project.
      allow read, write: if request.auth != null; 
    }
  }
}
```

## ESP Device Implementation Guide
Your ESP device code should do the following:

1. **Status**: Publish `"online"`, `"updating"`, `"error"`, etc. to the `status_topic` (e.g. `devices/esp32_01/status`) regularly (e.g. every 5s) to prevent the dashboard timeout.
2. **Telemetry**: Publish sensor values (numbers or strings) to the corresponding `topic` mapped in the dashboard (e.g. `devices/esp32_01/temp`).
3. **OTA**: Subscribe to the `ota_topic` (e.g. `devices/esp32_01/ota`). When a message arrives looking like `{"action":"ota","url":"https://..."}`, download and apply the firmware. Wait to update the `status_topic` to `"updating"` during the process.
