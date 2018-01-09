const Promise = require('bluebird');
const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;
const parser = new Readline();

const io = require('./../app').io;

let arduinoConnected = false;
let arduinoPort = null;

function asyncWrite(port, msg) {
  return new Promise((resolve, reject) => {
    port.write(msg + '\n', err => {
      if (err) reject(err);
      resolve();
    });
  });
}

function asyncGetArduinoPortInfo() {
  return new Promise((resolve, reject) => {
    SerialPort.list()
      .then(ports => {
        ports.map(port => {
          if (
            !!port.manufacturer &&
            port.manufacturer.indexOf('Arduino') !== -1
          ) {
            // arduino found!
            resolve(port);
          }
        });

        reject('no_arduino');
      })
      .catch(err => {
        reject(err);
      });
  });
}

function turnButtonOn() {
  if (arduinoConnected) {
    asyncWrite(arduinoPort, 1)
      .then(() => {
        console.log('button turned on');
      })
      .catch(e => {
        console.log(e);
      });
  }
}

function turnButtonOff() {
  if (arduinoConnected) {
    asyncWrite(arduinoPort, 0)
      .then(() => {
        console.log('button turned off');
      })
      .catch(e => {
        console.log(e);
      });
  }
}

function hookUpButtonEvents() {
  io.on('connection', socket => {
    socket.on('new_button_status', data => {
      switch (parseInt(data.status)) {
        case 1:
          turnButtonOn();
          break;
        case 0:
          turnButtonOff();
          break;
        default:
          console.log('unknown button status', data.status);
      }
    });
  });
}

function connectToArduino() {
  asyncGetArduinoPortInfo()
    .then(portInfo => {
      console.log(`Found Arduino at ${portInfo.comName}`);
      const port = new SerialPort(portInfo.comName);

      arduinoPort = port;
      arduinoConnected = true;

      port.on('open', () => {
        console.log('Connected to Arduino!');

        port.pipe(parser);
        parser.on('data', data => {
          const safeData = data.toString().trim(); // data might have \n, \t, etc.

          console.log(`data from arduino: "${safeData}"`);
          io.emit('new_msg', {
            msg: safeData
          });
        });
      });

      port.on('error', e => {
        console.log('Error connecting to Arduino', e);
      });

      return port;
    })
    .then(hookUpButtonEvents)
    .catch(err => {
      console.log(err);
      throw new Error('Error connecting to Arduino!');
    });
}

exports.connectToArduino = connectToArduino;
exports.turnButtonOn = turnButtonOn;
exports.turnButtonOff = turnButtonOff;
