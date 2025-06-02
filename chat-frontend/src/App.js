import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";

const socket = io("https://chat-backend-gd4a.onrender.com");

export default function ChatApp() {
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState("");
  const [profileSet, setProfileSet] = useState(false);
  const [chatUser, setChatUser] = useState(null);
  const [message, setMessage] = useState("");
  const [messagesByUser, setMessagesByUser] = useState({});
  const [users, setUsers] = useState([]);
  const [unreadUsers, setUnreadUsers] = useState(new Set());
  const [lastSeen, setLastSeen] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.on("connect", () => {
      setConnected(true);
      if (username) socket.emit("set-username", username);
    });

    socket.on("disconnect", () => setConnected(false));
    socket.on("users", (usersList) => setUsers(usersList));

    socket.on("receive-message", ({ from, text }) => {
      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      setMessagesByUser((prev) => {
        const userMsgs = prev[from] || [];
        return {
          ...prev,
          [from]: [...userMsgs, { from, text, timestamp }],
        };
      });

      if (from !== chatUser) {
        setUnreadUsers((prev) => new Set(prev).add(from));
      } else {
        socket.emit("message-read", { from });
      }
    });

    socket.on("last-seen", (data) => {
      setLastSeen((prev) => ({ ...prev, [data.user]: data.timestamp }));
    });

    socket.on("message-read-confirmed", ({ to }) => {
      setMessagesByUser((prev) => {
        const msgs = prev[to] || [];
        const updated = msgs.map((msg) =>
          msg.from === username ? { ...msg, readByRecipient: true } : msg
        );
        return { ...prev, [to]: updated };
      });
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("users");
      socket.off("receive-message");
      socket.off("last-seen");
      socket.off("message-read-confirmed");
    };
  }, [chatUser, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesByUser, chatUser]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  const handleSetUsername = () => {
    if (username.trim()) {
      setProfileSet(true);
      socket.emit("set-username", username);
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && chatUser) {
      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const msg = {
        from: username,
        text: message,
        timestamp,
        readByRecipient: false,
      };

      socket.emit("send-message", { to: chatUser, text: message });

      setMessagesByUser((prev) => {
        const msgs = prev[chatUser] || [];
        return { ...prev, [chatUser]: [...msgs, msg] };
      });

      setMessage("");
    }
  };

  const selectChatUser = (user) => {
    setChatUser(user);
    setUnreadUsers((prev) => {
      const copy = new Set(prev);
      copy.delete(user);
      return copy;
    });
    socket.emit("message-read", { from: user });
  };

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const currentMessages = chatUser ? messagesByUser[chatUser] || [] : [];

  return (
    <>
      <style>{`
        body.dark-mode {
          background-color: #121212;
          color: #eee;
          transition: background-color 0.3s, color 0.3s;
        }
        body.dark-mode input,
        body.dark-mode button {
          background-color: #333;
          color: #eee;
          border: 1px solid #555;
        }
        input, button {
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 6px 8px;
          margin: 4px 0;
        }
        button {
          cursor: pointer;
        }
      `}</style>

      <div
        style={{
          maxWidth: 600,
          margin: "20px auto",
          fontFamily: "Arial",
          backgroundColor: darkMode ? "#222" : "#fff",
          padding: 20,
          borderRadius: 10,
          border: darkMode ? "1px solid #444" : "1px solid #ccc",
        }}
      >
        <h2>Chat App</h2>
        <p>Status: {connected ? "🟢 Connected" : "🔴 Disconnected"}</p>
        <button onClick={toggleDarkMode}>
          Toggle {darkMode ? "☀ Light" : "🌙 Dark"} Mode
        </button>

        {!profileSet ? (
          <div style={{ marginTop: 20 }}>
            <input
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button onClick={handleSetUsername}>Set Name</button>
          </div>
        ) : (
          <>
            <div style={{ margin: "10px 0" }}>
              <strong>Logged in as:</strong> {username}
            </div>
            {!chatUser ? (
              <div>
                <h3>Select user to chat:</h3>
                {users
                  .filter((u) => u !== username)
                  .map((user) => (
                    <div key={user}>
                      <button onClick={() => selectChatUser(user)}>
                        {user}
                        {unreadUsers.has(user) && (
                          <span style={{ color: "red", marginLeft: 5 }}>•</span>
                        )}
                      </button>
                      <div style={{ fontSize: "0.75em", color: "#888" }}>
                        Last seen: {lastSeen[user] || "just now"}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div>
                <button onClick={() => setChatUser(null)}>
                  ⬅ Back to user list
                </button>
                <h3>Chatting with: {chatUser}</h3>
                <div
                  style={{
                    border: "1px solid #ccc",
                    height: 300,
                    overflowY: "auto",
                    padding: 10,
                    marginBottom: 10,
                    backgroundColor: darkMode ? "#333" : "#f9f9f9",
                  }}
                >
                  {currentMessages.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        textAlign: msg.from === username ? "right" : "left",
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <b>{msg.from}</b>: {msg.text}
                      </div>
                      <div style={{ fontSize: "0.75em", color: "#999" }}>
                        {msg.timestamp}{" "}
                        {msg.from === username &&
                          (msg.readByRecipient ? (
                            <span style={{ color: "blue" }}>✔</span>
                          ) : (
                            <span>✔</span>
                          ))}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <input
                  style={{ width: "80%" }}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message"
                />
                <button onClick={handleSendMessage}>Send</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
