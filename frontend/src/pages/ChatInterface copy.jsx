import React, { useState, useEffect, useRef, useContext } from "react";
import { AppContext } from "../context/AppContext";

const ChatInterface = () => {
  const { backendUrl, token } = useContext(AppContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [conversationHistory, setConversationHistory] = useState({});
  const [conversationTitles, setConversationTitles] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const chatMessagesRef = useRef(null);

  useEffect(() => {
    if (messages.length === 0) {
      const greetings = [
        "Hi there, how can I help you?",
        "Hello! What can I assist you with today?",
        "Hey! How may I help you today?",
        "Hi! What can I do for you?",
        "Hello there! How can I be of assistance?",
        "Hey there! How can I assist you today?",
        "Hi! How can I make your day easier?",
        "Hello! Need help with anything?",
        "Hey! What can I help you with right now?",
        "Hi there! How can I support you today?",
        "Greetings! How may I assist you?",
      ];
      const randomGreeting =
        greetings[Math.floor(Math.random() * greetings.length)];
      appendMessage(randomGreeting, "bot");
    }
  }, []);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  const appendMessage = (content, sender) => {
    setMessages((prev) => [...prev, { content, sender }]);
  };

  const sendToServer = async (message) => {
    try {
      const response = await fetch(`${backendUrl}/api/chat/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token, // Pass token for authentication
        },
        body: JSON.stringify({
          message,
          conversationId: activeConversationId,
        }),
      });
      const data = await response.json();
      if (data.error) {
        appendMessage("Error: " + data.error, "bot");
      } else {
        appendMessage(data.response, "bot");
      }
    } catch (error) {
      appendMessage("Error: " + error.message, "bot");
    }
  };

  const generateConversationTitle = async (conversationText) => {
    try {
      const response = await fetch(`${backendUrl}/api/chat/summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token, // Include token for authenticated requests
        },
        body: JSON.stringify({ conversationText }),
      });
      const data = await response.json();
      if (data.error) {
        return null;
      }
      return data.title;
    } catch (error) {
      console.error("Error generating title:", error);
      return null;
    }
  };

  const handleSend = () => {
    const trimmedInput = input.trim();
    if (trimmedInput !== "") {
      appendMessage(trimmedInput, "user");
      setInput("");
      sendToServer(trimmedInput);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  const handleToggleSidebar = () => {
    setSidebarHidden(!sidebarHidden);
  };

  const handleNewChat = async () => {
    if (messages.length > 0) {
      const currentId = activeConversationId || "chat_" + Date.now();
      if (!activeConversationId) setActiveConversationId(currentId);
      const conversationText = messages.map((m) => m.content).join("\n");
      const generatedTitle = await generateConversationTitle(conversationText);
      const title = generatedTitle || "Chat " + new Date().toLocaleTimeString();
      setConversationTitles((prev) => ({ ...prev, [currentId]: title }));
      setConversationHistory((prev) => ({ ...prev, [currentId]: messages }));
    }
    setMessages([]);
    const newId = "chat_" + Date.now();
    setActiveConversationId(newId);
    setConversationTitles((prev) => ({ ...prev, [newId]: "" }));
    appendMessage("Hi there, how can I help you?", "bot");
  };

  const handleChatHistoryClick = (id) => {
    setConversationHistory((prev) => ({
      ...prev,
      [activeConversationId]: messages,
    }));
    const selectedMessages = conversationHistory[id] || [];
    setMessages(selectedMessages);
    setActiveConversationId(id);
  };

  const filteredHistory = Object.keys(conversationTitles).filter((id) =>
    conversationTitles[id].toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative h-[70vh] mt-20 rounded-2xl bg-[#1e1e1e] text-[#e0e0e0] font-sans overflow-hidden">
      {/* Sidebar – always 300px wide; when closed, it slides left so that only a 50px tab remains visible */}
      <div
        className="absolute top-0 left-0 h-full bg-[#2c2c2c] transition-transform duration-300 ease-in-out overflow-hidden"
        style={{
          width: "300px",
          transform: sidebarHidden ? "translateX(-300px)" : "translateX(0)",
        }}
      >
        {/* Sidebar content shown only when expanded */}
        {!sidebarHidden && (
          <div className="ml-5 mt-5">
            <div className="flex justify-end items-center mb-4">
              <a href="../index/index.html">
                <button className="bg-[#3a8cbb] rounded-full p-1.5 text-white cursor-pointer transition-all duration-300 ease-in-out text-xl hover:bg-[#125777]">
                  <i className="fa-solid fa-house"></i>
                </button>
              </a>
              <button
                className="bg-[#3a8cbb] text-white rounded-full w-10 h-10 flex items-center justify-center text-lg transition-all duration-300 ease-in-out hover:bg-[#125777] ml-2"
                onClick={handleNewChat}
              >
                <i className="fa-solid fa-plus"></i>
              </button>
            </div>
            <div className="flex mb-4">
              <input
                type="text"
                placeholder="Search chats..."
                className="flex-1 p-2 border-0 rounded-l-md outline-none bg-[#444] text-[#e0e0e0]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="p-2 bg-[#3a8cbb] border-0 text-white rounded-r-md cursor-pointer transition-all duration-300 ease-in-out hover:bg-[#275c7a]">
                <i className="fa-solid fa-magnifying-glass"></i>
              </button>
            </div>
            <div className="mb-5" id="todaySection">
              <h2 className="mt-12 text-lg">Chat History</h2>
              <h3 className="mb-2 text-base border-b border-[#444] pb-1">
                Today
              </h3>
              {filteredHistory.map((id) => (
                <div
                  key={id}
                  className="p-2 rounded-md mb-1 cursor-pointer transition-colors duration-300 hover:bg-[#3a8cbb]"
                  onClick={() => handleChatHistoryClick(id)}
                >
                  {conversationTitles[id]}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toggle Button fixed at the left edge */}
      <button
        className="absolute top-[20px] left-[25px] z-50 bg-[#3a8cbb] rounded-md p-2 text-white cursor-pointer transition-all duration-300 ease-in-out hover:bg-[#125777]"
        onClick={handleToggleSidebar}
      >
        <i className="fa-solid fa-bars"></i>
      </button>

      {/* Chat Container – its left margin adjusts based on sidebar state */}
      <div
        className="flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden"
        style={{ marginLeft: sidebarHidden ? "0px" : "300px" }}
      >
        <div className="p-5 bg-[#343541] text-white text-center text-lg">
          MedicalGPT
        </div>
        <div
          id="chatMessages"
          className="flex-1 p-5 bg-[#2c2c2c] overflow-auto"
          ref={chatMessagesRef}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-5 flex items-start ${
                msg.sender === "user" ? "justify-end" : ""
              }`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg text-base leading-relaxed break-words ${
                  msg.sender === "user"
                    ? "bg-[#757575] text-white"
                    : "bg-[#444] text-[#e0e0e0]"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>
        {/* Input Container pinned to the bottom */}
        <div className="flex p-5 bg-[#2c2c2c] border-t border-[#444] mt-auto">
          <input
            type="text"
            placeholder="Type your message here..."
            className="flex-1 p-2 text-base border-0 rounded-md outline-none bg-[#444] text-[#e0e0e0]"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button
            className="ml-2 w-10 h-10 text-lg border-0 rounded-full bg-[#3a8cbb] text-white cursor-pointer transition-all duration-300 flex items-center justify-center hover:bg-[#005bb5]"
            onClick={handleSend}
          >
            <i className="fa-solid fa-arrow-up"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
