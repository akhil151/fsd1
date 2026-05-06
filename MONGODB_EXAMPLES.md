# MongoDB/Mongoose Examples for Quiz-Arena

## 6.1 Schema Definitions

### User Schema
```javascript
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["teacher", "student"] },
  createdAt: { type: Date, default: Date.now }
});
```

### Quiz Schema
```javascript
const quizSchema = new mongoose.Schema({
  title: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  questions: [{
    text: String,
    options: [String],
    correctAnswer: Number,
    difficulty: String
  }],
  playCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
```

### MatchResult Schema
```javascript
const matchResultSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
  roomCode: String,
  players: [{
    id: String,
    name: String,
    score: Number
  }],
  winner: Object,
  createdAt: { type: Date, default: Date.now }
});
```

## 6.2 Data Insertion (Create Operations)

### Insert User
```javascript
app.post("/api/users", async (req, res) => {
  const user = await User.create(req.body);
  res.json(user);
});
```

### Insert Quiz
```javascript
app.post("/api/quizzes", async (req, res) => {
  const quiz = await Quiz.create({
    ...req.body,
    creator: req.user._id
  });
  res.json(quiz);
});
```

### Insert Match Result
```javascript
app.post("/api/match-results", async (req, res) => {
  const result = await MatchResult.create(req.body);
  res.json(result);
});
```

## 6.3 Data Retrieval & Relationships (Populate)

### Fetch Quiz with Creator Details
```javascript
Quiz.findById(quizId).populate("creator");
```

### Fetch Match Results with Quiz Info
```javascript
MatchResult.find()
  .populate("quizId")
  .populate({
    path: "quizId",
    populate: { path: "creator" }
  });
```

### Fetch All Quizzes by Teacher
```javascript
Quiz.find({ creator: teacherId }).populate("creator");
```

## 6.4 Aggregation Queries

### Quiz Play Count by Teacher
```javascript
Quiz.aggregate([
  { $group: { _id: "$creator", totalPlays: { $sum: "$playCount" } } },
  { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "creator" } }
]);
```

### Average Score per Quiz
```javascript
MatchResult.aggregate([
  { $unwind: "$players" },
  { $group: { _id: "$quizId", avgScore: { $avg: "$players.score" } } }
]);
```

### Match Results Count by Date
```javascript
MatchResult.aggregate([
  { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }
]);
```

## 6.5 Advanced Queries

### Find Teachers with Most Quizzes
```javascript
User.find({
  _id: { $in: await Quiz.distinct("creator") },
  role: "teacher"
}).sort({ createdAt: -1 }).limit(10);
```

### Find Quizzes Played More Than 5 Times
```javascript
Quiz.find({ playCount: { $gt: 5 } }).populate("creator");
```

### Find Winners Across All Matches
```javascript
MatchResult.find({ "winner.id": { $exists: true } }).select("winner roomCode");
```

## 6.6 Aggregation & Analytics

### Leaderboard (Top Scoring Players)
```javascript
MatchResult.aggregate([
  { $unwind: "$players" },
  { $group: { _id: "$players.id", topScore: { $max: "$players.score" }, avgScore: { $avg: "$players.score" } } },
  { $sort: { topScore: -1 } },
  { $limit: 10 }
]);
```

### Total Quiz Statistics
```javascript
Quiz.aggregate([
  { $facet: {
    totalQuizzes: [{ $count: "count" }],
    totalQuestions: [{ $group: { _id: null, count: { $sum: { $size: "$questions" } } } }],
    totalPlays: [{ $group: { _id: null, total: { $sum: "$playCount" } } }]
  }}
]);
```

### Teacher Performance Report
```javascript
Quiz.aggregate([
  { $match: { creator: mongoose.Types.ObjectId(teacherId) } },
  { $lookup: { from: "matchresults", localField: "_id", foreignField: "quizId", as: "matches" } },
  { $addFields: { matchCount: { $size: "$matches" } } },
  { $project: { title: 1, playCount: 1, matchCount: 1 } }
]);
```

## 7. Performance Optimization

### 7.1 Efficient Query Design (Projection & Lean)

#### Fetch Only Required Fields
```javascript
// Only get name and email without password
User.find({}, "name email role").lean();
```

