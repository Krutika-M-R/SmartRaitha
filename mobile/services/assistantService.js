import request from './api';

async function askAssistant(message, language, history) {
  return request('/assistant', {
    method: 'POST',
    auth: true,
    body: { message, language, history },
  });
}

export default { askAssistant };
