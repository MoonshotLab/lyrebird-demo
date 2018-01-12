const size_t READ_BUF_SIZE = 64;

int buttonPin = 4;
int ledPin = 5;

void processBuffer();

char readBuf[READ_BUF_SIZE];
size_t readBufOffset = 0;

void setup() {
  Serial.begin(9600);

  pinMode(buttonPin, INPUT);  // Set the button as an input
  pinMode(ledPin, OUTPUT);
}

void loop() {
   if (digitalRead(buttonPin) == HIGH) {
     Serial.println("press");
     delay(500);
   }

  while (Serial.available()) {
    if (readBufOffset < READ_BUF_SIZE) {
      char c = Serial.read();
      if (c != '\n') {
        // Add character to buffer
        readBuf[readBufOffset++] = c;
      } else {
        // End of line character found, process line
        readBuf[readBufOffset] = 0;
        processBuffer();
        readBufOffset = 0;
      }
    } else {
      readBufOffset = 0;
    }
  }
}

void turnButtonOn() {
  digitalWrite(ledPin, HIGH);
}

void turnButtonOff() {
  digitalWrite(ledPin, LOW);
}

void processBuffer() {
  int val = atoi(readBuf);

  switch(val) {
    case 1:
      turnButtonOn();
      break;
    case 0:
      turnButtonOff();
      break;
    default:
      Serial.print("read from serial: "); Serial.println(readBuf);
      break;
  }
}
