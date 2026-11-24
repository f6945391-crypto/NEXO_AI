import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';

import { DisponibilidadEquipoService } from '../../src/equipos/disponibilidad-equipo.service';

describe('CUN-05 - Seguridad de zona horaria', () => {
  it('no consulta el perfil si el usuario no pertenece al equipo', async () => {
    const verificarMembresia = vi.fn().mockRejectedValue(
      new ForbiddenException('No perteneces a este equipo.'),
    );

    const deOrganizacion = vi.fn();

    const servicio = new DisponibilidadEquipoService(
      { deOrganizacion } as any,
      {} as any,
      {} as any,
      { verificarMembresia } as any,
    );

    const contexto = {
      perfilId: 'perfil-ajeno',
      organizacionId: 'organizacion-prueba',
      rol: 'colaborador',
      plan: 'empresarial',
      primerIngresoPendiente: false,
    } as const;

    await expect(
      servicio.obtenerZonaHorariaSolicitante(
        contexto,
        '11111111-1111-4111-8111-111111111111',
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(verificarMembresia).toHaveBeenCalledTimes(1);
    expect(deOrganizacion).not.toHaveBeenCalled();
  });
});