#### Quiz List with Specific Fields
```javascript
Quiz.find()
  .select("title creator playCount -_id")
  .populate("creator", "name email")
  .lean();
```

#### Match Results - Lightweight Query
```javascript
MatchResult.find({ roomCode: roomCode })
  .select("players winner createdAt")
  .lean();
```

### 7.2 Pagination

#### Paginate User Quizzes
```javascript
const page = 1;
const limit = 10;
const skip = (page - 1) * limit;

Quiz.find({ creator: teacherId })
  .skip(skip)
  .limit(limit)
  .sort({ createdAt: -1 });
```

#### Paginate Match Results
```javascript
MatchResult.find()
  .skip(0)
  .limit(20)
  .sort({ createdAt: -1 });
```

#### With Total Count
```javascript
const page = 1, limit = 10;
const total = await Quiz.countDocuments({ creator: teacherId });
const quizzes = await Quiz.find({ creator: teacherId })
  .skip((page - 1) * limit)
  .limit(limit);
```

### 7.3 Aggregation Optimization

#### Optimized Leaderboard (Match Early)
```javascript
MatchResult.aggregate([
  { $match: { createdAt: { $gte: new Date("2026-01-01") } } },  // Filter first
  { $unwind: "$players" },
  { $group: { _id: "$players.id", topScore: { $max: "$players.score" } } },
  { $sort: { topScore: -1 } },
  { $limit: 10 }
]);
```

#### Teacher Stats with $match
```javascript
Quiz.aggregate([
  { $match: { creator: mongoose.Types.ObjectId(teacherId) } },  // Filter early
  { $group: { _id: null, total: { $sum: "$playCount" }, count: { $sum: 1 } } }
]);
```

#### Optimized Quiz Analytics
```javascript
MatchResult.aggregate([
  { $match: { quizId: mongoose.Types.ObjectId(quizId) } },
  { $group: { 
    _id: "$quizId", 
    avgScore: { $avg: { $avg: "$players.score" } },
    totalMatches: { $sum: 1 }
  }}
]);
```

### 7.4 Caching Strategies

#### Cache Dashboard Metrics (Using Redis/Memory)
```javascript
// Example: Cache teacher dashboard data for 5 minutes
const cacheKey = `teacher:${teacherId}:dashboard`;
let dashboardData = cache.get(cacheKey);

if (!dashboardData) {
  dashboardData = await Quiz.aggregate([
    { $match: { creator: mongoose.Types.ObjectId(teacherId) } },
    { $lookup: { from: "matchresults", localField: "_id", foreignField: "quizId", as: "matches" } },
    { $project: { title: 1, playCount: 1, matchCount: { $size: "$matches" } } }
  ]);
  cache.set(cacheKey, dashboardData, 300); // 5 min cache
}
```

#### Cache Leaderboard
```javascript
const leaderboardKey = "global:leaderboard";
let leaderboard = cache.get(leaderboardKey);

if (!leaderboard) {
  leaderboard = await MatchResult.aggregate([
    { $unwind: "$players" },
    { $group: { _id: "$players.id", score: { $max: "$players.score" } } },
    { $sort: { score: -1 } },
    { $limit: 50 }
  ]);
  cache.set(leaderboardKey, leaderboard, 600); // 10 min cache
}
```

### 7.5 Efficient Data Modeling

#### Use References (Not Embedding Large Data)
```javascript
// GOOD: Reference to Quiz instead of embedding entire quiz
const matchResultSchema = new Schema({
  quizId: { type: ObjectId, ref: "Quiz" },  // Reference
  players: [{ id: String, name: String, score: Number }]
});

// BAD: Embedding entire quiz (wastes space)
// const matchResultSchema = new Schema({
//   quiz: { ... entire quiz object ... }
// });
```

#### Keep Documents Lightweight
```javascript
// Store only necessary player info
players: [{
  id: String,
  name: String,
  score: Number
  // Don't store full user object
}]
```

### 7.6 Backend Optimization

