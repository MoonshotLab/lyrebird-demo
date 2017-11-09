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

exports.initializeDb = initializeDb;
exports.logUtterance = logUtterance;
