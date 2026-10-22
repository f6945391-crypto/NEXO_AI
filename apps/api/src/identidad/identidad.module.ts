import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { requerirVariable } from '../plataforma/entorno';
import { AutenticacionController } from './autenticacion.controller';
import { AutenticacionService } from './autenticacion.service';
import { AutenticacionGuard, PrimerIngresoGuard, RolGuard } from './guardas';

// specs/06-acceso/plan.md §2. El limitador guarda sus contadores en memoria: basta mientras haya un
// solo proceso que atiende HTTP (AD-01). Si se escala a varios, pasa a Redis.
@Module({
  imports: [
    JwtModule.registerAsync({ useFactory: () => ({ secret: requerirVariable('JWT_SECRETO') }) }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
  ],
  controllers: [AutenticacionController],
  providers: [
    AutenticacionService,
    // Se ejecutan en este orden.
    { provide: APP_GUARD, useClass: AutenticacionGuard },
    { provide: APP_GUARD, useClass: PrimerIngresoGuard },
    { provide: APP_GUARD, useClass: RolGuard },
  ],
})
export class IdentidadModule {}
