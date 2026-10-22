import { HttpException, type PipeTransform } from '@nestjs/common';
import type { CodigoError, ErrorApi } from '@nexoai/contratos';
import type { z } from 'zod';

// Todo error que sale de la API tiene la forma ErrorApi de packages/contratos.
export function errorApi(estado: number, codigo: CodigoError, mensaje: string): HttpException {
  const cuerpo: ErrorApi = { codigo, mensaje };
  return new HttpException(cuerpo, estado);
}

// Valida el cuerpo, la consulta o los parámetros con un esquema de packages/contratos (AD-08).
export class ValidarCon<T extends z.ZodType> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly esquema: T) {}

  transform(valor: unknown): z.infer<T> {
    const resultado = this.esquema.safeParse(valor);
    if (!resultado.success) {
      throw errorApi(400, 'SOLICITUD_INVALIDA', 'La solicitud no tiene el formato esperado.');
    }
    return resultado.data;
  }
}
