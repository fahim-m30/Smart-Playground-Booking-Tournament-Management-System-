const { sendMessage, getContacts, getConversations, getMessages } = require("./chat.service");

const respond = (handler) => async (req, res) => {
    try {
        const data = await handler(req);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    sendMessage: respond((req) => sendMessage(req.body, req.user.userId, req.user.role)),
    getContacts: respond((req) => getContacts(req.user.userId, req.user.role, req.query.search)),
    getConversations: respond((req) => getConversations(req.user.userId, req.user.role)),
    getMessages: respond((req) => getMessages(req.user.userId, req.user.role, req.params.contactId)),
};
