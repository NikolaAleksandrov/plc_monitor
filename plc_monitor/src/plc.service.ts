import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import ModbusRTU from 'modbus-serial';

@Injectable()
export class PLCService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PLCService');

  private client: ModbusRTU;
  private isConnected = false;
  private plcIpAddress = '192.168.29.1'; // Replace with your PLC's IP address
  private plcPort = 502; // Default Modbus TCP port
  private inputState = 0; // Initial state of the digital input
  private registerAddress = 0; // Modbus register address (replace with actual register address)
  private unitId = 25; // Unit ID for the PLC

  constructor() {
    this.client = new ModbusRTU();
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
      this.logger.log(
        `Connecting to PLC at ${this.plcIpAddress}:${this.plcPort}...`,
      );

      await this.client.connectTCP(this.plcIpAddress, { port: this.plcPort });
      this.client.setID(this.unitId);
      this.client.setTimeout(3000); // 3 second timeout

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
      await this.client.close();
      this.isConnected = false;
      this.logger.log('Disconnected from PLC');
    } catch (error) {
      this.logger.error(`Error disconnecting from PLC: ${error.message}`);
    }
  }

  @Interval('pullData', 5)
  async pullData(): Promise<string> {
    if (!this.isConnected) {
      this.logger.warn('PLC not connected. Attempting to reconnect...');
      await this.connectToPLC();
      return 'PLC not connected';
    }

    try {
      // this.logger.log('Pulling data from PLC...');
      // Read discrete inputs using modbus-serial
      const a = await this.client.readDiscreteInputs(24576, 1);
      // const b = await this.client.readDeviceIdentification(
      //   this.registerAddress,
      //   1,
      // );
      const inputState = a.data[0] ? 1 : 0;
      if (inputState !== this.inputState) {
        this.inputState = inputState;
        this.logger.log(`Digital input state changed: ${inputState}`);
      }

      // this.logger.log(`Digital input state: ${inputState}`);
      return `Digital input state: ${inputState}`;
    } catch (error) {
      this.logger.error(`Error reading from PLC: ${error.message}`);
      this.isConnected = false;
      // Attempt to reconnect
      setTimeout(() => this.connectToPLC(), 5000);
      return `Error: ${error.message}`;
    }
  }
}
