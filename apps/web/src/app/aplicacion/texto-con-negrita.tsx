import { Fragment } from 'react';

// T-148 · REQ-AGT-06 · decisión 34 de 07-agente. El texto del asistente llega llano desde la API, salvo la
// negrita, `**así**`, que es la única marca que pasa. Aquí se muestra como negrita; nada más se interpreta.
export function TextoConNegrita({ texto }: { texto: string }) {
  const tramos = texto.split(/(\*\*[^*\n]+\*\*)/g);
  return (
    <>
      {tramos.map((tramo, i) =>
        tramo.length > 4 && tramo.startsWith('**') && tramo.endsWith('**') ? (
          <strong key={i}>{tramo.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>{tramo}</Fragment>
        ),
      )}
    </>
  );
}
