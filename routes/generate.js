const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  if (!!req.body && !!req.body.text && req.body.text.length > 0) {
    console.log(req.body.text);
    res.sendStatus(200);
  } else {
    res.sendStatus(500);
  }
});

module.exports = router;
