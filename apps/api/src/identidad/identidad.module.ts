import { Module } from '@nestjs/common';
import { RestablecimientoService } from './restablecimiento.service';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AgendaModule } from '../agenda/agenda.module';
import { requerirVariable } from '../plataforma/entorno';
import { AutenticacionController } from './autenticacion.controller';
import { AutenticacionService } from './autenticacion.service';
import { CambiarZonaHoraria } from './cambiar-zona-horaria';
import { AlcanceGuard, AutenticacionGuard, PrimerIngresoGuard } from './guardas';
import { IngresoEmpresaController } from './ingreso-empresa.controller';
import { PerfilController } from './perfil.controller';

// specs/06-acceso/plan.md §2. El limitador guarda sus contadores en memoria: basta mientras haya un
// solo proceso que atiende HTTP (AD-01). Si se escala a varios, pasa a Redis.
@Module({
  imports: [
    JwtModule.registerAsync({ useFactory: () => ({ secret: requerirVariable('JWT_SECRETO') }) }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
    // T-009: el cambio de zona horaria lee la réplica de la agenda
    AgendaModule,
  ],
  controllers: [AutenticacionController, PerfilController, IngresoEmpresaController],
  providers: [
    RestablecimientoService,
    AutenticacionService,
    CambiarZonaHoraria,
    // Se ejecutan en este orden.
    { provide: APP_GUARD, useClass: AutenticacionGuard },
    { provide: APP_GUARD, useClass: PrimerIngresoGuard },
    { provide: APP_GUARD, useClass: AlcanceGuard },
  ],
  exports: [AutenticacionService],
})
export class IdentidadModule {}