#### Async/Await Best Practices
```javascript
app.get("/api/teacher-dashboard/:teacherId", async (req, res) => {
  try {
    // Fetch in parallel, not sequentially
    const [quizzes, matchResults] = await Promise.all([
      Quiz.find({ creator: req.params.teacherId }).lean(),
      MatchResult.find({ quizId: { $in: quizIds } }).lean()
    ]);
    
    res.json({ quizzes, matchResults });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### Minimize API Response Size
```javascript
// Good: Return only needed fields
app.get("/api/quizzes", async (req, res) => {
  const quizzes = await Quiz.find()
    .select("title playCount createdAt")
    .lean();
  res.json(quizzes);
});
```

#### Reusable Middleware
```javascript
const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ 
    message: err.message 
  });
};

const validateQuizId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.quizId)) {
    return res.status(400).json({ error: "Invalid quiz ID" });
  }
  next();
};
```

### 7.7 Frontend Optimization

#### Lazy Load Match Results
```javascript
// Load results incrementally as user scrolls
const [page, setPage] = useState(1);

useEffect(() => {
  fetch(`/api/match-results?page=${page}&limit=10`)
    .then(res => res.json())
    .then(data => setResults([...results, ...data]));
}, [page]);
```

#### API Call Optimization
```javascript
// Debounce search queries
const [searchTerm, setSearchTerm] = useState("");
const debouncedSearch = useCallback(
  debounce((term) => {
    fetch(`/api/quizzes/search?q=${term}`)
      .then(res => res.json())
      .then(data => setQuizzes(data));
  }, 500),
  []
);
```

#### Efficient State Management
```javascript
// Cache quiz data in context to avoid refetches
const [quizzes, setQuizzes] = useState([]);
const [cached, setCached] = useState(false);

useEffect(() => {
  if (!cached) {
    fetch("/api/quizzes")
      .then(res => res.json())
      .then(data => {
        setQuizzes(data);
        setCached(true);
      });
  }
}, [cached]);
```

### 7.8 EXPLAIN ANALYZE Usage

#### Analyze Query Execution
```javascript
// Check if query uses indexes efficiently
User.find({ email: "test@example.com" }).explain("executionStats");
```

#### Analyze Quiz Query
```javascript
Quiz.find({ creator: teacherId, playCount: { $gt: 5 } })
  .explain("executionStats");
```

#### Analyze Aggregation Pipeline
```javascript
MatchResult.aggregate([
  { $match: { createdAt: { $gte: new Date("2026-01-01") } } },
  { $unwind: "$players" },
  { $group: { _id: "$players.id", score: { $max: "$players.score" } } }
]).explain("executionStats");
```

#### Performance Metrics
```javascript
// Returns: executionStats with executedStages, executionTimeMillis, etc.
const stats = await Quiz.find({ creator: teacherId }).explain("executionStats");
console.log(`Execution time: ${stats.executionStats.executionTimeMillis}ms`);
console.log(`Documents examined: ${stats.executionStats.totalDocsExamined}`);
console.log(`Documents returned: ${stats.executionStats.nReturned}`);
```

## 8. Transaction Handling

### 8.1 Transaction Basics
MongoDB transactions ensure ACID compliance. Transactions allow multiple operations to be grouped into a single atomic unit—either all succeed or all fail.

**Transaction Steps:**
1. Start a session
2. Begin transaction
3. Execute database operations
4. Commit if successful / Rollback if error

### 8.2 Transaction Implementation for Quiz-Arena

#### Create Quiz with Questions (Transaction)
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // Create quiz
  const quiz = await Quiz.create([{
    title: "General Knowledge",
    creator: teacherId,
    questions: [
      { text: "What is 2+2?", options: ["3", "4", "5"], correctAnswer: 1 },
      { text: "What is capital of France?", options: ["London", "Paris", "Berlin"], correctAnswer: 1 }
    ]
  }], { session });

  // Update teacher's quiz count
  await User.updateOne(
    { _id: teacherId },
    { $inc: { quizCount: 1 } },
    { session }
  );

  // Commit transaction
  await session.commitTransaction();
  console.log("Quiz created successfully");
} catch (error) {
  // Rollback if error occurs
  await session.abortTransaction();
  console.error("Transaction failed:", error.message);
} finally {
  session.endSession();
}
```

