#include <OneWire.h>
#include <DallasTemperature.h>


int DS18S20_Pin = 10; //DS18S20 Signal pin on digital 3

//Temperature chip i/o
OneWire ds(DS18S20_Pin); // on digital pin 3

String textAlarmTropFroid, textAlarmTropChaud;
int relay1 = 2;
int relay2 = 3;
int relay3 = 4;
int relay4 = 5;
int relay5 = 6;
int relay6 = 7;
int relay7 = 8;
int relay8 = 9;


void setup(void) {
 Serial.begin(9600);
 pinMode(relay1, OUTPUT);
 pinMode(relay2, OUTPUT);
 pinMode(relay3, OUTPUT);
 pinMode(relay4, OUTPUT);
 pinMode(relay5, OUTPUT);
 pinMode(relay6, OUTPUT);
 pinMode(relay7, OUTPUT);
 pinMode(relay8, OUTPUT);


 // Texte pour menus ( a etre dans un include eventuellement.. )
 textAlarmTropFroid = "il fait froid... moins de 23, ALerte !!! Il fait presentement; ";
 textAlarmTropChaud = "il fait chaud... plus de 23, ALerte !!! Il fait presentement; ";

 
}

void loop(void) {
  float temperature = getTemp();
 
  /*
  digitalWrite(relay2,LOW);
 Serial.println(temperature);
 delay(1000);
 digitalWrite(relay2,HIGH);
 Serial.println(temperature + temperature);
 delay(1000);

 */
 
 
 
 if (temperature < 23) { 
  digitalWrite(relay1,LOW);
  digitalWrite(relay2,LOW);
  digitalWrite(relay3,LOW);
  digitalWrite(relay4,LOW);
  digitalWrite(relay5,LOW);
  digitalWrite(relay6,LOW);
  digitalWrite(relay7,LOW);
  digitalWrite(relay8,LOW);
  Serial.println(textAlarmTropFroid + temperature); 
  }
 if (temperature > 23) { 
  digitalWrite(relay1,HIGH);
  Serial.println(textAlarmTropChaud + temperature);
  digitalWrite(relay1,HIGH);
  digitalWrite(relay2,HIGH);
  digitalWrite(relay3,HIGH);
  digitalWrite(relay4,HIGH);
  digitalWrite(relay5,HIGH);
  digitalWrite(relay6,HIGH);
  digitalWrite(relay7,HIGH);
  digitalWrite(relay8,HIGH);
  }
  
delay(1000);
 
 
}

void closeCircuit()
{
  
  }


float getTemp(){
 //returns the temperature from one DS18S20 in DEG Celsius

 byte data[12];
 byte addr[8];

 if ( !ds.search(addr)) {
   //no more sensors on chain, reset search
   ds.reset_search();
   return -1000;
 }

 if ( OneWire::crc8( addr, 7) != addr[7]) {
   Serial.println("CRC is not valid!");
   return -1000;
 }

 if ( addr[0] != 0x10 && addr[0] != 0x28) {
   Serial.print("Device is not recognized");
   return -1000;
 }

 ds.reset();
 ds.select(addr);
 ds.write(0x44,1); // start conversion, with parasite power on at the end

 byte present = ds.reset();
 ds.select(addr);  
 ds.write(0xBE); // Read Scratchpad

 
 for (int i = 0; i < 9; i++) { // we need 9 bytes
  data[i] = ds.read();
 }
 
 ds.reset_search();
 
 byte MSB = data[1];
 byte LSB = data[0];

 float tempRead = ((MSB << 8) | LSB); //using two's compliment
 float TemperatureSum = tempRead / 16;
 
 return TemperatureSum;
 
}
