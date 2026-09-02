(() => {
    if (!document.querySelector("link[data-turf-dialog-styles]")) {
        const stylesheet = document.createElement("link");
        stylesheet.rel = "stylesheet";
        stylesheet.href = "assets/css/ui-dialog.css";
        stylesheet.dataset.turfDialogStyles = "";
        document.head.append(stylesheet);
    }
    const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

    const openDialog = ({ title, message, confirmLabel = "Continue", cancelLabel = "Cancel", tone = "danger", input = null, rules = [], showCancel = true }) => new Promise((resolve) => {
        const dialog = document.createElement("div");
        dialog.className = "turf-dialog-backdrop";
        dialog.innerHTML = `<section class="turf-dialog" role="dialog" aria-modal="true" aria-labelledby="turf-dialog-title"><span class="turf-dialog-icon ${tone}" aria-hidden="true">${tone === "danger" ? "!" : "i"}</span><div class="turf-dialog-copy"><h2 id="turf-dialog-title">${escapeHTML(title)}</h2><p>${escapeHTML(message)}</p></div>${rules.length ? `<ul class="turf-dialog-rules">${rules.map((rule) => `<li>${escapeHTML(rule)}</li>`).join("")}</ul>` : ""}${input ? `<label class="turf-dialog-field">${escapeHTML(input.label || "Value")}<input id="turf-dialog-input" maxlength="120" value="${escapeHTML(input.value || "")}" placeholder="${escapeHTML(input.placeholder || "")}" required></label>` : ""}<div class="turf-dialog-actions">${showCancel ? `<button class="turf-dialog-cancel" type="button">${escapeHTML(cancelLabel)}</button>` : ""}<button class="turf-dialog-confirm ${tone}" type="button">${escapeHTML(confirmLabel)}</button></div></section>`;
        document.body.append(dialog);
        const inputElement = dialog.querySelector("#turf-dialog-input");
        const finish = (value) => {
            document.removeEventListener("keydown", onKeydown);
            dialog.remove();
            resolve(value);
        };
        const onKeydown = (event) => {
            if (event.key === "Escape") finish(input ? null : false);
            if (event.key === "Enter" && document.activeElement === inputElement) dialog.querySelector(".turf-dialog-confirm").click();
        };
        document.addEventListener("keydown", onKeydown);
        dialog.querySelector(".turf-dialog-cancel")?.addEventListener("click", () => finish(input ? null : false));
        dialog.querySelector(".turf-dialog-confirm").onclick = () => {
            const value = inputElement?.value.trim();
            if (inputElement && !value) return inputElement.focus();
            finish(input ? value : true);
        };
        dialog.onclick = (event) => { if (event.target === dialog) finish(input ? null : false); };
        requestAnimationFrame(() => (inputElement || dialog.querySelector(".turf-dialog-confirm")).focus());
    });

    window.TurfDialog = {
        confirm: (options = {}) => openDialog({ title: "Please confirm", message: "Do you want to continue?", ...options }),
        prompt: ({ label, value, placeholder, ...options } = {}) => openDialog({ title: "Enter details", message: "Please provide the requested information.", confirmLabel: "Save", tone: "primary", ...options, input: { label, value, placeholder } }),
        alert: (options = {}) => openDialog({ title: "Notice", message: "", confirmLabel: "I understand", tone: "primary", showCancel: false, ...options }).then(() => undefined),
    };
})();
