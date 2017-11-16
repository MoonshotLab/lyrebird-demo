const low = require('lowdb');

const config = require('./config');

const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync(config.statsPath);
const db = low(adapter);
const _ = db._; // lodash

function initializeDb() {
  db
    .defaults({
      utterances: [],
      auth: {}
    })
    .write();
}

function logUtterance(utteranceObj) {
  db
    .get('utterances')
    .push(utteranceObj)
    .write();
}

function getUtteranceById(id) {
  return db
    .get('utterances')
    .find({ id: parseInt(id) })
    .value();
}

function getUtteranceByText(text) {
  return db
    .get('utterances')
    .find({
      text: text
    })
    .value();
}

function getAllUtterances() {
  return db
    .get('utterances')
    .sortBy('created_at')
    .reverse()
    .value();
}

function getAuth() {
  return db.get('auth').value();
}

function setAuth(auth) {
  db.set('auth', auth).write();
}

exports._ = _;
exports.initializeDb = initializeDb;
exports.logUtterance = logUtterance;
exports.getUtteranceById = getUtteranceById;
exports.getAllUtterances = getAllUtterances;
exports.getUtteranceByText = getUtteranceByText;
exports.getAuth = getAuth;
exports.setAuth = setAuth;
