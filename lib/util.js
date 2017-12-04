const _ = require('lodash');

exports.sentenceCase = str => {
  try {
    const sentences = str.match(/([^\.!\?]+[\.!\?]+)|([^\.!\?]+$)/g); // https://stackoverflow.com/a/11761720/2777986
    if (sentences !== null) {
      return sentences.map(sentence => _.capitalize(sentence.trim())).join(' '); // capitalize each sentence
    } else {
      // no more than 1 sentence in str
      return _.capitalize(str.trim());
    }
  } catch (e) {
    console.log(e);
    return null;
  }
};
