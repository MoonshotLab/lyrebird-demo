const express = require('express');
const Promise = require('bluebird');
const axios = require('axios');
const moment = require('moment');
const upload = require('multer')({ dest: '/tmp/' });
const s3 = require('aws-s3-promisified')({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_ACCESS_SECRET
});

const router = express.Router();

const db = require('./../lib/db');
const util = require('./../lib/util');

const _ = db._; // lodash

const uploadFieldSpec = [
  {
    name: 'blob',
    maxCount: 1
  },
  {
    name: 'text',
    maxCount: 1
  }
];

function asyncMakeSureAudioIsFresh(utterance) {
  return new Promise((resolve, reject) => {
    axios
      .get(utterance.audio_file)
      .then(() => {
        resolve(utterance);
      })
      .catch(e => {
        // audio not fresh, remove from db
        db.removeUtterance(utterance);

        asyncGenerateLyrebirdUtterance(utterance.text)
          .then(newUtterance => {
            console.log('utterance regenerated!');
            resolve(newUtterance);
          })
          .catch(e => {
            console.log('error regenerating utterance!');
            reject(e);
          });
      });
  });
}

function asyncGenerateLyrebirdUtterance(text) {
  return new Promise((resolve, reject) => {
    if (_.isNil(process.env.ACCESS_TOKEN)) {
      reject(new Error('unset access token'));
    }

    const requestObj = {
      method: 'post',
      url: 'https://lyrebird.ai/api/generate/',
      data: {
        texts: [text]
      },
      headers: {
        Authorization: `${process.env.TOKEN_TYPE} ${process.env.ACCESS_TOKEN}`,
        // Authorization: `${
        //   process.env.TOKEN_TYPE
        // } wsRfif3925Wim2kVvIixfSoicl3xVy`,
        'Content-Type': 'application/json',
        Accept: 'application/json; indent=4'
      }
    };

    axios(requestObj)
      .then(lyrebirdRes => {
        if (
          lyrebirdRes.data[0].status === 'success' &&
          !!lyrebirdRes.data[0].utterance
        ) {
          return lyrebirdRes.data[0].utterance;
        } else {
          reject(new Error('lyrebird unable to generate utterance'));
        }
      })
      .then(utterance => {
        // add to db
        db.addUtterance(utterance);
        resolve(utterance);
      })
      .catch(err => {
        try {
          reject(err.response.data.detail);
        } catch (e) {
          reject(err);
        }
      });
  });
}

router.post('/', upload.fields(uploadFieldSpec), (req, res) => {
  if (!!process.env.ACCESS_TOKEN && !!req.body.text && !!req.files.blob) {
    const phrase = util.sentenceCase(req.body.text);
    console.log(`Generating "${phrase}"`);

    // upload screenshot to s3
    const blob = req.files.blob[0];
    s3
      .putFile(process.env.S3_BUCKET, blob.filename, blob.path)
      .then(s3Res => {
        // add to utterance history with screenshot
        db.addUtteranceToHistory({
          utterance: phrase,
          timestamp: moment(),
          screenshot: `https://s3.amazonaws.com/${process.env.S3_BUCKET}/${
            blob.filename
          }`
        });
      })
      .then(async () => {
        // check if utterance is already in db
        const dbUtterance = db.getUtteranceByText(phrase);
        if (!!dbUtterance) {
          // make sure file is still there
          console.log(`Utterance "${phrase}" already in DB.`);

          return asyncMakeSureAudioIsFresh(dbUtterance)
            .then(utterance => {
              return utterance;
            })
            .catch(() => {
              // audio is not fresh, generate

              asyncGenerateLyrebirdUtterance(phrase)
                .then(utterance => {
                  return utterance;
                })
                .catch(e => {
                  throw e;
                  return null;
                });
            });
        } else {
          return asyncGenerateLyrebirdUtterance(phrase)
            .then(utterance => {
              return utterance;
            })
            .catch(e => {
              console.log(e);
              throw e;
            });
        }
      })
      .then(utterance => {
        // file is good, resolve!
        res.status(200).send(utterance);
      })
      .catch(e => {
        console.log(e);
        res.sendStatus(500);
      });
  } else {
    console.log('text and access token must be set');
    console.log('req.body', req.body);
    console.log('process.env.ACCESS_TOKEN', process.env.ACCESS_TOKEN);
    res.sendStatus(500);
  }
});

// used for verifying auth
router.post('/test', (req, res) => {
  asyncGenerateLyrebirdUtterance('test')
    .then(utterance => {
      res.sendStatus(200);
    })
    .catch(e => {
      res.sendStatus(500);
    });
});

module.exports = router;
