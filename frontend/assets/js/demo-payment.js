/**
 * Demo payment gateway controller.
 * Displays the selected payment method, validates demo wallet/card details,
 * completes or cancels the checkout, then opens the receipt on success.
 */
// ===================================================
// Payment Checkout Setup & API Access
// ===================================================
const API = "https://smart-playground-booking-tournament.onrender.com/api/v1";
const token = localStorage.getItem("authToken");
const paymentId = new URLSearchParams(location.search).get("payment");
const card = document.querySelector("#checkout-card");
const backLink = document.querySelector("#back-link");

if (!token) location.replace("login.html");
if (!paymentId) location.replace("booking.html");

// Makes an authenticated API request and returns only the data payload.
const req = async (path, options = {}) => {
    const response = await fetch(API + path, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });

    const body = await response.json();
    if (!response.ok) {
        throw new Error(body.message || "Payment service is unavailable.");
    }

    return body.data;
};

// Escapes dynamic text before it is inserted into an HTML template.
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => (
    {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
    }[character]
));

// Formats amounts as Bangladeshi Taka without decimal places.
const money = (amount) => new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
}).format(amount);

const configs = {
    bKash: { color: "#e2136e", intro: "Pay safely from your bKash account." },
    Nagad: { color: "#f05a28", intro: "Approve this payment from your Nagad account." },
    Rocket: { color: "#8149a0", intro: "Use your Rocket account to finish this payment." },
    Card: { color: "#1769aa", intro: "Enter your card details to continue." },
};

let checkout;

// Returns the booking or tournament name shown in the checkout summary.
const orderName = (payment) => {
    if (payment.booking) {
        return `${payment.booking.playground?.name || "Playground"} slot`;
    }

    return payment.tournamentTeam?.tournament?.name || "Tournament registration";
};

// Displays the demonstration-only security notice below each payment form.
const securityNote = () => `
    <p class="secure">
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V6Z"/>
        </svg>
        For this demonstration, details are checked only for format and are never stored.
    </p>
`;

// Renders the shared provider header, progress bar, and order summary.
function shell(content, step = 1) {
    const config = configs[checkout.payment.paymentMethod];

    card.innerHTML = `
        <header class="provider-head" style="--provider:${config.color}">
            <div class="provider-brand">
                <strong>${esc(checkout.payment.paymentMethod)}</strong>
                <span>Secure payment</span>
            </div>
            <p>${config.intro}</p>
        </header>
        <div class="checkout-content" style="--provider:${config.color}">
            <div class="progress">
                <span class="active">1</span><i></i>
                <span class="${step === 2 ? "active" : ""}">2</span><i></i>
                <span>3</span>
            </div>
            <div class="order">
                <div>
                    <span>Paying to</span>
                    <b>TURF · ${esc(orderName(checkout.payment))}</b>
                    <span>Reference ${esc(checkout.checkout.reference)}</span>
                </div>
                <strong>${money(checkout.checkout.amount)}</strong>
            </div>
            <p id="message" class="message"></p>
            ${content}
            ${securityNote()}
        </div>
    `;
}

// Shows an API or form-validation error inside the current checkout screen.
function showError(message) {
    const box = document.querySelector("#message");
    box.textContent = message;
    box.classList.add("show");
}

// Shows the first wallet step, where the customer enters their mobile number.
function walletStart() {
    shell(`
        <form id="wallet-start">
            <div class="field">
                <label for="mobile">${esc(checkout.payment.paymentMethod)} account number</label>
                <input id="mobile" inputmode="numeric" autocomplete="tel" placeholder="01XXXXXXXXX" maxlength="11" required>
                <p class="hint">Enter an 11-digit Bangladeshi number to continue.</p>
            </div>
            <div class="actions">
                <button class="primary">Continue</button>
                <button type="button" class="cancel" data-cancel>Cancel payment</button>
            </div>
        </form>
    `);

    document.querySelector("#wallet-start").onsubmit = (event) => {
        event.preventDefault();
        const mobile = document.querySelector("#mobile").value.replace(/\D/g, "");

        if (!/^01\d{9}$/.test(mobile)) {
            showError("Enter an 11-digit Bangladeshi mobile number.");
            return;
        }

        walletVerify(mobile);
    };

    bindCancel();
}

