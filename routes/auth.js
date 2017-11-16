const express = require('express');
const router = express.Router();
const app = require('./../app');

const lyrebird = require('./../lib/lyrebird');
const db = require('./../lib/db');
const auth = require('./../lib/auth');

router.get('/', async (req, res) => {
  try {
    if (!!req.query && !!req.query.code) {
      process.env.AUTH_CODE = req.query.code;
      lyrebird
        .postAuthCodeToLyrebird()
        .then(tokenData => {
          const auth = auth.getAuthFromTokenData(tokenData);

          db.setAuth(auth);
          auth.setAuthProcessVars(auth);

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
