const express = require('express');
const puppeteer = require('puppeteer');
const Promise = require('bluebird');

const router = express.Router();

const db = require('./../lib/db');

function generateLyrebirdUtteranceFromText(inputText) {
  return new Promise(async (resolve, reject) => {
    try {
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

      await page.waitForSelector(VOICE_INPUT_SELECTOR);

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
                resolve(utterance);
              } else {
                reject(new Error('invalid response'));
              }
            } catch (e) {
              console.log('Error parsing JSON:', e);
              reject(new Error('invalid response'));
            }

            await browser.close();

            const timeEnd = new Date();
            console.log(
              `response took ${(timeEnd - timeStart) / 1000} seconds`
            );
            return;
          })
          .catch(async e => {
            console.log('Error getting JSON response:', e);

            await browser.close();

            const timeEnd = new Date();
            console.log(
              `response took ${(timeEnd - timeStart) / 1000} seconds`
            );
            reject(new Error('invalid response'));
          });
      });
    } catch (e) {
      reject(e);
    }
  });
}

router.post('/', (req, res) => {
  if (
    !!req.body &&
    !!req.body.text &&
    req.body.text.length > 0 &&
    !!process.env.AUTH_CODE
  ) {
    const phrase = req.body.text;
    generateLyrebirdUtteranceFromText(phrase)
      .then(url => {
        res.status(200).send(url);
      })
      .catch(e => {
        console.log(e);
        res.sendStatus(500);
      });
  } else {
    console.log('invalid request');
    res.sendStatus(500);
  }
});

router.get('/', (req, res) => {
  res.send('hi');
});

module.exports = router;
