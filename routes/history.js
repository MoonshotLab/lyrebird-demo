const express = require('express');
const router = express.Router();

const db = require('./../lib/db');

const dbHistory = router.get('/', (req, res) => {
  res.render('history', {
    bodyId: 'history',
    history: db.getAllHistory(),
    moment: require('moment')
  });
});

module.exports = router;
