import { Controller, Get } from '@nestjs/common';
import { SaludRespuesta } from '@nexoai/contratos';
import { Publico } from '../identidad/decoradores';

@Publico()
@Controller('salud')
export class SaludController {
  @Get()
  consultar(): SaludRespuesta {
    return SaludRespuesta.parse({ estado: 'ok' });
  }
}
