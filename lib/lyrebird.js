const puppeteer = require('puppeteer');
const Promise = require('bluebird');
const axios = require('axios');

function getOrRefreshAccessToken() {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Attempting to get access token');
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // fails in docker without this!
      });

      await getAuthCode(browser); // gets auth code, then is redirected to /auth, which sets process.env.ACCESS_TOKEN

      await browser.close();

      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

async function getAuthCode(browser) {
  return new Promise(async (resolve, reject) => {
    try {
      const page = await browser.newPage();

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

      await page.waitForNavigation();

      const AUTHORIZE_BUTTON_SELECTOR =
        'body > div.container.lyrebird-container > div > form > div > div:nth-child(7) > div > input.btn.btn-primary';

      await page.click(AUTHORIZE_BUTTON_SELECTOR);

      page.on('response', function(response) {
        if (response.status === 200) {
          response
            .json()
            .then(async jsonResponse => {
              if (jsonResponse.killBrowser === true) {
                resolve();
              }
            })
            .catch(e => {
              console.log('promise catch');
              console.log(e);
            });
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

function getAccessToken() {
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

module.exports.getAuthCode = getAuthCode;
module.exports.getAccessToken = getAccessToken;
module.exports.getOrRefreshAccessToken = getOrRefreshAccessToken;
