// @flow

import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as systemdSocket from 'systemd-socket';
import * as SerialPort from 'serialport';
// import * as InterByteTimeout from '@serialport/parser-inter-byte-timeout';
import * as Readline from '@serialport/parser-readline';
import Reader, { ResultJSON } from './Reader';


const state = {
  readers: {} as { [portName: string]: Reader },
  error: undefined,
};


function openPort(comName: string) {
  const port = new SerialPort(comName, { baudRate: 115200, bindingOptions: { vmin: 1, vtime: 1 } });

  port.drain();

  const reader = new Reader(port);
  state.readers[comName] = reader;

  port.on('data', (chunk: Buffer) => {
    console.log('<', chunk.toString());
  });

  const readline = new Readline();
  const parser = port.pipe(readline)
  parser.on('data', (chunk: Buffer) => {
    reader.parse(chunk.toString());
  });

  port.on('error', (err: any) => {
    port.drain();
    reader.handleError(err.message);
    console.log('Error on port ', comName, ':', err.message, ', closing…');
    port.close((error) => {
      if (error) {
        console.log('Could not close port:', error);
      } else {
        console.log('Port closed.');
      }
    });
  });

  port.on('close', () => {
    console.log('Port', comName, 'closed.');
    reader.close();
    delete state.readers[comName];
  });
}

async function connectNewDevices() {
  try {
    const list = await SerialPort.list();
    const compatibleDevices = list
      .filter(d => d.manufacturer === 'Adafruit' && d.productId === '800c');
    // console.log('Compatible devices:', compatibleDevices);
    compatibleDevices.forEach(device => {
      if (!state.readers[device.comName]) {
        console.log('Opening port to device', device);
        openPort(device.comName);
      }
    });
  } catch (error) {
    console.log('Error while enumerating devices:', error);
  }
}

setInterval(() => connectNewDevices(), 1000);

const app = express();

app.use(bodyParser.json());

const optionsHandler = (req: any, res: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end();
};

function sendResult(res: express.Response, result: ResultJSON) {
  res.status(result.error ? 400 : 200).json(result);
}

function sendError(res: express.Response, status: number, error: string) {
  res.status(status).json({ error });
}

const requestHandler = async (req: express.Request, res: express.Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { query } = req;
  const portName = Object.keys(state.readers)[0];
  const reader = state.readers[portName];
  if (!reader) {
    sendError(res, 404, 'Reader not found.');
    return;
  }

  try {
    if (query.cmd === 'R') {
      return sendResult(res, await reader.readCardData());
    }
    if (query.cmd === 'W') {
      const hexPairsString = query.data;
      if (!hexPairsString) {
        return sendError(res, 422, 'Please supply a `data` parameter with hex-encoded hexPairsString to write, e.g. "DEADBEEF010203".');
      }
      if (hexPairsString.length > 512) {
        return sendError(res, 413, 'Given data is too long to write.');
      }
      if (!hexPairsString.match(/([0-9a-fA-F]{2})+/)) {
        return sendError(res, 422, '`data` parameter may only consist of hex character pairs [0-9a-fA-F].');
      }
      return sendResult(res, await reader.writeCardData(hexPairsString));
    }
    return sendError(res, 422, 'Please supply a valid `cmd` parameter.');
  } catch (error) {
    return sendError(res, 500, String(error));
  }
}

app.options('/:portName', optionsHandler);
app.options('/', optionsHandler);
app.get('/:portName', requestHandler);
app.get('/', requestHandler);
app.post('/:portName', requestHandler);
app.post('/', requestHandler);


const socket = systemdSocket();
if (socket) {
  console.log('Using socket', socket, 'for listening...');
}
const server = app.listen(socket || 80);

console.log('Initialized memory card server on', server.address());
