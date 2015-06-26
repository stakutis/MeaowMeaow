#define NO_LCD 1
#include <Sparki.h>  // include the sparki library
#include <I2C_16.h>
#include <TMP006.h>



#define TEMPERATURE

#ifdef TEMPERATURE
#include <stdint.h>
#include <math.h>
#include <SparkiWire.h>

float convertCtoF(float c) {
  return c *1.8 +32; // T(°F) = T(°C) × 1.8 + 32
}

uint8_t sensor1 = 0x40; // I2C address of TMP006, can be 0x40-0x47
uint16_t samples = TMP006_CFG_8SAMPLE; // # of samples per reading, can be 1/2/4/8/16
#endif


int memleft() {
    char *p;
    int size=1024*2;
    while (!(p=(char*)malloc(size))) size--;
    if (p) free(p);
    return size;
}

void setup()
{
  Serial1.begin(9600);
  Serial1.println("!Starting (tues)25....");
  sparki.servo(0);
#ifdef TEMPERATURE
  config_TMP006(sensor1, samples);
#endif
  Serial1.print("!Free memory:"); Serial1.println(memleft());
}

char incoming[25];
int incomingIdx=0;

int accumulateIncoming() {
  while (Serial1.available()) {
    char c=(char)Serial1.read();
    if (c==(char)0) continue;  // ignore bytes...server is sending double-byte chars
    if (c=='\r') continue;
    if (incomingIdx >= sizeof(incoming)) {
      Serial1.println("!Overflowed incoming buffer!");
      return true; // Dont overflow
    }
    if (c=='\n') return true;
    incoming[incomingIdx]=c;
    incomingIdx++;
  }
  return false;
}

void clearIncoming() {
  int i;
  for (i=0; i<sizeof(incoming); i++) incoming[i]=0;
  incomingIdx=0;
}

void processScan() {
  // The pattern must be 2-chars and "|" repeated; e.g. SDD|AY|AZ|AX
  Serial1.print("C");
  
  int idx=1;
  
  while (idx < incomingIdx) {
    switch (incoming[idx]) {
      case 'S': if (incoming[idx+1]=='V') {
                  Serial1.print("SV");
                  Serial1.print(sparki.systemVoltage());
                }
                break;
      case 'D': if (incoming[idx+1]=='D') {
                  Serial1.print("DD");
                  Serial1.print(sparki.ping());
                }
                break;
      case 'A': if (incoming[idx+1]=='Z') {
                  Serial1.print("AZ");
                  Serial1.print(sparki.accelZ());
                }
                else
                if (incoming[idx+1]=='X') {
                  Serial1.print("AX");
                  Serial1.print(sparki.accelX());
                }
                else
                if (incoming[idx+1]=='Y') {
                  Serial1.print("AY");
                  Serial1.print(sparki.accelY());
                }
                break;
      case 'M': if (incoming[idx+1]=='Z') {
                  Serial1.print("MZ");
                  Serial1.print(sparki.magZ());
                }
                else
                if (incoming[idx+1]=='X') {
                  Serial1.print("MX");
                  Serial1.print(sparki.magX());
                }
                else
                if (incoming[idx+1]=='Y') {
                  Serial1.print("MY");
                  Serial1.print(sparki.magY());
                }
                else
                if (incoming[idx+1]=='R') {
                  Serial1.print("MR");
                  Serial1.print(sparki.areMotorsRunning());
                }
                else
                if (incoming[idx+1]=='L') {
                  Serial1.print("ML");
                  Serial1.print(memleft());
                }
                break;
       case 'L': if (incoming[idx+1]=='L') {
                  Serial1.print("LL");
                  Serial1.print(sparki.lineLeft());
                }
                else
                if (incoming[idx+1]=='C') {
                  Serial1.print("LC");
                  Serial1.print(sparki.lineCenter());
                }
                else
                if (incoming[idx+1]=='R') {
                  Serial1.print("LR");
                  Serial1.print(sparki.lineRight());
                }
                break;
       case 'E': if (incoming[idx+1]=='L') {
                  Serial1.print("EL");
                  Serial1.print(sparki.edgeLeft());
                }
                else
                if (incoming[idx+1]=='R') {
                  Serial1.print("ER");
                  Serial1.print(sparki.edgeRight());
                }
                break;
      case 'T': if (incoming[idx+1]=='L') {
                  Serial1.print("TL");
                  Serial1.print(sparki.lightLeft());
                }
                else
                if (incoming[idx+1]=='C') {
                  Serial1.print("TC");
                  Serial1.print(sparki.lightCenter());
                }
                else
                if (incoming[idx+1]=='R') {
                  Serial1.print("TR");
                  Serial1.print(sparki.lightRight());
                }
#ifdef TEMPERATURE
                else
                if (incoming[idx+1]=='T') {
                  float object_temp = readObjTempC(sensor1);
                  Serial1.print("TO");
                  Serial1.print(convertCtoF(object_temp));
                  Serial1.print("|");
                  // Serial1.print("Object Temperature: "); Serial1.print(convertCtoF(object_temp)); Serial1.println("*F");
                  float sensor_temp = readDieTempC(sensor1);
                  // Serial1.print("Sensor Temperature: "); Serial1.print(convertCtoF(sensor_temp)); Serial1.println("*F");
                  Serial1.print("TS");
                  Serial1.print(convertCtoF(sensor_temp));
                }
#endif
                break;
    }
    Serial1.print("|");
    idx+=3;

  }
   
  Serial1.println("\r");
}


