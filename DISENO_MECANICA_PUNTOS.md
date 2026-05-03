# DISEÑO, MECÁNICA Y PUNTOS — ANTIGUA ORDEN [AOR] WAR COMMAND
## Documento maestro — versión sesión mayo 2026

---

## SISTEMAS DE JUEGO

### Modo Clásico
- Guerra: viernes 14:00h España → domingo 14:00h España
- Registro cierra: viernes 14:00h España (8am Ecuador / 7am México)
- Votaciones Asamblea: domingo 9:00am → viernes 1 hora antes de la guerra

### Modo Nuevo (prueba)
- Guerra: viernes 22:00h España → lunes 9:00am Ecuador
- Registro cierra: viernes 22:00h España (16pm Ecuador / 15pm México)
- Votaciones Asamblea: domingo 9:00am → viernes 1 hora antes de la guerra

### Reset semanal
- Automático lunes 9:00am España
- Archiva pt_* → pts_acumulados
- Resetea columnas de guerra

---

## REGIONES DE JUEGO
- América del Sur → hora Ecuador
- América del Norte → hora México
- España → hora base siempre resaltada

---

## CÓDIGO ÚNICO
- +1pt por conectarse con código único (sin importar cuántas veces al día)
- Solo 1pt por día aunque se conecte múltiples veces
- NO aplica si entra con teléfono

---

## REGISTRO DE DISPONIBILIDAD
| Tipo | Pts | Bonus anticipado |
|------|-----|-----------------|
| Conquistador | +10 | +5 (antes mié 23:59h España) |
| Refuerzos | +5 | +2 |
| Reserva | +2 | +2 |
| No disponible | +1 | — |

### Stats (una vez por semana, timer semanal desde último llenado)
- Solo BP: +1pt
- Solo Poder: +1pt
- Solo Nivel: +1pt (se deshabilita al llegar a 340)
- Los 3 juntos: +5pts (bonus de 2pts extra)
- Timer en cuenta regresiva hasta próxima habilitación

### Región
- América del Sur / América del Norte
- Se guarda permanentemente, usuario puede cambiar
- Resetear campo para que usuarios lo vuelvan a elegir

---

