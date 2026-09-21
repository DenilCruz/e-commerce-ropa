import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  productoId: string;
}

export const ResenasSection: React.FC<Props> = ({ productoId }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reseñas de Clientes</Text>
      <View style={styles.starsRow}>
        <Text style={styles.stars}>★★★★★</Text>
        <Text style={styles.ratingText}>5.0 (2 reseñas)</Text>
      </View>
      <View style={styles.reviewCard}>
        <Text style={styles.reviewUser}>María G. - <Text style={styles.reviewDate}>Hace 2 días</Text></Text>
        <Text style={styles.reviewContent}>¡Excelente calidad! La tela es muy suave y el talle me quedó perfecto. Definitivamente volveré a comprar.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  stars: { color: '#fbbf24', fontSize: 18, letterSpacing: 2 },
  ratingText: { fontSize: 14, color: '#4b5563', fontWeight: '500' },
  reviewCard: { backgroundColor: '#f9fafb', padding: 16, borderRadius: 8 },
  reviewUser: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 6 },
  reviewDate: { color: '#9ca3af', fontWeight: '400' },
  reviewContent: { fontSize: 14, color: '#4b5563', lineHeight: 22 }
});
