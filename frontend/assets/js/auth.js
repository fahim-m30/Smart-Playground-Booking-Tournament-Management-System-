const BASE_URL = "https://smart-playground-booking-tournament.onrender.com/api/v1/auth";

const toggleOwnerFields = () => {
    const accountType = document.querySelector("#accountType")?.value;
    const ownerFields = document.querySelector("#ownerFields");
    if (ownerFields) {
        ownerFields.style.display = accountType === "owner" ? "grid" : "none";
    }
};

const showMessage = (container, message, type = "error") => {
    if (!container) return;
    container.innerHTML = `<div class="auth-alert auth-alert--${type}">${message}</div>`;
};

const handleResponse = async (response, messageContainer, successRedirect) => {
    const data = await response.json();
    if (response.ok) {
        showMessage(messageContainer, data.message || "Success!", "success");
        if (successRedirect) {
            setTimeout(() => {
                window.location.href = successRedirect;
            }, 1200);
        }
    } else {
        showMessage(messageContainer, data.message || "Something went wrong.", "error");
    }
};

const getQueryParam = (name) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || "";
};

const getDashboardRedirect = (user) => {
    // One role-aware dashboard keeps every account in the correct workspace.
    return user?.role ? "dashboard.html" : "index.html";
};

const registerForm = document.querySelector("#register-form");
const loginForm = document.querySelector("#login-form");
const verifyOtpForm = document.querySelector("#verify-otp-form");
const forgotPasswordForm = document.querySelector("#forgot-password-form");
const resetPasswordForm = document.querySelector("#reset-password-form");
let registrationSubmitting = false;

document.querySelectorAll(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
        const input = button.closest(".password-field")?.querySelector("input");
        if (!input) return;
        const visible = input.type === "text";
        input.type = visible ? "password" : "text";
        button.textContent = visible ? "Show" : "Hide";
        button.setAttribute("aria-label", visible ? "Show password" : "Hide password");
        button.setAttribute("aria-pressed", String(!visible));
    });
});

const previewImage = (input, previewBox) => {
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        previewBox.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
        previewBox.style.display = "block";
    };
    reader.readAsDataURL(file);
};

if (document.querySelector("#accountType")) {
    document.querySelector("#accountType").addEventListener("change", toggleOwnerFields);
    toggleOwnerFields();
}

if (document.querySelector("#profileImage") && document.querySelector("#profilePreview")) {
    document.querySelector("#profileImage").addEventListener("change", (event) => {
        previewImage(event.target, document.querySelector("#profilePreview"));
    });
}

if (document.querySelector("#nidFrontImage") && document.querySelector("#nidFrontPreview")) {
    document.querySelector("#nidFrontImage").addEventListener("change", (event) => {
        previewImage(event.target, document.querySelector("#nidFrontPreview"));
    });
}

if (document.querySelector("#nidBackImage") && document.querySelector("#nidBackPreview")) {
    document.querySelector("#nidBackImage").addEventListener("change", (event) => {
        previewImage(event.target, document.querySelector("#nidBackPreview"));
    });
}

