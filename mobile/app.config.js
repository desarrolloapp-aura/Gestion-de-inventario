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
        // foregroundImage: "./assets/icon.png", // Descomentar cuando tengas el icono (1024x1024 px)
        backgroundColor: "#111827"
      },
      package: "com.aura.mobile",
      permissions: [
        "CAMERA"
      ]
    },
    // icon: "./assets/icon.png", // Descomentar cuando tengas el icono (1024x1024 px)
    web: {
    },
    plugins: [
      [
        "expo-camera",
        {
          cameraPermission: "Permitir acceso a la cámara para escanear códigos QR"
        }
      ]
    ],
    scheme: "aura",
    extra: {
      // URL del backend en producción (Render)
      apiUrl: process.env.API_URL || "https://aura-backend-u905.onrender.com",
      eas: {
        projectId: "6cfe36ce-1b8e-4173-afdd-9b703f8d2879"
      }
    }
  }
};

