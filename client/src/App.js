import './App.css';
import React, {useState, useEffect} from 'react';
const TradingView = window.TradingView;

function App() {

  // BASE_URL stores the location of the express api, ticker is a value set by the user,
  // posNeg and longShort are string variables used to output messages on the screen
  // about the particlular stock the user entered, and payload is going to store all the
  // data received from the api, if the response has a status 400, error is set to true
  // which is used to conditionally render an error message on the screen.

  const [ticker, setTicker] = useState('GME');
  const [posNeg, setPosNeg] = useState(' ');
  const [longShort, setLongShort] = useState(' ');
  const [payload, setPayload] = useState({
    companyName: ' ',
    articles: [],
    sentiment: 0
  });

  const [error, setError] = useState(false);

  // This code creates a TradingViews object which is a class imported with a script tag
  // from the internet. The script tag is in the root index.html file and is imported into
  // this react component at the top.

  const tradingViewSetup = () => {
    new TradingView.widget(
      {
      "width": 1000,
      "height": 600,
      "symbol": `${ticker}`,
      "interval": "D",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "toolbar_bg": "#f1f3f6",
      "enable_publishing": false,
      "allow_symbol_change": true,
      "container_id": "tradingview_ae533"
      }
    )
  }
  useEffect(() => {
    tradingViewSetup();
  },[]);

  // when a user types letteres into the input, they are automatically converted
  // to uppercase b/c all tickers are always uppercase.

  const onChange = (e) => {
    setTicker(e.target.value.toUpperCase());
  }

  // When the user submits a new ticker, the payload object is initially reset.
  // The tradingViewSetup function is called again to get a new chart for the new
  // ticker, error is set to false in case it was previously set to true, a fetch
  // request is made to the api and it will wait for the payload response. If theres
  // no error, payload is set to the response object, and posNeg and longShort are
  // set to the appropriate strings based on the value for sentiment.

  const onSubmit = async (e) => {
    e.preventDefault()

    setPosNeg(' ');
    setLongShort(' ');
    setPayload({companyName: ' ',
                articles: [],
                sentiment: 0.0
              })
    
    tradingViewSetup()

    try {
      setError(false);

      const response = await fetch(`/news/${ticker}`)

      if (response.status === 400) {
        setError(true);

      } else {
        const parseRes = await response.json()
        setPayload(parseRes);

        if (parseFloat(parseRes.sentiment) > 0) {
          setPosNeg('Positive');
          setLongShort('Long');
        } else {
          setPosNeg('Negative');
          setLongShort('Short');
        }
      }
    } catch (err) {
      console.log(err.message);
      setError(true);
    }
  }

  // All the articles received for the ticker the user entered will be stored in an array.
  // This function is mapped over that array and creates a display on the screen for each
  // article displaying title, description, content, and the url link to that article.

  const makeArticle = (article) => {
    return <>
      <h2>{article.title}</h2>
      <h3>{article.description}</h3>
      <p>{article.content}</p>
      <a href={article.url} target='_blank'>continue reading</a>
      <hr />
    </>
  }

  return <>
    <h1>MILLION DOLLAR STOCK PREDICTOR</h1>
    <h2>Enter the ticker symbol of your favorite stock and see whether it will go up or down</h2>

    {/* form for the user to enter a ticker */}

    <form onSubmit={onSubmit}>
    <input value={ticker} onChange={onChange} ></input>
      <button type='submit'>Submit</button>
    </form>

    {/* if error is true an error message will display on the screen. */}

    {error && <p class='error'>There was a problem retrieving sentiment data for this ticker</p>}

    {/* divs for the trading view widget */}

    <div class="tradingview-widget-container">
      <div id="tradingview_ae533"></div>
    </div>

    <div id='news-sentiment'>

    {/* div for displaying the news. all articles in articles array are mapped to the makeArticle function. */}

      <div id='news'>
        <h1>News</h1>
        {payload.articles && payload.articles.map(makeArticle)}
      </div>

      {/* displays sentiment score received, whether its positive or negative and a long/short recommendation. */}

      <div id='sentiment'>
        <h1>Sentiment</h1>
        <h1>{payload.sentiment}</h1>
        <h2>{payload.companyName} has a {posNeg} sentiment score.</h2>
        <h2>You should take a {longShort} position.</h2> 
      </div>
    </div>
  </>
}

export default App;