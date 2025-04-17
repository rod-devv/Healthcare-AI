require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is missing in .env");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Object to store conversation histories keyed by conversationId.
const conversations = {};

const doctors_data = `- Dr. Alice Johnson: Expertise: physiotherapy, Location: City Hospital, Working Time: Monday, 09:00-16:00.
- Dr. Bob Smith: Expertise: Neurology, Location: County Hospital, Working Time: Tuesday, 10:00-17:00.
- Dr. Menachem Cohen: Expertise: Orthopedics, Location: Carmel Medical Center Hospital in Haifa, Working Time: Sunday to Thursday, 08:00-17:00.`;

const search_in_data = `In addition, advise the patient on where to go and which type of doctor to consult based on the available doctor database. Here is a sample doctor table:`;

const if_no_relavent_data = `If you cannot find relevant data in the database, simply advise the patient on which type of doctor (specialty) would be appropriate for their symptoms.
`;

const system_Prompt = `
המערכת בוט AI מתקדם המסוגל לנהל שיח עם המטופל, לתשאל אותו לגבי תחושותיו, לאבחן מצבו הראשוני, ולהמליץ על בדיקות נדרשות או הפניה למרפאה מתאימה תוך הערכת רמת הדחיפות.
You are a medical AI assistant that provides initial medical advice. Identify the patient's symptoms, recommend relevant medical specialties, and assess the urgency of the situation. 
You should only answer questions related to medical topics. If a question is unrelated to medical matters (for example, "how large is the moon"), kindly respond that you only provide medical advice.`;

const main_Prompt =
  system_Prompt +
  (search_in_data + doctors_data + if_no_relavent_data) +
  // "dont give rigth away place and locaion of a doctor, ask him if he needs directions first";
  //+  "dont give rigth away place and locaion of a doctor, ask him if he needs directions first";
  app.post("/chat", async (req, res) => {
    const { message, conversationId } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Please provide a message." });
    }

    // Retrieve or initialize the conversation history for this conversationId.
    let conversationHistory = conversations[conversationId];
    if (!conversationHistory) {
      conversationHistory = [{ role: "system", content: main_Prompt }];
      conversations[conversationId] = conversationHistory;
    }

    // Append the user's message.
    conversationHistory.push({ role: "user", content: message });

    try {
      // Send the full conversation history to OpenAI's API.
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: conversationHistory,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
        }
      );

      const aiResponse = response.data.choices[0].message.content;

      // Append the assistant's response to the conversation history.
      conversationHistory.push({ role: "assistant", content: aiResponse });

      res.json({ response: aiResponse });
    } catch (error) {
      console.error(
        "Error:",
        error.response ? error.response.data : error.message
      );
      res.status(503).json({ error: "Error connecting to the model." });
    }
  });

// New endpoint to generate a conversation title.
app.post("/summarize", async (req, res) => {
  const { conversationText } = req.body;
  if (!conversationText) {
    return res.status(400).json({ error: "Please provide conversation text." });
  }
  try {
    // Updated prompt for a concise, descriptive title (5-10 words).
    const summaryResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "Generate a concise, descriptive title (5-10 words) summarizing the following medical conversation. Provide only the title.",
          },
          { role: "user", content: conversationText },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );
    const title = summaryResponse.data.choices[0].message.content.trim();
    res.json({ title });
  } catch (error) {
    console.error(
      "Error summarizing conversation:",
      error.response ? error.response.data : error.message
    );
    res.status(503).json({ error: "Error generating summary title." });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