// Shows the second wallet step, where the customer confirms PIN and OTP.
function walletVerify(mobile) {
    shell(`
        <form id="wallet-verify">
            <div class="field">
                <label>Account number</label>
                <input value="${esc(mobile)}" disabled>
            </div>
            <div class="field">
                <label for="pin">${esc(checkout.payment.paymentMethod)} PIN</label>
                <input id="pin" type="password" inputmode="numeric" autocomplete="off" placeholder="Enter payment PIN" minlength="4" maxlength="6" required>
            </div>
            <div class="field">
                <label for="otp">Verification code</label>
                <input id="otp" inputmode="numeric" autocomplete="one-time-code" placeholder="Enter 6-digit verification code" maxlength="6" required>
                <p class="hint">A verification code was sent to the number above.</p>
            </div>
            <div class="actions">
                <button class="primary" id="confirm">Confirm payment</button>
                <button type="button" class="cancel" data-cancel>Cancel payment</button>
            </div>
        </form>
    `, 2);

    document.querySelector("#wallet-verify").onsubmit = (event) => {
        event.preventDefault();
        complete({
            mobileNumber: mobile,
            pin: document.querySelector("#pin").value,
            otp: document.querySelector("#otp").value,
        });
    };

    bindCancel();
}

// Shows the card-details form, which is the card provider's confirmation step.
function cardForm() {
    shell(`
        <form id="card-form">
            <div class="field">
                <label for="card-number">Card number</label>
                <input id="card-number" inputmode="numeric" autocomplete="cc-number" placeholder="4111 1111 1111 1111" maxlength="23" required>
                <p class="hint">Enter a valid card number.</p>
            </div>
            <div class="split">
                <div class="field">
                    <label for="expiry">Expiry</label>
                    <input id="expiry" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5" required>
                </div>
                <div class="field">
                    <label for="cvv">CVV</label>
                    <input id="cvv" type="password" inputmode="numeric" autocomplete="cc-csc" placeholder="•••" maxlength="4" required>
                </div>
            </div>
            <div class="actions">
                <button class="primary" id="confirm">Pay ${money(checkout.checkout.amount)}</button>
                <button type="button" class="cancel" data-cancel>Cancel payment</button>
            </div>
        </form>
    `, 2);

    document.querySelector("#card-form").onsubmit = (event) => {
        event.preventDefault();
        complete({
            cardNumber: document.querySelector("#card-number").value,
            expiry: document.querySelector("#expiry").value,
            cvv: document.querySelector("#cvv").value,
        });
    };

    bindCancel();
}

// Completes the pending payment and opens its receipt after a successful response.
async function complete(credentials) {
    const button = document.querySelector("#confirm");
    button.disabled = true;
    button.textContent = "Confirming securely…";

    try {
        const result = await req(`/payments/demo/checkout/${paymentId}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
        });

        location.replace(`receipt.html?payment=${result.payment._id}`);
    } catch (error) {
        button.disabled = false;
        button.textContent = "Confirm payment";
        showError(error.message);
    }
}

// Cancels the pending checkout only after the user confirms the action.
function bindCancel() {
    document.querySelector("[data-cancel]").onclick = async () => {
        const approved = await TurfDialog.confirm({
            title: "Cancel this payment?",
            message: "Are you sure you want to cancel this pending payment? No amount has been charged.",
            confirmLabel: "Cancel payment",
        });

        if (!approved) return;

        try {
            await req(`/payments/demo/checkout/${paymentId}/cancel`, {
                method: "POST",
            });
            location.replace("booking.html");
        } catch (error) {
            showError(error.message);
        }
    };
}

// Loads the pending checkout and chooses the correct form for its payment method.
(async () => {
    try {
        checkout = await req(`/payments/demo/checkout/${paymentId}`);

        if (checkout.payment.paymentStatus === "Paid") {
            location.replace(`receipt.html?payment=${paymentId}`);
            return;
        }

        if (checkout.payment.paymentStatus !== "Pending") {
            throw new Error("This checkout is no longer available.");
        }

        backLink.onclick = (event) => {
            event.preventDefault();
            document.querySelector("[data-cancel]").click();
        };

        if (checkout.payment.paymentMethod === "Card") {
            cardForm();
        } else {
            walletStart();
        }
    } catch (error) {
        card.innerHTML = `
            <div class="loading">
                ${esc(error.message)}
                <br><br>
                <a class="back" href="booking.html">Return to bookings</a>
            </div>
        `;
    }
})();
