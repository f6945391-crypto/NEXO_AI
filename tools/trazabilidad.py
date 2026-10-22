"""Genera y verifica specs/trazabilidad.md a partir de los spec.md.

Uso:
    python tools/trazabilidad.py           regenera la tabla
    python tools/trazabilidad.py --check   verifica sin escribir; sale con 1 si hay problemas

Las columnas Fase, Tarea, Prueba y Estado se editan a mano en trazabilidad.md
y se conservan al regenerar. El resto sale de los spec.md.
"""

import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SPECS = RAIZ / "specs"
SALIDA = SPECS / "trazabilidad.md"

ESTADOS = ("pendiente", "en curso", "implementado", "verificado", "retirado")
ESTADOS_CON_PRUEBA = ("implementado", "verificado")

# Fase por defecto de cada prefijo, según SPEC.md §10. Se puede corregir fila a fila.
FASE_POR_PREFIJO = {
    "ACC": "1",
    "CUN01": "1",
    "CAP": "2",
    "CUN02": "3",
    "CUN05": "4",
    "CUN07": "4",
    "ENC": "4",
    "CUN04": "5",
}

# Origen por defecto de los requisitos escritos en formato de una línea, que no llevan **Origen:**.
ORIGEN_POR_PREFIJO = {
    "ACC": "Requisito del sistema",
    "ENC": "CUN-04, CUN-07",
}

RE_ENCABEZADO = re.compile(r"^###\s+(REQ-[A-Z0-9]+-\d+)\b(.*)$")
RE_EN_LINEA = re.compile(r"^\*\*(REQ-[A-Z0-9]+-\d+)\*\*\s*·\s*(.*)$")
RE_ORIGEN = re.compile(r"^\*\*Origen:\*\*\s*(.+)$")
RE_TIPO = re.compile(r"^\*\*Tipo:\*\*\s*(.+)$")
RE_REFERENCIA = re.compile(r"\b(R-\d+|RN-[A-Z]+-\d+|CUN-\d+|DP?-\d+)\b")
RE_FILA = re.compile(r"^\|\s*(REQ-[A-Z0-9]+-\d+)\s*\|")
RE_TAREA = re.compile(r"^###\s+(T-\d{3})\b")
RE_ID_TAREA = re.compile(r"T-\d{3}")

TIPOS_EN_LINEA = {
    "ubicuo": "ubicuo",
    "cuando": "dirigido por evento",
    "mientras": "dirigido por estado",
    "si ": "no deseado",
    "donde": "opcional",
}


def prefijo(req):
    return req.split("-")[1]


def tipo_de_linea(texto):
    t = texto.lower()
    for clave, tipo in TIPOS_EN_LINEA.items():
        if t.startswith(clave):
            return tipo
    return "—"


def leer_specs():
    """Devuelve (requisitos, duplicados). requisitos: id -> dict."""
    reqs, duplicados = {}, []
    for spec in sorted(SPECS.glob("*/spec.md")):
        area = spec.parent.name
        lineas = spec.read_text(encoding="utf-8").splitlines()
        actual = None
        for linea in lineas:
            m = RE_ENCABEZADO.match(linea)
            if m:
                actual = m.group(1)
                if actual in reqs:
                    duplicados.append((actual, area))
                reqs[actual] = {
                    "area": area,
                    "origen": "—",
                    "tipo": "—",
                    "retirado": "RETIRADO" in m.group(2),
                }
                continue
            m = RE_EN_LINEA.match(linea)
            if m:
                req, cuerpo = m.group(1), m.group(2)
                if req in reqs:
                    duplicados.append((req, area))
                refs = sorted(set(RE_REFERENCIA.findall(cuerpo)))
                base = ORIGEN_POR_PREFIJO.get(prefijo(req), "—")
                reqs[req] = {
                    "area": area,
                    "origen": "; ".join([base] + refs) if refs else base,
                    "tipo": tipo_de_linea(cuerpo),
                    "retirado": "RETIRADO" in cuerpo,
                }
                actual = None
                continue
            if actual:
                m = RE_ORIGEN.match(linea)
                if m:
                    reqs[actual]["origen"] = m.group(1).strip()
                m = RE_TIPO.match(linea)
                if m:
                    reqs[actual]["tipo"] = m.group(1).strip()
                if linea.startswith("**Requisito:**") and "RETIRADO" in linea:
                    reqs[actual]["retirado"] = True
    return reqs, duplicados


def leer_tareas():
    """Identificadores T-nnn definidos en los tasks.md."""
    tareas = set()
    for archivo in SPECS.glob("*/tasks.md"):
        for linea in archivo.read_text(encoding="utf-8").splitlines():
            m = RE_TAREA.match(linea)
            if m:
                tareas.add(m.group(1))
    return tareas


