import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { aislarPorOrganizacion, type PrismaDeOrganizacion } from './aislamiento';
import { crearClientePrisma, type PrismaClient } from './prisma';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly cliente: PrismaClient = crearClientePrisma();

  // El acceso normal a datos: filtrado por la organización del contexto (P-04).
  deOrganizacion(organizacionId: string): PrismaDeOrganizacion {
    return aislarPorOrganizacion(this.cliente, organizacionId);
  }

  // Solo para lo que ocurre antes de conocer la organización, como buscar el perfil por correo al
  // ingresar (T-004). Cualquier otro uso es una excepción que se justifica en su plan.md.
  get sinAislar(): PrismaClient {
    return this.cliente;
  }

  async onModuleDestroy(): Promise<void> {
    await this.cliente.$disconnect();
  }
}
