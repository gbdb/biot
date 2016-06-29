#include <OneWire.h>
#include <DallasTemperature.h>
#include <Ethernet.h>
#include <SPI.h>
#include <Ethernet.h>
#include <Wire.h>
#include <RTClib.h>
RTC_DS1307 rtc;
#include "DHT.h"
DHT dht;



  unsigned long current;
  unsigned long nextChange;

  String current_mode = "on";
  String startMode = "on";
  int pompeTempsOn = 150; //900
  int pompeTempsOff = 150;

int ThermometersPin = 42; //1Wire Protocol est sur la pin 42
OneWire gOneWire(ThermometersPin);
DallasTemperature sensors(&gOneWire);
//Thermometres
DeviceAddress ThermoEAU = { 0x28, 0xC5, 0x6D, 0x73, 0x06, 0x00, 0x00, 0x66 };
DeviceAddress ThermoAIR = { 0x28, 0xDB, 0x60, 0x74, 0x06, 0x00, 0x00, 0x44 };
float lastSavedTempEau = 1.21;
float lastSavedTempAir = 1.21;
float lastSavedhumidity_dht = -7;


//messages pour port serie et eventuellement MySensor..
//String textAlarmTropFroid,
String textAlarmTropChaud, textPresentement, textAlarmTemp, textTempOK, textErreurLectureTemperature, textAlarmTropFroidExtreme;
String textAlarmWaterLevelCritical, textAlarmWaterLevelBad, textAlarmWaterLevelPumpOFF, textWaterLevel1OK, textWaterLevel2OK;
//relais
int relay1 = 26;
int relay2 = 28;
int relay3 = 30;
int relay4 = 32;
int relay5 = 34;
int relay6 = 36;
int relay7 = 38;
int relay8 = 40;

//WaterLevel Switches
int waterLevel1SwitchStatus = 22;
int waterLevel2SwitchStatus = 23;
const int waterLevelSwitch1Pin = 22;
const int waterLevelSwitch2Pin = 23;

//pompe
long pumpCycleOnDelay;
long pumpCycleOff;

// INTERNET
byte mac[] = { 0x54, 0x34, 0x41, 0x30, 0x30, 0x31 }; 
EthernetClient client;
char server[] = "192.168.0.101";

void setup() {
  Serial.begin(9600);
  Ethernet.begin(mac);
  pinMode(relay1, OUTPUT);
  pinMode(relay2, OUTPUT);
  pinMode(relay3, OUTPUT);
  pinMode(relay4, OUTPUT);
  pinMode(relay5, OUTPUT);
  pinMode(relay6, OUTPUT);
  pinMode(relay7, OUTPUT);
  pinMode(relay8, OUTPUT);

//RTC
 #ifdef AVR
 Wire.begin();
 #else
 Wire1.begin();
 #endif
 rtc.begin();
 
 if (!rtc.isrunning()) {
  Serial.println("horloge ne tourne pas..");
  rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }
  DateTime now = rtc.now();
  //Configuration des cycles
  if (startMode == "on") {
    nextChange = now.unixtime() + pompeTempsOn;
    Serial.print("NextChange in setup ");
    Serial.println(nextChange);
    Serial.print("Temps la la ");
    Serial.println(now.unixtime());
    Serial.println(now.year(), DEC);
    } else { nextChange = now.unixtime() + pompeTempsOff; }
    
    //OneWire Thermometres
    sensors.begin();
    sensors.setResolution(ThermoEAU, 10);
    sensors.setResolution(ThermoAIR, 10);
    //water Level Switches
    pinMode(waterLevelSwitch1Pin, INPUT);
    pinMode(waterLevelSwitch2Pin, INPUT);
    // Textes
    textAlarmTropFroidExtreme = "Il fait Vraiment trop froid";
    textAlarmTropChaud = "Il fait chaud... Alerte";
    textAlarmTemp = "Erreur dans le module temperature; ";
    textTempOK = "temperature Normale";
    textPresentement = "Il fait presentement; ";
    textWaterLevel1OK = "Le niveau de leau est OK";
    textWaterLevel2OK = "Le niveau de leau pompe est OK";
    textAlarmWaterLevelCritical = "Le niveau de leau est critique";
    textAlarmWaterLevelPumpOFF = "La pompe est presentement eteinte du au niveau de leau sous le seuil de tolerance.. ";
    textAlarmWaterLevelBad = "Le niveau de leau est bas...";
    textAlarmTropChaud = "Il fait chaud... Alerte";
    textAlarmTemp = "Erreur dans le module temperature; ";
    textTempOK = "temperature Normale";
    textPresentement = "Il fait presentement; ";
    textErreurLectureTemperature = "pas capable de lire le thermo.. ";

    dht.setup(53);

    
    }

