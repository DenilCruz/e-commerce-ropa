import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './navigation/RootNavigator';
import { OfflineBanner } from './components/OfflineBanner';
import { useNetworkStore } from './store/network.store';

export default function App() {
  useEffect(() => {
    const unsubscribe = useNetworkStore.getState().initNetworkListener();
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <OfflineBanner />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
