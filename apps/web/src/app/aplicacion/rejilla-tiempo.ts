export interface RangoTemporal {
  inicio: number;
  fin: number;
  duracion: number;
}

export interface PosicionTemporal {
  izquierda: number;
  ancho: number;
}

export interface MarcaTemporal {
  instante: string;
  posicion: number;
  etiqueta: string;
}

export function crearRangoTemporal(
  desde: string,
  hasta: string,
): RangoTemporal {
  const inicio = Date.parse(desde);
  const fin = Date.parse(hasta);

  if (
    !Number.isFinite(inicio) ||
    !Number.isFinite(fin) ||
    fin <= inicio
  ) {
    throw new Error('Rango temporal invalido.');
  }

  return {
    inicio,
    fin,
    duracion: fin - inicio,
  };
}

export function posicionarIntervalo(
  rango: RangoTemporal,
  desde: string,
  hasta: string,
): PosicionTemporal | null {
  const inicio = Date.parse(desde);
  const fin = Date.parse(hasta);

  if (
    !Number.isFinite(inicio) ||
    !Number.isFinite(fin) ||
    fin <= inicio
  ) {
    return null;
  }

  const inicioVisible = Math.max(
    inicio,
    rango.inicio,
  );

  const finVisible = Math.min(
    fin,
    rango.fin,
  );

  if (finVisible <= inicioVisible) {
    return null;
  }

  return {
    izquierda:
      ((inicioVisible - rango.inicio) /
        rango.duracion) * 100,
    ancho:
      ((finVisible - inicioVisible) /
        rango.duracion) * 100,
  };
}

export function formatearInstante(
  instante: string | number,
  zonaHoraria: string,
  incluirFecha = false,
): string {
  const fecha = new Date(instante);

  return new Intl.DateTimeFormat('es-PE', {
    timeZone: zonaHoraria,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...(incluirFecha
      ? {
          day: '2-digit',
          month: '2-digit',
        }
      : {}),
  }).format(fecha);
}

export function crearMarcasTemporales(
  rango: RangoTemporal,
  zonaHoraria: string,
  pasoMinutos = 60,
): MarcaTemporal[] {
  if (
    !Number.isFinite(pasoMinutos) ||
    pasoMinutos <= 0
  ) {
    throw new Error('Paso temporal invalido.');
  }

  const paso = pasoMinutos * 60_000;

  if (rango.duracion / paso > 500) {
    throw new Error('Demasiadas marcas temporales.');
  }

  const marcas: MarcaTemporal[] = [];

  const agregar = (instante: number) => {
    marcas.push({
      instante: new Date(instante).toISOString(),
      posicion:
        ((instante - rango.inicio) /
          rango.duracion) * 100,
      etiqueta: formatearInstante(
        instante,
        zonaHoraria,
      ),
    });
  };

  agregar(rango.inicio);

  for (
    let instante = rango.inicio + paso;
    instante < rango.fin;
    instante += paso
  ) {
    agregar(instante);
  }

  agregar(rango.fin);

  return marcas;
}
