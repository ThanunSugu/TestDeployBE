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
const USERS_KEY = ["_id", "email", "password"];

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

// //patch users
// webServer.patch("/users/:userId", (req, res) => {
//   // const id = parseInt(req.params.userId, 10);

//   // Read request body and store it in `attributes` variable
//   const attributes = req.body;

//   // Update todo with `updateTodo`
//   const updatedUser = updateUser(id, attributes);

//   const updateUser = (id, attributes) => {
//     const user = findUser(id);
//     if (!todo) {
//       return null;
//     }

//     /**
//      * Bonus
//      *
//      * This code has a bug where caller can update the `id` of the todo.
//      * In real world, we don't want to allow the caller to update the `id`.
//      *
//      * Fix the code so that the caller can't update todo's id. Or, even if they
//      * try to update the id, it will be ignored.
//      */
//     const updatedUser = (userDatabase[id] = { ...todo, ...attributes });

//     return updatedUser;
//   };

//   // Return the updated todo
//   res.status(200).json({ data: updatedUser });

//   throw new Error("Not implemented");
// });

//2 patch good to fix 1 attribute ******
// webServer.patch("/users/:userId", async (req, res) => {
//   try {
//     // Extract userId from the request parameters
//     const { userId } = req.params;

//     // Extract email from the request body
//     const { email } = req.body;

//     // Check if the email was provided
//     if (!email) {
//       return res.status(400).send("Email is required");
//     }

//     // Convert string ID to ObjectId
//     const objectId = new ObjectId(userId);

//     // Perform the update operation
//     const updateResult = await databaseClient
//       .db()
//       .collection("users")
//       .updateOne({ _id: objectId }, { $set: { email: email } });

//     // Check if the user was found and updated
//     if (updateResult.matchedCount === 0) {
//       return res.status(404).send("User not found");
//     }

//     // Respond with a success message
//     res.status(200).send("User email updated successfully");
//   } catch (error) {
//     // If an error occurs, log it and return an error message
//     console.error(error);
//     res.status(500).send("An error occurred while updating the user's email");
//   }
// });

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

/////users-end/////////////////////////////////////////////////////////////

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
