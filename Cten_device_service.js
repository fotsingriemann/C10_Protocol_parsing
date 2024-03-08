
const mqtt = require("mqtt");
const dotenv = require("dotenv");
dotenv.config();
const net = require('net');
const port = 1234;



if (process.env.MQTT_BROKER_URL) {

  let client = mqtt.connect("mqtt://" + process.env.MQTT_BROKER_URL);

    const server = net.createServer();
    server.listen(port, () => {
        console.log('TCP Server is running on port ' + port + '.');
    });

    let sockets = [];

   // the payloadObject"
    let payloadObj = { "serialId": null, "timestamp": 1680180853, "direction":0, "date":"", "time":"", "gps_status":"","battery_percent":0,"latitude": 0, "latitude_dir":'', "longitude": 0,"longitude_dir":'', "speed": 0,"unlock_medium":"","generalStatus":{"statut_1":[], "statut_2":[], "statut_3":[], "statut_4":[]}, 
    "GPS_antena_powerStatus":{
      "located":'',
      "gps_status": '',
      "power_status":'',
      "milleage_unit":''
    }, 
    "satellites": 0,"kilometrage":0, "sim":'', "rawString":""};

    let sensorObj = {"serialId":null, "timestamp": 1680180853, "message":"", "rawString":"", "command":""}

    server.on('connection', function(sock) {
        console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);
        sockets.push(sock);


        sock.on('data', function(data) {

            sockets.forEach(function(sock, index, array) {
                
                const buf = Buffer.from(data)
                const str = buf.toString("hex");
                if(str.length > 70){
                  console.log(str)
                      payloadObj.rawString = str
                            ///

                    //serial ID
                    let hexSerialId = str.split("").splice(10, 8).join("")
                    // console.log(hexSerialId)
                    payloadObj.serialId = (hexSerialId.match(/../g).map((elem,index) => (index==1||index==2 ? (parseInt("0x"+elem)-parseInt("0x80")==0 ? "00" : parseInt("0x"+elem)-parseInt("0x80")) : parseInt("0x"+elem)%10<1 ? "0" +parseInt("0x"+elem) : parseInt("0x"+elem) ))).join("").toString()

                    //timestamp
                    let hexTimestamp = str.split("").splice(18, 12).join("").match(/../g);
                    hexDate = (hexTimestamp.join("").split("").splice(0, 6).join("").match(/../g).join("-").toString()).split("-") 
                    hexDate[0] = (parseInt(hexDate[0]) + 2000).toString()
                    hexDate = hexDate.join("-")
                    payloadObj.date=hexDate
                    hexTime = hexTimestamp.join("").split("").splice(6, 12).join("").match(/../g).join(":").toString()
                    payloadObj.time=hexTime
                    payloadObj.timestamp = Date.parse(new Date(hexDate + " " + hexTime))/1000
                 
                    //latitude
                    let hexLatitude = str.split("").splice(30, 8).join("")
                    let hexLatitude_copy = hexLatitude
                    hex2bin(hexLatitude.charAt(0), 4).charAt(0) == '0' ? payloadObj.latitude_dir = 'N' : payloadObj.latitude_dir = 'S'
                    hexLatitude = hexLatitude.split("")
                    hex2bin(hexLatitude[0], 4).charAt(0) == '1' ? hexLatitude[0] = 1 : hexLatitude[0] = 0
                    let latitude = hexLatitude.splice(3, 8)
                    latitude[1] = latitude[1]+"."
                    let deg_latitude = (parseInt(hexLatitude.splice(0, 3).join(""))).toString()
                    payloadObj.latitude =  hex2bin(hexLatitude_copy.charAt(0), 4).charAt(0) == '0' ? parseFloat(deg_latitude) + parseFloat(latitude.join(""))/60 : -1 * (parseFloat(deg_latitude) + parseFloat(latitude.join(""))/60)
                    

                    //longitude
                    let hexLongitude = str.split("").splice(38, 8).join("")
                    let hexLongitude_copy = hexLongitude
                    hex2bin(hexLongitude.charAt(0), 4).charAt(0) == '0' ? payloadObj.longitude_dir = 'N' : payloadObj.longitude_dir = 'S'
                    hexLongitude = hexLongitude.split("")
                    hex2bin(hexLongitude[0], 4).charAt(0) == '1' ? hexLongitude[0] = 1 : hexLongitude[0] = 0
                    let longitude = hexLongitude.splice(3, 8)
                    longitude[1] = longitude[1]+"."
                    let deg_longitude = (parseInt(hexLongitude.splice(0, 3).join(""))).toString()
                    payloadObj.longitude = hex2bin(hexLongitude_copy.charAt(0), 4).charAt(0) == '0' ? parseFloat(deg_longitude) + parseFloat(longitude.join(""))/60 : -1 * (parseFloat(deg_longitude) + parseFloat(longitude.join(""))/60)



                    //speed
                    let hexSpeed = str.split("").splice(46, 4).join("")
                    payloadObj.speed = parseInt(hexSpeed)

                    //direction
                    let hexDirection = str.split("").splice(50, 4).join("")
                    payloadObj.direction = parseInt(hexDirection)

                    //Status de l'antenne gps
                    let hexGPS_antena_powerStatus = str.split("").splice(54, 2).join("")
                    gps_power_antenastatus(payloadObj,hexGPS_antena_powerStatus)
                    
                    //Kilometrage
                    let hexKilometrage = str.split("").splice(56, 6).join("")
                    payloadObj.kilometrage = parseInt("0x" + hexKilometrage)

                    //general status
                    let hexgeneral_status = str.split("").splice(62, 8).join("")
                    parse_generalStatus(payloadObj, hexgeneral_status)

                    //satellite number
                    let satellites = str.split("").splice(74, 2).join("")
                    payloadObj.satellites = parseInt("0x" + satellites)

                    //Which sim
                    let sim = str.split("").splice(76, 2).join("")
                    payloadObj.sim = hex2bin(sim)[7] == 0 ? "Sim 1" : "Sim 2"

                    //Which sim
                    let gps_status = str.split("").splice(86, 2).join("")
                    payloadObj.gps_status = hex2bin(gps_status).charAt(0) == "0" ? "Not Located" : "Located"
                    
                    //Pourcentage de la baterie 
                    let hexbattery_percent = str.split("").splice(88, 2).join("")
                    payloadObj.battery_percent = parseFloat(hexbattery_percent)

                      //Unlock_medium 
                      let hexunlockmedium = str.split("").splice(88, 2).join("")
                      payloadObj.unlock_medium = hex2bin(hexunlockmedium)[7] == "1" ? "Unlock by RFID" : hex2bin(hexunlockmedium)[6] == "1" ? "Unlock by GPRS" : hex2bin(hexunlockmedium)[5] == "1" ? "Unlock by SMS" : hex2bin(hexunlockmedium)[4] == "1" ? "Unlock by auto unlock" : "None of these"
                // ////



                }else{
                  sensorObj.rawString = str
                  let  _hexcommand = str.match(/../g)[2]
                  sensorObj.command = _hexcommand

                  let _hexSerialId = str.split("").splice(10, 8).join("")
                  sensorObj.serialId = (_hexSerialId.match(/../g).map((elem,index) => (index==1||index==2 ? (parseInt("0x"+elem)-parseInt("0x80")==0 ? "00" : parseInt("0x"+elem)-parseInt("0x80")) : parseInt("0x"+elem)%10<1 ? "0" +parseInt("0x"+elem) : parseInt("0x"+elem) ))).join("").toString()

                  let _hexmessage = str.split("").splice(18, 2).join("")
                  sensorObj.message = _hexmessage

                }

                console.log(payloadObj)

                client.publish(
                  process.env.PUBLISH_TOPIC_TRACK,
                  JSON.stringify(payloadObj),
                );

                client.publish(
                  process.env.PUBLISH_TOPIC_SENSOR,
                  JSON.stringify(sensorObj),
                );
                

    
            }
            )

            

        });

        
        sock.on('close', function(data) {
            let index = sockets.findIndex(function(o) {
                return o.remoteAddress === sock.remoteAddress && o.remotePort === sock.remotePort;
            })
            if (index !== -1) sockets.splice(index, 1);
            console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
        });
    });
  }else{
    console.log("MQTT VARIABLES NOT SET!");
  }
   