#### Record Match Result with Player Updates (Transaction)
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // Create match result
  const matchResult = await MatchResult.create([{
    quizId: quizId,
    roomCode: "ROOM123",
    players: [
      { id: "player1", name: "Alice", score: 85 },
      { id: "player2", name: "Bob", score: 70 }
    ],
    winner: { id: "player1", name: "Alice", score: 85 }
  }], { session });

  // Update quiz play count
  await Quiz.updateOne(
    { _id: quizId },
    { $inc: { playCount: 1 } },
    { session }
  );

  // Update player statistics
  await User.updateOne(
    { _id: "player1" },
    { $inc: { wins: 1, totalScore: 85 } },
    { session }
  );

  // Commit transaction
  await session.commitTransaction();
  console.log("Match result recorded");
} catch (error) {
  await session.abortTransaction();
  console.error("Transaction failed:", error.message);
} finally {
  session.endSession();
}
```

#### Batch Update Student Scores (Transaction)
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // Update multiple students' scores
  const students = ["student1", "student2", "student3"];
  
  for (const studentId of students) {
    await User.updateOne(
      { _id: studentId },
      { $inc: { totalScore: 50, matchesPlayed: 1 } },
      { session }
    );
  }

  // Update quiz stats
  await Quiz.updateOne(
    { _id: quizId },
    { $inc: { playCount: students.length } },
    { session }
  );

  // Commit transaction
  await session.commitTransaction();
  console.log("Batch update completed");
} catch (error) {
  await session.abortTransaction();
  console.error("Transaction failed:", error.message);
} finally {
  session.endSession();
}
```

#### Transfer Quiz Ownership (Transaction)
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // Transfer quiz from old teacher to new teacher
  await Quiz.updateOne(
    { _id: quizId },
    { $set: { creator: newTeacherId } },
    { session }
  );

  // Decrement old teacher's quiz count
  await User.updateOne(
    { _id: oldTeacherId },
    { $inc: { quizCount: -1 } },
    { session }
  );

  // Increment new teacher's quiz count
  await User.updateOne(
    { _id: newTeacherId },
    { $inc: { quizCount: 1 } },
    { session }
  );

  // Commit transaction
  await session.commitTransaction();
  console.log("Quiz transferred successfully");
} catch (error) {
  await session.abortTransaction();
  console.error("Transaction failed:", error.message);
} finally {
  session.endSession();
}
```

#### Create Quiz and Track in Leaderboard (Transaction)
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // Create new quiz
  const quiz = await Quiz.create([{
    title: "Math Quiz",
    creator: teacherId,
    questions: [],
    playCount: 0
  }], { session });

  // Create leaderboard entry
  await db.collection("leaderboards").insertOne({
    quizId: quiz[0]._id,
    topScores: [],
    createdAt: new Date()
  }, { session });

  // Log activity
  await db.collection("activity").insertOne({
    action: "quiz_created",
    quizId: quiz[0]._id,
    teacherId: teacherId,
    timestamp: new Date()
  }, { session });

  // Commit transaction
  await session.commitTransaction();
  console.log("Quiz and leaderboard created");
} catch (error) {
  await session.abortTransaction();
  console.error("Transaction failed:", error.message);
} finally {
  session.endSession();
}
```

