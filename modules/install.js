let deferredPrompt;

const banner = document.getElementById("install-banner");
const installBtn = document.getElementById("install-btn");
const closeBtn = document.getElementById("close-install");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();

  deferredPrompt = e;

  banner.style.display = "flex";
});

installBtn.addEventListener("click", async () => {
  banner.style.display = "none";

  deferredPrompt.prompt();

  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === "accepted") {
    console.log("App installed");
  } else {
    console.log("Install dismissed");
  }

  deferredPrompt = null;
});

closeBtn.addEventListener("click", () => {
  banner.style.display = "none";
});

window.addEventListener("appinstalled", () => {
  console.log("PWA installed");

  banner.style.display = "none";
});
