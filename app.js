require('dotenv').config();

const express = require('express');
const app = express();
const http = require('http').Server(app);

const bodyParser = require('body-parser');
const path = require('path');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

require('./lib/db').initializeDb();

const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log('Server running on port ' + port);
});

module.exports = app;
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/generate', require('./routes/generate'));
app.use('/recordings', require('./routes/recordings'));
app.use('*', (req, res) => {
  res.redirect('/');
});

require('./lib/lyrebird')
  .getOrRefreshAccessToken()
  .then(() => {
    console.log('Access token got');
  })
  .catch(e => {
    console.log('Access token error', e);
  });
