const express = require('express');
const router = express.Router();

const moment = require('moment');

const db = require('./../lib/db');

router.get('/all', (req, res) => {
  res.render('all', {
    utterances: db.getAllUtterances()
  });
});

router.get('/:id', (req, res) => {
  const utterance = db.getUtteranceById(req.params.id);
  if (!!req.params.id) {
    res.render('recording', {
      bodyId: 'recording',
      utterance: utterance,
      date: moment(utterance.created_at).format('MM/DD/YY')
    });
  } else {
    res.sendStatus(500);
  }
});

module.exports = router;
