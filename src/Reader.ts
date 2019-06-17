import * as SerialPort from 'serialport';
import * as pEvent from 'p-event';
import { EventEmitter } from 'events';

export type ResultJSON = { error?: string, success?: boolean, content?: number[] };

const chunkSize = 32;
const chunkIntervalInMilliseconds = 1;

export default class Reader extends EventEmitter {
  state = 'ready' as 'reading' | 'writing' | 'ready';
  port: SerialPort;
  writeQueue: string = "";
  writeInterval?: any;

  constructor(port: SerialPort) {
    super();
    this.port = port;
    this.on('message', (message) => console.log(`Event: ${JSON.stringify(message)}`));
    this.on('error', (error) => console.log(`Error: ${JSON.stringify(error)}`));
    this.writeInterval = setInterval(() => { this.writeNextData() }, chunkIntervalInMilliseconds);
  }

  async writeCardData(hexPairsString: string): Promise<ResultJSON> {
    if (this.state !== 'ready') throw new Error(`Reader still ${this.state}, not ready.`);
    this.state = 'writing';
    this.sendWriteCommand(hexPairsString)
    return pEvent(this, 'message', { timeout: 1200 })
      .finally(() => this.state = 'ready');
  }

  async readCardData(): Promise<ResultJSON> {
    if (this.state !== 'ready') throw new Error(`Reader still ${this.state}, not ready.`);
    this.state = 'reading';
    this.sendReadCommand();
    return pEvent(this, 'message', { timeout: 1200 })
      .finally(() => this.state = 'ready');
  }

  writeNextData() {
    if (this.writeQueue.length) {
      const nextCharacters = this.writeQueue.slice(0, chunkSize);
      this.writeQueue = this.writeQueue.slice(chunkSize);
      const written = this.port.write(nextCharacters);
      this.port.drain();
      console.log(`> ${nextCharacters} (written: ${written})`);
    }
  }

  parse(incomingMessageString: string) {
    console.log(`<< Got message: ${incomingMessageString}`);
    if (incomingMessageString[0] !== '{') return;
    try {
      const incomingMessage = JSON.parse(incomingMessageString);
      this.emit('message', incomingMessage);
    } catch (error) {
      this.emit('error', `Could not parse incoming message from reader: ${incomingMessageString}`);
    }
  }

  handleError(error: any) {
    if (this.writeInterval) clearInterval(this.writeInterval);
    this.emit('error', `Error on serial port: ${String(error)}`);
  }

  close() {
    if (this.writeInterval) clearInterval(this.writeInterval);
    this.emit('error', 'Serial port connection closed.');
  }

  private sendWriteCommand(hexPairsString: string) {
    // this.port.flush();

    console.log(`Sending ${hexPairsString.length / 2} hex-encoded bytes to device for writing...`);
    const string = `W\n${hexPairsString}\n`;
    this.writeQueue += string;
  }

  private sendReadCommand() {
    // this.port.flush();

    console.log(`> R`);
    this.port.write('R\n');
    // this.port.drain();
  }
}