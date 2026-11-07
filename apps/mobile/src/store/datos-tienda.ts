import { useCartStore } from './cart.store';
import { useFavoritosStore } from './favoritos.store';

export function limpiarDatosLocalesDeTienda() {
  useCartStore.setState({
    guestItems: [],
    cart: { items: [], totalItems: 0, total: 0 },
    cupon: null,
    descuento: 0,
    totalConDescuento: 0,
    mensajeCupon: null,
    error: null,
    cargando: false,
  });
  useFavoritosStore.setState({ items: [], favoritosIds: [], cargando: false });
}
