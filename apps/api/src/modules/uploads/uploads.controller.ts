import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar registros de Uploads' })
  findAll() {
    return this.uploadsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un registro de Uploads por ID' })
  findOne(@Param('id') id: string) {
    return this.uploadsService.findOne(id);
  }
}
