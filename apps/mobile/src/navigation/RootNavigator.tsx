import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { ProductDetailScreen } from '../screens/producto/ProductDetailScreen';
import { FavoritosScreen } from '../screens/favoritos/FavoritosScreen';
import { CheckoutScreen } from '../screens/checkout/CheckoutScreen';
import { TrackingScreen } from '../screens/envios/TrackingScreen';
import { ProbadorScreen } from '../screens/probador/ProbadorScreen';
import { ConsultasIAScreen } from '../screens/admin/ConsultasIAScreen';
import { PuntoDeVentaScreen } from '../screens/ventas/PuntoDeVentaScreen';
import { useAuthStore } from '../store/auth.store';
import { leerSesion } from '../services/pos/sesion';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const sesion = leerSesion(useAuthStore((state) => state.token));
  return (
    <NavigationContainer>
      <Stack.Navigator key={sesion ? `${sesion.usuarioId}:${sesion.tenantId}` : 'invitado'} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Auth" component={AuthStack} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="Favoritos" component={FavoritosScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="Tracking" component={TrackingScreen} />
        <Stack.Screen name="Probador" component={ProbadorScreen} />
        <Stack.Screen name="ConsultasIA" component={ConsultasIAScreen} />
        <Stack.Screen name="PuntoDeVenta" component={PuntoDeVentaScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
