import createCustomMessage from './scnearios/create-custom-message.scenario.js';

export const options = {
  scenarios: {
    create_custom_message: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 1),
      duration: __ENV.DURATION || '10s',
      exec: 'createCustomMessage',
    },
  },
};

export default function () {}

export { createCustomMessage };
