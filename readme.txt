EJERCICIO PERFORMANCE QA
========================

Versiones utilizadas
--------------------
- k6 v2.4.0
- Windows 11 Pro (también se puede ejecutar en Linux o macOS)
- Git 2.47.1
- Librería k6-summary 0.1.0 de jslib.k6.io (k6 la descarga sola al ejecutar el script)

Servicio probado: POST https://fakestoreapi.com/auth/login


Contenido
---------
ejercicio1/data/usuarios.csv               usuarios y contraseñas para la prueba
ejercicio1/scripts/login-load-test.js      script de k6
ejercicio1/reports/                        reportes de la ejecución (txt, json, html y log de consola)
ejercicio2/textSummary.txt                 resumen que venía en el enunciado
ejercicio2/InformeResultados.docx          informe del ejercicio 2 (también está en .md)


Requisitos
----------
Tener conexión a internet e instalar k6:

  Windows:  winget install GrafanaLabs.k6
  macOS:    brew install k6
  Linux:    https://grafana.com/docs/k6/latest/set-up/install-k6/

Para comprobar que quedó instalado:  k6 version


Pasos para ejecutar
-------------------
1. Clonar el repositorio y entrar a la carpeta del script:

   git clone https://github.com/hramses1/performance-qa-tcs.git
   cd performance-qa-tcs/ejercicio1/scripts

   Es importante ejecutar desde esta carpeta porque las rutas del csv y de los reportes son relativas.

2. Ejecutar la prueba:

   k6 run login-load-test.js

   Si además se quiere el reporte html con gráficas:

   Windows (PowerShell)
     $env:K6_WEB_DASHBOARD="true"
     $env:K6_WEB_DASHBOARD_EXPORT="../reports/reporte-dashboard.html"
     k6 run login-load-test.js

   Linux / macOS
     K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=../reports/reporte-dashboard.html k6 run login-load-test.js

3. Los resultados quedan en ejercicio1/reports (textSummary.txt, summary.json y el html si se generó).
   Si alguna validación no se cumple, k6 lo marca con una X en el resumen y termina con código 99.


Configuración de la prueba
--------------------------
Se usa el executor constant-arrival-rate de k6 a 25 peticiones por segundo durante 3 minutos.
Puse 25 en lugar de 20 para tener margen y asegurar que se cumplan los 20 TPS.

Los usuarios se leen de usuarios.csv y se van rotando en cada iteración.

Validaciones (thresholds):
  - p(95) del tiempo de respuesta menor a 1500 ms
  - tasa de error menor al 3 %
  - al menos 20 peticiones por segundo

En cada respuesta también se valida que el status sea 200 o 201, que venga el token
y que no pase de 1,5 s.

Se pueden cambiar algunos valores sin tocar el script:
  k6 run -e TPS=30 -e DURATION=5m login-load-test.js


Ejercicio 2
-----------
No tiene nada que ejecutar, el análisis está en ejercicio2/InformeResultados.docx.
