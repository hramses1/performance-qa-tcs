# Informe de resultados - Prueba de carga App Transaction Balance

## 1. Objetivo

Revisar los resultados de la prueba de carga hecha con k6 sobre la transacción App Transaction Balance, a partir del archivo textSummary.txt y del gráfico de monitoreo de usuarios virtuales (VUs) contra peticiones por segundo, para identificar hallazgos y dar recomendaciones.

## 2. Resumen

La prueba duró aproximadamente 63 minutos (de 01:35 a 02:38) con un máximo de 140 usuarios virtuales. En total se enviaron 276.650 peticiones, un promedio de 73,18 por segundo.

La tasa de error fue de 2,44 %, que está por debajo del 3 % pero bastante cerca. El p95 del tiempo de respuesta fue de 1,57 s, por encima de 1,5 s, que es el valor que normalmente se toma como aceptable.

Lo más importante es lo que se ve en el gráfico: entre las 01:50 y las 01:59 las peticiones por segundo bajan de unas 85 a menos de 25, aunque los 140 usuarios siguen activos. Ese periodo cae en la etapa 1 de la prueba, que es donde están casi todos los errores 5xx.

En mi opinión la prueba no se debería dar por aprobada. Aunque k6 marca los thresholds en verde, el servicio tuvo una caída de rendimiento fuerte de casi 10 minutos.

## 3. Datos de la ejecución

| Métrica | Valor |
|---|---|
| Peticiones totales | 276.650 |
| Peticiones por segundo (promedio) | 73,18 |
| Usuarios virtuales máximos | 140 |
| Checks correctos | 97,55 % (269.891) |
| Peticiones fallidas | 2,44 % (6.759) |
| Tiempo de respuesta promedio | 861,68 ms |
| Mediana | 613,42 ms |
| p(90) | 1,28 s |
| p(95) | 1,57 s |
| Máximo | 29,93 s |
| p(95) solo de respuestas exitosas | 1,42 s |
| Duración promedio de iteración | 1,86 s |
| Datos enviados / recibidos | 588 MB / 842 MB |

Errores por etapa:

| Etapa | Tipo de error | Cantidad |
|---|---|---|
| Stage 0 | HTTP 5xx | 1 |
| Stage 1 | HTTP 4xx | 769 |
| Stage 1 | HTTP 5xx | 5.987 |
| Stage 2 | HTTP 5xx | 2 |
| Total | | 6.759 |

De los 6.759 errores, 6.756 son de la etapa 1, y de esos 5.987 son 5xx, o sea errores del servidor (alrededor del 89 % del total).

Los tiempos de conexión, TLS, envío y recepción son muy bajos: en promedio están en microsegundos y el máximo no llega a 40 ms. Prácticamente todo el tiempo de respuesta es http_req_waiting, es decir, el tiempo que tarda el servidor en procesar. La lentitud viene del backend y no de la red.

## 4. Análisis del gráfico VUs vs peticiones por segundo

Lo que se observa en el gráfico, por tramos:

| Hora aprox. | VUs | Peticiones/s |
|---|---|---|
| 01:35 - 01:37 | sube de 0 a 140 | sube hasta unas 95 |
| 01:37 - 01:50 | 140 | entre 80 y 85 |
| 01:50 - 01:52 | 140 | baja a unas 40 |
| 01:52 - 01:57 | 140 | entre 10 y 25, con un pico suelto de unas 55 |
| 01:57 - 02:00 | 140 | se recupera hasta unas 85 |
| 02:00 - 02:37 | 140 | entre 80 y 90 (a las 02:02 marca 82,6/s) |
| 02:37 - 02:38 | baja a 0 | baja a 0 |

Con 140 usuarios y unas 85 peticiones por segundo, cada usuario hace una iteración cada 1,65 s aproximadamente. Esto cuadra con la mediana de iteration_duration (1,61 s), así que en condiciones normales el servicio aguanta esa carga con tiempos de unos 600 ms.

Entre 01:50 y 01:59 la cantidad de usuarios no cambia, pero las peticiones por segundo caen casi un 90 %. Como en esta prueba cada usuario espera la respuesta antes de enviar la siguiente petición, que bajen las peticiones por segundo significa que las respuestas empezaron a tardar mucho más. Con 140 usuarios y unas 10 peticiones por segundo, cada iteración estaría tardando unos 14 s. Eso es coherente con los tiempos máximos del resumen, de 26 a 30 s.

