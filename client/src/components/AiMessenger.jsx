import { useState, useEffect, useRef } from "react";
import "./AiMessenger.css";
import { request } from "../services/api";

export default function AiMessenger({ token, user, initialContact, onClose, embedded = false, navigate }) {
  const [mode, setMode] = useState("ai"); // "ai" | "messenger"
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // AI Chat Messages
  const [aiMessages, setAiMessages] = useState([
    {
      id: "ai-welcome",
      sender: "ai",
      text: `Hello ${user?.name ? user.name.split(" ")[0] : "Player"}! 👋 I'm **TURF AI Copilot**, your 24/7 smart assistant. 

I can help you with:
• ⚽ **Ground Bookings** & hourly slot timings
• 🏆 **Tournaments**, live lottery draw & fixtures
• 💸 **Cancellations** & instant cash refund rules
• 🌦️ **Rain & weather** match rescheduling policies
• 🎫 **Gate QR Pass** check-in at the ground

Feel free to ask in **English** or **বাংলা**! How can I assist you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      quickChips: [
        "⚽ How to book a ground?",
        "🏆 Tournament draw & lottery",
        "💸 Cancellation & refund policy",
        "🌦️ What happens if it rains?",
        "📍 Best turf fields in Dhaka",
        "বাংলায় সাহায্য চাই"
      ]
    }
  ]);

  // Venue Messenger State
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeContact, setActiveContact] = useState(initialContact || null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messengerError, setMessengerError] = useState("");

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [aiMessages, threadMessages, isTyping]);

  // Load Contacts and Conversations when switching to Messenger mode
  useEffect(() => {
    if (mode === "messenger" && token) {
      loadMessengerData();
    }
  }, [mode, token]);

  const loadMessengerData = async () => {
    setLoadingContacts(true);
    setMessengerError("");
    try {
      const [convs, conts] = await Promise.all([
        request("/chat/conversations", { token }).catch(() => []),
        request("/chat/contacts", { token }).catch(() => [])
      ]);
      setConversations(Array.isArray(convs) ? convs : []);
      setContacts(Array.isArray(conts) ? conts : []);

      if (initialContact) {
        setActiveContact(initialContact);
      } else if (!activeContact && convs?.length > 0) {
        setActiveContact(convs[0].contact || convs[0]);
      } else if (!activeContact && conts?.length > 0) {
        setActiveContact(conts[0]);
      }
    } catch (err) {
      setMessengerError(err.message || "Failed to load chat contacts.");
    } finally {
      setLoadingContacts(false);
    }
  };

  // Load Active Thread Messages
  useEffect(() => {
    if (mode === "messenger" && activeContact && token) {
      loadThreadMessages(activeContact.id || activeContact._id);
    }
  }, [activeContact, mode, token]);

  const loadThreadMessages = async (contactId) => {
    if (!contactId) return;
    setLoadingMessages(true);
    try {
      const msgs = await request(`/chat/contacts/${contactId}/messages`, { token });
      setThreadMessages(Array.isArray(msgs) ? msgs : []);
    } catch {
      setThreadMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // ========================================================
  // AI KNOWLEDGE BRAIN & RESPONSE GENERATOR
  // ========================================================
  const generateAiAnswer = (prompt) => {
    const q = prompt.toLowerCase();
    const isBangla = /[\u0980-\u09FF]/.test(prompt) ||
      /\b(kivabe|ki vabe|kobe|taka|refund|pabo|bristi|khala|khelte|koto|mathe|shomoy)\b/i.test(prompt);

    // 1. Cancellation & Refunds
    if (q.includes("cancel") || q.includes("refund") || q.includes("ferot") || q.includes("টাকা ফেরত") || q.includes("বাতিল")) {
      if (isBangla) {
        return `### 💸 বাতিল ও রিফান্ড নীতি (TURF Refund Policy)
1. **স্লট বুকিং বাতিল:** খেলার নির্ধারিত সময়ের অন্তত **২ ঘণ্টা আগে** বুকিং বাতিল করলে সম্পূর্ণ রিফান্ড পাওয়া যাবে।
2. **টুর্নামেন্ট রেজিস্ট্রেশন বাতিল:** টুর্নামেন্ট শুরু হওয়ার অন্তত **২ দিন আগে** বাতিল করতে হবে।
3. **ক্যাশ রিফান্ড সংগ্রহ:** অনুমোদিত রিফান্ডের টাকা সরাসরি সংশ্লিষ্ট ভেন্যু/মাঠের অফিস থেকে সংগ্রহ করা যায়। আপনার ফোনে বুকিং বাতিল ও কালেকশন ভাউচারের SMS পাঠানো হয়।`;
      }
      return `### 💸 Cancellation & Refund Policy
• **Slot Bookings:** You can cancel any slot booking up to **2 hours before** start time for an approved refund.
• **Tournament Registrations:** Must be cancelled at least **2 days before** the tournament begins.
• **Cash Collection:** Approved refunds can be collected in cash directly at the venue office counter. An SMS notification voucher is automatically sent to your registered phone number.`;
    }

    // 2. Booking a Ground / Slot
    if (q.includes("book") || q.includes("slot") || q.includes("ground") || q.includes("field") || q.includes("মাঠ") || q.includes("বুক")) {
      if (isBangla) {
        return `### ⚽ মাঠ বা স্লট বুক করার সহজ নিয়ম:
1. **মাঠ নির্বাচন:** 'Playgrounds' অপশনে গিয়ে আপনার পছন্দের ভেন্যু (যেমন: ধানমন্ডি, গুলশান, মিরপুর) বেছে নিন।
2. **তারিখ ও স্লট নির্বাচন:** উপলব্ধ তারিখ ও পছন্দের সময়সূচি (সকাল ৬টা থেকে রাত ১২টা) নির্বাচন করুন।
3. **কনফার্মেশন ও QR কোড:** বুকিং কনফার্ম হলে সাথে সাথেই আপনার ড্যাশবোর্ডে ডিজিটাল **QR Entry Pass** পাবেন যা মাঠে প্রবেশের সময় স্ক্যান করা হবে।`;
      }
      return `### ⚽ How to Book a Turf Ground:
1. Go to **Playgrounds** tab from the top menu or dashboard.
2. Choose your preferred venue (Football, Cricket, Futsal, Badminton).
3. Pick your desired date and active hourly time slot (6:00 AM – 12:00 AM).
4. Complete your reservation to instantly generate your **Gate QR Entry Pass** in your dashboard!`;
    }

    // 3. Tournaments, Draw, Lottery
    if (q.includes("tourney") || q.includes("tournament") || q.includes("lottery") || q.includes("draw") || q.includes("fixture") || q.includes("টুর্নামেন্ট") || q.includes("লটারি")) {
      if (isBangla) {
        return `### 🏆 টুর্নামেন্ট ও লাইভ লটারি সিস্টেম:
• **লাইভ ড্র (Live Lottery Draw):** টুর্নামেন্ট শুরুর ঠিক ১ দিন আগে ভেন্যু অ্যাডমিন লাইভ লটারির মাধ্যমে গ্রুপ ও ফিক্সচার তৈরি করেন।
• **গ্রুপ ও নকআউট:** প্রতিটি দল গ্রুপ পর্বে ম্যাচ খেলবে এবং কোয়ালিফাই করা দলগুলো কোয়ার্টার, সেমি ও ফাইনালে উঠবে।
• **ফলাফল ও ট্রফি:** প্রতিটি ম্যাচের লাইভ স্কোরবোর্ড ও ফলাফল সরাসরি TURF প্ল্যাটফর্মে রিয়েল-টাইমে আপডেট হয়!`;
      }
      return `### 🏆 Tournaments & Official Live Draw:
• **Live Team Lottery:** 1 day before the tournament commences, the playground administrator conducts the official Live Draw ceremony where all verified teams are randomly distributed into group stages.
• **Competition Structure:** Teams play group-stage matches followed by Quarter-finals, Semi-finals, and the Grand Final.
• **Live Standings:** Points tables and fixtures update dynamically on the platform after every match.`;
    }

    // 4. Rain & Weather Rescheduling
    if (q.includes("rain") || q.includes("weather") || q.includes("bristi") || q.includes("বৃষ্টি") || q.includes("reschedule")) {
      if (isBangla) {
        return `### 🌦️ বৃষ্টি বা প্রতিকূল আবহাওয়া সংক্রান্ত নিয়ম:
• ভারী বৃষ্টি বা বিদ্যুতের সমস্যার কারণে যদি মাঠ খেলার অনুপযোগী হয়, তবে ভেন্যু অ্যাডমিন তাৎক্ষণিকভাবে ম্যাচটি অফিশিয়ালি স্থগিত করবেন।
• অ্যাডমিন নতুন তারিখ ও সময় ঘোষণা করবেন এবং কোনো পর্ব অসমাপ্ত রেখে পরবর্তী পর্বের খেলা শুরু হবে না। খেলোয়াড়দের ফোনে মেসেজ পাঠানো হয়।`;
      }
      return `### 🌦️ Rain & Weather Policy:
• If severe rain or ground conditions make play unsafe, the playground administrator logs an official delay reason.
• The match is rescheduled to a mutually approved time. Next-round knockout matches remain locked until all preceding matches are officially played.`;
    }

    // 5. QR Code & Gate Entry
    if (q.includes("qr") || q.includes("gate") || q.includes("scanner") || q.includes("pass") || q.includes("entry") || q.includes("গেটের")) {
      if (isBangla) {
        return `### 🎫 ডিজিটাল QR গেট পাস সিস্টেম:
• আপনার প্রতিটি কনফার্মড বুকিং এবং টুর্নামেন্ট এন্ট্রির জন্য একটি ডায়নামিক QR কোড তৈরি হয়।
• মাঠে পৌঁছানোর পর ভেন্যুর গেট সিকিউরিটি/স্টাফ তাদের TURF QR Scanner দিয়ে আপনার টিকিট স্ক্যান করবেন। একবার স্ক্যান হওয়ার সাথে সাথেই সবুজ ভেরিফিকেশন সিগন্যাল ও অডিও বীপ শোনা যাবে।`;
      }
      return `### 🎫 Digital QR Gate Pass System:
• Every confirmed ground reservation and paid tournament ticket generates a dynamic QR Code.
• Upon arrival at the venue gate, the security/staff scanner scans your QR pass to check you in seamlessly with zero paper tickets needed.`;
    }

    // 6. Grounds in Dhaka
    if (q.includes("dhaka") || q.includes("venue") || q.includes("location") || q.includes("best") || q.includes("dhanmondi") || q.includes("uttara") || q.includes("মিরপুর")) {
      if (isBangla) {
        return `### 📍 ঢাকার শীর্ষ টার্ফ মাঠসমূহ:
• **Dhanmondi Arena:** আন্তর্জাতিক মানের কৃত্রিম ঘাস, চমৎকার ফ্লাডলাইট এবং ড্রেসিংরুম সুবিধা।
• **Uttara Sports Complex:** ফুটসাল ও ৭-এ-সাইড ফুটবলের জন্য সেরা।
• **Gulshan & Banani Turf:** প্রিমিয়াম নাইট ম্যাচ সুবিধা ও ক্যাফে লাউঞ্জ।
• **Mirpur Turf Hub:** বাজেট-বান্ধব ও চমৎকার পার্কিং সুবিধা।
[প্লে-গ্রাউন্ডস ব্রাউজ করুন](#venues) সরাসরি বুকিং করার জন্য!`;
      }
      return `### 📍 Top Featured Turfs in Dhaka:
• **Dhanmondi Arena:** FIFA-standard artificial grass, powerful LED floodlights & parking.
• **Uttara Turf & Sports Hub:** Perfect for 7-a-side Football & Box Cricket.
• **Gulshan/Banani Rooftop Turf:** Premium night games with corporate amenities.
• **Mirpur Turf Zone:** High-durability turf with affordable hourly rates.
Explore all grounds by navigating to **Playgrounds** tab!`;
    }

    // 7. Bengali General
    if (isBangla) {
      return `আমি আপনার প্রশ্নের উত্তর দিতে প্রস্তুত! আপনি স্লট বুকিং, টুর্নামেন্ট রেজিস্ট্রেশন, লাইভ ড্র, টাকা রিফান্ড বা বৃষ্টিতে ম্যাচ পেছানো নিয়ে যে কোনো প্রশ্ন করতে পারেন।

**প্রয়োজনীয় লিংক:**
• [মাঠ খুঁজুন](#venues)
• [চলমান টুর্নামেন্ট](#tournaments)
• [আমার ড্যাশবোর্ড ও QR পাস](#dashboard)`;
    }

    // Default English response
    return `### 🤖 TURF Assistant Information
Thank you for your question! Here is how TURF works:
• **Playgrounds:** Search venues across Dhaka with artificial grass, floodlights, and premium amenities.
• **Real-time Slots:** Reserve daytime or night slots with immediate digital QR receipt generation.
• **Tournaments:** Register your team, participate in official live group lotteries, and battle for championship trophies.
• **Direct Support:** You can also switch to the **Venue Messenger** tab above to chat directly with venue managers.

Need a specific answer? Try typing *"How do I cancel?"* or *"How to register for tournament?"*`;
  };

  // Handle Send in AI Mode
  const handleAiSend = (textToSend) => {
    const messageText = (textToSend || input).trim();
    if (!messageText) return;

    const userMsg = {
      id: "u-" + Date.now(),
      sender: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setAiMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Realistic typing response delay
    setTimeout(() => {
      const replyText = generateAiAnswer(messageText);
      const aiReply = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        quickChips: [
          "⚽ How to book a ground?",
          "🏆 Tournament lottery & draw",
          "💸 Refund policy",
          "🎫 QR Gate Pass"
        ]
      };
      setAiMessages((prev) => [...prev, aiReply]);
      setIsTyping(false);
    }, 600);
  };

  // Handle Send in Venue Messenger Mode
  const handleMessengerSend = async () => {
    const text = input.trim();
    if (!text || !activeContact) return;

    const recipientId = activeContact.id || activeContact._id;
    const tempMsg = {
      _id: "tmp-" + Date.now(),
      sender: user?._id || "me",
      recipient: recipientId,
      message: text,
      createdAt: new Date().toISOString()
    };

    setThreadMessages((prev) => [...prev, tempMsg]);
    setInput("");

    try {
      await request("/chat/send-message", {
        method: "POST",
        token,
        body: { recipient: recipientId, message: text }
      });
      loadThreadMessages(recipientId);
    } catch (err) {
      setMessengerError(err.message || "Failed to send message.");
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (mode === "ai") {
      handleAiSend();
    } else {
      handleMessengerSend();
    }
  };

  return (
    <div className={`ai-messenger-container ${embedded ? "embedded-mode" : "modal-floating-mode"}`}>
      {/* Messenger Header Bar */}
      <header className="ai-messenger-header">
        <div className="header-identity">
          <div className="ai-copilot-avatar">
            {mode === "ai" ? "🤖" : (activeContact?.name?.[0] || "💬").toUpperCase()}
            <span className="online-beacon" />
          </div>
          <div className="identity-copy">
            <div className="identity-title-row">
              <h3>{mode === "ai" ? "TURF AI Copilot" : (activeContact?.name || "Venue Messenger")}</h3>
              <span className="ai-badge">{mode === "ai" ? "GPT Engine Active" : "Direct Chat"}</span>
            </div>
            <p>
              {mode === "ai"
                ? "24/7 Smart Assistance for bookings, rules & venues"
                : (activeContact?.playground?.name || activeContact?.role?.replace("-", " ") || "Live Support Desk")}
            </p>
          </div>
        </div>

        <div className="header-actions">
          {/* Mode Switcher Pills */}
          <div className="mode-segmented-control">
            <button
              type="button"
              className={`mode-btn ${mode === "ai" ? "active" : ""}`}
              onClick={() => setMode("ai")}
            >
              🤖 AI Copilot
            </button>
            <button
              type="button"
              className={`mode-btn ${mode === "messenger" ? "active" : ""}`}
              onClick={() => setMode("messenger")}
            >
              💬 Venue Chat
            </button>
          </div>

          {onClose && (
            <button type="button" className="close-messenger-btn" onClick={onClose} aria-label="Close Chat">
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Main Body Area */}
      <div className="ai-messenger-body">
        {/* ========================================================
            MODE 1: TURF AI COPILOT
            ======================================================== */}
        {mode === "ai" && (
          <div className="ai-thread-viewport">
            <div className="ai-messages-list">
              {aiMessages.map((msg) => (
                <div key={msg.id} className={`chat-bubble-row ${msg.sender}`}>
                  <div className="chat-bubble">
                    <div className="bubble-content">
                      {msg.text.split("\n").map((line, idx) => {
                        if (line.startsWith("### ")) {
                          return <h4 key={idx} className="bubble-heading">{line.replace("### ", "")}</h4>;
                        }
                        if (line.startsWith("• ")) {
                          return <li key={idx} className="bubble-bullet">{line.replace("• ", "")}</li>;
                        }
                        if (line.trim().startsWith("[") && line.includes("](#")) {
                          const match = line.match(/\[(.*?)\]\((.*?)\)/);
                          if (match) {
                            return (
                              <button
                                key={idx}
                                type="button"
                                className="bubble-link-btn"
                                onClick={() => navigate && navigate(match[2].replace("#", ""))}
                              >
                                {match[1]} →
                              </button>
                            );
                          }
                        }
                        return line ? <p key={idx}>{line}</p> : <div key={idx} style={{ height: "4px" }} />;
                      })}
                    </div>
                    <span className="bubble-timestamp">{msg.timestamp}</span>
                  </div>

                  {msg.quickChips && msg.quickChips.length > 0 && (
                    <div className="quick-chips-track">
                      {msg.quickChips.map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          className="quick-chip-pill"
                          onClick={() => handleAiSend(chip)}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="chat-bubble-row ai">
                  <div className="chat-bubble typing-indicator-bubble">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* ========================================================
            MODE 2: DIRECT VENUE MESSENGER
            ======================================================== */}
        {mode === "messenger" && (
          <div className="venue-messenger-layout">
            {/* Contacts Sidebar */}
            <aside className="messenger-contacts-aside">
              <div className="contacts-aside-header">
                <strong>Conversations</strong>
                <span>{contacts.length} Available</span>
              </div>
              <div className="contacts-scroll-list">
                {loadingContacts ? (
                  <p className="messenger-status-copy">Loading contacts…</p>
                ) : contacts.length > 0 ? (
                  contacts.map((c) => {
                    const cId = c.id || c._id;
                    const isSelected = (activeContact?.id || activeContact?._id) === cId;
                    return (
                      <div
                        key={cId}
                        className={`contact-card ${isSelected ? "selected" : ""}`}
                        onClick={() => setActiveContact(c)}
                      >
                        <div className="contact-avatar">{c.name?.[0] || "V"}</div>
                        <div className="contact-card-copy">
                          <strong>{c.name}</strong>
                          <span>{c.playground?.name || c.role?.replace("-", " ")}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="messenger-status-copy">No venue contacts found. Try AI Copilot mode!</p>
                )}
              </div>
            </aside>

            {/* Conversation Thread */}
            <section className="messenger-thread-section">
              {activeContact ? (
                <>
                  <div className="thread-contact-subhead">
                    <div>
                      <strong>{activeContact.name}</strong>
                      <span>{activeContact.playground?.name || activeContact.role}</span>
                    </div>
                    {activeContact.playground?.phone && (
                      <span className="contact-phone-chip">📞 {activeContact.playground.phone}</span>
                    )}
                  </div>

                  <div className="messenger-messages-list">
                    {loadingMessages ? (
                      <p className="messenger-status-copy">Loading conversation history…</p>
                    ) : threadMessages.length > 0 ? (
                      threadMessages.map((m) => {
                        const isMine = m.sender === (user?._id || user?.id);
                        return (
                          <div key={m._id} className={`chat-bubble-row ${isMine ? "user" : "ai"}`}>
                            <div className="chat-bubble">
                              <p>{m.message}</p>
                              <span className="bubble-timestamp">
                                {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="thread-empty-state">
                        <span>💬</span>
                        <p>No messages yet. Send a message to start chatting with {activeContact.name}!</p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </>
              ) : (
                <div className="thread-empty-state">
                  <span>👈</span>
                  <p>Select a venue contact to begin chatting.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Composer Input Bar */}
      <footer className="ai-messenger-composer">
        {messengerError && <div className="messenger-error-banner">{messengerError}</div>}
        <form onSubmit={handleFormSubmit} className="composer-form">
          <input
            type="text"
            className="composer-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === "ai"
                ? "Ask TURF AI anything (e.g. 'How to book a slot?', 'Refund rules')..."
                : `Message ${activeContact?.name || "venue admin"}...`
            }
            maxLength={1200}
          />
          <button
            type="submit"
            className="composer-send-btn"
            disabled={!input.trim()}
            title="Send Message"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </footer>
    </div>
  );
}
