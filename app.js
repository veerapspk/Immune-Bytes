const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
var jwt = require("jsonwebtoken");
const cors= require('cors')

const dbPath = path.join(__dirname, "todoApplication.db");

const app = express();
app.use(cors())
app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("server has started at localhost");
    });
  } catch (e) {
    console.log(`DB ERROR :${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.email = payload.email;
        next();
      }
    });
  }
};

app.post("/user/create/", async (request, response) => {
  const {
    email,
    password,
    date_of_birth,
    company_name,
    age,
    name,
  } = request.body;
  const checkUserQuery = `SELECT * FROM users WHERE email="${email}"`;
  const dbResponse = await db.get(checkUserQuery);
  if (dbResponse === undefined) {
    const payload = {
      email: email,
    };
    const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
    const newUserQuery = `INSERT INTO users (name,email,password,date_of_birth,age,company_name)
      VALUES ("${name}","${email}","${password}","${date_of_birth}",${age},"${company_name}");`;
    const dbResponse = await db.run(newUserQuery);
    response.send({ jwtToken });
  } else {
    response.status(400);
    response.send("User Already Exist");
  }
});

app.delete("/user/", authenticateToken, async (request, response) => {
  const { email } = request;
  const deleteQuery = `
    DELETE FROM
        users
    WHERE
        email = "${email}";`;
  const dbResponse = await db.run(deleteQuery);
  response.send("Account Deleted");
});

app.post("/users/login/", async (request, response) => {
  const { email, password } = request.body;
  console.log(email);
  const query = `SELECT * FROM users WHERE email LIKE "${email}";`;
  const dbResponse = await db.get(query);

  if (dbResponse === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const checkPassword = password === dbResponse.password;
    if (checkPassword === true) {
      const payload = {
        email: email,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      console.log(jwtToken);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Email and Password Didn't Matched");
    }
  }
});

app.get("/user/data/", authenticateToken, async (request, response) => {
  const { email } = request;
  const dataQuery = `SELECT * FROM users WHERE email="${email}"`;
  const dbResponse = await db.get(dataQuery);
  response.send(dbResponse);
});

module.exports = app;
