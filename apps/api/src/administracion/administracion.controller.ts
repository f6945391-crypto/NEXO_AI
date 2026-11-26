import { Controller, Get } from '@nestjs/common';
import type { EquipoOrganizacion, PersonaOrganizacion, SesionEmpresa } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { Contexto, EnEmpresa, SoloAdministrador, ZonaEmpresa } from '../identidad/decoradores';
import { LecturasAdministracion } from './lecturas';

// T-061 · specs/08-administracion/plan.md §6 y §7.2. Lecturas de la zona de empresa. Las acciones son
// Operaciones (operaciones-empresa.controller.ts).
@ZonaEmpresa()
@Controller('administracion')
export class AdministracionController {
  constructor(private readonly lecturas: LecturasAdministracion) {}

  @EnEmpresa()
  @Get('sesion')
  sesion(@Contexto() contexto: ContextoSolicitud): Promise<SesionEmpresa> {
    return this.lecturas.sesion(contexto);
  }

  // REQ-ADM-08
  @SoloAdministrador()
  @Get('personas')
  personas(@Contexto() contexto: ContextoSolicitud): Promise<PersonaOrganizacion[]> {
    return this.lecturas.personas(contexto);
  }

  // REQ-ADM-28 a 32, solo lectura: el administrador ve todos; el responsable, solo los suyos
  @EnEmpresa()
  @Get('equipos')
  equipos(@Contexto() contexto: ContextoSolicitud): Promise<EquipoOrganizacion[]> {
    return this.lecturas.equipos(contexto);
  }
}
