import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStore } from '../store/network.store';

export const OfflineBanner: React.FC = () => {
  const { isConnected, isInitialized } = useNetworkStore();
  const slideAnim = useRef(new Animated.Value(-50)).current;

  const showBanner = isInitialized && !isConnected;

  useEffect(() => {
    if (showBanner) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [showBanner, slideAnim]);

  if (!showBanner) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
      <Text style={styles.text}>Modo sin conexión · Navegando en catálogo guardado</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#b45309', // Amber 700 elegante
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
