const moment = require('moment');

const db = require('./db');
const _ = db._;

function setAuthProcessVars(auth) {
  process.env.ACCESS_TOKEN = auth.access_token;
  process.env.TOKEN_TYPE = auth.token_type;
  process.env.TOKEN_SCOPE = auth.scope;
  process.env.REFRESH_TOKEN = auth.refresh_token;
  process.env.ACCESS_TOKEN_TIMESTAMP = auth.access_token_timestamp;
  process.env.ACCESS_TOKEN_EXPIRATION = auth.access_token_expiration;
}

function makeSureAuthIsFresh() {
  // TODO: setTimeout to refresh auth
  const auth = db.getAuth();

  let getToken = false;
  let refreshToken = false;

  if (!!auth && !_.isEmpty(auth)) {
    // auth is set, make sure access token is fresh
    if (moment() > process.env.ACCESS_TOKEN_EXPIRATION) {
      // we're past the date of expiration, get token
      if (!!process.env.REFRESH_TOKEN) {
        getToken = true;
      } else {
        // refresh token is set, refresh access token
        refreshToken = false;
      }
    }
  } else {
    // no auth, get access token
    getToken = true;
  }

  if (getToken === true) {
    getAccessToken()
      .then(res => {
        console.log('Access token got');
      })
      .catch(e => {
        throw e;
      });
  } else if (refreshToken === true) {
    refreshAccessToken()
      .then(res => {
        console.log('Access token refreshed');
      })
      .catch(e => {
        throw e;
      });
  } else {
    setAuthProcessVars(auth);
    console.log('Auth is fresh');
  }
}

function getAuthFromTokenData(tokenData) {
  const now = moment();

  const auth = {
    access_token: tokenData.access_token,
    token_type: tokenData.token_type,
    token_scope: tokenData.scope,
    refresh_token: tokenData.refresh_token,
    access_token_timestamp: now,
    access_token_expiration: moment(now + tokenData.expires_in * 1000) // expires_in is in seconds, moment works in ms
  };
}

module.exports.setAuthProcessVars = setAuthProcessVars;
module.exports.makeSureAuthIsFresh = makeSureAuthIsFresh;
module.exports.getAuthFromTokenData = getAuthFromTokenData;
