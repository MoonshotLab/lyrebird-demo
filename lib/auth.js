const moment = require('moment');
const Promise = require('bluebird');
const axios = require('axios');

const db = require('./db');
const lyrebird = require('./lyrebird');
const _ = db._;

let refreshAccessTimeout = null;

function setAuthProcessVarsFromDb() {
  const auth = db.getAuth();
  // console.log(auth);
  setAuthProcessVars(auth);
}

function setAuthProcessVars(auth) {
  process.env.ACCESS_TOKEN = auth.access_token;
  process.env.TOKEN_TYPE = auth.token_type;
  process.env.TOKEN_SCOPE = auth.scope;
  process.env.REFRESH_TOKEN = auth.refresh_token;
  process.env.ACCESS_TOKEN_TIMESTAMP = auth.access_token_timestamp;
  process.env.ACCESS_TOKEN_EXPIRATION = auth.access_token_expiration;
}

function getAccessToken() {
  lyrebird
    .getAccessToken()
    .then(res => {
      console.log('Access token got');
    })
    .catch(e => {
      console.log('Error getting access token', e.message);
    });
}

function refreshAccessToken() {
  console.log('refreshing access token');
  lyrebird
    .refreshAccessToken()
    .then(tokenData => {
      console.log('Access token refreshed');
      const auth = getAuthFromTokenData(tokenData);
      setAuthProcessVars(auth);
    })
    .catch(e => {
      // console.log(e);
      console.log('Error refreshing access token', e.message);
    });
}

function makeSureAuthIsFresh() {
  asyncMakeSureAuthIsFresh()
    .then(() => {
      // hook up env vars
      setAuthProcessVarsFromDb();
      setRefreshAuthTimeout();
    })
    .catch(e => {
      console.log('error making sure auth is fresh:', e.message);
    });
}

function setRefreshAuthTimeout() {
  if (!process.env.ACCESS_TOKEN_EXPIRATION)
    throw new Error('access token expiration must be set');

  clearTimeout(refreshAccessTimeout);
  refreshAccessTimeout = setTimeout(() => {
    refreshAccessToken();
  }, (moment(process.env.ACCESS_TOKEN_EXPIRATION) - moment()) / 10);
}

function asyncCheckIfAuthIsFresh() {
  return new Promise((resolve, reject) => {
    const auth = db.getAuth();

    if (!!auth && !_.isEmpty(auth)) {
      // hook up env vars
      setAuthProcessVars(auth);

      // auth is set, make sure access token is fresh
      if (moment() > moment(process.env.ACCESS_TOKEN_EXPIRATION)) {
        // we're past the date of expiration, get token
        console.log('token expired');
        reject(new Error('token_expired'));
      } else {
        // auth is still within expiration date, hit test endpoint
        axios
          .post(`${process.env.SITE_URL}/generate/test`)
          .then(() => {
            // everything works, yay!
            // console.log('endpoint test succeeded');
            resolve();
          })
          .catch(e => {
            // test endpoint fails
            // console.log('endpoint test failed');
            reject(new Error('endpoint_failure'));
          });
      }
    } else {
      // no auth info
      // console.log('empty auth');
      reject(new Error('empty_auth'));
    }
  });
}

function asyncMakeSureAuthIsFresh() {
  return new Promise((resolve, reject) => {
    asyncCheckIfAuthIsFresh()
      .then(() => {
        resolve();
      })
      .catch(e => {
        // auth is not fresh!
        // console.log(e.message);
        lyrebird
          .getAccessToken()
          .then(() => {
            // console.log('success!');
            resolve();
          })
          .catch(e => {
            reject(e);
          });
      });
  });
}

function getAuthFromTokenData(tokenData) {
  const now = moment();

  const auth = {
    access_token: tokenData.access_token,
    token_type: tokenData.token_type,
    token_scope: tokenData.scope,
    refresh_token: tokenData.refresh_token,
    access_token_timestamp: now.format(),
    access_token_expiration: moment(now + tokenData.expires_in * 1000).format() // expires_in is in seconds, moment works in ms
  };

  return auth;
}

exports.setAuthProcessVars = setAuthProcessVars;
exports.makeSureAuthIsFresh = makeSureAuthIsFresh;
exports.getAuthFromTokenData = getAuthFromTokenData;
exports.setAuthProcessVarsFromDb = setAuthProcessVarsFromDb;
