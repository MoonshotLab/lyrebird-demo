const axios = require('axios');
const qs = require('qs');

axios.defaults.headers.common['Authorization'] = process.env.SECRET;

function saveUtterance(utteranceObj) {
  try {
    axios({
      url: process.env.LOG_URL,
      method: 'POST',
      data: qs.stringify(utteranceObj)
    })
      .then(() => {
        console.log('Successfully posted to log');
      })
      .catch(e => {
        console.log('Unable to post to log', e);
      });
  } catch (e) {
    console.log('Unable to post to log', e);
  }
}

exports.saveUtterance = saveUtterance;
