import request from './api';

async function getCrops() {
  return request('/crops');
}

export default { getCrops };
