// @flow

const express = require('express');
const bodyParser = require('body-parser');
const pcsclite = require('pcsclite');
require('systemd');

type SuccessCallback = (data: Buffer) => void;
type ErrorCallback = (error: Error) => void;

const port = process.env.LISTEN_PID ? 'systemd' : (process.env.PORT || 44602);
const ipAddress = process.env.BIND_IP || '127.0.0.1';
const selectCardTypeCommand = new Buffer([0xFF, 0xA4, 0x00, 0x00, 0x01, 0x01]);
const readMemoryCardCommand = new Buffer([0xFF, 0xB0, 0x00, 0x00, 0xFF]);
const writeMemoryCardCommand = inputBufferArray =>
  new Buffer([0xFF, 0xD0, 0x00, 0x00, inputBufferArray.length].concat(inputBufferArray));

type ReaderInfo = {
  reader: Object,
  currentCardContent: ?number[],
  lastError: ?string
};

type State = {
  connectedReaders: {
    [string]: ReaderInfo,
  },
  lastError: ?string,
};

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

const connectedReaders = {};
const state: State = {
  connectedReaders,
  lastError: 'Test error!',
};

const app = express();
const pcsc = pcsclite();

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(state);
});

app.post('/readers/:name', (req, res) => {
  if (!(req.body instanceof Array)) {
    res.status(422).json({ lastError: 'Please supply an array as request body JSON.' });
    return;
  }
  if (req.body.length > 256) {
    res.status(413).json({ lastError: 'Given data is too long to write.' });
    return;
  }
  const readerInfo = connectedReaders[req.params.name];
  if (!readerInfo) {
    res.status(404).json({ lastError: 'Reader not found.' });
    return;
  }
  if (!readerInfo.currentCardContent) {
    res.status(404).json({ lastError: 'No card inserted.' });
    return;
  }
  const command = writeMemoryCardCommand(req.body);
  readerInfo.transmit(command, 2,
    () => { res.status(200).json({ lastError: null, message: 'Data written.' }); },
    (error) => {
      const lastError = error.message;
      state.lastError = lastError;
      res.status(500).json({ lastError });
    },
  );
});

app.listen(port, ipAddress);

log(`Initializing PC/SC over HTTP server on http://${ipAddress}:${port}`);

function responseIsOkay(responseBuffer) {
  return responseBuffer.length > 2 ||
    Buffer.compare(responseBuffer, new Buffer([0x90, 0x00])) === 0;
}

pcsc.on('reader', (reader) => {
  log('New reader detected', reader.name);
  const readerInfo: ReaderInfo = { reader, currentCardContent: null, lastError: null };
  connectedReaders[reader.name] = readerInfo;

  const transmit = (
    cmd: Buffer,
    length: number,
    successCallback: SuccessCallback,
    errorCallback?: ErrorCallback,
  ) => {
    const protocol = connectedReaders[reader.name].protocol;
    if (!protocol) {
      throw new Error('Could not transmit data: Protocol is not known yet');
    }
    reader.transmit(cmd, length, protocol, (err, data) => {
      if (err || !responseIsOkay(data)) {
        log('Transmission error', err, data);
        state.lastError = err;
        if (errorCallback) errorCallback(err);
        return;
      }
      log('Data received', data);
      successCallback(data);
    });
  };

  connectedReaders[reader.name].transmit = transmit;

  reader.on('error', function onError(err) {
    readerInfo.lastError = err;
    log('Reader ', this.name, ' had an error:', err.message);
  });

  reader.on('status', function onStatus(status) {
    connectedReaders[reader.name].status = status;
    log('Status for', this.name, ':', status.state, 'ATR:', status.atr.toString('hex'));
    const changes = this.state ^ status.state;
    if (changes) {
      if ((changes & this.SCARD_STATE_EMPTY) && (status.state & this.SCARD_STATE_EMPTY)) {
        log('Card removed.');
        readerInfo.currentCardContent = null;
        reader.disconnect(reader.SCARD_LEAVE_CARD, (err) => {
          if (err) {
            log(err);
          } else {
            log(`${reader.name} disconnected.`);
          }
        });
      } else if (
        (changes & this.SCARD_STATE_PRESENT) && (status.state & this.SCARD_STATE_PRESENT)
      ) {
        log('Card inserted');
        const options = { share_mode: this.SCARD_SHARE_SHARED, protocol: this.SCARD_PROTOCOL_T0 };
        reader.connect(options, (err, protocol) => {
          if (err) {
            log('Connection error', err, 'Protocol:', protocol);
          } else {
            connectedReaders[reader.name].protocol = protocol;
            log('Protocol(', reader.name, '):', protocol);
            transmit(selectCardTypeCommand, 2, () => {
              transmit(readMemoryCardCommand, 257, (data) => {
                if (data.length > 2) {
                  readerInfo.currentCardContent = new Array(data);
                  state.lastError = null;
                }
              });
            });
          }
        });
      }
    }
  });

  reader.on('end', function () {
    log('Reader', this.name, 'removed.');
    delete connectedReaders[this.name];
  });
});

pcsc.on('error', (err) => {
  log('PCSC error:', err.message);
  state.lastError = err;
});