// app.js
const state = {
  code: null,
  ownerToken: null,
  redirectUrl: null,
  logoDataUrl: null
};

const els = {
  targetUrl: document.getElementById("targetUrl"),
  createBtn: document.getElementById("createBtn"),
  updateBtn: document.getElementById("updateBtn"),
  linkInfo: document.getElementById("linkInfo"),
  logoInput: document.getElementById("logoInput"),
  removeLogoBtn: document.getElementById("removeLogoBtn"),
  dotsType: document.getElementById("dotsType"),
  cornerSquareType: document.getElementById("cornerSquareType"),
  cornerDotType: document.getElementById("cornerDotType"),
  cornerRadius: document.getElementById("cornerRadius"),
  dotsColor: document.getElementById("dotsColor"),
  useDotsColor: document.getElementById("useDotsColor"),
  cornersColor: document.getElementById("cornersColor"),
  useCornersColor: document.getElementById("useCornersColor"),
  bgColor: document.getElementById("bgColor"),
  transparentBg: document.getElementById("transparentBg"),
  gradient: document.getElementById("gradient"),
  gradientColors: document.getElementById("gradientColors"),
  gradColor1: document.getElementById("gradColor1"),
  gradColor2: document.getElementById("gradColor2"),
  format: document.getElementById("format"),
  size: document.getElementById("size"),
  downloadBtn: document.getElementById("downloadBtn"),
  qrPreview: document.getElementById("qrPreview")
};

let qrCode = null;

function buildQrData() {
  const dataUrl = state.redirectUrl || "https://example.com/r/preview";

  const useGradient = els.gradient.checked;
  const dotColorValue = els.useDotsColor.checked ? els.dotsColor.value : "#000000";
  const cornerColorValue = els.useCornersColor.checked ? els.cornersColor.value : "#000000";

  const dotsOptions = {
    type: els.dotsType.value,
    color: dotColorValue
  };
  if (useGradient) {
    dotsOptions.gradient = {
      type: "linear",
      rotation: Math.PI / 4,
      colorStops: [
        { offset: 0, color: els.gradColor1.value },
        { offset: 1, color: els.gradColor2.value }
      ]
    };
    delete dotsOptions.color;
  }

  return {
    width: Number(els.size.value) || 400,
    height: Number(els.size.value) || 400,
    type: "canvas",
    data: dataUrl,
    image: state.logoDataUrl || undefined,
    margin: 8,
    qrOptions: { errorCorrectionLevel: state.logoDataUrl ? "H" : "Q" },
    imageOptions: { crossOrigin: "anonymous", margin: 8, imageSize: 0.35 },
    dotsOptions,
    cornersSquareOptions: {
      type: els.cornerSquareType.value,
      color: cornerColorValue
    },
    cornersDotOptions: {
      type: els.cornerDotType.value,
      color: cornerColorValue
    },
    backgroundOptions: {
      color: els.transparentBg.checked ? "rgba(0,0,0,0)" : els.bgColor.value
    }
  };
}

function renderQr() {
  const options = buildQrData();
  if (!qrCode) {
    qrCode = new QRCodeStyling(options);
    els.qrPreview.innerHTML = "";
    qrCode.append(els.qrPreview);
  } else {
    qrCode.update(options);
  }
}

function setLinkInfo(msg) {
  els.linkInfo.textContent = msg;
}

els.createBtn.addEventListener("click", async () => {
  const url = els.targetUrl.value.trim();
  if (!url) return setLinkInfo("Enter a URL first.");
  els.createBtn.disabled = true;
  try {
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUrl: url })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create link");

    state.code = data.code;
    state.ownerToken = data.ownerToken;
    state.redirectUrl = data.redirectUrl;

    const saved = JSON.parse(localStorage.getItem("dynamicQrLinks") || "{}");
    saved[data.code] = { ownerToken: data.ownerToken, targetUrl: data.targetUrl };
    localStorage.setItem("dynamicQrLinks", JSON.stringify(saved));
    localStorage.setItem("dynamicQrLastCode", data.code);

    els.updateBtn.disabled = false;
    setLinkInfo(`Created! Permanent QR link: ${data.redirectUrl} — save this page (ownerToken is stored in your browser) to update the destination later.`);
    renderQr();
  } catch (err) {
    setLinkInfo(err.message);
  } finally {
    els.createBtn.disabled = false;
  }
});

els.updateBtn.addEventListener("click", async () => {
  if (!state.code) return;
  const url = els.targetUrl.value.trim();
  if (!url) return setLinkInfo("Enter a URL first.");
  els.updateBtn.disabled = true;
  try {
    const res = await fetch(`/api/links/${state.code}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUrl: url, ownerToken: state.ownerToken })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update link");
    setLinkInfo(`Destination updated. QR image is unchanged: ${state.redirectUrl}`);
  } catch (err) {
    setLinkInfo(err.message);
  } finally {
    els.updateBtn.disabled = false;
  }
});

window.addEventListener("DOMContentLoaded", () => {
  const lastCode = localStorage.getItem("dynamicQrLastCode");
  const saved = JSON.parse(localStorage.getItem("dynamicQrLinks") || "{}");
  if (lastCode && saved[lastCode]) {
    state.code = lastCode;
    state.ownerToken = saved[lastCode].ownerToken;
    state.redirectUrl = `${window.location.origin}/r/${lastCode}`;
    els.targetUrl.value = saved[lastCode].targetUrl;
    els.updateBtn.disabled = false;
    setLinkInfo(`Loaded existing QR link: ${state.redirectUrl}`);
  }
  renderQr();
});

els.logoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.logoDataUrl = reader.result;
    renderQr();
  };
  reader.readAsDataURL(file);
});

els.removeLogoBtn.addEventListener("click", () => {
  state.logoDataUrl = null;
  els.logoInput.value = "";
  renderQr();
});

[
  els.dotsType,
  els.cornerSquareType,
  els.cornerDotType,
  els.cornerRadius,
  els.dotsColor,
  els.cornersColor,
  els.bgColor,
  els.transparentBg,
  els.gradient,
  els.gradColor1,
  els.gradColor2,
  els.size
].forEach((el) => el.addEventListener("input", renderQr));

els.useDotsColor.addEventListener("change", () => {
  els.dotsColor.disabled = !els.useDotsColor.checked;
  renderQr();
});

els.useCornersColor.addEventListener("change", () => {
  els.cornersColor.disabled = !els.useCornersColor.checked;
  renderQr();
});

els.gradient.addEventListener("change", () => {
  els.gradientColors.style.display = els.gradient.checked ? "grid" : "none";
  renderQr();
});

els.downloadBtn.addEventListener("click", () => {
  if (!qrCode) return;
  const format = els.format.value;
  qrCode.download({ name: `qr-${state.code || "preview"}`, extension: format });
});
