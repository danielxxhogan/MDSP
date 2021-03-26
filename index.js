const express = require('express');
const cors = require('cors');
const NewsAPI = require('newsapi');
const fetch = require('node-fetch');
const language = require('@google-cloud/language');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.static('client/build'));


const newsapi = new NewsAPI(process.env.NEWS_API_KEY);
const nlpapi = new language.LanguageServiceClient();

const PORT = process.env.PORT || 3002;

app.get('/news/:ticker', async (req, res) => {

  const ticker = req.params.ticker.toUpperCase();
  const payload = {};

  // The application has the user enter a ticker symbol but the news api
  // gets much better results when you enter in the company name. Here I am making
  // a request to the alphavantage api which will return information about the
  // ticker symbol the user entered including the name of the company which I will
  // use to query the news api

  try {
    const response = await fetch('https://www.alphavantage.co/query?' +
                                 `function=OVERVIEW&symbol=${ticker}&` +
                                 `apikey=${process.env.ALPHA_VANTAGE_API_KEY}`)

    const parseCompany = await response.json();
    const company = parseCompany.Name;
    payload['companyName'] = company;

  // in order to send a dynamic request to the news api, I need to calculate
  // the current day, and the day 14-16 days previous to the current day
  // then I need to format them into strings that the api will accept

  const today = new Date();
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()   // gets month index value
  const currentDay = today.getDate()

  if (currentDay < 14) {
    startDay = 15 + currentDay;
    if (currentMonth == 0) {
      startYear = currentYear - 1;
      startMonth = 11;
    } else {
      startYear = currentYear;
      startMonth = currentMonth - 1;
    }
  } else {
    startDay = currentDay - 13;
    startMonth = currentMonth;
    startYear = currentYear;
  }

  const fromString = `${startYear}-${startMonth + 1}-${startDay}`;
  const toString = `${currentYear}-${currentMonth + 1}-${currentDay}`;

  // once I have the company name and the strings for start and end date, I can make the request
  // to the news api. The content I'm looking for in the response is an array called articles. Each
  // element in the array is an object and the information I want is stored in title, description, and content

  const newsResponse = await newsapi.v2.everything({
    q: company,
    from: fromString,
    to: toString,
    language: 'en',
    sortBy: 'relevancy',
    page: 2
    })

  const articles = newsResponse.articles;

  // after I get the data from the news api, I want to collect all titles, descriptions, and content
  // into one array that I can loop over to get the sentiment score for each. I also want to keep the
  // articles grouped together when I send them to the client so they can be formatted properly on
  // the screen. For each article I push the entire article to payload.articles and push the individual
  // pieces to the allContent array.

  const allContent = [];
  payload['articles'] = [];

  for (let i=0; i<articles.length; i++) {
    payload['articles'].push(articles[i]);
    allContent.push(articles[i].title)
    allContent.push(articles[i].description)
    allContent.push(articles[i].content)
  }

  // The google language api complains when I feed it null values. Here I am filtering out null values
  // from the news articles content

  const filteredContent = allContent.filter(element => element !== null);

  // as I loop over each piece of content, I will be adding each value for the sentiment and magnitude to
  // individual arrays. I will also be keeping a running total of the magnitude which will be used to
  // calculate the aggregate sentiment

  let totalMagnitude = 0.0;
  let totalSentiment = 0.0;
  const magnitudeScores = [];
  const sentimentScores = [];

  for (let i=0; i<filteredContent.length; i++) {

    const document = {content: filteredContent[i],
                      type: 'PLAIN_TEXT'
    }

    const [nlpresponse] = await nlpapi.analyzeSentiment({document: document});
    const results = nlpresponse.documentSentiment;
    totalMagnitude += results.magnitude;
    magnitudeScores.push(results.magnitude);
    sentimentScores.push(results.score);
  }

  // Once I have the total magnitude, I can divide each piece of content's magnitude by the total
  // to get that pieces weight. Then I multiply the sentiment score it received by it's weight
  // to get it's sentiment score in relation to all other sentiment scores and add it to the total.

  for (let i=0; i<sentimentScores.length; i++) {
    const magnitude = magnitudeScores[i] / totalMagnitude;
    const sentiment = sentimentScores[i] * magnitude;
    totalSentiment += sentiment;
  }

  payload['sentiment'] = totalSentiment;

  // now that I have the company Name, all the articles for that company in the last two weeks and
  // that company's aggregate sentiment score for the last two weeks, I can send a response to the client.

  res.json(payload);

  } catch (err) {
    console.log(err.message);
    res.status(400).json('failed');
  }
})


app.listen(PORT, () => {
  console.log('Server started on port', PORT);
});