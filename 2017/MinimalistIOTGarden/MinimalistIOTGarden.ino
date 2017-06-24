#define RELAY1 12
#include <Wire.h>
#include <Time.h>
#include "RTClib.h"
RTC_DS1307 RTC;

bool PumpOn = true;
time_t lastCycleCycle;

int TEMPS_OFF = 600;
int TEMPS_ON = 300;

int Cycle[2] = { TEMPS_ON , TEMPS_OFF }; //en secondes; 5sec ON / 10sec OFF
int CurrentCycleIndex = 0;
String readString = "";

void setup() {
    Serial.begin(9600);
    Wire.begin();
    RTC.begin();
    if (!RTC.isrunning()) {
        Serial.println("RTC is NOT running!");
        RTC.adjust(DateTime(__DATE__, __TIME__));
    }
    
    pinMode(RELAY1, OUTPUT);
    digitalWrite(RELAY1,HIGH);

    DateTime now = RTC.now();
    lastCycleCycle =  now.unixtime();
}

void loop() {
    DateTime now = RTC.now();
    //Serial.print("UNIX TIME: ");
    //Serial.println(now.unixtime());

    while (Serial.available()) {
      delay(10);
      
      char c = Serial.read();  //gets one byte from serial buffer
      readString += c; 
    }

   //Serial.print("VOILA LA READ STRING: ");
   //Serial.println(readString);
   if(readString != "" && readString != "x"){
     int new_temps_off = getValue(readString, ',', 0);
     int new_temps_on = getValue(readString, ',', 1);
     Serial.print("NOUVEAU TEMPS OFF: ");
     Serial.println(new_temps_off);
     Serial.print("NOUVEAU TEMPS ON: ");
     Serial.println(new_temps_on);
     updateTimerInterval(new_temps_off, new_temps_on);
     readString = "";
   }
    
    time_t live = now.unixtime();
    CheckTime(live);
    if(PumpOn)
      digitalWrite(RELAY1,HIGH);
    else
      digitalWrite(RELAY1,LOW);

     delay(500);

}

void updateTimerInterval(int newTimeOff, int newTimeOn) {
  Cycle[0] = newTimeOff;
  Cycle[1] = newTimeOn;
}

void CheckTime(time_t currentCycle) {
    
   //Serial.print("\nDifference: ");
   //Serial.println(currentCycle - lastCycleCycle);
   if (currentCycle - lastCycleCycle >= Cycle[CurrentCycleIndex]){
     PumpOn = !PumpOn;
     lastCycleCycle = currentCycle;
     Serial.println("-->Changing state<--");
     ApplyNextCycle();
   }
}

void ApplyNextCycle() {

  if(PumpOn)
    CurrentCycleIndex = 0;
   else
    CurrentCycleIndex = 1;
    
}

int getValue(String data, char separator, int index)
{
    int found = 0;
    int strIndex[] = { 0, -1 };
    int maxIndex = data.length() - 1;

    for (int i = 0; i <= maxIndex && found <= index; i++) {
        if (data.charAt(i) == separator || i == maxIndex) {
            found++;
            strIndex[0] = strIndex[1] + 1;
            strIndex[1] = (i == maxIndex) ? i+1 : i;
        }
    }
    String newValue = found > index ? data.substring(strIndex[0], strIndex[1]) : "";
    return newValue.toInt();
}

void SendValues()
 {
  Serial.print('#');
  String values = Cycle[0] + "," + Cycle[1];
  Serial.print(values);
  Serial.print("");
 Serial.print('~'); //used as an end of transmission character - used in app for string length
 Serial.println();
 delay(10);        //added a delay to eliminate missed transmissions
}
