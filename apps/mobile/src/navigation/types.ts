export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ProductDetail: { productId: string };
  Checkout: undefined;
  Favoritos: undefined;
  Tracking: { codigo?: string } | undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
  VerifyEmail: { token?: string } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Catalog: { categoriaId?: string } | undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};
