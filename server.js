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
  { chance: 9, type: "Hilih" },
  { chance: 9, type: "Aku cape" },
  { chance: 9, type: "Berisik ah" },
  { chance: 8, type: "MAN ROBBUKA?!!?" },
];
const globalChance = 5 / 100;

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
  const cmdOld = "_?";
  const cmdSearch = ";?"

  if (event.type === "join") {
    const type = event.source.type;
    answer = "Thanks for inviting me... SIKE you should be the one thanking me for looking up on your stuffs.\n\nI will answer you if you ask a question ending with ;?\ntry: Elon Musk;?";
    reply(replyToken, answer);
    writeGroupJoin(groupId, type, timestamp);
  }

  if (event.type === "message" && event.message.type === "text") {
    userText = event.message.text;

    if (userText.slice(-2) === cmdOld) {
      // reply(replyToken, "We are changing the command to ;?");
      // reply(replyToken, "Sorry we are currently in maintenance");
      let userQuestion = userText.split(cmdOld)[0];

      (async () => {
        const answer = await getDdg(userQuestion);
        // const answer = InterfaceAPI (googleResult, userQuestion);

        reply(replyToken, answer);
        writeChatHistory(
          replyToken,
          userId,
          userQuestion,
          timestamp,
          answer
        );
      })().catch(error => {
        return console.error(error);
      });
    }

    if (userText.slice(-2) === cmdSearch) {
      const userQuestion = userText.split(cmdSearch)[0].replace(/\s+/g, "%20");

      (async () => {
        // const ddgResult = await getDdg(userQuestion);
        const googleResult = await getGoogleMarcelinhov(userQuestion);
        // const googleResult = await getGoogleSerpsbot(userQuestion);
        // const googleResult = await getGoogleApigeek(userQuestion);
        
        const answer = InterfaceAPI (googleResult, userQuestion);

        reply(replyToken, answer);
        writeChatHistory(
          replyToken,
          userId,
          userQuestion,
          timestamp,
          answer
        );
      })().catch(error => {
        return console.error(error);
      });
    }

    else if (groupId === 'C939ec88d1fa050eaa8882ca764340ca0') {
      var rnd = Math.random();
      console.warn(rnd);

      if (globalChance > rnd) {
        rnd = Math.random();
        const annoy = ganggu(rnd);
        if (annoy) {
          console.log(annoy);
          reply(replyToken, annoy);
        }
      }

      if (contains(userText.toLowerCase(), bannedWords)) {
        randomRude(replyToken, reminder);
      }
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

async function getDdg(userQuestion) {
  const searchQuery = userQuestion.replace(/\s+/g, "%20");

  return got(`https://api.duckduckgo.com/?q=${searchQuery}&format=json&pretty=1&no_html=1&skip_disambig=1`)
    .then(res => {
      var answer;
      const searchResult = JSON.parse(res.body);

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
      // console.log("answer: ", answer);
      return answer;
    })
    .catch(error => {
      return console.error(error);
    });
}

function InterfaceAPI (response, userQuestion) {
  if (response === 0) {
    return `Sorry we can't seem to find that, use this link to find it yourself:\n\nnhttps://www.google.com/search?q=${userQuestion}`;
  }
  else {
    var answer = `${userQuestion.replace(/%20+/g, " ")}\n`;
    const count = response.length > 3 ? 3: response.length;
  
    for (let i = 0; i < count; i++) {
      answer += `${i+1}. ${response[i].title}\n${response[i].description}\n${response[i].link}\n\n`;
    }
    
    return answer;
  }
}


async function getGoogleSerpsbot(userQuestion) {
  const hl = "en-ID"; //Parameter defines the language to use for the Google search. It's a two-letter language code. (e.g., en for English, es for Spanish, or fr for French) Head to the Google languages for a full list of supported Google languages.
  const gl = "id"; //Parameter defines the country to use for the Google search. It's a two-letter country code. (e.g., us for the United States, uk for United Kingdom, or fr for France) Head to the Google countries for a full list of supported Google countries.

  return got(`https://google-search5.p.rapidapi.com/google-serps/?q=${userQuestion}&gl=${gl}&hl=${hl}`, {
    headers: {
      "x-rapidapi-host" : process.env.rapidapi_hostS,
      "x-rapidapi-key"  : process.env.rapidapi_key,
      "useQueryString"  : true
    }
  }).then(res => {
    const result = JSON.parse(res.body);
    const searchResult = result.data.results.organic.map(({ title, snippet: description, url: link }) => ({ title, description, link }));

    if (searchResult.length === 0) {
      return 0;
    }

    return searchResult;

  }).catch(error => {
    return console.error(error);
  });
}

async function getGoogleMarcelinhov(userQuestion) {
  const hl = "en"; //Parameter defines the language to use for the Google search. It's a two-letter language code. (e.g., en for English, es for Spanish, or fr for French) Head to the Google languages for a full list of supported Google languages.
  const gl = "id"; //Parameter defines the country to use for the Google search. It's a two-letter country code. (e.g., us for the United States, uk for United Kingdom, or fr for France) Head to the Google countries for a full list of supported Google countries.

  return got(`https://google-search1.p.rapidapi.com/google-search?q=${userQuestion}&hl=${hl}&gl=${gl}`, {
    headers: {
      "x-rapidapi-host" : process.env.rapidapi_hostM,
      "x-rapidapi-key"  : process.env.rapidapi_key,
      "useQueryString"  : true
    }
  }).then(res => {
    const result = JSON.parse(res.body);
    const searchResult = result.organic.map(({ title, snippet: description, url: link }) => ({ title, description, link }));

    if (searchResult.length === 0) {
      return 0;
    }

    return searchResult;

  }).catch(error => {
    return console.error(error);
  });
}

async function getGoogleApigeek(userQuestion) {
  return got(`https://google-search3.p.rapidapi.com/api/v1/search/q=${userQuestion}&num=5&lr=lang_en`, {
    headers: {
      "x-rapidapi-host" : process.env.rapidapi_hostA,
      "x-rapidapi-key"  : process.env.rapidapi_key,
      "useQueryString"  : true
    }
  }).then(res => {
    const searchResult = JSON.parse(res.body);
    if (searchResult.results.length === 0) {
      return 0;
    }

    return searchResult.results;

  }).catch(error => {
    return console.error(error);
  });
}