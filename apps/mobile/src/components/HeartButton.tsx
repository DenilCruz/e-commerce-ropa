import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFavoritosStore } from '../store/favoritos.store';

interface HeartButtonProps {
  productoId: string;
  size?: number;
}

export const HeartButton: React.FC<HeartButtonProps> = ({ productoId, size = 24 }) => {
  const { esFavorito, toggleFavorito } = useFavoritosStore();
  const active = esFavorito(productoId);

  return (
    <TouchableOpacity 
      style={styles.button}
      onPress={() => toggleFavorito(productoId)}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={active ? 'heart' : 'heart-outline'} 
        size={size} 
        color={active ? '#ef4444' : '#111827'} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.8)',
  }
});