function hex2bin(hex){
  return (parseInt(hex, 16).toString(2)).padStart(8, '0');
}


function gps_power_antenastatus(payloadObj, hexGPS_antena_powerStatus){
  let bin_GPS_antena = hex2bin(hexGPS_antena_powerStatus)
            bin_GPS_antena.charAt(0) == 0 ? payloadObj.GPS_antena_powerStatus.located="noLocated" : payloadObj.GPS_antena_powerStatus.located="Located"
            bin_GPS_antena.split("").shift()
            switch(bin_GPS_antena.match(/../g)[0]){
              case "11": payloadObj.GPS_antena_powerStatus.gps_status="gps normal"
              break
              case "10": payloadObj.GPS_antena_powerStatus.gps_status="gps court circuit"
              break
              case "01": payloadObj.GPS_antena_powerStatus.gps_status="gps circuit ouvert"
              break
              case "00": payloadObj.GPS_antena_powerStatus.gps_status="gps error"
              default : payloadObj.GPS_antena_powerStatus.gps_status="aucun antene gps"
            }
            switch(bin_GPS_antena.match(/../g)[1]){
              case "11": payloadObj.GPS_antena_powerStatus.power_status="main power normal"
              break
              case "10": payloadObj.GPS_antena_powerStatus.power_status="main power off"
              break
              case "01": payloadObj.GPS_antena_powerStatus.power_status="main power abnormal (too high/ too slow)"
              break
              default : payloadObj.GPS_antena_powerStatus.power_status="main power error"
            }
            switch(bin_GPS_antena.match(/../g)[2][0]){
              case "0": payloadObj.GPS_antena_powerStatus.milleage_unit="Km"
              break
              case "1": payloadObj.GPS_antena_powerStatus.milleage_unit="0.1Km"
              break
              default : payloadObj.GPS_antena_powerStatus.milleage_unit="aucune"
            }
            switch(hex2bin(hexGPS_antena_powerStatus).match(/../g).pop()){
              case "00": payloadObj.GPS_antena_powerStatus.milleage_unit="m"
              break
              case "01": payloadObj.GPS_antena_powerStatus.milleage_unit="m"
              break
              case "10": payloadObj.GPS_antena_powerStatus.milleage_unit="Km"
              break
              case "11": payloadObj.GPS_antena_powerStatus.milleage_unit="Km"
              break
              default : payloadObj.GPS_antena_powerStatus.milleage_unit="aucune"
            }
}

