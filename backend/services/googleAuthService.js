const axios = require('axios');

function getGoogleUser(idToken) {
  return axios.get('https://oauth2.googleapis.com/tokeninfo', { params: { id_token: idToken } });
}

module.exports = { getGoogleUser };