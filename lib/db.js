const low = require('lowdb');

const config = require('./config');

const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync(config.statsPath);
const db = low(adapter);

exports._ = db._; // lodash

exports.initializeDb = () => {
  db
    .defaults({
      utterances: [],
      auth: {}
    })
    .write();
};

exports.logUtterance = utteranceObj => {
  db
    .get('utterances')
    .push(utteranceObj)
    .write();
};

exports.getUtteranceById = id => {
  return db
    .get('utterances')
    .find({ id: parseInt(id) })
    .value();
};

exports.getUtteranceByText = text => {
  return db
    .get('utterances')
    .find({
      text: text
    })
    .value();
};

exports.getAllUtterances = () => {
  return db
    .get('utterances')
    .sortBy('created_at')
    .reverse()
    .value();
};

exports.getAuth = () => {
  return db.get('auth').value();
};

exports.setAuth = auth => {
  db.set('auth', auth).write();
};
