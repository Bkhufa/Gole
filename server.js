// but feel free to use whatever libraries or frameworks you'd like through `package.json`.
const http = require('http');
const express = require("express");
const app = express();

const serviceAccount = {
  "type": process.env.PRIVATEKEYtype,
  "project_id": process.env.PRIVATEKEYproject_id,
  "private_key_id": process.env.PRIVATEKEYprivate_key_id,
  "private_key": process.env.PRIVATEKEYprivate_key,
  "client_email": process.env.PRIVATEKEYclient_email,
  "client_id": process.env.PRIVATEKEYclient_id,
  "auth_uri": process.env.PRIVATEKEYauth_uri,
  "token_uri": process.env.PRIVATEKEYtoken_uri,
  "auth_provider_x509_cert_url": process.env.PRIVATEKEYauth_provider_x509_cert_url,
  "client_x509_cert_url": process.env.PRIVATEKEYclient_x509_cert_url
};

// console.log(serviceAccount);
// console.log(process.env.PRIVATEKEYprivate_key);

const admin = require("firebase-admin");
// admin.initializeApp(functions.config().firebase)
admin.initializeApp({
  // credential: admin.credential.applicationDefault(),
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL
});
const database = admin.database();

const {
  Client,
  middleware,
  SignatureValidationFailed,
  JSONParseError
} = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.channelAccessToken,
  channelSecret: process.env.channelSecret
};

const client = new Client(config);

// Auto refresh every 5 mins
app.get("/", (request, response) => {
  console.log(Date.now() + " Ping Received");
  response.sendStatus(200);
});

app.listen(process.env.PORT);
setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 280000);

app.post("/callback", middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(e => {
      console.log(e);
    });
});

// Error Handler
app.use((err, req, res, next) => {
  if (err instanceof SignatureValidationFailed) {
    res.status(401).send(err.signature);
    return;
  } else if (err instanceof JSONParseError) {
    res.status(400).send(err.raw);
    return;
  }
  next(err); // will throw default 500
});


// function handleEvent(event) {
function handleEvent(event) {

    // var event = request.body.events[0];
    console.log(event);
    var userId = event.source.userId; 
    var timestamp = event.timestamp;
    var replyToken = event.replyToken;

    var userText = "";
    const botCommand = '_?';

    if (event.type === "message" && event.message.type === "text"){
        userText = event.message.text;
        if (userText.slice(-2) === botCommand) {
            let userQuestion = userText.split(botCommand)[0];

            writeChatHistory(replyToken, userId, userQuestion, timestamp);

            var searchQuery = userQuestion.replace(/\s+/g, '%20');
            // var searchQuery = userQuestion;

            console.log(searchQuery);

            // searchResult = get(searchQuery);


            // console.log("searchresult", searchResult);

            // const searchObj = JSON.parse(searchResult);

            // console.log("searchobj", searchObj);
            
            var answer;

            // if (searchObj.AbstractText) {
            //     answer = `${searchObj.Heading}\n${searchObj.AbstractText}\nSource: ${searchObj.AbstractURL}`;
            //     if (searchObj.RelatedTopics){
            //         for (let i = 0; i < 5; i++){
            //             answer += `Related Topics:\n1. ${searchObj.RelatedTopics[i].Text} : ${searchObj.RelatedTopics[i].FirstURL}`
            //         }
            //     }
            //     else if (searchObj.Results){
            //         answer += JSON.stringify(searchObj.Results);
            //     }
            // }
            // else {
                answer = `Sorry we can't find that, do it yourself you lazy unwanted garbage, here is the link: \n\n google.com/${searchQuery} \n ddg.gg/${searchQuery}`;
            // }

            const message = {
                type: 'text',
                text: answer
            };
            
            client.replyMessage(replyToken, message)
                .catch((err) => {
                    console.error(err);
                });
        }
    } 

    // return response.status(200).send(request.method);
}

function writeChatHistory(replyToken, userId, userQuestion, timestamp) {
    timestamp = timestamp.toString();

    database.ref('chat-history/' + userQuestion).set({
        userId: userId,
        timestamp: timestamp,
        replyToken: replyToken
    });

    // firestore.collection("chat-history").set({
    //     "userId": userId,
    //     "message": userText,
    //     "timestamp": timestamp
    // });
}

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});



// // our default array of dreams
// const dreams = [
//   "Find and count some sheep",
//   "Climb a really tall mountain",
//   "Wash the dishes"
// ];

// // make all the files in 'public' available
// // https://expressjs.com/en/starter/static-files.html
// app.use(express.static("public"));

// // https://expressjs.com/en/starter/basic-routing.html
// app.get("/", (request, response) => {
//   response.sendFile(__dirname + "/views/index.html");
// });

// // send the default array of dreams to the webpage
// app.get("/dreams", (request, response) => {
//   // express helps us take JS objects and send them as JSON
//   response.json(dreams);
// });

// // listen for requests :)
// const listener = app.listen(process.env.PORT, () => {
//   console.log("Your app is listening on port " + listener.address().port);
// });
