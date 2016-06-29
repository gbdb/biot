// This Arduino sketch reads DS18B20 "1-Wire" digital
// temperature sensors.
// Tutorial:
// http://www.hacktronics.com/Tutorials/arduino-1-wire-tutorial.html
//Changed sketch to handle individual temperature probes for testing out software and hub
//each probe is plugged into a wiring harness using either a 4.7K or 2.2K resistor configuration.
//will use this to test power soruce and resistor needed to read 5 temp probes.
//ver-1.01-R
// Rik Kretzinger
//    08/17/2011

#include <OneWire.h>
#include <DallasTemperature.h>

// Data wire is plugged into pin 3 on the Arduino
#define ONE_WIRE_BUS 8

// Setup a oneWire instance to communicate with any OneWire devices
OneWire oneWire(ONE_WIRE_BUS);

// Pass our oneWire reference to Dallas Temperature.
DallasTemperature sensors(&oneWire);

// Assign the addresses of your 1-Wire temp sensors.
// See the tutorial on how to obtain these addresses:
// http://www.hacktronics.com/Tutorials/arduino-1-wire-address-finder.html

DeviceAddress Probe012 = { 0x28, 0xD8, 0x79, 0x31, 0x03, 0x00, 0x00, 0xC6 };
DeviceAddress Probe013 = { 0x28, 0x43, 0x77, 0x22, 0x03, 0x00, 0x00, 0x9D };
DeviceAddress Probe014 = { 0x28, 0x30, 0x65, 0x31, 0x03, 0x00, 0x00, 0x13 };
DeviceAddress Probe015 = { 0x28, 0xDE, 0x9D, 0x31, 0x03, 0x00, 0x00, 0xB1 };
DeviceAddress Probe016 = { 0x28, 0x7E, 0x8A, 0x31, 0x03, 0x00, 0x00, 0xC0 };

void setup(void)
{
// start serial port
Serial.begin(9600);
// Start up the library
sensors.begin();
// set the resolution to 10 bit (good enough?)
sensors.setResolution(Probe012, 10);
sensors.setResolution(Probe013, 10);
sensors.setResolution(Probe014, 10);
sensors.setResolution(Probe015, 10);
sensors.setResolution(Probe016, 10);
}

void printTemperature(DeviceAddress deviceAddress)
{
float tempC = sensors.getTempC(deviceAddress);
if (tempC == -127.00) {
Serial.print("Error getting temperature");
} else {
Serial.print("C: ");
Serial.print(tempC);
Serial.print(" F: ");
Serial.print(DallasTemperature::toFahrenheit(tempC));
}
}

void loop(void)
{
delay(2000);
Serial.println();
Serial.println();
Serial.print("Getting temperatures…\n\r");
sensors.requestTemperatures();

Serial.print("Probe 012 temperature is: ");
printTemperature(Probe012);
Serial.print("\n\r");
Serial.print("Probe 013 temperature is: ");
printTemperature(Probe013);
Serial.print("\n\r");
Serial.print("Probe 014 temperature is: ");
printTemperature(Probe014);
Serial.print("\n\r");
Serial.print("Probe 015 temperature is: ");
printTemperature(Probe015);
Serial.print("\n\r");
Serial.print("Probe 016 temperature is: ");
printTemperature(Probe016);
Serial.print("\n\r");

}
