import request from './api';

async function getMandis() {
  return request('/mandis');
}

export default { getMandis };
