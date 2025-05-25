import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Controller, Tag } from 'ethernet-ip';

@Injectable()
export class PLCService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PLCService');
  private plc: Controller;
  private digitalInputTag: Tag;
  private isConnected = false;
  private plcIpAddress = '192.168.1.10'; // Replace with your PLC's IP address

  constructor() {
    this.plc = new Controller();
    this.digitalInputTag = new Tag('D0.1'); // Digital input D0.1
  }

  async onModuleInit() {
    await this.connectToPLC();
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.disconnectFromPLC();
    }
  }

  private async connectToPLC() {
    try {
      this.logger.log(`Connecting to PLC at ${this.plcIpAddress}...`);
      await this.plc.connect(this.plcIpAddress).then(() => {
        console.log(this.plc.properties);
      });
      await this.plc.readTag(this.digitalInputTag);
      this.isConnected = true;
      this.logger.log('Successfully connected to PLC');
    } catch (error) {
      this.isConnected = false;
      this.logger.error(`Failed to connect to PLC: ${error.message}`);
      // Try to reconnect after delay
      setTimeout(() => this.connectToPLC(), 10000);
    }
  }

  private async disconnectFromPLC() {
    try {
      await this.plc.disconnect();
      this.isConnected = false;
      this.logger.log('Disconnected from PLC');
    } catch (error) {
      this.logger.error(`Error disconnecting from PLC: ${error.message}`);
    }
  }

  @Interval('pullData', 5000)
  async pullData(): Promise<string> {
    if (!this.isConnected) {
      this.logger.warn('PLC not connected. Attempting to reconnect...');
      await this.connectToPLC();
      return 'PLC not connected';
    }

    try {
      this.logger.log('Pulling data from PLC...');
      await this.plc.readTag(this.digitalInputTag);
      const inputState = this.digitalInputTag.value;
      this.logger.log(`Digital input D0.1 state: ${inputState}`);
      return `Digital input D0.1 state: ${inputState}`;
    } catch (error) {
      this.logger.error(`Error reading from PLC: ${error.message}`);
      this.isConnected = false;
      // Attempt to reconnect
      setTimeout(() => this.connectToPLC(), 5000);
      return `Error: ${error.message}`;
    }
  }
}
