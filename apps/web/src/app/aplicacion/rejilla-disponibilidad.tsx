import type {
  DisponibilidadEquipoRespuesta,
  DisponibilidadIndividualEquipo,
} from '@nexoai/contratos';

import {
  crearRangoTemporal,
  crearMarcasTemporales,
  posicionarIntervalo,
  formatearInstante,
} from './rejilla-tiempo';

interface PropsRejillaDisponibilidad {
  resultado: DisponibilidadEquipoRespuesta;
  nombres: Readonly<Record<string, string>>;
}

function motivoVisible(
  participante: DisponibilidadIndividualEquipo,
): string {
  if (participante.estado === 'consultado') {
    return '';
  }

  switch (participante.motivo) {
    case 'sin_consentimiento':
      return 'Permiso no concedido';

    case 'calendario_no_disponible':
      return 'Calendario no disponible';

    case 'autorizacion_no_vigente':
      return 'Permiso no vigente';
  }
}

export function RejillaDisponibilidad({
  resultado,
  nombres,
}: PropsRejillaDisponibilidad) {
  const rango = crearRangoTemporal(
    resultado.desde,
    resultado.hasta,
  );

  const zona = resultado.zonaHoraria;

  const bandasComunes = resultado.intervalos.flatMap(
    (intervalo) => {
      const posicion = posicionarIntervalo(
        rango,
        intervalo.inicio,
        intervalo.fin,
      );

      if (!posicion) {
        return [];
      }

      return [{
        intervalo,
        posicion,
        etiqueta:
          formatearInstante(intervalo.inicio, zona, true) +
          ' - ' +
          formatearInstante(intervalo.fin, zona, true) +
          ' (' + intervalo.duracionMinutos + ' min)',
      }];
    },
  );

  const horas = rango.duracion / 3_600_000;

  const marcas = crearMarcasTemporales(
    rango,
    zona,
    horas > 12 ? 120 : 60,
  );

  return (
    <section
      className="rejilla-disponibilidad"
      aria-label="Disponibilidad individual del equipo"
    >
      <header className="rejilla-encabezado">
        <h3>Disponibilidad por participante</h3>

        <p>
          Zona horaria: {zona}
        </p>
      </header>

      {!resultado.disponibilidadCompleta && (
        <p className="rejilla-aviso-parcial">
          {resultado.participantesConsultados > 0
            ? 'Las coincidencias corresponden solamente a los calendarios consultados.'
            : 'No hay calendarios disponibles para calcular coincidencias.'}
        </p>
      )}

      <div className="rejilla-leyenda">
        <span>
          <i className="rejilla-muestra rejilla-libre" />
          Libre
        </span>

        <span>
          <i className="rejilla-muestra rejilla-ocupado" />
          Ocupado
        </span>

        <span>
          <i className="rejilla-muestra rejilla-sin-datos" />
          Sin informacion
        </span>

        <span>
          <i className="rejilla-muestra rejilla-comun" />
          {resultado.disponibilidadCompleta
            ? 'Disponibilidad comun'
            : 'Coincidencia parcial'}
        </span>
      </div>

      <div className="rejilla-desplazamiento">
        <div className="rejilla-tabla">
          <div className="rejilla-fila rejilla-fila-eje">
            <div className="rejilla-participante">
              Participante
            </div>

            <div className="rejilla-eje">
              {marcas.map((marca, indice) => (
                <span
                  key={marca.instante}
                  className={[
                    'rejilla-marca',
                    indice === 0
                      ? 'rejilla-marca-inicial'
                      : '',
                    indice === marcas.length - 1
                      ? 'rejilla-marca-final'
                      : '',
                  ].filter(Boolean).join(' ')}
                  style={{
                    left: `${marca.posicion}%`,
                  }}
                  title={formatearInstante(
                    marca.instante,
                    zona,
                    true,
                  )}
                >
                  {marca.etiqueta}
                </span>
              ))}
            </div>
          </div>

          {resultado.disponibilidadIndividual.map(
            (participante, indice) => {
              const nombre =
                nombres[participante.perfilId] ??
                `Participante ${indice + 1}`;

              const sinDatos =
                participante.estado === 'sin_datos';

              return (
                <div
                  key={participante.perfilId}
                  className="rejilla-fila"
                >
                  <div
                    className="rejilla-participante"
                    title={nombre}
                  >
                    {nombre}
                  </div>

                  <div
                    className={[
                      'rejilla-linea',
                      sinDatos
                        ? 'rejilla-sin-datos'
                        : 'rejilla-libre',
                    ].join(' ')}
                    role="group"
                    aria-label={`Horario de ${nombre}`}
                  >
                    {marcas.map((marca) => (
                      <span
                        key={marca.instante}
                        className="rejilla-guia"
                        aria-hidden="true"
                        style={{
                          left: `${marca.posicion}%`,
                        }}
                      />
                    ))}

                    {!sinDatos && bandasComunes.map(
                      ({ intervalo, posicion, etiqueta }) => (
                        <span
                          key={
                            'comun-' +
                            intervalo.inicio +
                            intervalo.fin
                          }
                          className="rejilla-banda-comun"
                          aria-hidden="true"
                          title={etiqueta}
                          style={{
                            left: `${posicion.izquierda}%`,
                            width: `${posicion.ancho}%`,
                          }}
                        />
                      ),
                    )}

                    {sinDatos ? (
                      <span className="rejilla-motivo">
                        {motivoVisible(participante)}
                      </span>
                    ) : (
                      participante.intervalosOcupados.map(
                        (intervalo) => {
                          const posicion =
                            posicionarIntervalo(
                              rango,
                              intervalo.inicio,
                              intervalo.fin,
                            );

                          if (!posicion) {
                            return null;
                          }

                          const etiqueta =
                            'Ocupado: ' +
                            formatearInstante(
                              intervalo.inicio,
                              zona,
                              true,
                            ) +
                            ' - ' +
                            formatearInstante(
                              intervalo.fin,
                              zona,
                              true,
                            );

                          return (
                            <span
                              key={
                                intervalo.inicio +
                                intervalo.fin
                              }
                              className="rejilla-bloque rejilla-ocupado"
                              role="img"
                              aria-label={etiqueta}
                              title={etiqueta}
                              style={{
                                left: `${posicion.izquierda}%`,
                                width: `${posicion.ancho}%`,
                              }}
                            />
                          );
                        },
                      )
                    )}
                  </div>
                </div>
              );
            },
          )}

          {bandasComunes.length > 0 && (
            <div className="rejilla-fila rejilla-fila-duraciones">
              <div className="rejilla-participante">
                Duracion
              </div>

              <div className="rejilla-duraciones">
                {bandasComunes.map(
                  ({ intervalo, posicion, etiqueta }) => (
                    <span
                      key={
                        intervalo.inicio +
                        intervalo.fin
                      }
                      className="rejilla-duracion"
                      title={etiqueta}
                      aria-hidden="true"
                      style={{
                        left: `${posicion.izquierda}%`,
                        width: `${posicion.ancho}%`,
                      }}
                    >
                      {intervalo.duracionMinutos} min
                    </span>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
