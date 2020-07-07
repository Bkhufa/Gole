// but feel free to use whatever libraries or frameworks you'd like through `package.json`.
const http = require('http');
const express = require("express");
const app = express();
const got = require('got');


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

const admin = require("firebase-admin");
// admin.initializeApp(functions.config().firebase)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL
});
const database = admin.database();

// const line = require("@line/bot-sdk");

const {
  Client,
  middleware,
  SignatureValidationFailed,
  JSONParseError
} = require('@line/bot-sdk');

// Auto refresh every 5 mins
app.get("/", (request, response) => {
  console.log(Date.now() + " Ping Received");
  response.sendStatus(200);
});

app.listen(process.env.PORT);
setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 1000);
// }, 280000);

const config = {
  channelAccessToken: process.env.channelAccessToken,
  channelSecret: process.env.channelSecret
};

const client = new Client(config);

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
    // console.log(event);
    var userId = event.source.userId; 
    var timestamp = event.timestamp;
    var replyToken = event.replyToken;

    var userText = "";
    const cmdSearch = '_?';

    if (event.type === "message" && event.message.type === "text"){
        userText = event.message.text;
        if (userText.slice(-2) === cmdSearch) {
            let userQuestion = userText.split(cmdSearch)[0];

            writeChatHistory(replyToken, userId, userQuestion, timestamp);

            var searchQuery = userQuestion.replace(/\s+/g, '%20');
            var searchResult;
            var answer;

            console.log(searchQuery);
          
            // (async () => {
            //       try {
            //           const response = await got('https://api.duckduckgo.com/?q=Stoicism&format=json&pretty=1&no_html=1&skip_disambig=1');
            //           console.log(response.body);
            //           console.log(response);
            //       } catch (error) {
            //           console.error(error.response.body);
            //           //=> 'Internal server error ...'
            //       }
            //   })();
          
            got(`https://api.duckduckgo.com/?q=${searchQuery}&format=json&pretty=1&no_html=1&skip_disambig=1`).then(res => {
              console.log(res.body);
              searchResult = JSON.parse(res.body);
              console.log(typeof(searchResult))
              
              if (searchResult.AbstractText) {
                  answer = `${searchResult.Heading}\n${searchResult.AbstractText}\nSource: ${searchResult.AbstractURL}`;
                  if (searchResult.RelatedTopics){
                      answer += '\n\nRelated Topics:';
                      for (let i = 1; i <= 5; i++){
                          answer += `\n${i}. ${searchResult.RelatedTopics[i].Text} : ${searchResult.RelatedTopics[i].FirstURL}`
                      }
                  }
                  else if (searchResult.Results){
                      answer += JSON.stringify(searchResult.Results);
                  }
              }
              else {
                  answer = `Sorry we can't find that, do it yourself you lazy unwanted garbage, here is the link: \n\n ddg.gg/${searchQuery} \n https://www.google.com/search?q=${searchQuery}`;
              }

              const message = {
                  type: 'text',
                  text: answer
              };

              client.replyMessage(replyToken, message)
                  .catch((err) => {
                      console.error(err);
                  });
            });
            
        }
    } 

    // return response.status(200).send(request.method);
  return;
}

function writeChatHistory(replyToken, userId, userQuestion, timestamp) {
    timestamp = timestamp.toString();

    database.ref('search-history/' + userQuestion).set({
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