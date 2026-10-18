import { create } from 'zustand';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string;
  isInitialized: boolean;
  setNetworkState: (state: NetInfoState) => void;
  initNetworkListener: () => () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isConnected: true, // Asumir conectado inicialmente para no bloquear UI
  isInternetReachable: true,
  connectionType: 'unknown',
  isInitialized: false,

  setNetworkState: (netState: NetInfoState) => {
    const isConnected = Boolean(netState.isConnected);
    // isInternetReachable puede ser null mientras verifica; si es null, confiamos en isConnected
    const isInternetReachable =
      netState.isInternetReachable === null ? isConnected : Boolean(netState.isInternetReachable);

    set({
      isConnected: isConnected && isInternetReachable !== false,
      isInternetReachable: netState.isInternetReachable,
      connectionType: netState.type,
      isInitialized: true,
    });
  },

  initNetworkListener: () => {
    // 1. Obtener estado inicial de inmediato
    NetInfo.fetch().then((state) => {
      useNetworkStore.getState().setNetworkState(state);
    });

    // 2. Suscribirse a cambios continuos
    const unsubscribe = NetInfo.addEventListener((state) => {
      useNetworkStore.getState().setNetworkState(state);
    });

    return unsubscribe;
  },
}));
