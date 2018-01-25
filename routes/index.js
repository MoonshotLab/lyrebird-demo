const express = require('express');
const router = express.Router();
const app = require('./../app');

router.get('/', (req, res) => {
  res.render('index', {
    bodyId: 'index',
    foo: app.locals.foo,
    installation: process.env.CONNECT_TO_ARDUINO == 'true'
  });
});

module.exports = router;
