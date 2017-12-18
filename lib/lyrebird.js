const puppeteer = require('puppeteer');
const Promise = require('bluebird');
const axios = require('axios');

function getOrRefreshAccessToken() {
  return new Promise((resolve, reject) => {
    try {
      let getToken = false;
      let refreshToken = false;

      if (!process.env.ACCESS_TOKEN || !process.env.ACCESS_TOKEN_EXPIRATION) {
        // no access token, get one
        getToken = true;
      } else {
        // access token is set, make sure it's valid
        if (moment() > process.env.ACCESS_TOKEN_EXPIRATION) {
          // we're past the date of expiration, get token
          if (!!process.env.REFRESH_TOKEN) {
            getToken = true;
          } else {
            // refresh token is set, refresh access token
            refreshToken = false;
          }
        }
      }
    } catch (e) {
      reject(e);
    }
  });
}

function getAccessToken() {
  return new Promise(async (resolve, reject) => {
    let browser;
    try {
      console.log('Attempting to get access token');
      browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // fails in docker without this!
      });

      await getAuthCode(browser); // gets auth code, then is redirected to /auth, which sets process.env.ACCESS_TOKEN

      await browser.close();

      resolve();
    } catch (getAccessTokenError) {
      try {
        await browser.close();
      } catch (browserCloseError) {
        console.log('error closing browser');
      }
      reject(getAccessTokenError);
    }
  });
}

function refreshAccessToken() {
  return postRefreshTokenToLyrebird();
}

function getAuthCode(browser) {
  return new Promise(async (resolve, reject) => {
    const page = await browser.newPage();

    try {
      const AUTH_CODE_URL = `https://lyrebird.ai/auth/authorize/?client_id=${
        process.env.CLIENT_ID
      }&response_type=code&redirect_uri=${process.env.SITE_URL}/auth`;
      const USERNAME_SELECTOR = '#id_username';
      const PASSWORD_SELECTOR = '#id_password';
      const LOGIN_BUTTON_SELECTOR =
        'body > div.container.lyrebird-container > div > div > form > div:nth-child(4) > div > input';

      await page.goto(AUTH_CODE_URL);

      await page.click(USERNAME_SELECTOR);
      await page.keyboard.type(process.env.LYREBIRD_EMAIL);

      await page.click(PASSWORD_SELECTOR);
      await page.keyboard.type(process.env.LYREBIRD_PASSWORD);

      await page.click(LOGIN_BUTTON_SELECTOR);

      const AUTHORIZE_BUTTON_SELECTOR =
        'body > div.container.lyrebird-container > div > form > div > div:nth-child(7) > div > input.btn.btn-primary';

      await page.waitForSelector(AUTHORIZE_BUTTON_SELECTOR);
      await page.click(AUTHORIZE_BUTTON_SELECTOR);

      page.on('response', function(response) {
        if (response.ok) {
          try {
            response
              .text()
              .then(async textResponse => {
                try {
                  const jsonResponse = JSON.parse(textResponse); // will throw if not valid json
                  if (jsonResponse.killBrowser === true) {
                    resolve();
                  }
                } catch (e) {
                  // console.log('not valid json');
                  // console.log(textResponse);
                }
              })
              .catch(e => {
                // suppress errors (I know, I know) bc erroring responses don't need to shut off the browser
                console.log('promise catch:', e.message);
                response
                  .text()
                  .then(text => {
                    console.log('text', text);
                  })
                  .catch(err => {
                    console.log(err);
                  });
              });
          } catch (e) {
            console.log('try catch');
            console.log(e);
          }
        } else if (response.status === 404) {
          console.log(`${response.url} 404's, rejecting`);
          reject(new Error(`${response.url} 404's, rejecting`));
        }
      });
    } catch (e) {
      try {
        const content = await page.content();
        console.log(content);
      } catch (pageError) {
        console.log(pageError);
      }

      reject(e);
    }
  });
}

function postAuthCodeToLyrebird() {
  return new Promise((resolve, reject) => {
    if (!process.env.AUTH_CODE) {
      reject(new Error('process.env.AUTH_CODE must be set'));
    }

    axios({
      method: 'post',
      url: 'https://lyrebird.ai/auth/token/',
      data: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: process.env.AUTH_CODE,
        redirect_uri: `${process.env.SITE_URL}/auth`
      },
      headers: {
        Accept: 'application/json; indent=4'
      }
    })
      .then(res => {
        if (!!res.data && !!res.data.access_token) {
          resolve(res.data);
        } else {
          reject(new Error('unable to obtain access token'));
        }
      })
      .catch(e => {
        reject(e);
      });
  });
}

function postRefreshTokenToLyrebird() {
  return new Promise((resolve, reject) => {
    console.log(process.env);
    axios({
      method: 'post',
      url: 'https://lyrebird.ai/auth/token/',
      data: {
        client_id: process.env.CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: process.env.REFRESH_TOKEN
      },
      headers: {
        Accept: 'application/json; indent=4',
        Authorization: `${process.env.TOKEN_TYPE} ${process.env.ACCESS_TOKEN}`
      }
    })
      .then(res => {
        if (!!res.data && !!res.data.access_token) {
          resolve(res.data);
        } else {
          reject(new Error('unable to obtain access token'));
        }
      })
      .catch(e => {
        reject(e);
      });
  });
}

module.exports.getOrRefreshAccessToken = getOrRefreshAccessToken;
module.exports.postAuthCodeToLyrebird = postAuthCodeToLyrebird;
module.exports.getAccessToken = getAccessToken;
module.exports.refreshAccessToken = refreshAccessToken;
