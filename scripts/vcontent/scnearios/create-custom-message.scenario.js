import { post } from '../../../helpers/http.js';
import { authHeaders } from '../../../helpers/auth.js';
import { createCustomMessagePayload } from '../payloads/custom-message.payload.js';
import {
  customMessageDuration,
  customMessageErrors,
} from '../../../helpers/metrics.js';

const BASE_URL = __ENV.VCONTENT_BASE_URL;
const JWT_TOKEN = __ENV.VCONTENT_JWT_TOKEN;

export default function createCustomMessage() {
  const res = post(
    `${BASE_URL}/custom-message`,
    createCustomMessagePayload(),
    authHeaders(JWT_TOKEN),
    { endpoint: 'custom-message' },
  );

  customMessageDuration.add(res.timings.duration);
  customMessageErrors.add(res.status >= 400);
}