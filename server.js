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
    console.log(event);
    var userId = event.source.userId; 
    var timestamp = event.timestamp;
    var replyToken = event.replyToken;

    var userText = "";
    const cmdSearch = '_?';
    var answer;
  
    // client.getGroupSummary(event.source.groupId).then((summary) => {
    //   console.log(summary)
    // }).catch((err) => {
    //     console.error(err);
    // });
  
    got(`https://api.line.me/v2/bot/group/${event.source.groupId}/summary`).then(res => {
     console.log(res); 
    });
  
    if (event.type === "join"){
      
      const groupId = event.source.groupId;
      const type = event.source.type;
            
      answer = 'Thanks for inviting me... bitch you should be the one thanking me for looking up on your shit.\n\nI will answer you if you ask a question ending with _?\ntry: Yo mama_?'
      const message = {
          type: 'text',
          text: answer
      };
      
      client.replyMessage(replyToken, message)
        .catch((err) => {
            console.error(err);
      });
      
      
      
      // writeGroupJoin(groupName, groupId, type, timestamp); 
    }
  
    

    if (event.type === "message" && event.message.type === "text"){
        userText = event.message.text;
        if (userText.slice(-2) === cmdSearch) {
            let userQuestion = userText.split(cmdSearch)[0];
            var searchQuery = userQuestion.replace(/\s+/g, '%20');
            var searchResult;
          
            console.log(searchQuery);
                    
            got(`https://api.duckduckgo.com/?q=${searchQuery}&format=json&pretty=1&no_html=1&skip_disambig=1`).then(res => {
              searchResult = JSON.parse(res.body);
              // console.log(searchResult)
              
              writeChatHistory(replyToken, userId, userQuestion, timestamp, searchResult);
              
              if (searchResult.AbstractText) {
                  answer = `${searchResult.Heading}\n${searchResult.AbstractText}\nSource: ${searchResult.AbstractURL}`;
                  
              }
              else {
                  answer = `Sorry we can't find the meaning of that, do it yourself you lazy unwanted garbage, here is the link: \n\nddg.gg/${searchQuery} \nor\nhttps://www.google.com/search?q=${searchQuery}`;
              }
              
              // console.log(searchQuery);
              
              if (searchResult.RelatedTopics.length != 0){
                  answer += '\n\nRelated Topics:';
                  let relatedTopicsCount = (searchResult.RelatedTopics.length < 4) ? searchResult.RelatedTopics.length : 4;
                  // console.log(relatedTopicsCount);
                  for (let i = 0; i <= relatedTopicsCount; i++){
                      // console.log(i, answer);
                      if (!searchResult.RelatedTopics[i].Text){
                        break
                      }
                      else 
                        answer += `\n${i+1}. ${searchResult.RelatedTopics[i].Text} : ${searchResult.RelatedTopics[i].FirstURL}`;
                  }
              }
              else if (searchResult.Results){
                  answer += JSON.stringify(searchResult.Results);
              }
              
              answer = answer.replace(/\[]/g, '');

              const message = {
                  type: 'text',
                  text: answer
              };

              client.replyMessage(replyToken, message)
                .catch((err) => {
                    console.error(err);
              });
            }).catch((error) => {
                console.log(error);
                return;
            });
        }
    } 

    // return response.status(200).send(request.method);
  return;
}

function writeChatHistory(replyToken, userId, userQuestion, timestamp, searchResult) {
    timestamp = timestamp.toString();

    database.ref('search-history/' + userQuestion).set({
        userId: userId,
        timestamp: timestamp,
        replyToken: replyToken,
        answer: searchResult
    });

    // firestore.collection("chat-history").set({
    //     "userId": userId,
    //     "message": userText,
    //     "timestamp": timestamp
    // });
}

function writeGroupJoin(groupName, groupId, type, timestamp) {
    timestamp = timestamp.toString();

    database.ref('group-list/' + groupName).set({
        timestamp: timestamp,
        type: type,
        groupId: groupId
    });
}