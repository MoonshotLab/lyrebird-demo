## Lyrebird Demo

Web app deployed at https://lyrebird-demo.moonshot.cloud/. Speech -> text -> synthesized speech via [Lyrebird](https://lyrebird.ai/). Voice model trained by Jeff King, CEO of [Barkley](https://www.barkleyus.com/).

### Notes
* Deployed via Dokku.
* Uses Google [Cloud Speech API](https://cloud.google.com/speech/) for transcription.
* Uses the Lyrebird API which is in limited developer preview.
* In situ, is triggered by a button via serial-connected Arduino.

### Routes
* GET `/` -> app
* POST `/process` -> converts audio webm to flac via ffmpeg before transcribing via Google Cloud
* POST `/generate` -> takes screenshot blob and uploads to s3, then generates utterance via Lyrebird and saves to DB.
* GET `/auth` -> called after Lyrebird initial auth redirect and sets session env vars

### Env
Add a `.env` with the following:

```
SITE_URL=''
LYREBIRD_EMAIL=''
LYREBIRD_PASSWORD=''
CLIENT_ID=''
CLIENT_SECRET=''
AWS_ACCESS_KEY=''
AWS_ACCESS_SECRET=''
S3_BUCKET=''
GOOGLE_APPLICATION_CREDENTIALS=''
ARDUINO_BAUD_RATE=''
CONNECT_TO_ARDUINO=''
```

### keyfile.json
You must also have a `keyfile.json` at the root, downloaded from Google Cloud. It should look like this:

```
{
  "type": "service_account",
  "project_id": "",
  "private_key_id": "",
  "private_key": "",
  "client_email": "",
  "client_id": "",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://accounts.google.com/o/oauth2/token",
  "auth_provider_x509_cert_url": "",
  "client_x509_cert_url": ""
}

```
