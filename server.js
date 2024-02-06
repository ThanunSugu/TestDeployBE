import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import multer from "multer";
import { ObjectId } from "mongodb";
import databaseClient from "./services/database.mjs";
import { checkMissingField } from "./utils/requestUtils.js";

const HOSTNAME = process.env.SERVER_IP || "127.0.0.1";
const PORT = process.env.SERVER_PORT || 3000;

// setting initial configuration for upload file, web server (express), and cors
const upload = multer({ dest: "uploads/" });
dotenv.config();
const webServer = express();
webServer.use(cors());
webServer.use(express.json());

// HEALTH DATA
// const COMPANY_KEY = ["name", "taxId"];
const USERS_KEY = ["userId", "email", "password"];

// server routes

webServer.get("/", (req, res) => {
  res.send("Hello World");
});

/////// user-start
webServer.get("/users", async (req, res) => {
  const data = await databaseClient.db().collection("users").find({}).toArray();
  res.json(data);
});

//post users
webServer.post("/users", async (req, res) => {
  const body = req.body;

  // check missing fields here

  // create data

  const data = {
    ...body,
    // employees: [],
  };
  await databaseClient.db().collection("users").insertOne(data);
  res.send("Create User Successfully");
});

///////users-end

webServer.get("/company", async (req, res) => {
  const data = await databaseClient
    .db()
    .collection("company")
    .find({})
    .toArray();
  res.json(data);
});

webServer.post("/company", async (req, res) => {
  const body = req.body;

  // check missing fields here

  // create data
  const data = {
    ...body,
    employees: [],
  };

  await databaseClient.db().collection("company").insertOne(data);
  res.send("Create Company Successfully");
});

webServer.post("/company/employee", async (req, res) => {
  const body = req.body;

  // check missing fields here

  // create data
  const companyId = body.company_id;
  const userId = body.user_id;

  await databaseClient
    .db()
    .collection("company")
    .updateOne(
      { _id: new ObjectId(companyId) },
      { $push: { employees: new ObjectId(userId) } }
    );

  res.send("Add employee to company");
});

// initilize web server
// const currentServer = webServer.listen(PORT, HOSTNAME, () => {
const currentServer = webServer.listen(process.env.PORT || 3000, () => {
  console.log(
    `DATABASE IS CONNECTED: NAME => ${databaseClient.db().databaseName}`
  );
  console.log(`SERVER IS ONLINE => http://${HOSTNAME}:${PORT}`);
});

const cleanup = () => {
  currentServer.close(() => {
    console.log(
      `DISCONNECT DATABASE: NAME => ${databaseClient.db().databaseName}`
    );
    try {
      databaseClient.close();
    } catch (error) {
      console.error(error);
    }
  });
};

// cleanup connection such as database
process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);
