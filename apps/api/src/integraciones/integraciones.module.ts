import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { requerirVariable } from '../plataforma/entorno';
import { ClienteGoogle } from './cliente-google';
import { IntegracionesController } from './integraciones.controller';
import { IntegracionesGoogleService } from './integraciones-google.service';
import { OAuthGoogleReal, PROVEEDOR_OAUTH_GOOGLE } from './oauth-google';
import { RequiereGoogleGuard } from './requiere-google';

// specs/06-acceso/plan.md §2 · T-007, T-008. La guarda de @RequiereGoogle va después de las de
// identidad, porque necesita el contexto de la solicitud.
@Module({
  imports: [JwtModule.registerAsync({ useFactory: () => ({ secret: requerirVariable('JWT_SECRETO') }) })],
  controllers: [IntegracionesController],
  providers: [
    IntegracionesGoogleService,
    ClienteGoogle,
    { provide: PROVEEDOR_OAUTH_GOOGLE, useClass: OAuthGoogleReal },
    { provide: APP_GUARD, useClass: RequiereGoogleGuard },
  ],
  exports: [IntegracionesGoogleService, ClienteGoogle],
})
export class IntegracionesModule {}