void loop() {
  Serial.println("****JARDIN BIOT****");
  gTimer();
  gTempManager(); 
  //MySqlSaveEvent("Pompe1","ChangedtoOff","TTout");
  //gWaterLevelManager();
  //Serial.println(F("------"));
  //MySqlSave(1,"yaaaa",-11.22);
  //MySqlSaveEvent("Pompe", "1oop", "ere");
  delay(3000);
  }

void gTempManager() {
  String textAlarmTropFroid = "Il fait froid... Alerte";
  Serial.println("--->Module gTempManager<---");
  sensors.requestTemperatures();
  float temperatureEau = gReturnTemperature(ThermoEAU);
  float temperatureAir = gReturnTemperature(ThermoAIR);
  float humidity_dht = dht.getHumidity();
  
  Serial.print("---------=============--------");
  Serial.println(humidity_dht);
  
  
  //Alerte et Event
  
  //if (temperatureEau < 15) {Serial.println(textAlarmTropFroidExtreme); }
  
  //if (temperatureEau < 18) {Serial.println(textAlarmTropFroid);  }
  //if (temperatureEau >= 25) {Serial.println(textAlarmTropChaud); }
  if (temperatureEau == lastSavedTempEau) { } else { //Tres louche sur le MEGA ca marche mieux.
    Serial.print("Enregistrement de la temperature Eau");
    MySqlSave(1,"TempEau", temperatureEau);
    lastSavedTempEau = temperatureEau;
    }
  if (temperatureAir == lastSavedTempAir) { } else { 
    Serial.print("Enregistrement de la temperature Air");
    MySqlSave(1,"TempAir", temperatureAir);
    lastSavedTempAir = temperatureAir;
    }
    if (humidity_dht == lastSavedhumidity_dht){ } 
    else if (humidity_dht == 0.00){ } 
    else if (humidity_dht == 0) { } 
    //else if (lastSavedhumidity_dht >= humidity_dht  + 5 || lastSavedhumidity_dht <= humidity_dht - 5 )  {
    else if (humidity_dht >= lastSavedhumidity_dht + 3 || humidity_dht <= lastSavedhumidity_dht - 3 )  {
    Serial.println("Enregistrement de lhumiditer Air");
    MySqlSave(1,"TempHumid", humidity_dht);
    lastSavedhumidity_dht = humidity_dht;   
    } else { Serial.println("ben non je saver rien la...");
    Serial.print("last saved humid ");
    Serial.println(lastSavedhumidity_dht);
    Serial.print("current ");
    Serial.println(humidity_dht);
        Serial.print("minus ");
    Serial.println(lastSavedhumidity_dht - 3 );
            Serial.print("plus ");
    Serial.println(lastSavedhumidity_dht + 3 );
    }
  
    
    
    
    Serial.print("leau est a : ");
    Serial.println(temperatureEau);
    Serial.print("laie est a : ");
    Serial.println(temperatureAir);
    Serial.print("Humiditer est a; ");
    Serial.println(humidity_dht);
    
    Serial.println("_________________________");
}

