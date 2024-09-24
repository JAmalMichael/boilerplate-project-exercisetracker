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
  console.log("post exercises can be working");
  const userId = req.params._id;
  console.log("userparam id working");

  let { description, duration, date } = req.body;

  // if(!date){
  //   date = new Date()
  // } else {
  //   date = new Date(date)
  // }

  //changing returns to date =  and removing const dateChecker fixed:
  // The response returned from POST /api/users/:_id/exercises will be the user object with the exercise fields added.
  if (!date) {
    date = new Date(Date.now()).toDateString();
  } else {
    const parts = date.split("-");
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);

    const utcDate = new Date(Date.UTC(year, month, day));
    date = new Date(
      utcDate.getTime() + utcDate.getTimezoneOffset() * 60000
    ).toDateString();
  }

  let foundUser = await User.findById(userId);

  const newExercise = new Exercise({
    username: foundUser.username,
    description,
    duration: Number(duration),
    date,
    userId: userId,
  });

  await newExercise.save();

  res.json({
    _id: foundUser._id,
    username: foundUser.username,
    description: newExercise.description,
    duration: newExercise.duration,
    date: newExercise.date.toDateString(),
  });
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(req.params._id);

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    let query = { userId: user._id };

    if (from || to) {
      query.date = {};
      if (from)
        query.date.$gte = new Date(
          Date.UTC(
            from.split("-")[0],
            from.split("-")[1] - 1,
            from.split("-")[2]
          )
        );
      if (to)
        query.date.$lte = new Date(
          Date.UTC(to.split("-")[0], to.split("-")[1] - 1, to.split("-")[2])
        );
    }

    const checkDate = (date) => {
      if (!date) {
        return new Date(Date.now()).toDateString();
      } else {
        const parts = date.split("-");
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);

        const utcDate = new Date(Date.UTC(year, month, day));
        return new Date(
          utcDate.getTime() + utcDate.getTimezoneOffset() * 60000
        ).toDateString();
      }
    };
    const exerciseDate = checkDate(date);

    let exercises = await Exercise.find(query).limit(parseInt(limit) || 100);

    const log = exercises.map((ex) => ({
      description: ex.description,
      duration: ex.duration,
      //date: checkDate(ex.date.toISOString().split('T')[0]), // Use .toDateString() for correct format
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log,
      date: exerciseDate,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error, please try again" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
