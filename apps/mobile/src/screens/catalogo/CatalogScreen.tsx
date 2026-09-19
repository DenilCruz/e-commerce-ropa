import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const CatalogScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Catálogo</Text>
      <Text style={styles.subtitle}>Pantalla lista para listar productos desde el backend.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
