const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dbPath = path.join(__dirname, "usersdata.db");

const app = express();
app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
  } catch (e) {
    console.log(`DB ERROR : ${e.message}`);
    process.exit(1);
  }
  app.listen(3000, () => {
    console.log("Server started successfully at http://localhost:3000");
  });
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
    response.send("Invalid Access Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_KEY", async (error, payload) => {
      if (error) {
        response.send("Invalid Access Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

app.post("/registration/", async (request, response) => {
  const { username, email, password } = request.body;
  const userChecking = `
        SELECT * FROM users WHERE username = '${username}';`;
  const user = await db.get(userChecking);

  if (user === undefined) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const registerUserQuery = `
        INSERT INTO users (username,email,password)
        VALUES ('${username}',
                '${email}',
                '${hashedPassword}'
                );`;
    await db.run(registerUserQuery);
    response.send("user registered successfully");
  } else {
    response.status(400);
    response.send("user already existed");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkingUser = `
        SELECT * FROM users WHERE username = '${username}';`;
  const existedUser = await db.get(checkingUser);

  if (existedUser === undefined) {
    response.status(400);
    response.send("No such user found");
  } else {
    const is_password_match = await bcrypt.compare(
      password,
      existedUser.password
    );
    if (is_password_match === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "MY_SECRET_KEY");
      response.send(jwtToken);
    } else {
      response.status(201);
      response.send("Invalid username or password");
    }
  }
});

app.get("/users/", authenticateToken, async (request, response) => {
  const { username } = request;
  const selectQuery = `SELECT * FROM users;`;
  const users = await db.all(selectQuery);
  response.send(users);
});
