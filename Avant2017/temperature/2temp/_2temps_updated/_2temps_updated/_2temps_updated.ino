#include <OneWire.h>
#include <DallasTemperature.h>

#define ONE_WIRE_BUS 10
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
DeviceAddress insideThermometer = { 0x28, 0xC5, 0x6D, 0x73, 0x06, 0x00, 0x00, 0x66 };
DeviceAddress outsideThermometer = { 0x28, 0xDB, 0x60, 0x74, 0x06, 0x00, 0x00, 0x44 };

String textAlarmTropFroid, textAlarmTropChaud;

void setup(void)
{
  
  Serial.begin(9600);
  
  /*gModule Temperature*/
  sensors.begin();
  sensors.setResolution(insideThermometer, 10);
  sensors.setResolution(outsideThermometer, 10);
  textAlarmTropFroid = "il fait froid... moins de 23, ALerte !!! Il fait presentement; ";
  textAlarmTropChaud = "il fait chaud... plus de 23, ALerte !!! Il fait presentement; ";
  /*gModule Temperature --------  FIN*/
}

void loop(void)
{ 
  /*gModule Temperature*/
  Serial.print("Getting temperatures...\n\r");
  sensors.requestTemperatures();
  printTemperature(insideThermometer);
  returnTemperature(insideThermometer);
  delay(2000);
  /*gModule Temperature --------  FIN*/
 }

void printTemperature(DeviceAddress deviceAddress)
{
  float tempC = sensors.getTempC(deviceAddress);
  if (tempC == -127.00) {
    Serial.print("Error getting temperature");
  } else {
    Serial.print("C: ");
    Serial.println(tempC);
    //Serial.print(" F: ");
    //Serial.print(DallasTemperature::toFahrenheit(tempC));
  }
}

int returnTemperature(DeviceAddress deviceAddress)
{
  float tempC = sensors.getTempC(deviceAddress);
  if (tempC == -127.00) {
    Serial.print("Error getting temperature");
  } else {
    //Serial.print("RAW-");
    //Serial.print(tempC);
    //Serial.println("-RAW");
    return tempC;  
  }
  }

