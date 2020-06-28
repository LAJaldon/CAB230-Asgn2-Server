const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.get('/', function (req, res, next) {
  res.status(400).json({ error: true, message: "Request on /stocks must include symbol as path parameter, or alternatively you can hit /stocks/symbols to get all symbols" })
});

/* GET - unfiltered stocks list with industry filtering */
router.get("/symbols", function (req, res, next) {
  const { industry } = req.query;

  if (Object.keys(req.query).length === 0) {
    req.db.from('stocks')
      .select("name", "symbol", "industry")
      .distinct('name')
      .then((rows) => {
        res.json(rows)
      })
      .catch((e) => {
        res.status(404).json({ error: true, message: "Not found" })
      })
  } else if (typeof industry === 'undefined') {
    res.status(400).json({ message: "Invalid query parameter: only 'industry' is permitted" })
  } else {
    req.db.from('stocks')
      .select("name", "symbol", "industry")
      .where("industry", "LIKE", "%" + industry + "%")
      .distinct('name')
      .then((rows) => {
        if (rows.length === 0) {
          res.status(404).json({ error: true, message: "Industry sector not found" })
        } else {
          res.status(200).json(rows)
        }
      })
      .catch((e) => {
        res.status(404).json({ error: true, message: "Not found" })
      })
  }
});

/* GET - filter stocks by symbols */
router.get('/:symbol', function (req, res, next) {
  const { stockQuery } = req.query;
  if (Object.keys(req.params.symbol).length > 5) {
    res.status(400).json({ error: true, message: "Stock symbol incorrect format - must be 1-5 capital letters" })
  } else if (req.query.from) {
    res.status(400).json({ error: true, message: "Date parameters only available on authenticated route /stocks/authed" })
  } else {
    req.db.from('stocks')
      .select('*')
      .limit(1)
      .where('symbol', '=', req.params.symbol)
      .then(rows => {
        if (rows.length === 0) {
          res.status(404).json({ error: true, message: "No entry for symbol in stocks database" })
        }
        res.status(200).json(rows[0])
      })
      .catch((e) => {
        res.status(404).json({ error: true, message: "Not found" })
      })
  }
});

const authorize = (req, res, next) => {
  const authorization = req.headers.authorization
  let token = null

  if (authorization && authorization.split(" ").length === 2) {
    token = authorization.split(" ")[1]
  } else {
    res.status(403).json({ error: true, message: "Authorization header not found" })
    return;
  }

  try {
    const secretKey = "secret key"
    const decoded = jwt.verify(token, secretKey)

    if (decoded.exp < Date.now()) {
      res.status(403).json({ error: true, message: "Token has expired" })
      return;
    }
    next()

  } catch (e) {
    res.status(403).json({ error: true, message: "Token is not valid", "Error catched": e })
  }
}

/* GET - filter stocks of a symbol between two specified dates */
router.get("/authed/:symbol", authorize, function (req, res, next) {
  const fromDate = req.query.from;
  const toDate = req.query.to;

  if (typeof fromDate === 'undefined' || typeof toDate === 'undefined') {
    res.status(400).json({ error: true, message: "Parameters allowed are 'from' and 'to', example: /stocks/authed/AAL?from=2020-03-15" })
  } else {
    req.db.from('stocks')
      .select("*")
      .where("symbol", req.params.symbol)
      .whereBetween("timestamp", [fromDate, toDate])
      .then((rows) => {
        if (rows.length === 0) {
          res.status(404).json({ error: true, message: "No entries available for query symbol for supplied date range" })
        } else {
          res.status(200).json(rows)
        }
      })
      .catch((e) => {
        res.status(404).json({ error: true, message: "Not found" })
      })
  }
});

module.exports = router;
