const express = require('express');
const puppeteer = require('puppeteer');
const Promise = require('bluebird');
const axios = require('axios');

const router = express.Router();

const db = require('./../lib/db');
const _ = db._; // lodash

const sentenceCase = require('sentence-case');

function generateLyrebirdUtteranceFromText(inputText) {
  return new Promise((resolve, reject) => {
    if (!!process.env.ACCESS_TOKEN) {
      axios({
        method: 'post',
        url: 'https://lyrebird.ai/api/generate/',
        data: {
          texts: [inputText]
        },
        headers: {
          Authorization: `${process.env.TOKEN_TYPE} ${
            process.env.ACCESS_TOKEN
          }`,
          'Content-Type': 'application/json',
          Accept: 'application/json; indent=4'
        }
      })
        .then(lyrebirdRes => {
          // data is an array, but since we just passed in one text, we only care about the first
          if (
            lyrebirdRes.data[0].status === 'success' &&
            !!lyrebirdRes.data[0].utterance
          ) {
            resolve(lyrebirdRes.data[0].utterance);
          } else {
            reject(new Error('response unsuccessful'));
          }
        })
        .catch(e => {
          reject(e);
        });
    } else {
      reject(new Error('unset access token'));
    }
  });
}

function puppeteerGenerateLyrebirdUtteranceFromText(inputText) {
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
    !!process.env.ACCESS_TOKEN
  ) {
    const phrase = sentenceCase(req.body.text);

    // check if utterance is already in db
    const dbUtterance = db.getUtteranceByText(phrase);

    if (!!dbUtterance) {
      // utterance in db
      console.log(`Utterance "${phrase}" already in DB.`);
      res.status(200).send(dbUtterance);
    } else {
      // new utterance, hit lyrebird api
      console.log(`Utterance "${phrase}" is new, generate via Lyrebird.`);
      generateLyrebirdUtteranceFromText(phrase)
        .then(utterance => {
          db.logUtterance(utterance);
          res.status(200).send(utterance);
        })
        .catch(e => {
          if (!!e.data && !!e.data.detail) {
            console.log(e.data.detail);
          } else {
            console.log(e);
          }

          res.status(500).send(e);
        });
    }
  } else {
    res.status(500).send(new Error('text and access_token must be set'));
  }
});

module.exports = router;
