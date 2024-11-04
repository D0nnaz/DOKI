require("dotenv").config();
const express = require("express");
const { engine } = require("express-handlebars");
const http = require("http");
const socketIo = require("socket.io");
const { MongoClient, ObjectId } = require("mongodb");
const bodyParser = require("body-parser");
const { MONGO_URI } = process.env;
const client = new MongoClient(MONGO_URI);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.engine(
  "handlebars",
  engine({
    extname: "handlebars",
    defaultLayout: "main",
    layoutsDir: __dirname + "/views/layouts/",
    partialsDir: __dirname + "/views/partials/",
  })
);
app.set("view engine", "handlebars");
app.set("views", "./views");

async function run() {
  try {
    await client.connect();
    const db = client.db("bucketlistDB");
    const collection = db.collection("items");

    console.log("MONGODB VERBONDEN");

    app.get("/", async (req, res) => {
      const items = await collection.find().toArray();
      res.render("start", { title: "Bucketlist", items });
    });

    app.post("/add", async (req, res) => {
      const newItem = { text: req.body.text, done: false };
      const result = await collection.insertOne(newItem);
      res.json({ _id: result.insertedId, text: newItem.text });
      io.emit("itemAdded", { _id: result.insertedId, text: newItem.text });
    });

    app.post("/delete", async (req, res) => {
      const itemId = req.body.itemId;
      await collection.deleteOne({ _id: new ObjectId(itemId) });
      io.emit("itemDeleted", itemId);
      res.redirect("/");
    });

    app.post("/revert", async (req, res) => {
      const itemId = req.body.itemId;
      await collection.updateOne(
        { _id: new ObjectId(itemId) },
        { $set: { done: false } }
      );
      io.emit("itemReverted", itemId);
      res.redirect("/");
    });

    io.on("connection", (socket) => {
      console.log("A user connected");

      socket.on("markItemAsDone", async (itemId) => {
        await collection.updateOne(
          { _id: new ObjectId(itemId) },
          { $set: { done: true } }
        );
        io.emit("itemMarkedAsDone", itemId);
      });

      socket.on("markItemAsNotDone", async (itemId) => {
        await collection.updateOne(
          { _id: new ObjectId(itemId) },
          { $set: { done: false } }
        );
        io.emit("itemReverted", itemId);
      });

      socket.on("disconnect", () => {
        console.log("User disconnected");
      });
    });

    server.listen(PORT, () => {
      console.log(`Server started on -> ${PORT}`);
    });
  } catch (err) {
    console.error(err);
  }
}

run();