import request from './api';

async function askAssistant(message, language, history, location) {
  return request('/assistant', {
    method: 'POST',
    auth: true,
    body: { message, language, history, location },
  });
}

export default { askAssistant };
