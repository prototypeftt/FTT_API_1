/* eslint-disable no-var */
/* eslint-disable max-len */
const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");

const admin = require("firebase-admin");
const bodyParser = require("body-parser");

// Fetch the service account key JSON file contents
const serviceAccount = require("./service/serviceAccountKey.json");

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({credential: admin.credential.cert(serviceAccount),
// The database URL depends on the location of the database
  databaseURL: "https://prototypeftt-cca12-default-rtdb.europe-west1.firebasedatabase.app/",
  storageBucket: "gs://prototypeftt-cca12.appspot.com",
});

// As an admin, the app has access to read and write all data,
// regardless of Security Rules
const db = admin.database();

// const {getStorage} = require("firebase-admin/storage");
// const bucket = getStorage().bucket();

const app = express();
app.use(cors({origin: true}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use(bodyParser.json());

app.get("/", (req, res, next) =>
  res.json({message: "Firebase function service is working"})
);

// API's for Client/Broker Messaging

app.get("/messages/:uuid", (req, res, next) => {
  const uuid = req.params.uuid;
  const ref = db.ref("messages/" + uuid + "/");
  let messageData="";
  ref.once("value", function(snapshot) {
    messageData = snapshot.val();
    res.status(200).send(JSON.stringify(messageData));
  }).catch(console.error);
});

app.post("/newmessage", (req, res, next) => {
  const message = req.body;
  const senderUuid = message.senderUuid;
  const receiverUuid = message.receiverUuid;
  const ref = db.ref("messages/" + receiverUuid + "/");

  ref.push({
    "uuid": senderUuid,
    "name": message.name,
    "message": message.message,
  }).catch(
      console.error
  ).then(
      res.status(201).send({"key": ref.key})
  );
}
);

// Delete message

app.delete("/messages/:uuid/:messageid", (req, res, next) => {
  const uuid = req.params.uuid;
  const messageid = req.params.messageid;
  const ref = db.ref("messages/" + uuid + "/" + messageid + "/");
  const deleteSuccess = "{\"message\":\"Message Deleted \"}";

  // removes the message from the receivers inbox
  ref.remove().catch(
      console.error
  ).then(
      res.status(201).send(deleteSuccess)
  );
});


// API's for AI Angine 13.11.2022 3

app.post("/ai/asset/add", (req, res) => {
  console.log(req.body);
  console.log(req.headers);

  var message = req.body;
  var assetName = message.assetName;
  var assetId = message.assetId;
  var closePrice = message.assetClosePrice;
  var assetCategory = message.assetCategory;
  var assetPrediction = message.assetPrediction;
  var assetPredictedPrice = message.assetPredictedPrice;
  var assetDate = message.assetDate;
  var assetMovement = message.assetMovement;

  var ref = db.ref("assets/" + assetCategory + "/" + assetId + "/");
  // const pathReference = ref(bucket, "graphs/" + assetId + ".pdf");
  // const pathReference = bucket.cloudStorageURI.href;

  // const pathReference = bucket.ref("graphs/" + assetId + ".pdf");

  // console.log("pathref:"+pathReference);
  // bucket.getSignedUrl();

  // console.log("bucket:"+bucket.name);

  ref.set({
    "assetName": assetName,
    "assetCategory": assetCategory,
    "assetId": assetId,
    "closePrice": closePrice,
    "assetPrediction": assetPrediction,
    "predictedPrice": assetPredictedPrice,
    "assetDate": assetDate,
    "assetMovement": assetMovement,
  }).catch(
      console.error
  ).then(
      res.status(201).send()
  );
}
);

app.get("/ai/asset/list", (req, res, next) => {
  const ref = db.ref("assets/");
  let messageData="";
  ref.once("value", function(snapshot) {
    messageData = snapshot.val();
    res.status(200).send(JSON.stringify(messageData));
  }).catch(console.error);
});

// API's for Chatbot

// Each chat is a separate thread
// One session per user, state held for sessio status
// Basic chatbot decision tree will be used to guide responses based
// on pre-defined options presented to client

app.post("/chatbot/newsession", (req, res, next) => {
  const message = req.body;
  const senderUuid = message.senderUuid;
  const ref = db.ref("chatbot/" + senderUuid + "/");
  const ref2 = db.ref("chatbot/tree/menu/");

  // Setup the session and return the main menu
  // Get the main menu from the chatbot data tree

  let messageData="";

  ref.set({
    "uuid": senderUuid,
    "selection": message.selection,
  }).catch(
      console.error
  ).then(
      ref2.once("value", function(snapshot) {
        messageData = snapshot.val();
        res.status(201).send(JSON.stringify(messageData));
      }).catch(console.error)

  );
}
);

app.post("/chatbot/selectoption", (req, res, next) => {
  console.log(req.body);
  console.log(req.headers);

  const message = req.body;
  const senderUuid = message.senderUuid;
  const ref = db.ref("chatbot/" + senderUuid + "/");
  const ref2 = db.ref("chatbot/tree/option/" +message.selection);
  // const jsonOptions = "{\"message\":\"Please choose - \", \"options\":[{\"option\":\"A - Buy Assets\"},{\"option\":\"B - Sell Assets\"},{\"option\":\"C - Contact Broker\"}]}";
  let messageData="";

  ref.set({
    "uuid": senderUuid,
    "selection": message.selection,
  }).catch(
      console.error
  ).then(
      ref2.once("value", function(snapshot) {
        messageData = snapshot.val();
        res.status(201).send(JSON.stringify(messageData));
      }).catch(console.error)
  );
}
);

app.post("/chatbot/endsession", (req, res, next) => {
  const message = req.body;
  const senderUuid = message.senderUuid;
  const ref = db.ref("chatbot/" + senderUuid + "/");
  const jsonOptions = "{\"message\":\"Goodbye \"}";

  // removes the chatbot session
  ref.remove().catch(
      console.error
  ).then(
      res.status(201).send(jsonOptions)
  );
}
);

exports.api = functions.https.onRequest(app);