void gTimer() {
  Serial.println("--->Module gTimer<---");
  DateTime now = rtc.now();
  current = now.unixtime();
  Serial.print("Il est maintenant; ");
  Serial.println(current);
  Serial.print("Current; ");
  Serial.println(current_mode);

  if (current >= nextChange)
  {
    if (current_mode == "on") {
      current_mode = "off";
      RelayChangeState(relay8);
      nextChange = now.unixtime() + pompeTempsOff;
      
      MySqlSaveEvent("Pompe1","ChangedtoOff","RTimer");
      } else {
        current_mode = "on";
        RelayChangeState(relay8);
        nextChange = now.unixtime() + pompeTempsOn;
        MySqlSaveEvent("Pompe1","ChangedtoOn","RTimer");
        }
    }
    else { Serial.print("pas encore le temps de changer, on change dans; ");
    int reste = nextChange - current;
    Serial.println(reste);
    }
  }


void RelayChangeState(int relayNumber)
{
  digitalWrite(relayNumber,!digitalRead(relayNumber));
  Serial.println("Je viens de changer le State... on continue...");
  }

void gPrintTemperature(DeviceAddress deviceAddress)
{
  float tempC = sensors.getTempC(deviceAddress);
  if (tempC == -127.00) {
    Serial.print(textErreurLectureTemperature);
  } else {
    Serial.print("C: ");
    Serial.println(tempC);
  }
}

int gReturnTemperature(DeviceAddress deviceAddress)
{
  float tempC = sensors.getTempC(deviceAddress);
  if (tempC == -127.00) {
    Serial.print("problem");
  } else { return tempC;}
  }

void MySqlSave(int type, String SensorName, float SensorValue)
{
  if (!client.connect(server, 80)) 
  { Serial.println("Je narrive pas a me connectez"); 
  } else {
    switch (type) {
      case 1:
      //ajoute une temperature
       client.print( "GET /biot/add_data.php?type=temperature&");
      client.print("sensor=");
      client.print(SensorName);
      client.print("&temperature=");
      client.print(SensorValue);
      client.println( " HTTP/1.1");
    client.print( "Host: " );
    client.println(server);
    client.println( "Connection: close" );
    client.println();
    client.println();
    client.stop();
    Serial.println("---Module MySqlSave; (temperatures) added"); 
      break;
      }
      } 

      //http://localhost/biot/add_data.php?type=temperature&sensor=trtr&temperature=43
}


void MySqlSaveEvent(String What, String Event, String Reason)
{
  if (!client.connect(server, 80)) 
  { Serial.println("Je narrive pas a me connecter au serveur web"); 
  } else {

      client.print( "GET /biot/saveCurrent.php?");
      client.print("what=");
      client.print(What);
      client.print("&&event=");
      client.print(Event);
      client.print("&&reason=");
      client.print(Reason);
      client.println(" HTTP/1.1");
      client.print("Host: " );
      client.println(server);
      client.println("Connection: close" );
      client.println();
      client.println();
      client.stop();
      Serial.println("---Module MySqlSaveEvent; added"); 
      } 

      
}

  /*
   void gWaterLevelManager() {  
   //Serial.println(F("--->Module WaterLevelManager<---"));
  Serial.println("--->Module WaterLevelManager<---");
  waterLevel1SwitchStatus = digitalRead(waterLevelSwitch1Pin);
  waterLevel2SwitchStatus = digitalRead(waterLevelSwitch2Pin);

//-Flotteur haut niveau
//Serial.print(F("WaterLevelSwitch #1 Status; "));
Serial.print("WaterLevelSwitch #1 Status; ");
if (waterLevel1SwitchStatus == HIGH) {
  //Si le floteur est en haut, la switch est fermer, donc assez d'eau
  Serial.println(textWaterLevel1OK);
  //Serial.println(F("Aucun changement on continue ...."));
  Serial.println("Aucun changement on continue ....");
  } else { 
    //Si le flotteur ne flotte plus, c'est qu'il n'y  a plus assez d'eau
    Serial.println(textAlarmWaterLevelBad);
    Serial.println("Une alarm va etre envoyé");
    //Serial.println(F("Une alarm va etre envoyé"));
    }

//flotteur protecteur de pompe
Serial.print("WaterLevelSwitch #2 Status; ");
if (waterLevel2SwitchStatus == HIGH) {Serial.println(textWaterLevel2OK); } else { 
  Serial.println(textAlarmWaterLevelCritical); 
  }
  }
*/



