export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ProductDetail: { productId: string };
  Checkout: undefined;
  Favoritos: undefined;
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
  Catalog: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};
