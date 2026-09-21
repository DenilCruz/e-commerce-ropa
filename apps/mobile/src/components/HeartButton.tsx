import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFavoritosStore } from '../store/favoritos.store';
import { useAuthStore } from '../store/auth.store';
import { useNavigation } from '@react-navigation/native';

interface HeartButtonProps {
  productoId: string;
  size?: number;
}

export const HeartButton: React.FC<HeartButtonProps> = ({ productoId, size = 22 }) => {
  const navigation = useNavigation<any>();
  const { user, isAuthenticated } = useAuthStore();
  const { esFavorito, toggleFavorito } = useFavoritosStore();
  const active = esFavorito(productoId);

  const handlePress = async () => {
    if (!isAuthenticated || !user) {
      navigation.navigate('Auth', { screen: 'Login' });
      return;
    }
    await toggleFavorito(user.id, productoId);
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
    padding: 7,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
