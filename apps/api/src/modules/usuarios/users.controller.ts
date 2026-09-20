import { Controller, Get, Post, Body, Param, Put, Delete, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UsuariosService } from './users.service';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CrearDireccionDto } from './dto/crear-direccion.dto';

@ApiTags('Usuarios y Perfiles')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly servicioUsuarios: UsuariosService) {}

  // ==========================
  // PERFIL
  // ==========================

  @Get(':id/perfil')
  @ApiOperation({ summary: 'Obtener el perfil público/privado de un usuario con sus direcciones' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  obtenerPerfil(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicioUsuarios.obtenerPerfil(id);
  }

  @Put(':id/perfil')
  @ApiOperation({ summary: 'Actualizar datos básicos del perfil (nombre, foto, celular)' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  actualizarPerfil(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: ActualizarUsuarioDto,
  ) {
    return this.servicioUsuarios.actualizarPerfil(id, datos);
  }

  // ==========================
  // DIRECCIONES
  // ==========================

  @Get(':id/direcciones')
  @ApiOperation({ summary: 'Listar todas las direcciones de entrega de un usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  obtenerDirecciones(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicioUsuarios.obtenerDirecciones(id);
  }

  @Post(':id/direcciones')
  @ApiOperation({ summary: 'Agregar una nueva dirección de entrega a la libreta' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 201, description: 'Dirección guardada exitosamente.' })
  agregarDireccion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: CrearDireccionDto,
  ) {
    return this.servicioUsuarios.agregarDireccion(id, datos);
  }

  @Delete(':idUsuario/direcciones/:idDireccion')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una dirección de la libreta del usuario' })
  @ApiParam({ name: 'idUsuario', description: 'ID del usuario' })
  @ApiParam({ name: 'idDireccion', description: 'ID de la dirección a borrar' })
  eliminarDireccion(
    @Param('idUsuario', ParseUUIDPipe) idUsuario: string,
    @Param('idDireccion', ParseUUIDPipe) idDireccion: string,
  ) {
    return this.servicioUsuarios.eliminarDireccion(idUsuario, idDireccion);
  }
}
