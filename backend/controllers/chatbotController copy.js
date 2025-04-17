// controllers/chatbotController.js
import axios from "axios";
import ConversationModel from "../models/Conversation.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Define your prompt parts
const systemPrompt = `
המערכת בוט AI מתקדם המסוגל לנהל שיח עם המטופל, לתשאל אותו לגבי תחושותיו, לאבחן מצבו הראשוני, ולהמליץ על בדיקות נדרשות או הפניה למרפאה מתאימה תוך הערכת רמת הדחיפות.
You are a medical AI assistant that provides initial medical advice. Identify the patient's symptoms, recommend relevant medical specialties, and assess the urgency of the situation. 
You should only answer questions related to medical topics. If a question is unrelated to medical matters (for example, "how large is the moon"), kindly respond that you only provide medical advice.
`;

const doctorsData = `
- Dr. Alice Johnson: Expertise: physiotherapy, Location: City Hospital, Working Time: Monday, 09:00-16:00.
- Dr. Bob Smith: Expertise: Neurology, Location: County Hospital, Working Time: Tuesday, 10:00-17:00.
- Dr. Menachem Cohen: Expertise: Orthopedics, Location: Carmel Medical Center Hospital in Haifa, Working Time: Sunday to Thursday, 08:00-17:00.
`;

const searchInData = `In addition, advise the patient on where to go and which type of doctor to consult based on the available doctor database. Here is a sample doctor table:`;
const ifNoRelevantData = `If you cannot find relevant data in the database, simply advise the patient on which type of doctor (specialty) would be appropriate for their symptoms.
`;

const mainPrompt =
  systemPrompt + (searchInData + doctorsData + ifNoRelevantData);

const sendChat = async (req, res) => {
  console.log("inside sendChat ---------", req.body);
  const { message, conversationId: providedConversationId } = req.body;
  if (!message)
    return res.status(400).json({ error: "Please provide a message." });

  // Retrieve the user ID (make sure your auth middleware sets req.user or req.userId)
  const userId = req.user && req.user._id ? req.user._id : req.body.userId;
  if (!userId) {
    return res
      .status(401)
      .json({ error: "Unauthorized: user not identified." });
  }

  // If no valid conversationId is provided, generate a new one
  let conversationId = providedConversationId;
  let conversation;
  if (!conversationId) {
    conversationId = "chat_" + Date.now();
    conversation = null; // Force creation of a new conversation
  } else {
    // Try to find an existing conversation only if a conversationId is provided
    conversation = await ConversationModel.findOne({ conversationId, userId });
  }

  try {
    if (!conversation) {
      // Create a new conversation with the required system prompt message
      conversation = new ConversationModel({
        conversationId,
        userId,
        messages: [{ role: "system", content: mainPrompt }],
      });
    }

    // Append the user's message to the conversation
    conversation.messages.push({ role: "user", content: message });

    // Prepare the conversation history for the API call
    const messagesForAPI = conversation.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Call the OpenAI API with the conversation history
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: messagesForAPI,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    conversation.messages.push({ role: "assistant", content: aiResponse });

    // Save the updated conversation
    await conversation.save();

    res.json({ response: aiResponse, conversationId });
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    res.status(503).json({ error: "Error connecting to the model." });
  }
};

const summarizeConversation = async (req, res) => {
  const { conversationText } = req.body;
  if (!conversationText)
    return res.status(400).json({ error: "Please provide conversation text." });

  try {
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
};

export { sendChat, summarizeConversation };
