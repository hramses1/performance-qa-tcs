// Prueba de carga - login FakeStoreAPI
import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

const BASE_URL = __ENV.BASE_URL || 'https://fakestoreapi.com';
const TPS = Number(__ENV.TPS || 25); // se piden minimo 20
const DURATION = __ENV.DURATION || '3m';
const MAX_RESPONSE_MS = 1500;
const REPORTS_DIR = __ENV.REPORTS_DIR || '../reports';

// usuarios del csv
const users = new SharedArray('usuarios', () =>
  open('../data/usuarios.csv')
    .split(/\r?\n/)
    .slice(1) // cabecera
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [user, passwd] = line.split(',');
      return { user: user.trim(), passwd: passwd.trim() };
    }),
);

// para separar errores 4xx y 5xx en el resumen
const failed4xx = new Counter('failed_request_HTTP4xx');
const failed5xx = new Counter('failed_request_HTTP5xx');

export const options = {
  scenarios: {
    login_carga: {
      executor: 'constant-arrival-rate',
      rate: TPS,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: 30,
      maxVUs: 150,
    },
  },
  thresholds: {
    http_req_duration: [`p(95)<${MAX_RESPONSE_MS}`],
    http_req_failed: ['rate<0.03'],
    http_reqs: ['rate>=20'],
    checks: ['rate>0.97'],
  },
};

export default function () {
  const cred = users[__ITER % users.length];
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ username: cred.user, password: cred.passwd }),
    { headers: { 'Content-Type': 'application/json' }, timeout: '60s', tags: { name: 'POST /auth/login' } },
  );

  if (res.status >= 500) failed5xx.add(1);
  else if (res.status >= 400) failed4xx.add(1);

  check(res, {
    'status es 200/201': (r) => r.status === 200 || r.status === 201,
    'respuesta contiene token': (r) => {
      try {
        return typeof r.json('token') === 'string';
      } catch (e) {
        return false;
      }
    },
    [`tiempo de respuesta <= ${MAX_RESPONSE_MS} ms`]: (r) => r.timings.duration <= MAX_RESPONSE_MS,
  });
}

// guarda el resumen en txt y json ademas de mostrarlo en consola
export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    [`${REPORTS_DIR}/textSummary.txt`]: textSummary(data, { indent: ' ', enableColors: false }),
    [`${REPORTS_DIR}/summary.json`]: JSON.stringify(data, null, 2),
  };
}
