const notifications = document.querySelector(".notifications");
const buttons = document.querySelectorAll(".glass-btn");

let done = false;

const toastDetails = {
  timer: 1000000,
  "enter-shop": {
    text: "<div>Right</div> click to select a bottle. <br><br> Right click again to send scroll back.",
  },
};

const removeToast = (toast) => {
  toast.classList.add("hide");
  if (toast.timeoutId) clearTimeout(toast.timeoutId);
  setTimeout(() => toast.remove(), 500);
};

const createToast = (id) => {
  if (!done) {
    const { text } = toastDetails[id];
    const toast = document.createElement("li");
    toast.className = `toast ${id}`;
    toast.innerHTML = `<div class="column">
                         <i class="fa-solid"></i>
                         <span>${text}</span>
                      </div>
                      <i class="fa-solid fa-xmark" onclick="removeToast(this.parentElement)"></i>`;
    notifications.appendChild(toast);
    toast.timeoutId = setTimeout(() => removeToast(toast), toastDetails.timer);
    done = true; // Set done to true after the toast is created
  }
};

buttons.forEach((btn) => {
  btn.addEventListener("click", () => {
    createToast(btn.id);
  });
});