// controllers/chatbotController.js
import axios from "axios";
import ConversationModel from "../models/Conversation.js";
import doctorModel from "../models/doctorModel.js"; // adjust file name/path if needed

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Define your prompt parts
const systemPrompt = `
המערכת בוט AI מתקדם המסוגל לנהל שיח עם המטופל, לתשאל אותו לגבי תחושותיו, לאבחן מצבו הראשוני, ולהמליץ על בדיקות נדרשות או הפניה למרפאה מתאימה תוך הערכת רמת הדחיפות.
You are a medical AI assistant that provides initial medical advice. Identify the patient's symptoms, recommend relevant medical specialties, and assess the urgency of the situation. 
You should only answer questions related to medical topics. If a question is unrelated to medical matters (for example, "how large is the moon"), kindly respond that you only provide medical advice.
`;

const searchInData = `In addition, advise the patient on where to go and which type of doctor to consult based on the available doctor database. Here is a sample doctor table:`;
const ifNoRelevantData = `If you cannot find relevant data in the database, simply advise the patient on which type of doctor (specialty) would be appropriate for their symptoms.
`;

const getChatHistory = async (req, res) => {
  // Ensure the user is authenticated
  const userId = req.body.userId;
  //   console.log("req.body.userId =", req.body.userId);
  try {
    // Fetch all conversations for this user
    const conversations = await ConversationModel.find({ userId });
    console.log("conversations =", conversations);
    // console.log("userId =", userId);
    res.json({ conversations });
  } catch (error) {
    console.error("Error fetching conversation history:", error);
    res.status(500).json({ error: "Error fetching conversation history." });
  }
};

// Function to fetch doctor data and build a string for the AI prompt.
const getDoctorsData = async () => {
  try {
    const doctors = await doctorModel.find({ available: true });
    if (!doctors || doctors.length === 0) return "No doctor data available.";
    // Build a string for each doctor.
    return doctors
      .map(
        (doc) =>
          `- Dr. ${doc.name}: Speciality: ${doc.speciality}, Degree: ${
            doc.degree
          }, Experience: ${doc.experience}, Fees: ${doc.fees}, Location: ${
            doc.address?.line1 || "N/A"
          }`
      )
      .join("\n");
  } catch (err) {
    console.error("Error retrieving doctors data:", err);
    return "Error retrieving doctor data.";
  }
};

const sendChat = async (req, res) => {
  console.log("inside sendChat ---------", req.body);
  const { message, conversationId: providedConversationId } = req.body;
  if (!message)
    return res.status(400).json({ error: "Please provide a message." });

  // Retrieve the user ID (assumes your auth middleware sets req.user or you pass it in the body)
  const userId = (req.user && req.user._id) || req.body.userId || null;
  if (!userId) {
    return res
      .status(401)
      .json({ error: "Unauthorized: user not identified." });
  }

  // Use provided conversationId or generate a new one
  let conversationId = providedConversationId;
  let conversation;
  if (!conversationId) {
    conversationId = "chat_" + Date.now();
    conversation = null;
  } else {
    conversation = await ConversationModel.findOne({ conversationId, userId });
  }

  try {
    if (!conversation) {
      // Fetch dynamic doctor data and construct the full prompt.
      const doctorsData = await getDoctorsData();
      const mainPrompt =
        systemPrompt +
        "\n" +
        searchInData +
        "\n" +
        doctorsData +
        "\n" +
        ifNoRelevantData;
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

export { sendChat, summarizeConversation, getChatHistory };
