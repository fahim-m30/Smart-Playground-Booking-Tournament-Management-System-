import { useState, useEffect, useRef, useMemo } from "react";
import "./AiMessenger.css";
import { request } from "../services/api";

// Subtle modern UI message chime
function playChime(isReceived = false) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const now = ctx.currentTime;
    if (isReceived) {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
    } else {
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5
    }
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  } catch {}
}

export default function AiMessenger({ token, user, initialContact, onClose, embedded = false, navigate }) {
  const role = user?.role || "customer";
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeContact, setActiveContact] = useState(initialContact || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");
  const [showVenueInfo, setShowVenueInfo] = useState(false);
  const [mobileView, setMobileView] = useState("list"); // "list" | "thread" on phone

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Load Contacts and Conversations on Mount
  useEffect(() => {
    if (!token) return;
    loadContactsAndConversations();
  }, [token, role]);

  const loadContactsAndConversations = async () => {
    setLoadingContacts(true);
    setErrorBanner("");
    try {
      const [conts, convs] = await Promise.all([
        request("/chat/contacts", { token }).catch(() => []),
        request("/chat/conversations", { token }).catch(() => [])
      ]);

      const rawContacts = Array.isArray(conts) ? conts : [];
      const rawConversations = Array.isArray(convs) ? convs : [];

      // Filter: Customer MUST NOT see system admin / super-admin
      const filteredContacts = rawContacts.filter((c) => {
        if (role === "customer") {
          return c.role === "playground-admin";
        }
        return true;
      });

      const filteredConversations = rawConversations.filter((cv) => {
        if (role === "customer") {
          return cv.contact?.role === "playground-admin";
        }
        return true;
      });

      setContacts(filteredContacts);
      setConversations(filteredConversations);

      // Select initial contact if provided or pick first conversation/contact
      if (initialContact) {
        setActiveContact(initialContact);
        setMobileView("thread");
      } else if (!activeContact) {
        if (filteredConversations.length > 0) {
          const first = filteredConversations[0];
          setActiveContact({
            ...(first.contact || {}),
            playground: first.playground || first.contact?.playground
          });
        } else if (filteredContacts.length > 0) {
          setActiveContact(filteredContacts[0]);
        }
      }
    } catch (err) {
      setErrorBanner(err.message || "Failed to load messenger contacts.");
    } finally {
      setLoadingContacts(false);
    }
  };

  // Load thread messages whenever activeContact changes
  useEffect(() => {
    const contactId = activeContact?.id || activeContact?._id;
    if (!contactId || !token) return;
    loadThread(contactId);
  }, [activeContact, token]);

  const loadThread = async (contactId) => {
    setLoadingMessages(true);
    try {
      const thread = await request(`/chat/contacts/${contactId}/messages`, { token });
      const rawList = Array.isArray(thread) ? thread : [];

      // If no messages yet, provide a smart welcome message from the AI
      if (rawList.length === 0) {
        const welcomeMessage = getWelcomeGreeting(activeContact);
        setMessages([
          {
            _id: "welcome-system",
            senderRole: "system",
            message: welcomeMessage,
            createdAt: new Date().toISOString()
          }
        ]);
      } else {
        setMessages(rawList);
      }
    } catch (err) {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Welcome greeting logic
  const getWelcomeGreeting = (contact) => {
    if (contact?.role === "super-admin") {
      return `স্বাগতম TURF সিস্টেম সাপোর্ট ডেস্কে! 🛡️ আমি প্ল্যাটফর্মের এআই অ্যাসিস্ট্যান্ট।
ভেন্যু অনুমোদন, স্লট কনফিগারেশন, পেমেন্ট ও পে-আউট, টুর্নামেন্ট আয়োজন বা স্টাফ স্ক্যানার পলিসি সম্পর্কে যেকোনো প্রশ্ন করতে পারেন। সিস্টেম সংক্রান্ত যে কোনো বিষয় আমি তাৎক্ষণিকভাবে বুঝিয়ে দিতে পারি। বিশেষ সহায়তার প্রয়োজন হলে সিস্টেম অ্যাডমিন সরাসরি যোগাযোগ করবেন।`;
    }
    const venueName = contact?.playground?.name || "TURF ভেন্যুতে";
    return `স্বাগতম ${venueName}! 👋 আমি এই মাঠের AI ভার্চুয়াল অ্যাসিস্ট্যান্ট।
মাঠের সুযোগ-সুবিধা, খেলার নিয়মাবলী (ফুটবল/ক্রিকেট), আজকের স্লটের সময় ও দাম বা টুর্নামেন্ট সম্পর্কে যেকোনো প্রশ্ন করতে পারেন। এর বাইরে যেকোনো প্রয়োজনে কিছুক্ষণের মধ্যে ভেন্যু প্রতিনিধি আপনার সাথে যোগাযোগ করবেন।`;
  };

  // Dynamic Suggestion Chips based on who you're chatting with
  const quickChips = useMemo(() => {
    if (activeContact?.role === "super-admin") {
      return [
        "📋 ভেন্যু লাইসেন্স ও অনুমোদন শর্তাবলী",
        "💰 পেমেন্ট ক্লিয়ারেন্স ও কমিশন নিয়ম",
        "🏆 টুর্নামেন্ট লাইভ লটারি ও ব্র্যাকেট নিয়ম",
        "👥 গেট স্টাফ ও QR স্ক্যানার কনফিগারেশন",
        "👨‍💻 সিস্টেম অ্যাডমিনের সরাসরি সহায়তা চাই"
      ];
    }
    const groundName = activeContact?.playground?.name || "মাঠের";
    return [
      `🏟️ ${groundName} সুযোগ-সুবিধা ও লোকেশন`,
      "⏰ আজকের উপলব্ধ স্লট ও রেট",
      "🏆 এই মাঠের টুর্নামেন্ট তথ্য",
      "💸 বুকিং বাতিল ও রিফান্ডের নিয়ম",
      "👟 কোন ধরনের জুতা/বুট পরে খেলা যাবে?",
      "👨‍💼 ভেন্যু ম্যানেজারের সাথে কথা বলতে চাই"
    ];
  }, [activeContact]);

  // Filtered contacts list for sidebar
  const filteredContactsList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const venue = (c.playground?.name || "").toLowerCase();
      const sport = (c.playground?.sportType || "").toLowerCase();
      const addr = (c.playground?.address || "").toLowerCase();
      return name.includes(q) || venue.includes(q) || sport.includes(q) || addr.includes(q);
    });
  }, [contacts, search]);

  // Handle Send Message
  const handleSend = async (messageText) => {
    const text = (messageText || input).trim();
    if (!text || !activeContact || isSending) return;

    const contactId = activeContact.id || activeContact._id;
    const tempUserMsg = {
      _id: "temp-" + Date.now(),
      sender: user?._id || user?.id,
      recipient: contactId,
      message: text,
      senderRole: role,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInput("");
    setIsSending(true);
    playChime(false);

    try {
      const res = await request("/chat/send-message", {
        method: "POST",
        token,
        body: {
          recipient: contactId,
          message: text
        }
      });

      // The backend returns { chat, botReply }
      if (res?.botReply) {
        setTimeout(() => {
          setMessages((prev) => [...prev, res.botReply]);
          playChime(true);
        }, 500);
      } else {
        // Fallback local smart response if bot reply was omitted
        setTimeout(() => {
          generateFallbackAiResponse(text, activeContact);
        }, 600);
      }
    } catch (err) {
      setErrorBanner(err.message || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  // Local fallback smart response if server concierge already answered or offline
  const generateFallbackAiResponse = (userText, contact) => {
    const q = userText.toLowerCase();
    const isSuperAdmin = contact?.role === "super-admin";
    const venueName = contact?.playground?.name || "TURF ভেন্যু";

    let reply = "";
    if (isSuperAdmin) {
      if (q.includes("approve") || q.includes("অনুমোদন")) {
        reply = "TURF ভেন্যু অনুমোদন নিয়ম: নতুন ভেন্যু যুক্ত করার পর সিস্টেম অ্যাডমিন ভেন্যুর লাইসেন্স, ঠিকানা, ছবি ও ফেসিলিটি যাচাই করে ২৪–৪৮ ঘণ্টার মধ্যে অনুমোদন করেন।";
      } else if (q.includes("commission") || q.includes("payout") || q.includes("টাকা") || q.includes("কমিশন")) {
        reply = "পেমেন্ট ও পে-আউট নিয়ম: কাস্টমারদের অনলাইন ও ক্যাশ বুকিং সরাসরি ড্যাশবোর্ডে ট্র্যাক হয়। প্ল্যাটফর্ম ফি সমন্বয়ের পর প্রতি সপ্তাহের শেষে পে-আউট ক্লিয়ারেন্স সম্পন্ন হয়।";
      } else {
        reply = "কিছুক্ষণের মধ্যে সিস্টেম অ্যাডমিন সরাসরি আপনার সাথে যোগাযোগ করবেন। আপনার অনুরোধটি প্ল্যাটফর্ম অ্যাডমিনের কাছে পাঠানো হয়েছে। (A system administrator will assist you directly shortly.)";
      }
    } else {
      if (q.includes("cancel") || q.includes("refund") || q.includes("বাতিল") || q.includes("ফেরত")) {
        reply = `বুকিং বাতিল ও রিফান্ডের নিয়ম: খেলার নির্ধারিত সময়ের অন্তত ২ ঘণ্টা আগে স্লট বাতিল করলে অনুমোদিত ক্যাশ রিফান্ড পাওয়া যায়, যা ${venueName}-এর অফিস থেকে সংগ্রহ করতে পারবেন।`;
      } else if (q.includes("facility") || q.includes("সুবিধা") || q.includes("location") || q.includes("ঠিকানা") || q.includes("মাঠ")) {
        const addr = contact?.playground?.address || "ঢাকা";
        reply = `${venueName} (${addr})-এ আন্তর্জাতিক মানের কৃত্রিম ঘাস, চমৎকার ফ্লাডলাইট, নিরাপদ ড্রেসিংরুম ও পার্কিং সুবিধা রয়েছে। উপরে দেওয়া 'Open Map' বাটনে ক্লিক করে লাইভ ম্যাপ দেখতে পারেন।`;
      } else if (q.includes("shoe") || q.includes("boot") || q.includes("জুতা") || q.includes("বুট") || q.includes("stud")) {
        reply = `${venueName}-এ কৃত্রিম ঘাসের সুরক্ষায় সাধারণ টার্ফ শু (Turf Shoes) বা রাবার স্টাড (Rubber Studs) ব্যবহার করতে হবে। ধাতব স্পাইক বুট মাঠে সম্পূর্ণ নিষিদ্ধ।`;
      } else if (q.includes("slot") || q.includes("time") || q.includes("স্লট") || q.includes("দাম") || q.includes("price")) {
        reply = `${venueName}-এর স্লট প্রতিদিন সকাল ৬:০০ থেকে রাত ১২:০০ টা পর্যন্ত খোলা থাকে। আপনার পছন্দের তারিখ ও সময় জানাতে পারেন অথবা সরাসরি ড্যাশবোর্ড থেকে স্লট কনফার্ম করতে পারেন।`;
      } else {
        reply = "কিছুক্ষণের মধ্যে আপনার সাথে আমাদের প্রতিনিধি যোগাযোগ করবে। আপনার বার্তাটি ভেন্যু অ্যাডমিনের পর্যালোচনার জন্য পাঠানো হয়েছে। (A venue representative will contact you shortly.)";
      }
    }

    const aiMsg = {
      _id: "local-ai-" + Date.now(),
      senderRole: "system",
      message: reply,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, aiMsg]);
    playChime(true);
  };

  // Check if a message is an escalation / handoff
  const isHandoffMessage = (msgText) => {
    return (
      msgText.includes("কিছুক্ষণের মধ্যে আপনার সাথে আমাদের প্রতিনিধি যোগাযোগ করবে") ||
      msgText.includes("কিছুক্ষণের মধ্যে সিস্টেম অ্যাডমিন") ||
      msgText.includes("representative will contact you shortly") ||
      msgText.includes("system administrator will assist you")
    );
  };

  const handleContactSelect = (contact) => {
    setActiveContact(contact);
    setMobileView("thread");
    setShowVenueInfo(false);
  };

  return (
    <div className={`ai-messenger-container ${embedded ? "embedded-mode" : "modal-floating-mode"}`}>
      {/* 1. TOP HEADER */}
      <header className="ai-messenger-header">
        <div className="header-identity">
          {mobileView === "thread" && (
            <button
              type="button"
              className="mobile-back-to-contacts-btn"
              onClick={() => setMobileView("list")}
              title="Back to Contacts"
            >
              ←
            </button>
          )}

          <div className="ai-copilot-avatar">
            {activeContact?.role === "super-admin"
              ? "🛡️"
              : (activeContact?.playground?.name?.[0] || activeContact?.name?.[0] || "🏟️").toUpperCase()}
            <span className="online-beacon" />
          </div>

          <div className="identity-copy">
            <div className="identity-title-row">
              <h3>
                {activeContact?.role === "super-admin"
                  ? "TURF Platform Support"
                  : (activeContact?.playground?.name || activeContact?.name || "TURF AI Messenger")}
              </h3>
              <span className="ai-badge">
                {activeContact?.role === "super-admin" ? "🛡️ System AI Active" : "🤖 Venue AI Active"}
              </span>
            </div>
            <p>
              {activeContact?.role === "super-admin"
                ? "Platform Verification, Payouts & Administration"
                : (activeContact?.playground?.address || activeContact?.role?.replace("-", " ") || "24/7 Playground & Game Assistant")}
            </p>
          </div>
        </div>

        <div className="header-actions">
          {activeContact?.playground && (
            <button
              type="button"
              className={`venue-info-toggle-btn ${showVenueInfo ? "active" : ""}`}
              onClick={() => setShowVenueInfo(!showVenueInfo)}
              title="Toggle Venue Details"
            >
              ℹ️ Details
            </button>
          )}

          {onClose && (
            <button type="button" className="close-messenger-btn" onClick={onClose} aria-label="Close Chat">
              ✕
            </button>
          )}
        </div>
      </header>

      {/* 2. VENUE DETAILS SUB-BANNER (If available) */}
      {showVenueInfo && activeContact?.playground && (
        <div className="venue-details-drawer">
          <div className="venue-drawer-grid">
            <div>
              <strong>📍 Location:</strong>
              <span>{activeContact.playground.address || "Dhaka, Bangladesh"}</span>
            </div>
            <div>
              <strong>⚽ Sport:</strong>
              <span>{activeContact.playground.sportType || "Football & Box Cricket"}</span>
            </div>
            {activeContact.phone && (
              <div>
                <strong>📞 Phone:</strong>
                <span>{activeContact.phone}</span>
              </div>
            )}
            {activeContact.playground.googleMapLocation && (
              <div>
                <strong>🗺️ Map:</strong>
                <a
                  href={activeContact.playground.googleMapLocation}
                  target="_blank"
                  rel="noreferrer"
                  className="open-map-link-btn"
                >
                  Open in Google Maps →
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. MAIN MESSENGER BODY (Split View: Contacts Left, Chat Thread Right) */}
      <div className="ai-messenger-body">
        {/* Contacts Sidebar (Venues / Admins) */}
        <aside className={`messenger-contacts-aside ${mobileView === "list" ? "mobile-show" : "mobile-hide"}`}>
          <div className="contacts-aside-header">
            <strong>
              {role === "customer" ? "Playground Venues" : "Conversations"}
            </strong>
            <span>{filteredContactsList.length} Active</span>
          </div>

          {/* Search bar */}
          <div className="contacts-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="search"
              placeholder={role === "customer" ? "Search venues or turfs..." : "Search contacts..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="contacts-scroll-list">
            {loadingContacts ? (
              <p className="messenger-status-copy">Loading playgrounds…</p>
            ) : filteredContactsList.length > 0 ? (
              filteredContactsList.map((contact) => {
                const cId = contact.id || contact._id;
                const isSelected = (activeContact?.id || activeContact?._id) === cId;
                const isSys = contact.role === "super-admin";
                return (
                  <div
                    key={cId}
                    className={`contact-card ${isSelected ? "selected" : ""}`}
                    onClick={() => handleContactSelect(contact)}
                  >
                    <div className={`contact-avatar ${isSys ? "sys-avatar" : ""}`}>
                      {isSys ? "🛡️" : (contact.playground?.name?.[0] || contact.name?.[0] || "🏟️").toUpperCase()}
                    </div>
                    <div className="contact-card-copy">
                      <strong>{contact.playground?.name || contact.name}</strong>
                      <span>
                        {isSys
                          ? "Platform Operations"
                          : (contact.playground?.sportType ? `⚽ ${contact.playground.sportType}` : contact.name)}
                      </span>
                    </div>
                    <span className="contact-live-dot" title="AI Ready" />
                  </div>
                );
              })
            ) : (
              <p className="messenger-status-copy">No venues found matching your search.</p>
            )}
          </div>
        </aside>

        {/* Conversation Thread Panel */}
        <section className={`messenger-thread-section ${mobileView === "thread" ? "mobile-show" : "mobile-hide"}`}>
          {activeContact ? (
            <>
              {/* Messages viewport */}
              <div className="messenger-messages-list">
                {loadingMessages ? (
                  <p className="messenger-status-copy">Loading conversation history…</p>
                ) : messages.length > 0 ? (
                  messages.map((m, idx) => {
                    const isMine =
                      m.senderRole === role &&
                      (m.sender === (user?._id || user?.id) || m.senderRole !== "system");
                    const isAi = m.senderRole === "system";
                    const handoff = isAi && isHandoffMessage(m.message);

                    return (
                      <div
                        key={m._id || idx}
                        className={`chat-bubble-row ${isMine ? "user" : isAi ? "ai" : "admin"}`}
                      >
                        {/* Sender Label Badge */}
                        <div className="bubble-sender-badge">
                          {isMine ? (
                            <span>You</span>
                          ) : isAi ? (
                            <span className="badge-ai">🤖 {activeContact.role === "super-admin" ? "System AI" : "Venue AI"}</span>
                          ) : (
                            <span className="badge-admin">👨‍💼 {activeContact.role === "super-admin" ? "Super Admin" : "Venue Manager"}</span>
                          )}
                        </div>

                        {/* Bubble Content */}
                        <div className={`chat-bubble ${isAi ? "ai-style" : isMine ? "user-style" : "admin-style"}`}>
                          <div className="bubble-content">
                            {m.message.split("\n").map((line, lIdx) => {
                              if (line.startsWith("### ")) {
                                return <h4 key={lIdx} className="bubble-heading">{line.replace("### ", "")}</h4>;
                              }
                              if (line.startsWith("• ")) {
                                return <li key={lIdx} className="bubble-bullet">{line.replace("• ", "")}</li>;
                              }
                              return line ? <p key={lIdx}>{line}</p> : <div key={lIdx} style={{ height: "4px" }} />;
                            })}
                          </div>
                          <span className="bubble-timestamp">
                            {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        {/* Escalation alert banner if handoff triggered */}
                        {handoff && (
                          <div className="escalation-alert-banner">
                            <span className="escalation-icon">🔔</span>
                            <div>
                              <strong>
                                {activeContact.role === "super-admin"
                                  ? "সিস্টেম অ্যাডমিনের কাছে অনুরোধ পাঠানো হয়েছে"
                                  : "ভেন্যু ম্যানেজারের কাছে অনুরোধ পাঠানো হয়েছে"}
                              </strong>
                              <span>আমাদের প্রতিনিধি খুব শীঘ্রই আপনার সাথে সরাসরি যোগাযোগ করবে।</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="thread-empty-state">
                    <span>💬</span>
                    <p>
                      {activeContact.role === "super-admin"
                        ? "সিস্টেম সম্পর্কিত যেকোনো প্রশ্ন করুন। আমাদের প্ল্যাটফর্ম এআই আপনাকে সহায়তা করবে।"
                        : "মাঠের সুযোগ-সুবিধা, খেলার নিয়ম বা স্লট সম্পর্কে প্রশ্ন করুন।"}
                    </p>
                  </div>
                )}

                {isSending && (
                  <div className="chat-bubble-row ai">
                    <div className="bubble-sender-badge">
                      <span className="badge-ai">🤖 AI Answering…</span>
                    </div>
                    <div className="chat-bubble ai-style typing-indicator-bubble">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="thread-quick-chips-bar">
                {quickChips.map((chip, cIdx) => (
                  <button
                    key={cIdx}
                    type="button"
                    className="quick-chip-pill"
                    onClick={() => handleSend(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="thread-empty-state">
              <span>👈</span>
              <p>বামপাশের তালিকা থেকে যেকোনো ভেন্যু বা অ্যাডমিন নির্বাচন করুন।</p>
            </div>
          )}
        </section>
      </div>

      {/* 4. COMPOSER BAR */}
      <footer className="ai-messenger-composer">
        {errorBanner && <div className="messenger-error-banner">{errorBanner}</div>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="composer-form"
        >
          <input
            type="text"
            className="composer-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeContact?.role === "super-admin"
                ? "সিস্টেম পলিসি বা অ্যাডমিন সংক্রান্ত প্রশ্ন লিখুন..."
                : `${activeContact?.playground?.name || "মাঠ"} বা খেলার নিয়ম সম্পর্কে প্রশ্ন লিখুন...`
            }
            maxLength={1200}
            disabled={!activeContact || isSending}
          />
          <button
            type="submit"
            className="composer-send-btn"
            disabled={!input.trim() || !activeContact || isSending}
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
