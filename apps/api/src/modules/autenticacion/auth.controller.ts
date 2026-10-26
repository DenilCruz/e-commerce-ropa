import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { RegistroDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { RecuperarPasswordDto } from './dto/recuperar-password.dto';
import { RestablecerPasswordDto } from './dto/restablecer-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerificarEmailDto } from './dto/verificar-email.dto';
import { CrearTiendaDto } from '../tiendas/dto/crear-tienda.dto';
import { CambiarPlanDto } from '../tiendas/dto/cambiar-plan.dto';
import { ActualizarConfigPagoDto } from '../tiendas/dto/actualizar-config-pago.dto';
import { PlanLimitsService } from '../tiendas/plan-limits.service';
import { StoresService } from '../tiendas/stores.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly planLimitsService: PlanLimitsService,
    private readonly storesService: StoresService,
  ) {}

  // =========================================================================
  // HU-01: REGISTRO (Visitante)
  // =========================================================================
  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'HU-01: Registrar nueva cuenta de usuario (Visitante)',
    description: 'Crea una cuenta con email y contraseña, asigna rol CLIENTE y envía email de verificación con Mailtrap.',
  })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o el correo ya existe.' })
  async registro(@Body() dto: RegistroDto) {
    return this.authService.registro(dto);
  }

  // =========================================================================
  // HU-02: INICIO DE SESIÓN (Visitante / Usuario)
  // =========================================================================
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'HU-02: Iniciar sesión',
    description: 'Autentica al usuario con correo y contraseña, retornando Access Token y Refresh Token.',
  })
  @ApiResponse({ status: 200, description: 'Inicio de sesión exitoso.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas o cuenta inactiva.' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // =========================================================================
  // HU-03: CIERRE DE SESIÓN (Cliente / Admin)
  // =========================================================================
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'HU-03: Cerrar sesión',
    description: 'Invalida el refresh token del usuario autenticado para proteger su cuenta.',
  })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async logout(
    @CurrentUser('userId') usuarioId: string,
    @Body() body?: { refreshToken?: string },
  ) {
    return this.authService.logout(usuarioId, body?.refreshToken);
  }

  // =========================================================================
  // HU-04: RECUPERAR CONTRASEÑA POR EMAIL (Visitante)
  // =========================================================================
  @Post('recuperar-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'HU-04: Solicitar enlace de recuperación de contraseña',
    description: 'Genera un token seguro y envía un correo transaccional vía Mailtrap con el enlace para restablecerla.',
  })
  @ApiResponse({ status: 200, description: 'Correo de recuperación enviado si el usuario existe.' })
  async recuperarPassword(@Body() dto: RecuperarPasswordDto) {
    return this.authService.recuperarPassword(dto);
  }

  // =========================================================================
  // HU-05: RESTABLECER CONTRASEÑA (Visitante)
  // =========================================================================
  @Post('restablecer-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'HU-05: Restablecer contraseña con token seguro',
    description: 'Verifica la validez del token y actualiza la contraseña del usuario en la base de datos.',
  })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada exitosamente.' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado.' })
  async restablecerPassword(@Body() dto: RestablecerPasswordDto) {
    return this.authService.restablecerPassword(dto);
  }

  // =========================================================================
  // HU-06: RENOVAR TOKEN (Sistema)
  // =========================================================================
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'HU-06: Renovar tokens de acceso (Refresh Token)',
    description: 'Genera un nuevo Access Token a partir de un Refresh Token válido sin requerir re-login.',
  })
  @ApiResponse({ status: 200, description: 'Tokens renovados exitosamente.' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado.' })
  async renovarToken(@Body() dto: RefreshTokenDto) {
    return this.authService.renovarToken(dto);
  }

  // =========================================================================
  // HU-07: VERIFICAR EMAIL (Sistema)
  // =========================================================================
  @Post('verificar-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'HU-07: Verificar email mediante POST',
    description: 'Confirma la dirección de correo electrónico del usuario mediante el token recibido.',
  })
  @ApiResponse({ status: 200, description: 'Email verificado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado.' })
  async verificarEmailPost(@Body() dto: VerificarEmailDto) {
    return this.authService.verificarEmail(dto);
  }

  @Get('verificar-email')
  @ApiOperation({
    summary: 'HU-07: Verificar email mediante enlace GET (Clic desde correo)',
    description: 'Permite verificar el email directamente al hacer clic en el enlace del correo.',
  })
  @ApiQuery({ name: 'token', required: true, description: 'Token de verificación de email' })
  @ApiResponse({ status: 200, description: 'Email verificado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado.' })
  async verificarEmailGet(@Query('token') token: string) {
    return this.authService.verificarEmail({ token });
  }

  @Post('reenviar-verificacion')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reenviar el correo de verificación',
    description:
      'Invalida los enlaces anteriores y envía uno nuevo (válido 24 horas) al correo del usuario autenticado. ' +
      'Máximo uno por minuto. Fuera de producción también devuelve el enlace.',
  })
  @ApiResponse({ status: 200, description: 'Correo de verificación enviado.' })
  @ApiResponse({ status: 400, description: 'El correo ya está verificado.' })
  @ApiResponse({ status: 429, description: 'Se pidió otro correo hace menos de un minuto.' })
  async reenviarVerificacion(@CurrentUser() usuario: any) {
    return this.authService.reenviarVerificacion(usuario.userId);
  }

  // =========================================================================
  // PERFIL AUTENTICADO
  // =========================================================================
  @Get('perfil')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener datos del usuario actualmente autenticado',
    description: 'Retorna el payload del token y contexto del usuario.',
  })
  @ApiResponse({ status: 200, description: 'Datos del usuario autenticado.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async obtenerPerfil(@CurrentUser() usuario: any) {
    return {
      message: 'Usuario autenticado correctamente.',
      usuario,
    };
  }

  // =========================================================================
  // MULTI-TIENDA: MIS TIENDAS, CAMBIO DE TIENDA ACTIVA Y ALTA DE TIENDA
  // =========================================================================
  @Get('tiendas')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar las tiendas a las que pertenece el usuario',
    description: 'Retorna cada tienda con el rol del usuario en ella y marca cuál es la activa.',
  })
  @ApiResponse({ status: 200, description: 'Lista de tiendas del usuario.' })
  async misTiendas(@CurrentUser() usuario: any) {
    return this.authService.listarMisTiendas(usuario.userId);
  }

  @Post('tiendas/:id/seleccionar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cambiar la tienda activa',
    description: 'Emite una nueva sesión (tokens) limitada a la tienda elegida, si el usuario pertenece a ella.',
  })
  @ApiResponse({ status: 200, description: 'Nueva sesión en la tienda elegida.' })
  @ApiResponse({ status: 404, description: 'El usuario no pertenece a esa tienda.' })
  async seleccionarTienda(@CurrentUser() usuario: any, @Param('id', ParseUUIDPipe) tiendaId: string) {
    return this.authService.seleccionarTienda(usuario.userId, tiendaId);
  }

  @Post('tiendas')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear una tienda nueva (suscripción)',
    description:
      'Crea el espacio de trabajo de una tienda con plan inicial FREE_TRIAL y convierte al usuario en su ADMIN. ' +
      'Exige correo verificado. Retorna una sesión ya dentro de la tienda nueva.',
  })
  @ApiResponse({ status: 201, description: 'Tienda creada y sesión iniciada en ella.' })
  @ApiResponse({ status: 403, description: 'El correo del usuario aún no está verificado.' })
  async crearTienda(@CurrentUser() usuario: any, @Body() dto: CrearTiendaDto) {
    return this.authService.crearTienda(usuario.userId, dto);
  }

  // =========================================================================
  // CATÁLOGO DE PLANES, MÉTRICAS DE USO Y UPGRADE (Pilar 1)
  // =========================================================================
  @Get('tiendas/catalogo-planes')
  @ApiOperation({
    summary: 'Catálogo público de planes de suscripción',
    description: 'Retorna los 3 planes disponibles (Free Trial, Estándar, Corporativo), precios y características.',
  })
  @ApiResponse({ status: 200, description: 'Catálogo de planes.' })
  async catalogoPlanes() {
    return this.planLimitsService.obtenerCatalogoPlanes();
  }

  @Get('tiendas/plan-limites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Consultar consumo y cuotas del plan de la tienda activa',
    description: 'Retorna el plan actual, límites permitidos y consumo en tiempo real de usuarios y productos.',
  })
  @ApiResponse({ status: 200, description: 'Métricas de consumo y límites.' })
  async planLimites(@CurrentUser() usuario: any) {
    const tenantId = usuario.tenantId;
    return this.planLimitsService.obtenerMetricasYLimites(tenantId);
  }

  @Patch('tiendas/cambiar-plan')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar plan de suscripción de la tienda (Upgrade/Downgrade)',
    description: 'Permite al administrador o propietario actualizar el plan de su tienda.',
  })
  @ApiResponse({ status: 200, description: 'Plan actualizado con éxito.' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes para cambiar el plan.' })
  async cambiarPlan(@CurrentUser() usuario: any, @Body() dto: CambiarPlanDto) {
    const tenantId = usuario.tenantId;
    return this.planLimitsService.cambiarPlan(tenantId, dto.plan, usuario.userId);
  }

  // =========================================================================
  // MODELO HÍBRIDO DE PASARELAS (MODELO A - CUSTODIA / MODELO B - COBRO DIRECTO)
  // =========================================================================
  @Get('tiendas/config-pago-publica')
  @ApiOperation({
    summary: 'Consultar configuración de pago pública de una tienda (Checkout)',
    description: 'Retorna si la tienda opera con Modelo B (QR Propio) o Modelo A (Custodia Central AURA).',
  })
  @ApiQuery({ name: 'slug', required: false, description: 'Slug de la tienda (o usa X-Tenant-Slug)' })
  @ApiResponse({ status: 200, description: 'Configuración de pasarela de la tienda.' })
  async configPagoPublica(@Query('slug') slug?: string) {
    return this.storesService.obtenerConfigPagoPublica(slug);
  }

  @Get('tiendas/mi-config-pago')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Consultar configuración de cobro y saldo en custodia de la tienda activa (Admin)',
    description: 'Muestra datos bancarios propios configurados y el saldo acumulado en custodia por ventas.',
  })
  @ApiResponse({ status: 200, description: 'Configuración y estado de billetera de la tienda.' })
  async miConfigPago(@CurrentUser() usuario: any) {
    return this.storesService.obtenerConfigPagoAdmin(usuario.tenantId);
  }

  @Patch('tiendas/mi-config-pago')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar configuración de cobro de la tienda activa (Subir QR propio)',
    description: 'Permite al dueño configurar su QR bancario, titular y banco para activar Modelo B (Cobro Directo).',
  })
  @ApiResponse({ status: 200, description: 'Configuración actualizada exitosamente.' })
  async actualizarMiConfigPago(
    @CurrentUser() usuario: any,
    @Body() dto: ActualizarConfigPagoDto,
  ) {
    return this.storesService.actualizarConfigPagoAdmin(usuario.tenantId, dto);
  }
}

