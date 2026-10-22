import { Controller, Get } from '@nestjs/common';
import { SaludRespuesta } from '@nexoai/contratos';

@Controller('salud')
export class SaludController {
  @Get()
  consultar(): SaludRespuesta {
    return SaludRespuesta.parse({ estado: 'ok' });
  }
}