#### Multi-Document Transaction Pattern
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // Step 1: Create match result
  const matchResult = await MatchResult.create([{
    quizId: quizId,
    roomCode: roomCode,
    players: playersData,
    winner: winnerData
  }], { session });

  // Step 2: Update quiz stats
  await Quiz.updateOne({ _id: quizId }, { $inc: { playCount: 1 } }, { session });

  // Step 3: Update all player records
  await Promise.all(playersData.map(player =>
    User.updateOne(
      { _id: player.id },
      { $inc: { matchesPlayed: 1, totalScore: player.score } },
      { session }
    )
  ));

  // Step 4: Create activity log
  await db.collection("logs").insertOne({
    type: "match_completed",
    matchId: matchResult[0]._id,
    participants: playersData.length,
    timestamp: new Date()
  }, { session });

  // All operations succeed or all rollback
  await session.commitTransaction();
  console.log("Transaction completed successfully");
} catch (error) {
  await session.abortTransaction();
  console.error("Transaction rolled back:", error.message);
  throw error;
} finally {
  session.endSession();
}
```

### 8.3 Error Handling in Transactions

#### Retry Logic
```javascript
const executeWithRetry = async (operation, maxRetries = 3) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      await operation(session);
      await session.commitTransaction();
      return;
    } catch (error) {
      await session.abortTransaction();
      retries++;
      
      if (retries >= maxRetries) {
        throw new Error(`Transaction failed after ${maxRetries} retries: ${error.message}`);
      }
      console.log(`Retry ${retries}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, 100 * retries)); // Exponential backoff
    } finally {
      session.endSession();
    }
  }
};

// Usage
await executeWithRetry(async (session) => {
  await Quiz.create([{ title: "Test" }], { session });
  await User.updateOne({ _id: teacherId }, { $inc: { quizCount: 1 } }, { session });
});
```

#### Validation Before Transaction
```javascript
const createQuizSafely = async (quizData, teacherId) => {
  // Validate data before starting transaction
  if (!quizData.questions || quizData.questions.length === 0) {
    throw new Error("Quiz must have at least one question");
  }

  if (!teacherId) {
    throw new Error("Teacher ID is required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const quiz = await Quiz.create([{
      ...quizData,
      creator: teacherId
    }], { session });

    await User.updateOne(
      { _id: teacherId },
      { $inc: { quizCount: 1 } },
      { session }
    );

    await session.commitTransaction();
    return quiz[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
```

## 9. AI Integration with Gemini

### 9.1 AI Insights Endpoint

#### Backend: routes/ai.js
```javascript
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const auth = require("../middleware/protect");
const Quiz = require("../models/Quiz");
const User = require("../models/User");
const MatchResult = require("../models/MatchResult");
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get AI Insights
router.get("/insights", auth, async (req, res) => {
  try {
    const [quizzes, users, matches] = await Promise.all([
      Quiz.find({ creator: req.user._id }),
      User.find({ role: "student" }),
      MatchResult.find()
    ]);

    const totalPlays = quizzes.reduce((sum, q) => sum + q.playCount, 0);
    const avgScore = matches.length > 0 
      ? Math.round(matches.reduce((sum, m) => sum + (m.players[0]?.score || 0), 0) / matches.length) 
      : 0;
    const topPlayer = matches.length > 0 
      ? matches.reduce((max, m) => max.players[0]?.score > m.players[0]?.score ? max : m) 
      : null;

    res.json({
      totalQuizzes: quizzes.length,
      totalPlayers: users.length,
      totalMatches: matches.length,
      totalPlays: totalPlays,
      averageScore: avgScore,
      topPlayer: topPlayer?.players[0]?.name || "N/A",
      quizzesByDifficulty: {
        easy: quizzes.filter(q => q.questions?.some(qu => qu.difficulty === "easy")).length,
        medium: quizzes.filter(q => q.questions?.some(qu => qu.difficulty === "medium")).length,
        hard: quizzes.filter(q => q.questions?.some(qu => qu.difficulty === "hard")).length
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// AI Chat with Action Detection
router.post("/chat", auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "Message required" });

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_key_here") {
      return res.json({ 
        reply: "AI chat is not configured. Please add GEMINI_API_KEY.", 
        action: "none" 
      });
    }

    const [quizzes, matches, users] = await Promise.all([
      Quiz.find({ creator: req.user._id }),
      MatchResult.find(),
      User.find({ role: "student" })
    ]);

    const lowerMsg = message.toLowerCase();

    // Create Quiz
    if (lowerMsg.includes("create quiz") || lowerMsg.includes("add quiz")) {
      const titleMatch = message.match(/quiz[:\s]+(.+?)(?:\s+on|\s+about|\s*$)/i);
      const title = titleMatch ? titleMatch[1].trim() : "New Quiz";
      const quiz = await Quiz.create({ 
        title, 
        creator: req.user._id, 
        questions: [] 
      });
      return res.json({ 
        reply: `Quiz "${quiz.title}" created!`, 
        action: "create_quiz", 
        result: quiz 
      });
    }

    // Create Match Room
    if (lowerMsg.includes("create room") || lowerMsg.includes("start match")) {
      const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
      const match = await MatchResult.create({ 
        quizId: quizzes[0]?._id, 
        roomCode: roomCode, 
        players: [] 
      });
      return res.json({ 
        reply: `Match room ${roomCode} created!`, 
        action: "create_room", 
        result: match 
      });
    }

    try {
      const context = `
You are a Quiz Arena AI assistant. Current data:
- Quizzes: ${quizzes.length} (${quizzes.map(q=>q.title).join(", ") || "none"})
- Students: ${users.length}
- Matches Played: ${matches.length}
- Average Score: ${matches.length > 0 ? Math.round(matches.reduce((sum, m) => sum + (m.players[0]?.score || 0), 0) / matches.length) : 0}

Answer: ${message}`;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(context);
      const reply = result.response.text();
      return res.json({ reply, action: "none" });
    } catch (aiError) {
      console.error("Gemini AI Error:", aiError.message);
      
      const stats = `You have ${quizzes.length} quizzes and ${matches.length} matches played. `;
      let fallbackReply = stats;
      
      if (lowerMsg.includes("how many") || lowerMsg.includes("count")) {
        fallbackReply += "Try: 'create quiz: Math 101' or 'create room' to start a match.";
      } else {
        fallbackReply += "I can help manage quizzes and matches. Try: 'create quiz: General Knowledge'";
      }
      
      return res.json({ reply: fallbackReply, action: "none" });
    }

  } catch (err) {
    console.error("Chat Error:", err.message);
    res.status(500).json({ message: "Chat service temporarily unavailable." });
  }
});

module.exports = router;
```

### 9.2 Frontend: AI Chat Component
```javascript
import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";

export default function AiChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setMessages([...messages, { text: input, sender: "user" }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input })
      });

      const data = await res.json();
      setMessages(prev => [...prev, { text: data.reply, sender: "ai", action: data.action }]);
    } catch (error) {
      setMessages(prev => [...prev, { text: "Error connecting to AI", sender: "ai" }]);
    }

    setInput("");
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-96 border rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle size={20} />
        <h3 className="font-semibold">Quiz Arena AI</h3>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`p-2 rounded ${msg.sender === "user" ? "bg-blue-100 text-right" : "bg-gray-100"}`}>
            {msg.text}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask about quizzes..."
          className="flex-1 border rounded px-3 py-2 text-sm"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
```

### 9.3 Environment Setup
```bash
# .env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 9.4 Integration in Main Server
```javascript
// server/index.ts
import aiRoutes from "./routes/ai";

app.use("/api/ai", aiRoutes);
```

## 10. Backend Integration Key Features

### 10.1 REST-ful API Design

Quiz-Arena exposes multiple API endpoints for quiz management, room management, user participation, and leaderboard features.

#### Quiz Management Endpoints
```javascript
// GET all quizzes
GET /api/quizzes

// GET quiz by ID
GET /api/quizzes/:id

// CREATE new quiz
POST /api/quizzes
Body: { title, questions: [], difficulty: "medium" }

// UPDATE quiz
PUT /api/quizzes/:id
Body: { title, questions }

// DELETE quiz
DELETE /api/quizzes/:id
```

#### Match Room Endpoints
```javascript
// CREATE match room
POST /api/match-rooms
Body: { quizId, roomCode, maxPlayers: 4 }

// JOIN room
POST /api/match-rooms/:roomCode/join
Body: { playerId, playerName }

// GET room details
GET /api/match-rooms/:roomCode

// END match
POST /api/match-rooms/:roomCode/end
Body: { winner, scores: [] }
```

#### Leaderboard & Analytics Endpoints
```javascript
// GET global leaderboard
GET /api/leaderboard

// GET user stats
GET /api/stats/:userId

// GET quiz analytics
GET /api/quizzes/:id/analytics
```

### 10.2 JWT Authentication

Secure authentication using JSON Web Tokens ensures only authorized users can access protected routes.

#### Login Flow
```javascript
// routes/authRoutes.ts
import jwt from "jsonwebtoken";
import User from "../models/User";

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    
    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Check if user exists
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });
    
    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || "student"
    });
    
    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

