const express = require('express');
const puppeteer = require('puppeteer');
const Promise = require('bluebird');

const router = express.Router();

const db = require('./../lib/db');

function generateLyrebirdUrlFromText(inputText) {
  return new Promise(async (resolve, reject) => {
    const timeStart = new Date();
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // fails in docker without this!
    });
    const page = await browser.newPage();

    const LOGIN_URL = 'https://lyrebird.ai/account/login';
    const VOICE_URL = 'https://lyrebird.ai/my/voice/';
    const USERNAME_SELECTOR = '#id_username';
    const PASSWORD_SELECTOR = '#id_password';
    const LOGIN_BUTTON_SELECTOR =
      'body > div.container.lyrebird-container > div > div > form > div:nth-child(4) > div > input';

    const VOICE_INPUT_SELECTOR = '#text-entry';
    const VOICE_GENERATE_BUTTON = '#submit-btn';

    await page.goto(LOGIN_URL);

    await page.click(USERNAME_SELECTOR);
    await page.keyboard.type(process.env.LYREBIRD_EMAIL);

    await page.click(PASSWORD_SELECTOR);
    await page.keyboard.type(process.env.LYREBIRD_PASSWORD);

    await page.click(LOGIN_BUTTON_SELECTOR);

    await page.waitForNavigation();

    await page.goto(VOICE_URL);

    await page.click(VOICE_INPUT_SELECTOR);
    await page.keyboard.type(inputText);

    await page.click(VOICE_GENERATE_BUTTON);

    page.on('response', responsePromise => {
      responsePromise
        .text()
        .then(async JSONResponse => {
          try {
            const response = JSON.parse(JSONResponse);
            if (
              !!response &&
              response.length > 0 &&
              response[0].status === 'success'
            ) {
              const utterance = response[0].utterance;
              db.logUtterance(utterance);
              resolve(utterance.audio_file);
            } else {
              reject(new Error('invalid response'));
            }
          } catch (e) {
            console.log('Error parsing JSON:', e);
            reject(new Error('invalid response'));
          }

          await browser.close();

          const timeEnd = new Date();
          console.log(`response took ${(timeEnd - timeStart) / 1000} seconds`);
        })
        .catch(async e => {
          console.log('Error getting JSON response:', e);

          await browser.close();

          const timeEnd = new Date();
          console.log(`response took ${(timeEnd - timeStart) / 1000} seconds`);
          reject(new Error('invalid response'));
        });
    });
  });
}

function setupGenerateRoute() {
  router.post('/', (req, res) => {
    if (!!req.body && !!req.body.text && req.body.text.length > 0) {
      const phrase = req.body.text;
      generateLyrebirdUrlFromText(phrase)
        .then(url => {
          res.status(200).send(url);
        })
        .catch(e => {
          console.log(e);
          res.sendStatus(500);
        });
    } else {
      res.sendStatus(500);
    }
  });
}

function setupProcessCloseEvents(browser) {
  process.stdin.resume(); //so the program will not close instantly

  async function exitHandler(options, err) {
    if (options.cleanup) console.log('clean');
    if (err) console.log(err.stack);

    if (options.exit) {
      try {
        await browser.close();
      } catch (e) {}

      process.exit();
      return Promise.resolve();
    }
  }

  //do something when app is closing
  process.on('exit', exitHandler.bind(null, { cleanup: true }));

  //catches ctrl+c event
  process.on('SIGINT', exitHandler.bind(null, { exit: true }));

  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
  process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

  //catches uncaught exceptions
  process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
}

function run() {
  setupGenerateRoute();
  // logInToLyrebird();
}

run();

module.exports = router;