if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = registerForm.name.value.trim();
        const email = registerForm.email.value.trim();
        const phone = registerForm.phone.value.trim();
        const password = registerForm.password.value;
        const confirmPassword = registerForm.confirmPassword.value;
        const accountType = registerForm.accountType?.value || "customer";
        const messageContainer = document.querySelector("#register-message");

        if (!name || !email || !phone || !password || !confirmPassword) {
            showMessage(messageContainer, "Please fill out all required fields.");
            return;
        }

        if (password !== confirmPassword) {
            showMessage(messageContainer, "Passwords do not match.");
            return;
        }

        if (registrationSubmitting) return;
        registrationSubmitting = true;
        const submitButton = registerForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton?.textContent;
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Sending OTP…";
        }

        const formData = new FormData();
        formData.append("name", name);
        formData.append("email", email);
        formData.append("phone", phone);
        formData.append("password", password);

        const profileImage = registerForm.profileImage?.files?.[0];
        if (profileImage) {
            formData.append("profileImage", profileImage);
        }

        if (accountType === "owner") {
            formData.append("nidNumber", registerForm.nidNumber?.value.trim() || "");

            const nidFrontImage = registerForm.nidFrontImage?.files?.[0];
            const nidBackImage = registerForm.nidBackImage?.files?.[0];
            if (nidFrontImage) formData.append("nidFrontImage", nidFrontImage);
            if (nidBackImage) formData.append("nidBackImage", nidBackImage);

            try {
                const response = await fetch(`${BASE_URL}/register-playground`, {
                    method: "POST",
                    body: formData,
                });

                await handleResponse(
                    response,
                    messageContainer,
                    `verify-otp.html?email=${encodeURIComponent(email)}`
                );
            } catch (error) {
                showMessage(messageContainer, "Unable to connect to the server.");
            } finally {
                registrationSubmitting = false;
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                }
            }
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/register`, {
                method: "POST",
                body: formData,
            });

            await handleResponse(
                response,
                messageContainer,
                `verify-otp.html?email=${encodeURIComponent(email)}`
            );
        } catch (error) {
            showMessage(messageContainer, "Unable to connect to the server.");
        } finally {
            registrationSubmitting = false;
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        }
    });
}

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = loginForm.email.value.trim();
        const password = loginForm.password.value;
        const messageContainer = document.querySelector("#login-message");

        if (!email || !password) {
            showMessage(messageContainer, "Please enter both email and password.");
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            if (response.ok) {
                const data = await response.json();
                showMessage(messageContainer, data.message || "Login successful.", "success");
                localStorage.setItem("authToken", data.data.accessToken);
                localStorage.setItem("authUser", JSON.stringify(data.data.user));
                const redirectPath = getDashboardRedirect(data.data.user);
                setTimeout(() => {
                    window.location.href = redirectPath;
                }, 1100);
            } else {
                const data = await response.json();
                showMessage(messageContainer, data.message || "Login failed.");
            }
        } catch (error) {
            showMessage(messageContainer, "Unable to connect to the server.");
        }
    });
}

if (verifyOtpForm) {
    const emailInput = verifyOtpForm.email;
    const prefilledEmail = getQueryParam("email");
    if (prefilledEmail) {
        emailInput.value = prefilledEmail;
    }

    verifyOtpForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = verifyOtpForm.email.value.trim();
        const otp = verifyOtpForm.otp.value.trim();
        const messageContainer = document.querySelector("#verify-message");

        if (!email || !otp) {
            showMessage(messageContainer, "Please enter both email and OTP.");
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/verify-otp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, otp }),
            });

            if (response.ok) {
                const data = await response.json();
                showMessage(messageContainer, data.message || "Email verified successfully.", "success");
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1200);
            } else {
                const data = await response.json();
                showMessage(messageContainer, data.message || "OTP verification failed.");
            }
        } catch (error) {
            showMessage(messageContainer, "Unable to connect to the server.");
        }
    });
}

if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = forgotPasswordForm.email.value.trim();
        const messageContainer = document.querySelector("#forgot-message");

        if (!email) {
            showMessage(messageContainer, "Please enter your email address.");
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/forgot-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();
            if (response.ok) {
                showMessage(messageContainer, data.message || "OTP sent successfully.", "success");
                document.querySelector("#resetEmail").value = email;
                document.querySelector("#forgot-password-form").style.display = "none";
                document.querySelector("#reset-password-form").style.display = "flex";
            } else {
                showMessage(messageContainer, data.message || "Unable to send reset OTP.");
            }
        } catch (error) {
            showMessage(messageContainer, "Unable to connect to the server.");
        }
    });
}

if (resetPasswordForm) {
    resetPasswordForm.style.display = "none";

    resetPasswordForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = resetPasswordForm.email.value.trim();
        const otp = resetPasswordForm.otp.value.trim();
        const newPassword = resetPasswordForm.newPassword.value;
        const confirmPassword = resetPasswordForm.confirmPassword.value;
        const messageContainer = document.querySelector("#reset-message");

        if (!email || !otp || !newPassword || !confirmPassword) {
            showMessage(messageContainer, "Please fill out all fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage(messageContainer, "Passwords do not match.");
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, otp, newPassword }),
            });

            const data = await response.json();
            if (response.ok) {
                showMessage(messageContainer, data.message || "Password reset successfully.", "success");
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1200);
            } else {
                showMessage(messageContainer, data.message || "Password reset failed.");
            }
        } catch (error) {
            showMessage(messageContainer, "Unable to connect to the server.");
        }
    });
}