#### Token Verification
```javascript
// lib/api.ts - Frontend
const api = axios.create({
  baseURL: "http://localhost:3000/api"
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### 10.3 Role-Based Access Control

Different user roles (Teacher, Student) have controlled access to specific functionalities.

#### Role-Based Middleware
```javascript
// middleware/protect.ts
import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};
```

#### Protected Routes by Role
```javascript
// Only teachers can create quizzes
router.post(
  "/quizzes",
  protect,
  authorizeRole(["teacher"]),
  createQuiz
);

// Only teachers can access quiz analytics
router.get(
  "/quizzes/:id/analytics",
  protect,
  authorizeRole(["teacher"]),
  getQuizAnalytics
);

// Students can join match rooms
router.post(
  "/match-rooms/:roomCode/join",
  protect,
  authorizeRole(["student"]),
  joinRoom
);

// All authenticated users can get leaderboard
router.get("/leaderboard", protect, getLeaderboard);
```

### 10.4 Middleware Integration

Middleware is used for authentication, error handling, request validation, and logging.

#### Custom Middleware Chain
```javascript
// middleware/asyncHandler.ts
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage
router.post("/quizzes", protect, asyncHandler(createQuiz));
```

#### Validation Middleware
```javascript
// middleware/validate.ts
import { body, validationResult } from "express-validator";

