import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/contexts/AuthContext';
import { Routes } from './src/navigation';
import { configureNotificationHandler } from './src/services/notificationService';

// Define como as notificações são exibidas com o app em primeiro plano.
configureNotificationHandler();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Routes />
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
