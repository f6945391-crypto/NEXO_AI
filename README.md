# NexoAI

Asistente personal inteligente · Curso de Diseño de Software · Entregable 2.

El proyecto se desarrolla guiado por especificación. **Empieza por [`SPEC.md`](SPEC.md)**: estado, principios, decisiones y registro de cambios. Las instrucciones de trabajo, incluidas las de la IA, están en [`AGENTS.md`](AGENTS.md).

## Levantar el proyecto

Requisitos: Node.js 22.12 o posterior, Python 3.12 y Docker.

```bash
npx pnpm@12.10.1 install
```

Copia `.env.example` a `.env`. PostgreSQL usa el puerto 5433, para no chocar con uno instalado en el equipo.

```bash
docker compose up -d
```

```bash
npx pnpm@12.10.1 --filter @nexoai/api migrar
```

```bash
npx pnpm@12.10.1 --filter @nexoai/api semilla
```

```bash
npx pnpm@12.10.1 verificar
```

`verificar` compila, ejecuta las pruebas y comprueba que especificación y trazabilidad digan lo mismo. Si falla, el cambio no está terminado.