Esa caída está dentro de la etapa 1, donde están los 5.987 errores 5xx. El resumen no permite ver la hora exacta de cada error, pero lo más probable es que la mayoría ocurriera en esa ventana.

Algo a tener en cuenta es que el servicio se recupera solo, sin bajar la carga. Eso hace pensar que algún recurso se saturó por un rato y luego se liberó: el pool de conexiones a la base de datos, pausas del garbage collector, algún proceso batch que corrió en paralelo, bloqueos en base de datos o el reinicio o autoescalado de alguna instancia. No parece un problema de capacidad permanente, porque antes y después el servicio funciona bien con la misma carga.

También hay que considerar que el promedio de 73 peticiones por segundo y la tasa de error de 2,44 % salen de toda la prueba, incluyendo la caída. Durante esos minutos la tasa de error real fue mucho más alta que 3 %, pero al promediarla con el resto de la prueba queda por debajo del límite.

## 5. Hallazgos

1. El p95 del tiempo de respuesta es 1,57 s y supera el máximo de 1,5 s.
2. Entre las 01:50 y las 01:59 hubo una caída fuerte del rendimiento (de unas 85 a unas 10 peticiones por segundo) con la carga constante de 140 usuarios.
3. Hubo 5.987 errores 5xx en la etapa 1, lo que indica que el servidor no pudo atender las peticiones en ese periodo.
4. Hubo 769 errores 4xx en la etapa 1. Pueden deberse a datos de prueba inválidos, tokens o sesiones vencidas, o a un límite de peticiones (429). Hay que revisar qué códigos fueron exactamente.
5. Hay respuestas de casi 30 s, lo que parece un timeout configurado en algún punto (gateway, balanceador o cliente).
6. La tasa de error global (2,44 %) cumple el límite de 3 %, pero con poco margen y concentrada en un solo evento.
7. El check "App Transaction Balance response was OK" sale fallido (97 %), pero los thresholds salen en verde. Los thresholds que se configuraron son más permisivos que los criterios de aceptación.

## 6. Conclusiones

El servicio no cumple con el tiempo de respuesta esperado para 140 usuarios concurrentes, ya que el p95 queda en 1,57 s.

Fuera de la caída, el servicio maneja entre 80 y 90 peticiones por segundo con tiempos de unos 600 ms, que sería su capacidad normal con esta carga.

El problema principal no es la latencia promedio sino la inestabilidad. Durante casi 10 minutos el servicio prácticamente dejó de responder bien, con muchos errores 5xx y timeouts. Si esto pasa en producción, los usuarios se quedarían sin servicio durante ese tiempo.

Como el servicio se recupera solo, lo más probable es que la causa sea un recurso que se satura temporalmente o algo externo a la prueba, más que falta de capacidad.

Por último, los thresholds de la prueba no reflejan bien los criterios de aceptación, porque dieron la prueba por buena a pesar de la caída.

## 7. Recomendaciones

1. Revisar qué pasó entre las 01:50 y las 01:59 con el monitoreo del servidor y de la aplicación: CPU, memoria, garbage collector, hilos, pool de conexiones a base de datos, bloqueos, logs de errores 5xx y si había algún job o proceso programado a esa hora.
2. Revisar los errores 4xx para saber qué códigos fueron (400, 401, 403, 429) y validar los datos de prueba y la vigencia de los tokens.
3. Ajustar los thresholds a los criterios de aceptación (p95 menor a 1500 ms, errores menores a 3 %, checks mayores a 97 %) para que el resultado de k6 sea confiable.
4. Analizar los resultados por intervalos de tiempo y no solo con el resumen final, por ejemplo con Grafana e InfluxDB o Prometheus. Así se ven caídas como esta, que en los promedios casi no se notan.
5. Si el objetivo es validar un número de TPS, usar un executor por tasa de llegada (constant-arrival-rate o ramping-arrival-rate). Con usuarios fijos, cuando el servicio se pone lento también baja la carga, y eso esconde parte del problema.
6. Revisar los timeouts de 30 s en cliente, gateway y servicio. Conviene que sean más cortos y acordes al tiempo de respuesta esperado, para que el sistema falle rápido en vez de acumular peticiones.
7. Volver a ejecutar la prueba después de los ajustes para ver si la caída se repite. También se recomienda una prueba de mayor duración para detectar degradación en el tiempo y una prueba de estrés para encontrar el límite real del servicio.
8. Guardar en la prueba el código, la respuesta y la hora de cada petición fallida, para facilitar el análisis.
