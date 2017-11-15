const express = require('express');
const router = express.Router();
const app = require('./../app');
const moment = require('moment');

const lyrebird = require('./../lib/lyrebird');

router.get('/', async (req, res) => {
  try {
    if (!!req.query && !!req.query.code) {
      process.env.AUTH_CODE = req.query.code;
      lyrebird
        .getAccessToken()
        .then(tokenData => {
          const now = moment();

          process.env.ACCESS_TOKEN = tokenData.access_token;
          process.env.TOKEN_TYPE = tokenData.token_type;
          process.env.TOKEN_SCOPE = tokenData.scope;
          process.env.REFRESH_TOKEN = tokenData.refresh_token;
          process.env.ACCESS_TOKEN_TIMESTAMP = now;
          process.env.ACCESS_TOKEN_EXPIRATION = moment(
            now + tokenData.expires_in * 1000
          ); // expires_in is in seconds, moment works in ms

          res.status(200).send({ killBrowser: true });
        })
        .catch(e => {
          console.log(e);
          res.sendStatus(500);
        });
    } else {
      res.redirect('/');
    }
  } catch (e) {
    console.log(e);
    res.sendStatus(500);
  }
});

module.exports = router;
