import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import multer from "multer";
import { ObjectId } from "mongodb";
import databaseClient from "./services/database.mjs";
import bcrypt from "bcrypt";
import { checkMissingField } from "./utils/requestUtils.js";
import { createJwt } from "./middlewares/createJwt.js";
import "dotenv/config";
import { auth } from "./middlewares/auth.js";

const HOSTNAME = process.env.SERVER_IP || "127.0.0.1";
const PORT = process.env.SERVER_PORT || 3000;

const SALT = 10;
const SIGNUP_DATA_KEYS = ["email", "password"];
const LOGIN_DATA_KEYS = ["email", "password"];

// setting initial configuration for upload file, web server (express), and cors
const upload = multer({ dest: "uploads/" });
dotenv.config();
const webServer = express();
webServer.use(cors());
webServer.use(express.json());

// HEALTH DATA
// const COMPANY_KEY = ["name", "taxId"];
const USERS_KEY = ["_id", "email", "password"];

// server routes

webServer.get("/", (req, res) => {
  res.send("Hello World Admin BE");
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

//3 patch good to fix MAny attributes ******

webServer.patch("/users/:userId", async (req, res) => {
  try {
    // Extract userId from the request parameters
    const { userId } = req.params;

    // Extract attributes to update from the request body
    // Destructuring with the rest operator to exclude _id from being updated
    const { _id, ...attributesToUpdate } = req.body;

    // Check if there are attributes to update
    if (Object.keys(attributesToUpdate).length === 0) {
      return res.status(400).send("No fields to update");
    }

    // Convert string ID to ObjectId
    const objectId = new ObjectId(userId);

    // Perform the update operation
    const updateResult = await databaseClient
      .db()
      .collection("users")
      .updateOne({ _id: objectId }, { $set: attributesToUpdate });

    // Check if the user was found and updated
    if (updateResult.matchedCount === 0) {
      return res.status(404).send("User not found");
    }

    // Respond with a success message
    res.status(200).send("User updated successfully");
  } catch (error) {
    // If an error occurs, log it and return an error message
    console.error(error);
    res.status(500).send("An error occurred while updating the user");
  }
});

//del
webServer.delete("/users/:userId", async (req, res) => {
  try {
    // Extract userId from the request parameters
    const { userId } = req.params;

    // Convert string ID to ObjectId for MongoDB
    const objectId = new ObjectId(userId);

    // Perform the deletion operation
    const deleteResult = await databaseClient
      .db()
      .collection("users")
      .deleteOne({ _id: objectId });

    // Check if the user was found and deleted
    if (deleteResult.deletedCount === 0) {
      return res.status(404).send("User not found");
    }

    // Respond with a success message
    res.status(200).send("User deleted successfully");
  } catch (error) {
    // If an error occurs, log it and return an error message
    console.error(error);
    res.status(500).send("An error occurred while deleting the user");
  }
});

/////users-end/////////////////////////////////////////////////////////////

///////userAdmin//////////////////////////////////////////////////////////
/////signup
webServer.post("/adminuser", async (req, res) => {
  let body = req.body;
  const [isBodyChecked, missingFields] = checkMissingField(
    SIGNUP_DATA_KEYS,
    body
  );
  const existingAdminUser = await databaseClient
    .db()
    .collection("adminUser")
    .findOne({ email: body.email });
  if (existingAdminUser) {
    res.status(400).send("already exists");
    return;
  }
  if (!isBodyChecked) {
    res.status(400).send(`Missing Fields: ${"".concat(missingFields)}`);
    return;
  }

  const saltRound = await bcrypt.genSalt(SALT);
  body["password"] = await bcrypt.hash(body["password"], saltRound);

  const result = await databaseClient
    .db()
    .collection("adminUser")
    .insertOne(body);
  const token = createJwt(body.email);
  res.status(201).json({ token, email: body.email, userId: result.insertedId });
});

//////login
webServer.post("/adminlogin", async (req, res) => {
  let body = req.body;
  const [isBodyChecked, missingFields] = checkMissingField(
    LOGIN_DATA_KEYS,
    body
  );
  if (!isBodyChecked) {
    res.status(400).send(`Missing Fields: ${"".concat(missingFields)}`);
    return;
  }
  const user = await databaseClient
    .db()
    .collection("adminUser")
    .findOne({ email: body.email });
  if (user === null) {
    res.status(400).send(`User or Password not found`);
    return;
  }
  if (!bcrypt.compareSync(body.password, user.password)) {
    res.status(400).send("User or Password not found");
    return;
  }

  const token = createJwt(user.email);
  res.status(200).json({ token, message: `Your Login ${user.email}` });
});

///////////////////////////////////////////////////////////////////////////////

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
