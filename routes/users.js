const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

router.post('/register', (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    res.status(400).json({ error: true, message: "Request body incomplete - email and password needed" });
  } else {
    const queryUsers = req.db.from('users').select('*').where('email', '=', email);
    queryUsers.then((users) => {
      if (users.length > 0) {
        res.status(409).json({ error: true, message: "User already exists!" });
        return;
      } else {
        const saltRounds = 10;
        const hash = bcrypt.hashSync(password, saltRounds);
        return req.db.from('users').insert({ email, hash });
      }
    })
      .catch((e) => {
        res.status(400).json({ error: true, message: "Could not create user" })
      })
      .then(() => {
        res.status(201).json({ message: "User created" });
      })
      .catch((e) => {
        res.status(400).json({ error: true, message: "Could not create user" });
      });
  }
});

router.post('/login', (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  if (!email || !password) {
    res.status(400).json({ error: true, message: 'Request body invalid - email and password are required' })
    return;
  }

  const queryUsers = req.db.from("users").select('*').where("email", "=", email)
  queryUsers
    .then((users) => {
      if (users.length === 0) {
        res.status(401).json({ error: true, message: " Incorrect email or password" })
        return;
      }

      const user = users[0]
      return bcrypt.compare(password, user.hash)
    })
    .catch((e) => {
      res.status(401).json({ message: "Incorrect email or password" })
    })
    .then((match) => {
      if (!match) {
        res.status(401).json({ error: true, message: "Incorrect email or password" })
        return;
      }

      const secretKey = "secret key"
      const expires_in = 60 * 60 * 24 // 1 Day
      const exp = Date.now() + expires_in * 1000
      const token = jwt.sign({ email, exp }, secretKey)
      res.json({ token, token_type: "Bearer", expires_in })
    })
    .catch((e) => {
      res.status(401).json({ error: true, message: "Incorrect email or password" })
    })
})

module.exports = router;
