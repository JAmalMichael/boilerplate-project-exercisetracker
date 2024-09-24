const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//database for user
const UserSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
});

const User = mongoose.model("User", UserSchema);

//database for exercise
const ExerciseSchema = new mongoose.Schema({
  userId: {
    type: String,
  },
  count: {
    type: Number,
  },
  description: {
    type: String,
  },
  duration: {
    type: Number,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

let Exercise = mongoose.model("Exercise", ExerciseSchema);

//connecting to mongodb
mongoose.connect(process.env.MONGO_DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//
app.use(cors());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//endpoint for creating and getting user
// Create new user
app.post("/api/users", async (req, res) => {
  const { username } = req.body;

  try {
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      res.json({
        username: existingUser.username,
        _id: existingUser._id,
      });
    } else {
      const newUser = new User({ username });
      await newUser.save();
      res.json({ username: newUser.username, _id: newUser._id });
    }
  } catch (error) {
    res.status(500).json({ error: "Server error, please try again" });
  }
});

// Get list of all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users.map((user) => ({ username: user.username, _id: user._id })));
  } catch (error) {
    res.status(500).json({ error: "Server error, please try again" });
  }
});

// Add exercise to user
app.post("/api/users/:_id/exercises", async (req, res) => {
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(req.params._id);

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const exercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(),
    });

    await exercise.save();

    const exerciseCount = await Exercise.countDocuments({ userId: user._id });

    res.json({
      username: user.username,
      count: exerciseCount,
      _id: user._id,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    });
  } catch (error) {
    res.status(500).json({ error: "Server error, please try again" });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;

  try {
    // Find the user by ID
    const user = await User.findById(req.params._id);

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Construct query for exercises
    let query = { userId: user._id };

    if (from) query.date = { ...query.date, $gte: new Date(from) };
    if (to) query.date = { ...query.date, $lte: new Date(to) };

    // Find exercises based on query and limit the results
    const exercises = await Exercise.find(query).limit(parseInt(limit) || 100);

    // Format the exercises into the log array
    const log = exercises.map((ex) => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString(),
    }));

    // Respond with the user's data and their exercise log
    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error, please try again" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
