const express = require("express");
const app = express();
const got = require("got");

const serviceAccount = {
  type: process.env.PRIVATEKEYtype,
  project_id: process.env.PRIVATEKEYproject_id,
  private_key_id: process.env.PRIVATEKEYprivate_key_id,
  private_key: process.env.PRIVATEKEYprivate_key,
  client_email: process.env.PRIVATEKEYclient_email,
  client_id: process.env.PRIVATEKEYclient_id,
  auth_uri: process.env.PRIVATEKEYauth_uri,
  token_uri: process.env.PRIVATEKEYtoken_uri,
  auth_provider_x509_cert_url: process.env.PRIVATEKEYauth_provider_x509_cert_url,
  client_x509_cert_url: process.env.PRIVATEKEYclient_x509_cert_url
};

const admin = require("firebase-admin");
// admin.initializeApp(functions.config().firebase)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL
});
const database = admin.database();

const {
  Client,
  middleware,
  SignatureValidationFailed,
  JSONParseError
} = require("@line/bot-sdk");

// Auto refresh every 5 mins
app.get("/", (request, response) => {
  console.log(Date.now() + " Ping Received");
  response.sendStatus(200);
});

app.listen(process.env.PORT);
setInterval(() => {
  got(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 250000);
// }, 1500);

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

const bannedWords = ["kudet", "qdet"];
const reminder = ["Mon maap itu tida sopan hehe", "Ssstt", "Jangan diulangi lagi ya", "Kamu lebih baik diam"];
const annoyance = [
  { chance: 15, type: "Anjayy" },
  { chance: 15, type: "Parahh" },
  { chance: 13, type: "Gatauu" },
  { chance: 12, type: "Ohh gitu" },
  { chance: 10, type: "Yaudah iya" },
  { chance: 9,  type: "Hilih" },
  { chance: 9,  type: "Aku cape" },
  { chance: 9,  type: "Berisik ah" },
  { chance: 8,  type: "MAN ROBBUKA?!!?" },
];
const globalChance = 10 / 100;

function ganggu(rnd) {
  // const rnd = Math.random();
  var acc = 0;
  for (var i = 0, r; (r = annoyance[i]); i++) {
    acc += r.chance / 100;
    console.log(acc, rnd);
    if (rnd < acc) return r.type;
  }
  console.warn(acc, rnd);
  return;
}

function handleEvent(event) {
  // console.log(event);
  var userId = event.source.userId;
  var timestamp = event.timestamp;
  var replyToken = event.replyToken;
  const groupId = event.source.groupId;

  var userText = "";
  var answer;
  const cmdSearch = "_?";

  if (event.type === "join") {
    const type = event.source.type;
    answer = "Thanks for inviting me... SIKE you should be the one thanking me for looking up on your stuffs.\n\nI will answer you if you ask a question ending with _?\ntry: Elon Musk_?";
    reply(replyToken, answer);
    writeGroupJoin(groupId, type, timestamp);
  }

  if (event.type === "message" && event.message.type === "text") {
    userText = event.message.text;    
    
    if (groupId === 'C939ec88d1fa050eaa8882ca764340ca0') {
      var rnd = Math.random();
      console.warn(rnd);
      
      if (globalChance > rnd) {
        rnd = Math.random();
        const annoy = ganggu(rnd);
        if (annoy) {
          console.log(annoy);
          // reply(replyToken, annoy);
        }
      }

      if (contains(userText.toLowerCase(), bannedWords)) {
        randomRude(replyToken, reminder);
      }
    }

    if (userText.slice(-2) === cmdSearch) {
      let userQuestion = userText.split(cmdSearch)[0];
      getDdg(userQuestion);
    }
  }
  // return response.status(200).send(request.method);
  return;
}

function reply(replyToken, replyText) {
  const message = {
    type: "text",
    text: replyText
  };

  client.replyMessage(replyToken, message).catch(err => {
    console.error(err);
  });
}

function writeChatHistory(
  replyToken,
  userId,
  userQuestion,
  timestamp,
  searchResult
) {
  timestamp = timestamp.toString();

  database.ref("search-history/" + userQuestion).set({
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

function writeGroupJoin(groupId, type, timestamp) {
  timestamp = timestamp.toString();
  database.ref("group-list/" + groupId).set({
    timestamp: timestamp,
    type: type
  });
}

function contains(target, pattern) {
  var value = 0;
  pattern.forEach(function (word) {
    value = value + target.includes(word);
  });
  return (value === 1);
}

function randomRude(replyToken, misuh) {
  var randomArr = Math.floor(Math.random() * misuh.length);
  reply(replyToken, misuh[randomArr]);
}

function getDdg(userQuestion) {
  var searchQuery = userQuestion.replace(/\s+/g, "%20");
  var searchResult;

  got(`https://api.duckduckgo.com/?q=${searchQuery}&format=json&pretty=1&no_html=1&skip_disambig=1`)
    .then(res => {
      
      searchResult = JSON.parse(res.body);

      writeChatHistory(
        replyToken,
        userId,
        userQuestion,
        timestamp,
        searchResult
      );

      if (searchResult.AbstractText) {
        answer = `${searchResult.Heading}\n${searchResult.AbstractText}\nSource: ${searchResult.AbstractURL}`;
      } else {
        answer = `Sorry we can't find the instant answer for that, use this link to find it yourself: \n\nhttps://www.google.com/search?q=${searchQuery}`;
      }

      if (searchResult.RelatedTopics.length != 0) {
        answer += "\n\nRelated Topics:";
        let relatedTopicsCount =
          searchResult.RelatedTopics.length > 4
            ? 4
            : searchResult.RelatedTopics.length - 1;
        for (let i = 0; i <= relatedTopicsCount; i++) {
          if (!("Text" in searchResult.RelatedTopics[i])) {
            break;
          } else
            answer += `\n${i + 1}. ${searchResult.RelatedTopics[i].Text}\n${
              searchResult.RelatedTopics[i].FirstURL
              }`;
        }
      } else if (searchResult.Results) {
        answer += JSON.stringify(searchResult.Results);
      }
      answer = answer.replace(/\[]/g, "");
      reply(replyToken, answer);
      return;
    })
    .catch(error => {
      console.log(error);
      return;
    });
}