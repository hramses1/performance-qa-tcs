# Ejercicio Performance QA

Prueba de carga al servicio de login de FakeStoreAPI con k6 (ejercicio 1) y análisis de resultados de una prueba de carga (ejercicio 2).

Las instrucciones para ejecutar la prueba están en `readme.txt` y las conclusiones del ejercicio 1 en `conclusiones.txt`. El informe del ejercicio 2 está en la carpeta `ejercicio2`.

Para correr la prueba:

```bash
cd ejercicio1/scripts
k6 run login-load-test.js
```

Resultado de la última ejecución (25 TPS durante 3 minutos):

| Validación | Esperado | Obtenido |
|---|---|---|
| TPS | 20 o más | 24,93 |
| Tiempo de respuesta p(95) | máximo 1,5 s | 437 ms |
| Tasa de error | menor a 3 % | 0 % |