## PROPAGANDA
- +1pt por mensaje enviado al chat general del juego
- Flujo NUEVO:
  1. Usuario copia el mensaje
  2. Pega en el chat del juego y cierra sesión del juego
  3. Al volver a la app, se habilita botón "CONFIRMÉ EL ENVÍO"
  4. Al presionar: +1pt al acumulado semanal
  5. Timer de 1 hora para copiar el siguiente mensaje
  6. El mensaje enviado se bloquea 6 horas
  7. Color dominante: morado (#C8A2FF)

---

## INTELIGENCIA MILITAR
- Cada voto vale **+1pt** (NO +3pts — corrección)

---

## ASAMBLEA — GUERRERO IMPLACABLE
- Votar: +3pts
- Más votado (único): +10pts
- Mayor puntaje de la JORNADA (solo calcWarPts, columnas semanales): +10pts
- Mismo jugador gana ambos (Pichichi): +10pts extra = 30 total
- Empate en cualquiera: +3pts c/u
- Racha 2 semanas: +20pts extra
- Racha 3+: +10pts adicionales por semana
- Pesos de voto: Líder=5, Co-Líder=4, Oficial=3, Veterano=2, Leyenda=2, resto=1
- Votaciones: domingo 9am → viernes 1h antes de guerra siguiente

---

## VERSUS — PvP (estilo Dudo)
- Registrar set 3 batallas, ganaste 0-1: +1pt
- Registrar set 3 batallas, ganaste 2-3: +2pts
- Confirmar resultado: +1pt al confirmador
- DUDO exitoso (3+ de 5): +3pts al dudador, se anulan pts desafiador
- Desafiador acepta DUDO: +1pt
- Desafiador escala a admin: +5pts
- Gana en videos (admin): +5pts, perdedor 0
- Ranking semanal top1: +5pts (cierre domingo)
- Ranking mensual top1: +10pts (último día mes)
- Límites: 1 batalla por rival/día, 5 desafíos/día, 1 DUDO por rival/día
- Ranking: más ganadores Y más perdedores separados
- Colores: rojo dominante, victorias en verde, ceros en gris tipografía

---

## NOTICIAS CLAN
### Noticias
- +1pt por leerla (timer 2 días para ganar pts, después pasa a historial sin pts)
- Botón "LEÍDA" junto a cada noticia

### Solicitudes (requerimientos)
- +1pt por leerla
- +3pts por cumplirla (botón separado)
- Timer 1 día para ganar pts, después pasa a historial sin pts
- Penalización -20pts si se declara cumplimiento falso detectado
- Secciones: Solicitudes en curso | Historial solicitudes | Historial noticias
- Rankings: más noticias leídas / más solicitudes leídas / más solicitudes cumplidas

---

## WHATSAPP
- Fundador (antes del lanzamiento): +50pts una vez, permanente
- Nuevo miembro: +25pts una vez, permanente
- Ambos se reflejan en pts_acumulados como ingreso de la semana en que se otorgan

---

## PERFIL PERSONAL
### Sección header
- Nombre en amarillo (#FFD700)
- Sección en celeste (#40E0FF)
- Rango en clan: color del rango
- Rol en guerra actual (actualiza con registro, "No definido" al inicio de semana)
- Stats: BP, Poder, Nivel

### Puntos acumulados por categoría (una sola vez)
- WhatsApp Fundador: +50pts
- WhatsApp Nuevo: +25pts

### Puntos recurrentes (tabla por fuente)
- Guerra de clanes (pt_registro, batallas, órdenes...)
- Propaganda (mensajes enviados)
- Asamblea (votos, premio)
- Inteligencia (votos)
- Versus PvP (sets, confirmaciones, dudos)
- Noticias (leídas, solicitudes)
- Código único (días conectado)

### Puntos de la semana (en vivo)
- Solo lo generado esta semana
- Desglosado por fuente con valor individual

---

## RANGOS
| Rango | Condición | Colchón |
|-------|-----------|---------|
| Líder 👑 | Punk'Z intocable | — |
| Co-Líder 👑 | Colchón 25,000 otorgado | 25,000 pts |
| Oficial ⚜ | Colchón 5,000 otorgado | 5,000 pts |
| Leyenda 🌟 | 2,500+ acumulados | — |
| Veterano ★★★ | 1,000+ | — |
| Guerrero ★★ | 500+ | — |
| Soldado ★ | 100+ | — |
| Recluta | 0-99 | — |
| ⚠ Vigilado | Negativo | — |

Colchón = buffer defensivo, NUNCA cuenta en totalizadores ni rankings

---

## CHECKLIST DE CAMBIOS PENDIENTES

### CRÍTICOS (bloquean uso)
- [ ] Bug empate falso Asamblea — calcWarPts ya corregido, verificar en DB
- [ ] Revertir pts mal asignados en DB (SQL)

### PROPAGANDA
- [ ] Nuevo flujo: copiar → ir al juego → volver → botón confirmar
- [ ] Timer 1h entre mensajes, 6h bloqueo por mensaje enviado
- [ ] Color morado dominante

### INTELIGENCIA MILITAR
- [ ] Cambiar voto de +3pts a +1pt

### VERSUS
- [ ] Totalizadores vacíos — conectar a DB correctamente
- [ ] Ranking más ganadores Y más perdedores
- [ ] Quitar botón "OTORGAR BONUS" (solo admin)
- [ ] Colores: rojo dominante, victorias verde, ceros gris
- [ ] Título "Versus" → "VERSUS" corregir mayúsculas

### REGISTRO
- [ ] Nombre dentro de la caja verde (no desbordarse)
- [ ] Horarios correctos según modo activo
- [ ] Nivel en actualizar stats con timer semanal y tope 340
- [ ] Región: América del Sur / América del Norte (resetear campo actual)

### NOTICIAS
- [ ] Timer 2 días para noticias, 1 día para solicitudes
- [ ] Secciones: en curso / historial noticias / historial solicitudes
- [ ] Rankings de lectores y cumplidores
- [ ] Penalización -20pts por cumplimiento falso

### PERFIL
- [ ] Nombre en amarillo, sección en celeste
- [ ] Rol guerra: "No definido" hasta que registre
- [ ] Eliminar línea de rol duplicada en gris
- [ ] Stats completos con todos los pts
- [ ] Desglose por categoría con tabla por fuente

### PUNTOS/REGLAS
- [ ] Inteligencia: +1pt (no +3)
- [ ] Código único: +1pt/día (ya implementado en verify())