export const validateQuizData = [
  body("title").notEmpty().withMessage("Title is required"),
  body("questions").isArray().withMessage("Questions must be an array"),
  body("questions.*.text").notEmpty().withMessage("Question text is required"),
  body("questions.*.options").isArray({ min: 2 }).withMessage("At least 2 options required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Usage
router.post("/quizzes", protect, validateQuizData, createQuiz);
```

#### Error Handling Middleware
```javascript
// middleware/errorHandler.ts
export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  
  res.status(status).json({
    success: false,
    status,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
};

// Usage in main server
app.use(errorHandler);
```

#### Logging Middleware
```javascript
// middleware/logger.ts
export const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
};

// Usage in main server
app.use(logger);
```

### 10.5 AI Integration

Backend APIs interact with Gemini AI to perform tasks such as quiz analysis, insights, and recommendations.

#### AI-Powered Quiz Insights
```javascript
// controllers/aiController.ts
import { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateQuizInsights = async (req, res) => {
  try {
    const { quizId } = req.body;
    
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Analyze this quiz and provide insights:
    Title: ${quiz.title}
    Questions: ${quiz.questions.length}
    Difficulties: ${quiz.questions.map(q => q.difficulty).join(", ")}
    
    Provide:
    1. Difficulty assessment
    2. Topic distribution
    3. Recommended improvements
    4. Estimated completion time`;
    
    const result = await model.generateContent(prompt);
    const insights = result.response.text();
    
    res.json({ insights });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

#### AI-Powered Performance Recommendations
```javascript
export const generatePlayerRecommendations = async (req, res) => {
  try {
    const { playerId } = req.body;
    
    const stats = await MatchResult.aggregate([
      { $unwind: "$players" },
      { $match: { "players.id": playerId } },
      { $group: {
        _id: "$players.id",
        avgScore: { $avg: "$players.score" },
        matchCount: { $sum: 1 },
        highestScore: { $max: "$players.score" }
      }}
    ]);
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Based on these player stats, give recommendations:
    Average Score: ${stats[0]?.avgScore || 0}
    Matches Played: ${stats[0]?.matchCount || 0}
    Highest Score: ${stats[0]?.highestScore || 0}
    
    Provide:
    1. Strengths
    2. Areas for improvement
    3. Recommended quiz difficulty
    4. Practice suggestions`;
    
    const result = await model.generateContent(prompt);
    const recommendations = result.response.text();
    
    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

### 10.6 Complete API Flow Example

**Scenario: User Login → Create Quiz → Join Match Room → End Match**

#### Step 1: User Login
```javascript
// Frontend
const handleLogin = async (email, password) => {
  const res = await api.post("/auth/login", { email, password });
  localStorage.setItem("authToken", res.data.token);
  setUser(res.data.user);
};

// Request
POST /api/auth/login
Body: { email: "teacher@example.com", password: "password123" }

// Response
{
  token: "eyJhbGc...",
  user: {
    id: "user123",
    name: "John Teacher",
    email: "teacher@example.com",
    role: "teacher"
  }
}
```

#### Step 2: Create Quiz
```javascript
// Frontend - Token is automatically added by interceptor
const handleCreateQuiz = async (quizData) => {
  const res = await api.post("/quizzes", quizData);
  setQuizzes([...quizzes, res.data]);
};

// Request
POST /api/quizzes
Headers: { Authorization: "Bearer eyJhbGc..." }
Body: {
  title: "Math Quiz",
  questions: [
    { text: "2+2?", options: ["3", "4", "5"], correctAnswer: 1, difficulty: "easy" }
  ]
}

// Response
{
  _id: "quiz123",
  title: "Math Quiz",
  creator: "user123",
  questions: [...],
  playCount: 0,
  createdAt: "2026-05-06T..."
}
```

#### Step 3: Create Match Room
```javascript
// Frontend
const handleCreateRoom = async (quizId) => {
  const res = await api.post("/match-rooms", { quizId });
  setRoomCode(res.data.roomCode);
};

// Request
POST /api/match-rooms
Headers: { Authorization: "Bearer eyJhbGc..." }
Body: { quizId: "quiz123" }

// Response
{
  _id: "room123",
  quizId: "quiz123",
  roomCode: "ABCD12",
  players: [],
  maxPlayers: 4,
  createdAt: "2026-05-06T..."
}
```

#### Step 4: Student Joins Room (WebSocket)
```javascript
// Frontend - Socket.io connection
const socket = io("http://localhost:3000");

const joinRoom = (roomCode, playerData) => {
  socket.emit("join-room", roomCode, {
    id: user.id,
    name: user.name,
    score: 0
  });
};

// Backend - Socket handler
socket.on("join-room", async (roomCode, playerData) => {
  const room = await MatchResult.findOne({ roomCode });
  room.players.push(playerData);
  await room.save();
  
  io.to(roomCode).emit("player-joined", playerData);
});
```

#### Step 5: End Match & Save Results
```javascript
// Frontend
const endMatch = (matchData) => {
  socket.emit("end-match", roomCode, matchData);
};

// Backend - Transaction ensures all updates succeed or fail
socket.on("end-match", async (roomCode, matchData) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Save match result
    const result = await MatchResult.create([matchData], { session });
    
    // Update quiz play count
    await Quiz.updateOne(
      { _id: matchData.quizId },
      { $inc: { playCount: 1 } },
      { session }
    );
    
    // Update player stats
    for (const player of matchData.players) {
      await User.updateOne(
        { _id: player.id },
        { $inc: { totalScore: player.score, matchesPlayed: 1 } },
        { session }
      );
    }
    
    await session.commitTransaction();
    io.to(roomCode).emit("match-ended", { result });
  } catch (error) {
    await session.abortTransaction();
    socket.emit("error", { message: "Failed to save match" });
  } finally {
    session.endSession();
  }
});
```

#### Step 6: Get Leaderboard
```javascript
// Frontend
const getLeaderboard = async () => {
  const res = await api.get("/leaderboard");
  setLeaderboard(res.data);
};

// Request
GET /api/leaderboard
Headers: { Authorization: "Bearer eyJhbGc..." }

// Response
[
  { id: "player1", name: "Alice", score: 950, matchesPlayed: 10 },
  { id: "player2", name: "Bob", score: 820, matchesPlayed: 8 },
  { id: "player3", name: "Charlie", score: 750, matchesPlayed: 6 }
]
```

### 10.7 Environment Variables
```bash
# .env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/quiz-arena
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=development
```

### 10.8 Server Initialization
```typescript
// server/index.ts
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { Server } from "socket.io";
import http from "http";

import quizRoutes from "./routes/quizRoutes";
import authRoutes from "./routes/authRoutes";
import aiRoutes from "./routes/ai";
import { protect } from "./middleware/protect";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./middleware/logger";
import { setupSocket } from "./socket";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middleware
app.use(logger);
app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/quizzes", protect, quizRoutes);
app.use("/api/ai", protect, aiRoutes);

// WebSocket
setupSocket(io);

// Error handling
app.use(errorHandler);

// Start server
server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
```
```