function parse_generalStatus(payloadObj, hexgeneral_status){
  let table_status = hexgeneral_status.match(/../g).map(elem => hex2bin(elem))
  let status_1 = table_status[0]
  let status_2 = table_status[1]
  let status_3 = table_status[2]
  let status_4 = table_status[3]
  payloadObj.generalStatus.statut_1.push(status_1.charAt(0) == '1' ? "ACC off" : "ACC on"); payloadObj.generalStatus.statut_1.push(status_1.charAt(1) == '1' ? "DEF(1) Alarm" : "Alarm 1 Normal"); payloadObj.generalStatus.statut_1.push(status_1.charAt(2) == '1' ? "DEF(2) Alarm" : "Alarm 2 Normal"); payloadObj.generalStatus.statut_1.push(status_1.charAt(3) == '1' ? "DEF(3) Alarm" : "Alarm Normal"); payloadObj.generalStatus.statut_1.push(status_1.charAt(4) == '1' ? "DEF(4) / Lora deconnected alarm" : "Alarm 4 Normal"); payloadObj.generalStatus.statut_1.push(status_1.charAt(5) == '1' ? " immobilize" : "recover Fuel pump"); payloadObj.generalStatus.statut_1.push(status_1.charAt(6) == '1' ? "Detach/light sensor alarm" : "light sensor Alarm is Normal"); payloadObj.generalStatus.statut_1.push(status_1.charAt(7) == '1' ? "in sleep" : "exit from sleep")
  payloadObj.generalStatus.statut_2.push(status_2.charAt(0) == '1' ? "SOS" : "not SOS/ Normal"); payloadObj.generalStatus.statut_2.push(status_2.charAt(1) == '1' ? "Overspeed" : "speed Normal"); payloadObj.generalStatus.statut_2.push(status_2.charAt(2) == '1' ? "Vibration" : "No vibration/Normal"); payloadObj.generalStatus.statut_2.push(status_2.charAt(3) == '1' ? "exit Geo-fence" : "on Geo-fence"); payloadObj.generalStatus.statut_2.push(status_2.charAt(4) == '1' ? "Enter Geo-fence" : "not in Geo-fence"); payloadObj.generalStatus.statut_2.push(status_2.charAt(5) == '1' ? "DEF (5) alarm" : "Alarm 5 Normal"); payloadObj.generalStatus.statut_2.push(status_2.charAt(6) == '1' ? "IDLE alarm happen" : "Normal Alarm"); payloadObj.generalStatus.statut_2.push(status_2.charAt(7) == '1' ? "OUT3 enabled" : "OUT3 disable")
  payloadObj.generalStatus.statut_3.push(status_3.charAt(0) == '1' ? "Fatigue driving" : "Driving Normal"); payloadObj.generalStatus.statut_3.push(status_3.charAt(1) == '1' ? "need reply 0x21" : "do not need reply"); payloadObj.generalStatus.statut_3.push(status_3.charAt(2) == '1' ? "Tempreture abnormal" : "Tempreture Normal"); payloadObj.generalStatus.statut_3.push(status_3.charAt(3) == '1' ? "GSM signal strength" : "GSM signal strength"); payloadObj.generalStatus.statut_3.push(status_3.charAt(4) == '1' ? "GSM signal strength" : "GSM signal strength"); payloadObj.generalStatus.statut_3.push(status_3.charAt(5) == '1' ? "GSM signal strength" : "GSM signal strength"); payloadObj.generalStatus.statut_3.push(status_3.charAt(6) == '1' ? "GSM signal strength" : "GSM signal strength"); payloadObj.generalStatus.statut_3.push(status_3.charAt(7) == '1' ? "GSM signal strength" : "GSM signal strength")
  payloadObj.generalStatus.statut_4.push(status_4.charAt(0) == '1' ? " OUT1 enabled" : " OUT1 disable"); payloadObj.generalStatus.statut_4.push(status_4.charAt(1) == '1' ? " OUT2 enabled" : " OUT2 disable"); payloadObj.generalStatus.statut_4.push(status_4.charAt(2) == '1' ? " Lock wire cut" : " Lock wire Normal"); payloadObj.generalStatus.statut_4.push(status_4.charAt(3) == '1' ? "LBS location" : "GPS location"); payloadObj.generalStatus.statut_4.push(status_4.charAt(4) == '1' ? "enable protection mode" : "disable protection mode"); payloadObj.generalStatus.statut_4.push(status_4.charAt(5) == '1' ? "unlock" : "lock on"); payloadObj.generalStatus.statut_4.push(status_4.charAt(6) == '1' ? "on charging" : "Non on charging"); payloadObj.generalStatus.statut_4.push(status_4.charAt(7) == '1' ? " casing/sim tamper" : "Sim Normal")
  
}
