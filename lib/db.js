const low = require('lowdb');

const config = require('./config');

const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync(config.statsPath);
const db = low(adapter);

function initializeDb() {
  db
    .defaults({
      utterances: []
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

function getAllUtterances() {
  return db
    .get('utterances')
    .sortBy('created_at')
    .reverse()
    .value();
}

exports.initializeDb = initializeDb;
exports.logUtterance = logUtterance;
exports.getUtteranceById = getUtteranceById;
exports.getAllUtterances = getAllUtterances;
