const moment = require('moment');
const Promise = require('bluebird');
const axios = require('axios');

const db = require('./db');
const lyrebird = require('./lyrebird');
const _ = db._;

let refreshAccessTimeout = null;

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

      clearTimeout(refreshAccessTimeout);
      refreshAccessTimeout = setTimeout(
        refreshAccessToken,
        (moment(process.env.ACCESS_TOKEN_EXPIRATION) - moment()) / 100000
      );
    })
    .catch(e => {
      // console.log(e);
      console.log('Error refreshing access token', e.message);
    });
}

function makeSureAuthIsFresh() {
  asyncMakeSureAuthIsFresh()
    .then(() => {
      setRefreshAuthTimeout();
    })
    .catch(e => {
      console.log('error making sure auth is fresh', e);
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

function asyncMakeSureAuthIsFresh() {
  return new Promise((resolve, reject) => {
    const auth = db.getAuth();

    let getToken = false;
    let refreshToken = false;

    if (!!auth && !_.isEmpty(auth)) {
      // auth is set, make sure access token is fresh
      if (moment() > moment(auth.access_token_expiration)) {
        // we're past the date of expiration, get token
        if (!!auth.refresh_token) {
          getToken = true;
        } else {
          // refresh token is set, refresh access token
          refreshToken = false;
        }
      } else {
        // make a test generate call to see
        console.log('testing post');
        axios
          .post(`${process.env.SITE_URL}/generate/test`)
          .then(res => {
            // test was success, resolve
            resolve();
          })
          .catch(e => {
            // test failed, refresh token
            getToken = true;
            // lyrebird
            //   .getAccessToken()
            //   .then(res => {
            //     console.log('access token got');
            //     resolve(res);
            //   })
            //   .catch(e => {
            //     reject(e);
            //   });
          });
      }
    } else {
      // no auth, get access token
      getToken = true;
    }

    if (getToken === true) {
      lyrebird
        .getAccessToken()
        .then(res => {
          console.log('access token got');
          resolve(res);
        })
        .catch(e => {
          reject(e);
        });
    } else if (refreshToken === true) {
      refreshAccessToken()
        .then(res => {
          console.log('access token refreshed');
          resolve(res);
        })
        .catch(e => {
          reject(e);
        });
    } else {
      setAuthProcessVars(auth);
      console.log('Retreiving auth from DB');
      resolve(auth);
    }
  });
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

  return auth;
}

module.exports.setAuthProcessVars = setAuthProcessVars;
module.exports.makeSureAuthIsFresh = makeSureAuthIsFresh;
module.exports.getAuthFromTokenData = getAuthFromTokenData;
