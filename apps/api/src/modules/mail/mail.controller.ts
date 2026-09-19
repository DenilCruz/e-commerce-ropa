import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MailService } from './mail.service';

@ApiTags('Mail')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get()
  @ApiOperation({ summary: 'Listar registros de Mail' })
  findAll() {
    return this.mailService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un registro de Mail por ID' })
  findOne(@Param('id') id: string) {
    return this.mailService.findOne(id);
  }
}
