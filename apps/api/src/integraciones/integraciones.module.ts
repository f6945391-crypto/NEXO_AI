import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { requerirVariable } from '../plataforma/entorno';
import { IntegracionesController } from './integraciones.controller';
import { IntegracionesGoogleService } from './integraciones-google.service';
import { OAuthGoogleReal, PROVEEDOR_OAUTH_GOOGLE } from './oauth-google';

// specs/06-acceso/plan.md §2 · T-007
@Module({
  imports: [JwtModule.registerAsync({ useFactory: () => ({ secret: requerirVariable('JWT_SECRETO') }) })],
  controllers: [IntegracionesController],
  providers: [IntegracionesGoogleService, { provide: PROVEEDOR_OAUTH_GOOGLE, useClass: OAuthGoogleReal }],
  exports: [IntegracionesGoogleService],
})
export class IntegracionesModule {}
