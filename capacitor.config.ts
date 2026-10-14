import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fiados.app',
  appName: 'FiadOS',
  webDir: 'www',
  // La interfaz se incluye en la app. La API se selecciona en el login.
  // No configurar server.url: haría depender la app de ionic serve.
  // XAMPP usa HTTP. Mantener el origen local HTTP evita contenido mixto con Axios.
  server: { androidScheme: 'http' },
};

export default config;
