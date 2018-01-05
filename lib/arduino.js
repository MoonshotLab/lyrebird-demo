const Promise = require('bluebird');
const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;
const parser = new Readline();

let arduino = null;

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

function connectToArduino() {
  asyncGetArduinoPortInfo()
    .then(portInfo => {
      console.log(`Found Arduino at ${portInfo.comName}`);
      // const port = new SerialPort(portInfo.comName);
      // port.pipe(parser);

      // parser.on('data', console.log);
    })
    .catch(err => {
      throw new Error('Error connecting to Arduino!');
    });
}

connectToArduino();

exports.connectToArduino = connectToArduino;
exports.arduino = arduino;
