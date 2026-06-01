/** Общие утилиты форм: ошибки по полям и всплывающие сообщения */
function setFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById("error-" + fieldId);
  if (!field || !errorEl) return;
  field.classList.add("field-invalid");
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById("error-" + fieldId);
  if (!field || !errorEl) return;
  field.classList.remove("field-invalid");
  errorEl.textContent = "";
  errorEl.hidden = true;
}

function clearFormErrors(fieldIds) {
  fieldIds.forEach(clearFieldError);
}

function bindClearOnInput(fieldIds) {
  fieldIds.forEach(function (fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener("input", function () {
        clearFieldError(fieldId);
      });
    }
  });
}

function showToast(message, type) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast toast-" + (type || "info");
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(function () {
    toast.classList.add("toast-hide");
    setTimeout(function () {
      toast.remove();
    }, 300);
  }, 3200);
}
