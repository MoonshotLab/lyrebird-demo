require('dotenv').config();

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
exports.io = io;

const bodyParser = require('body-parser');
const autoReap = require('multer-autoreap');
const path = require('path');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(autoReap);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

require('./lib/db').initializeDb();

if (process.env.CONNECT_TO_ARDUINO == 'true') {
  require('./lib/arduino').connectToArduino();
}

const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log('Server running on port ' + port);
});

module.exports = app;
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/process', require('./routes/process'));
app.use('/generate', require('./routes/generate'));
app.use('/history', require('./routes/history'));
app.use('*', (req, res) => {
  res.redirect('/');
});

require('./lib/auth').makeSureAuthIsFresh();
