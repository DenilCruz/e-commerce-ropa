import { Controller, Get, Post, Body, Param, Put, Delete, Query, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UsuariosService } from './users.service';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CrearDireccionDto } from './dto/crear-direccion.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { CambiarRolDto } from './dto/cambiar-rol.dto';

@ApiTags('Usuarios y Perfiles')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly servicioUsuarios: UsuariosService) {}

  // ==========================
  // PANEL ADMIN (HU-15, HU-16, HU-17)
  // ==========================

  @Get()
  @ApiOperation({ summary: 'Listar usuarios con paginación y búsqueda (HU-15)' })
  @ApiQuery({ name: 'pagina', required: false, example: 1 })
  @ApiQuery({ name: 'limite', required: false, example: 10 })
  @ApiQuery({ name: 'busqueda', required: false, example: 'maria' })
  listarUsuarios(
    @Query('pagina') pagina = 1,
    @Query('limite') limite = 10,
    @Query('busqueda') busqueda = '',
  ) {
    return this.servicioUsuarios.listarUsuarios(Number(pagina) || 1, Number(limite) || 10, busqueda);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Obtener lista de roles del sistema' })
  obtenerRoles() {
    return this.servicioUsuarios.obtenerRoles();
  }

  @Put(':id/toggle-bloqueo')
  @ApiOperation({ summary: 'Bloquear o desbloquear usuario (HU-16)' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  toggleBloqueo(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicioUsuarios.toggleBloqueo(id);
  }

  @Put(':id/rol')
  @ApiOperation({ summary: 'Cambiar rol de un usuario (HU-17: cliente <-> admin)' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  cambiarRol(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: CambiarRolDto,
  ) {
    return this.servicioUsuarios.cambiarRol(id, datos.rolId);
  }

  // ==========================
  // PERFIL (HU-09, HU-10, HU-11)
  // ==========================

  @Get(':id/perfil')
  @ApiOperation({ summary: 'Obtener el perfil de un usuario con sus direcciones (HU-09)' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  obtenerPerfil(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicioUsuarios.obtenerPerfil(id);
  }

  @Put(':id/perfil')
  @ApiOperation({ summary: 'Actualizar datos básicos del perfil (nombre, foto, celular) (HU-10)' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  actualizarPerfil(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: ActualizarUsuarioDto,
  ) {
    return this.servicioUsuarios.actualizarPerfil(id, datos);
  }

  @Put(':id/cambiar-password')
  @ApiOperation({ summary: 'Cambiar contraseña desde el perfil (HU-11)' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  cambiarContrasena(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: CambiarContrasenaDto,
  ) {
    return this.servicioUsuarios.cambiarContrasena(id, datos);
  }

  // ==========================
  // DIRECCIONES (HU-12, HU-13, HU-14)
  // ==========================

  @Get(':id/direcciones')
  @ApiOperation({ summary: 'Listar todas las direcciones de entrega de un usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  obtenerDirecciones(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicioUsuarios.obtenerDirecciones(id);
  }

  @Post(':id/direcciones')
  @ApiOperation({ summary: 'Agregar una nueva dirección de entrega a la libreta (HU-12)' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 201, description: 'Dirección guardada exitosamente.' })
  agregarDireccion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: CrearDireccionDto,
  ) {
    return this.servicioUsuarios.agregarDireccion(id, datos);
  }

  @Put(':idUsuario/direcciones/:idDireccion/predeterminada')
  @ApiOperation({ summary: 'Marcar dirección como predeterminada (HU-13)' })
  @ApiParam({ name: 'idUsuario', description: 'ID del usuario' })
  @ApiParam({ name: 'idDireccion', description: 'ID de la dirección' })
  marcarPredeterminada(
    @Param('idUsuario', ParseUUIDPipe) idUsuario: string,
    @Param('idDireccion', ParseUUIDPipe) idDireccion: string,
  ) {
    return this.servicioUsuarios.marcarPredeterminada(idUsuario, idDireccion);
  }

  @Delete(':idUsuario/direcciones/:idDireccion')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una dirección de la libreta del usuario (HU-14)' })
  @ApiParam({ name: 'idUsuario', description: 'ID del usuario' })
  @ApiParam({ name: 'idDireccion', description: 'ID de la dirección a borrar' })
  eliminarDireccion(
    @Param('idUsuario', ParseUUIDPipe) idUsuario: string,
    @Param('idDireccion', ParseUUIDPipe) idDireccion: string,
  ) {
    return this.servicioUsuarios.eliminarDireccion(idUsuario, idDireccion);
  }
}
