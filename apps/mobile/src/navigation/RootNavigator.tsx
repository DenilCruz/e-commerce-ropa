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

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Auth" component={AuthStack} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="Favoritos" component={FavoritosScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="Tracking" component={TrackingScreen} />
        <Stack.Screen name="Probador" component={ProbadorScreen} />
        <Stack.Screen name="ConsultasIA" component={ConsultasIAScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