def leer_tabla():
    """Columnas manuales de la tabla existente: id -> (fase, tarea, prueba, estado)."""
    if not SALIDA.exists():
        return {}
    manual = {}
    for linea in SALIDA.read_text(encoding="utf-8").splitlines():
        if not RE_FILA.match(linea):
            continue
        celdas = [c.strip() for c in linea.strip().strip("|").split("|")]
        if len(celdas) >= 7:
            manual[celdas[0]] = tuple(celdas[3:7])
    return manual


def celda(texto):
    return texto.replace("|", "\\|")


def generar(reqs, manual):
    filas = []
    conteo = {}
    for req in sorted(reqs, key=lambda r: (reqs[r]["area"], r)):
        datos = reqs[req]
        fase, tarea, prueba, estado = manual.get(
            req, (FASE_POR_PREFIJO.get(prefijo(req), "—"), "—", "—", "pendiente")
        )
        if datos["retirado"]:
            estado = "retirado"
        conteo.setdefault(datos["area"], {}).setdefault(estado, 0)
        conteo[datos["area"]][estado] += 1
        filas.append(
            f"| {req} | {datos['area']} | {celda(datos['origen'])} | {fase} | {tarea} | {prueba} | {estado} |"
        )

    resumen = ["| Área | Requisitos | " + " | ".join(ESTADOS) + " |",
               "|---|---|" + "---|" * len(ESTADOS)]
    for area in sorted(conteo):
        c = conteo[area]
        resumen.append(f"| {area} | {sum(c.values())} | " + " | ".join(str(c.get(e, 0)) for e in ESTADOS) + " |")

    return "\n".join([
        "# Trazabilidad",
        "",
        "**Generado por** `python tools/trazabilidad.py`. No edites las columnas Requisito, Área ni Origen: salen de los `spec.md`.",
        "**Se editan a mano:** Fase, Tarea (`T-nnn` de `tasks.md`), Prueba (nombre de la prueba automática) y Estado.",
        f"**Estados válidos:** {', '.join(ESTADOS)}. «implementado» y «verificado» exigen una prueba.",
        "**Verificar antes de dar algo por terminado:** `python tools/trazabilidad.py --check`.",
        "",
        "## Resumen",
        "",
        *resumen,
        "",
        "## Requisitos",
        "",
        "| Requisito | Área | Origen | Fase | Tarea | Prueba | Estado |",
        "|---|---|---|---|---|---|---|",
        *filas,
        "",
    ])


def verificar(reqs, duplicados, manual, tareas):
    problemas = []
    for req, (_, tarea, _, _) in manual.items():
        for t in RE_ID_TAREA.findall(tarea):
            if t not in tareas:
                problemas.append(f"{req}: cita {t}, que no está en ningún tasks.md")
    for req, area in duplicados:
        problemas.append(f"{req} está definido más de una vez (la última en {area})")
    for req in sorted(set(reqs) - set(manual)):
        problemas.append(f"{req} está en los spec.md pero no en trazabilidad.md: regenera la tabla")
    for req in sorted(set(manual) - set(reqs)):
        problemas.append(f"{req} está en trazabilidad.md pero en ningún spec.md: márcalo RETIRADO en su spec, no lo borres")
    for req, (fase, tarea, prueba, estado) in manual.items():
        if estado not in ESTADOS:
            problemas.append(f"{req}: estado «{estado}» no válido")
        if estado in ESTADOS_CON_PRUEBA and prueba in ("", "—"):
            problemas.append(f"{req}: estado «{estado}» sin prueba que lo respalde")
        if estado in ESTADOS_CON_PRUEBA and tarea in ("", "—"):
            problemas.append(f"{req}: estado «{estado}» sin tarea asociada")
    for req, datos in reqs.items():
        if datos["origen"] in ("", "—"):
            problemas.append(f"{req}: sin origen declarado")
    return problemas


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    reqs, duplicados = leer_specs()
    manual = leer_tabla()

    if "--check" in sys.argv:
        problemas = verificar(reqs, duplicados, manual, leer_tareas())
        for p in problemas:
            print(f"✗ {p}")
        print(f"{len(reqs)} requisitos, {len(problemas)} problemas")
        sys.exit(1 if problemas else 0)

    SALIDA.write_text(generar(reqs, manual), encoding="utf-8")
    print(f"{SALIDA.relative_to(RAIZ)}: {len(reqs)} requisitos")
    if duplicados:
        print(f"Atención: {len(duplicados)} identificadores duplicados; ejecuta --check")


if __name__ == "__main__":
    main()
