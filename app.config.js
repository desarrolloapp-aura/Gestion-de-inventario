export default {
  expo: {
    name: "Aura Ingeniería",
    slug: "aura-mobile",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    splash: {
      backgroundColor: "#111827"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.aura.mobile"
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#111827"
      },
      package: "com.aura.mobile",
      permissions: [
        "CAMERA"
      ]
    },
    web: {
    },
    plugins: [
      [
        "expo-camera",
        {
          cameraPermission: "Permitir acceso a la cámara para escanear códigos QR"
        }
      ],
      [
        "expo-barcode-scanner",
        {
          barCodeTypes: ["qr"]
        }
      ]
    ],
    scheme: "aura",
    extra: {
      apiUrl: process.env.API_URL || "http://192.168.1.113:8000",
      eas: {
        projectId: "6cfe36ce-1b8e-4173-afdd-9b703f8d2879"
      }
    }
  }
};