int readValue(char *str, int lastIdx) {
 int m=1;
 int a=0;
 int idx=0;
 if (str[idx]=='-') {m=-1; idx++;}
 while (idx!=lastIdx) {
   a=a*10+str[idx]-'0';
   idx++;
 }
 a=a*m;
 return a;
}


void processMove() {
 Serial1.print("C");
 int val;
 val=readValue(&incoming[2],incomingIdx-2);
 if (incoming[1]=='F') sparki.moveForward(val);
 else
 if (incoming[1]=='B') sparki.moveBackward(val);
 else
 if (incoming[1]=='L') sparki.moveLeft(val);
 else
 if (incoming[1]=='R') sparki.moveRight(val);
 else
 if (incoming[1]=='S') sparki.moveStop();
 
 Serial1.println("\r");
}

void processGripper() {
 Serial1.print("C");
 int val=5;
 
 if (incomingIdx>=2)
   val=readValue(&incoming[2],incomingIdx-2);

 if (incoming[1]=='O') sparki.gripperOpen(val);
 else
 if (incoming[1]=='C') sparki.gripperClose(val);
 else
 if (incoming[1]=='S') sparki.gripperStop();
 
 Serial1.println("\r");
}

void processServo() {
  //S angle
  int a;
  a=readValue(&incoming[1], incomingIdx-1);
  
 //Serial1.print("!Angle:");
 //Serial1.println(a);
 
 sparki.servo(a);
 Serial1.print("C");
 Serial1.println("\r");
}

void processTone() {
  //T freq | duration(0 means forever)
  //T  (with no params means stop)
  int barIdx;
  for (barIdx=1; barIdx < incomingIdx; barIdx++) if (incoming[barIdx]=='|') break;
  Serial1.print("!barIdx:"); Serial1.print(barIdx); Serial1.print(" incomingIdx:"); Serial1.println(incomingIdx);
  
  if (incomingIdx==1) sparki.noBeep();
  else {
    int freq, duration=0;
    freq=readValue(&incoming[1],barIdx-1);
    if (barIdx<incomingIdx) duration=readValue(&incoming[barIdx+1],incomingIdx-barIdx-1);
    //Serial1.print("!freq:"); Serial1.print(freq); Serial1.print(" dur:"); Serial1.println(duration);
    sparki.beep(freq, duration);
  }
 Serial1.print("C");
 Serial1.println("\r");
}

void processRGB() {
  int v[]={0,0,0},idx=0,i;
  i=1;
  while (i<=incomingIdx) {
    if (incoming[i]=='|') idx++;
    else v[idx]=v[idx]*10+(incoming[idx]-'0');
    i++;
  }
  
  sparki.RGB(v[0],v[1],v[2]);
 Serial1.print("C");
 Serial1.println("\r");
}

void processDepthSearch() {
  // D startAngle | stopAngle | angleAdjustment
 int barIdx, barFirstIdx=0;
 for (barIdx=1; barIdx <= incomingIdx; barIdx++) 
   if (incoming[barIdx]=='|') if (!barFirstIdx) barFirstIdx=barIdx; else break;
 //Serial1.print("!barFirstIdx:"); Serial1.print(barFirstIdx); Serial1.print(" barIdx:"); Serial1.println(barIdx);
 int start,stop,step;
 start=readValue(&incoming[1],barFirstIdx-1);
 stop=readValue(&incoming[barFirstIdx+1],barIdx-barFirstIdx-1);
 step=readValue(&incoming[barIdx+1],incomingIdx-barIdx-1);
 //Serial1.print("!start:"); Serial1.print(start); Serial1.print(" stop:"); Serial1.print(stop); Serial1.print(" step:"); Serial1.println(step);

 sparki.servo(start);
 delay(300);
 Serial1.print("C");
 for (; start < stop; start+=step) {
   int d=sparki.ping();
   sparki.servo(start);
   Serial1.print(d);
   Serial1.print("|");
   //delay(100); I think we can skip the delay because "ping" takes a while
 }
 Serial1.println("\r");
}

void processIncoming() {
  switch (incoming[0]) {
    case 'L': processRGB(); break;
    case 'S': processScan(); break;
    case 'G': processGripper(); break;
    case 'M': processMove(); break;
    case 'R': processServo(); break;
    case 'T': processTone(); break;
    case 'D': processDepthSearch(); break;
    default : 
      Serial1.print("!Unknown command received:");
      Serial1.print((int)incoming[0]);
      Serial1.print(" ");
      Serial1.println(incoming);
  }
}

void loop()
{
  if (accumulateIncoming()) {
    processIncoming();
    clearIncoming();
  }
  delay(100);
  
}

