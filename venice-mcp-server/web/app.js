// Venice Video: a phone-sized control surface for the venice-mcp-server web app.
// No framework and no build step. All DOM is built with createElement/textContent, never innerHTML, because prompts
// and error text come back from the server and must not be able to inject markup.

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Tiny element builder: h("p", { class: "x", onclick }, "text", childNode). */
function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else if (key === "value") node.value = value;
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children.flat()) {
    if (child === undefined || child === null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

// ---------------------------------------------------------------------------
// State and storage
// ---------------------------------------------------------------------------

const state = {
  engine: "local",
  tab: "create",
  status: null,
  jobs: [],
  image: null,
  quote: null,
  busy: false,
  signedIn: false
};

const store = {
  get(key) {
    try {
      return localStorage.getItem(`venice-video:${key}`);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`venice-video:${key}`, value);
    } catch {
      // Private mode or blocked storage: nothing to remember, nothing to break
    }
  }
};

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function api(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin"
    });
  } catch {
    throw new ApiError("Can't reach the app. Is your computer on, and is the app still running?", 0, {});
  }
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && path !== "/login") {
    showLogin();
    throw new ApiError("Sign in first.", 401, data);
  }
  if (!response.ok) throw new ApiError(data.message || data.error || `Something went wrong (${response.status}).`, response.status, data);
  return data;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function toast(text, kind = "ok", ms) {
  const node = h("div", { class: `toast ${kind === "ok" ? "" : kind}`.trim(), role: kind === "error" ? "alert" : "status" }, text);
  const close = () => node.remove();
  node.addEventListener("click", close);
  $("#toasts").append(node);
  setTimeout(close, ms ?? (kind === "error" ? 12000 : 5000));
}

function ago(iso) {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
  return `${Math.round(seconds / 86400)} d ago`;
}

const megabytes = bytes => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const STATUS_LABEL = { queued: "Queued", running: "Rendering", completed: "Done", failed: "Failed", cancelled: "Cancelled", timed_out: "Taking long" };

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

function showLogin(message) {
  state.signedIn = false;
  $("#login").hidden = false;
  $("#signout").hidden = true;
  const error = $("#login-error");
  error.hidden = !message;
  error.textContent = message ?? "";
  setTimeout(() => $("#token").focus(), 50);
}

async function signIn(token) {
  await api("/login", { method: "POST", body: { token } });
  $("#login").hidden = true;
  $("#token").value = "";
  await boot();
}

$("#login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const token = $("#token").value.trim();
  if (!token) return showLogin("Paste the token first.");
  try {
    await signIn(token);
  } catch (error) {
    showLogin(error.message);
  }
});

$("#signout").addEventListener("click", async () => {
  await api("/logout", { method: "POST", body: {} }).catch(() => undefined);
  showLogin();
});

// ---------------------------------------------------------------------------
// Status: what the computer can do right now
// ---------------------------------------------------------------------------

async function refreshStatus() {
  state.status = await api("/status");
  renderStatus();
}

function renderStatus() {
  const { local, hosted } = state.status;
  const pillLocal = $("#pill-local");
  pillLocal.className = `pill ${local.reachable ? "ok" : "bad"}`;
  pillLocal.textContent = local.reachable ? "Local" : "Local off";
  pillLocal.setAttribute("aria-label", local.reachable ? "Local video is ready" : "Local video is not available");
  const pillHosted = $("#pill-hosted");
  const hostedOk = hosted.configured && !hosted.error && hosted.models?.length > 0;
  pillHosted.className = `pill ${hostedOk ? "ok" : "bad"}`;
  pillHosted.textContent = hostedOk ? "Hosted" : "Hosted off";
  pillHosted.setAttribute("aria-label", hostedOk ? "Hosted video is ready" : "Hosted video is not available");
  renderEngine();
}

function engineNote() {
  const status = state.status;
  if (!status) return { text: "Checking your computer…", bad: false };
  if (state.engine === "local") {
    const { local } = status;
    if (!local.reachable) return { text: `${local.error} Start ComfyUI on your computer, then reload.`, bad: true };
    const mode = local.modes?.[state.image ? "i2v" : "t2v"];
    if (mode?.error) return { text: mode.error, bad: true };
    const queue = local.queue && local.queue.running + local.queue.waiting > 0 ? ` · ComfyUI busy: ${local.queue.running} running, ${local.queue.waiting} waiting` : "";
    return { text: `${local.gpu ?? "GPU"}${local.vram_gb ? ` · ${local.vram_gb} GB` : ""} · ${mode.workflow} · ${mode.fps} fps${queue}`, bad: false };
  }
  const { hosted } = status;
  if (!hosted.configured) return { text: hosted.error, bad: true };
  if (hosted.error) return { text: hosted.error, bad: true };
  if (!hosted.models.length) return { text: `Venice lists no "${hosted.prefix}" video model for your account.`, bad: true };
  return { text: `Venice · ${hosted.models.length} model${hosted.models.length === 1 ? "" : "s"}${hosted.balance ? ` · balance ${hosted.balance}` : ""}`, bad: false };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

function setEngine(engine) {
  state.engine = engine;
  store.set("engine", engine);
  invalidateQuote();
  renderEngine();
}

function renderEngine() {
  for (const button of $$("[data-engine]")) button.setAttribute("aria-pressed", String(button.dataset.engine === state.engine));
  $("#opts-local").hidden = state.engine !== "local";
  $("#opts-hosted").hidden = state.engine !== "hosted";
  const note = engineNote();
  const node = $("#engine-note");
  node.textContent = note.text;
  node.classList.toggle("bad", note.bad);
  renderSizes();
  renderModels();
  renderSubmit();
}

function renderSizes() {
  const select = $("#size");
  const previous = select.value;
  const mode = state.status?.local?.modes?.[state.image ? "i2v" : "t2v"];
  select.replaceChildren(h("option", { value: "" }, mode?.width ? `Default (${mode.width}×${mode.height})` : "Default"));
  for (const size of [...(mode?.allowed_sizes ?? [])].sort((a, b) => b.width * b.height - a.width * a.height || b.width - a.width)) {
    select.append(h("option", { value: `${size.width}x${size.height}` }, `${size.width}×${size.height}${size.width < size.height ? " (portrait)" : ""}`));
  }
  if ([...select.options].some(option => option.value === previous)) select.value = previous;
}

function renderModels() {
  const select = $("#model");
  const previous = select.value;
  select.replaceChildren(h("option", { value: "" }, state.image ? "Automatic (image-to-video)" : "Automatic (text-to-video)"));
  for (const id of state.status?.hosted?.models ?? []) select.append(h("option", { value: id }, id));
  if ([...select.options].some(option => option.value === previous)) select.value = previous;
}

function renderSubmit() {
  const button = $("#submit");
  button.disabled = state.busy;
  if (state.busy) return void (button.textContent = state.engine === "hosted" && !state.quote ? "Getting the price…" : "Sending…");
  if (state.engine === "local") button.textContent = "Generate (free)";
  else if (!state.quote) button.textContent = "Get the price";
  else button.textContent = state.quote.usd === null ? "Generate anyway" : `Generate for $${state.quote.usd.toFixed(2)}`;

  const quote = $("#quote");
  quote.hidden = !(state.engine === "hosted" && state.quote);
  quote.replaceChildren();
  quote.classList.remove("warn");
  if (!quote.hidden) {
    if (state.quote.usd === null) {
      quote.classList.add("warn");
      quote.append("Venice didn't give a price for this one. You can still generate it, but it isn't capped.");
    } else {
      quote.append("Venice quotes ", h("strong", {}, `$${state.quote.usd.toFixed(2)}`), ` for ${state.quote.fields.duration} s on ${state.quote.model}. It will only start if the price stays at or below that.`);
    }
    if (state.quote.warning) quote.append(h("div", { class: "note" }, state.quote.warning));
  }
}

function hostedFields() {
  const text = id => $(id).value.trim();
  return {
    duration: Number($("#duration").value),
    model: text("#model") || undefined,
    aspect_ratio: text("#aspect") || undefined,
    resolution: text("#resolution") || undefined
  };
}

const quoteKey = () => JSON.stringify([hostedFields(), Boolean(state.image)]);

function invalidateQuote() {
  if (!state.quote) return;
  state.quote = null;
  renderSubmit();
}

function setDuration(seconds) {
  $("#duration").value = String(seconds);
  syncChips();
  invalidateQuote();
}

function syncChips() {
  for (const chip of $$("#length-chips button")) chip.setAttribute("aria-pressed", String(Number(chip.dataset.seconds) === Number($("#duration").value)));
}

for (const seconds of [3, 5, 8, 10]) {
  $("#length-chips").append(h("button", { type: "button", "data-seconds": seconds, "aria-pressed": "false", onclick: () => setDuration(seconds) }, `${seconds}s`));
}
$("#duration").addEventListener("input", () => {
  syncChips();
  invalidateQuote();
});
for (const id of ["#model", "#aspect", "#resolution"]) $(id).addEventListener("input", invalidateQuote);
$("#prompt").addEventListener("input", () => store.set("prompt", $("#prompt").value));

for (const button of $$("[data-engine]")) button.addEventListener("click", () => setEngine(button.dataset.engine));

// Photo: downscaled in the browser so a 12 MP phone picture becomes a few hundred KB before it is sent
function downscale(file, maxSide = 1280, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This browser can't read that photo. Try a JPEG or PNG."));
    };
    image.src = url;
  });
}

function setImage(dataUri) {
  state.image = dataUri;
  $("#photo-preview").hidden = !dataUri;
  if (dataUri) $("#photo-preview img").src = dataUri;
  $("#photo-btn").textContent = dataUri ? "Change photo" : "Choose a photo";
  invalidateQuote();
  renderEngine();
}

$("#photo-btn").addEventListener("click", () => $("#photo").click());
$("#photo-clear").addEventListener("click", () => {
  $("#photo").value = "";
  setImage(null);
});
$("#photo").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    setImage(await downscale(file));
  } catch (error) {
    toast(error.message, "error");
  }
});

function setBusy(busy) {
  state.busy = busy;
  renderSubmit();
}

async function submitLocal(prompt, duration) {
  const body = { prompt, duration };
  const size = $("#size").value;
  if (size) {
    const [width, height] = size.split("x").map(Number);
    Object.assign(body, { width, height });
  }
  const seed = $("#seed").value.trim();
  if (seed !== "") body.seed = Number(seed);
  const negative = $("#negative").value.trim();
  if (negative) body.negative_prompt = negative;
  if (state.image) body.image = state.image;
  await api("/local/video", { method: "POST", body });
  toast("Started on your GPU. It takes a few minutes.", "ok", 3500);
}

async function submitHosted(prompt, duration) {
  const fields = hostedFields();
  if (!state.quote || state.quote.key !== quoteKey()) {
    const quote = await api("/hosted/quote", { method: "POST", body: { ...stripUndefined(fields), has_image: Boolean(state.image) } });
    state.quote = { usd: quote.quote_usd, model: quote.model, warning: quote.warning, fields, key: quoteKey() };
    return false;
  }
  const body = { ...stripUndefined(fields), prompt };
  const negative = $("#negative").value.trim();
  if (negative) body.negative_prompt = negative;
  if (state.image) body.image = state.image;
  // The price the user just saw (plus a cent for rounding) is the most Venice may charge
  if (state.quote.usd !== null) body.max_usd = Math.round((state.quote.usd + 0.01) * 100) / 100;
  await api("/hosted/video", { method: "POST", body });
  state.quote = null;
  toast("Sent to Venice. It takes a few minutes.", "ok", 3500);
  refreshStatus().catch(() => undefined);
  return true;
}

const stripUndefined = object => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));

$("#form").addEventListener("submit", async event => {
  event.preventDefault();
  if (state.busy) return;
  const prompt = $("#prompt").value.trim();
  const duration = Number($("#duration").value);
  if (!prompt) {
    toast("Describe the video first.", "error");
    return $("#prompt").focus();
  }
  if (!Number.isInteger(duration) || duration < 1 || duration > 30) return toast("Length must be a whole number of seconds from 1 to 30.", "error");

  setBusy(true);
  try {
    const started = state.engine === "local" ? (await submitLocal(prompt, duration), true) : await submitHosted(prompt, duration);
    if (started) {
      await refreshJobs();
      showTab("jobs");
      schedulePoll(); // a new job is active: leave the slow idle cadence
    }
  } catch (error) {
    toast(error.message, "error");
  } finally {
    setBusy(false);
  }
});

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

const cards = new Map();
const lastStatus = new Map();

function videoUrl(job, download = false) {
  return `/api/jobs/${job.engine}/${encodeURIComponent(job.id)}/video${download ? "?download=1" : ""}`;
}

function createCard(job) {
  const refs = {
    tag: h("span", { class: "tag" }, job.engine === "local" ? "Local" : "Hosted"),
    chip: h("span", { class: "chip" }),
    time: h("span", { class: "time" }),
    prompt: h("p", { class: "job-prompt" }),
    summary: h("p", { class: "job-summary" }),
    bar: h("div", { class: "bar" }, h("span")),
    progressText: h("span", { class: "progress-text" }),
    error: h("p", { class: "error" }),
    warnings: h("ul", { class: "warnings" }),
    media: h("div", { class: "media" }),
    cancel: h("button", { type: "button", class: "btn small danger" }, "Cancel"),
    download: h("a", { class: "btn small ghost", download: "" }, "Download"),
    again: h("button", { type: "button", class: "btn small ghost" }, "Use this prompt")
  };
  refs.progress = h("div", { class: "progress" }, refs.bar, refs.progressText);
  refs.actions = h("div", { class: "actions" }, refs.cancel, refs.download, refs.again);
  refs.root = h("li", { class: "card" }, h("div", { class: "job-head" }, refs.tag, refs.chip, refs.time), refs.prompt, refs.summary, refs.progress, refs.error, refs.warnings, refs.media, refs.actions);

  refs.cancel.addEventListener("click", async () => {
    refs.cancel.disabled = true;
    try {
      await api(`/jobs/${job.engine}/${encodeURIComponent(job.id)}/cancel`, { method: "POST", body: {} });
      await refreshJobs();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      refs.cancel.disabled = false;
    }
  });
  refs.again.addEventListener("click", () => {
    $("#prompt").value = refs.prompt.textContent;
    store.set("prompt", $("#prompt").value);
    setEngine(job.engine);
    showTab("create");
    $("#prompt").focus();
  });
  return refs;
}

function updateCard(refs, job) {
  const active = job.status === "queued" || job.status === "running";
  refs.chip.className = `chip ${job.status}`;
  refs.chip.textContent = STATUS_LABEL[job.status] ?? job.status;
  refs.time.textContent = ago(job.created_at);
  refs.prompt.textContent = job.prompt;
  refs.summary.textContent = job.summary;
  refs.summary.hidden = !job.summary;

  refs.progress.hidden = !active;
  const known = typeof job.progress === "number";
  refs.bar.classList.toggle("indeterminate", active && !known);
  refs.bar.firstChild.style.width = known ? `${Math.min(100, job.progress)}%` : "";
  refs.progressText.textContent = [job.status === "queued" ? "Waiting to start" : "Rendering", known ? `${job.progress}%` : "", job.detail].filter(Boolean).join(" · ");

  refs.error.hidden = !job.error;
  refs.error.textContent = job.error ?? "";
  refs.warnings.replaceChildren(...job.warnings.map(warning => h("li", {}, warning)));
  refs.warnings.hidden = job.warnings.length === 0;

  refs.cancel.hidden = !job.can_cancel;
  refs.download.hidden = !job.has_video;
  if (job.has_video) refs.download.href = videoUrl(job, true);
  // The player is created once, so a poll never interrupts playback
  if (job.has_video && !refs.video) {
    refs.video = h("video", { controls: true, playsinline: true, preload: "metadata", src: videoUrl(job) });
    refs.media.append(refs.video);
  }
}

function renderJobs() {
  const list = $("#jobs");
  let ref = list.firstChild;
  for (const job of state.jobs) {
    const key = `${job.engine}:${job.id}`;
    let refs = cards.get(key);
    if (!refs) {
      refs = createCard(job);
      cards.set(key, refs);
    }
    updateCard(refs, job);
    if (refs.root === ref) ref = ref.nextSibling;
    else list.insertBefore(refs.root, ref);
  }
  $("#jobs-empty").hidden = state.jobs.length > 0;

  const active = state.jobs.filter(job => job.status === "queued" || job.status === "running").length;
  const badge = $("#badge");
  badge.hidden = active === 0;
  badge.textContent = String(active);
}

function announceChanges() {
  for (const job of state.jobs) {
    const key = `${job.engine}:${job.id}`;
    const before = lastStatus.get(key);
    lastStatus.set(key, job.status);
    if (before === undefined || before === job.status) continue;
    if (job.status === "completed") {
      toast("Your video is ready.", "ok", 3500);
      if (state.tab === "library") refreshLibrary().catch(() => undefined);
    } else if (job.status === "failed") toast(`A video failed: ${job.error ?? "unknown error"}`, "error");
  }
}

async function refreshJobs() {
  const { jobs } = await api("/jobs");
  state.jobs = jobs;
  announceChanges();
  renderJobs();
}

let pollTimer;
function schedulePoll() {
  clearTimeout(pollTimer);
  if (document.hidden || !state.signedIn) return;
  const active = state.jobs.some(job => job.status === "queued" || job.status === "running");
  pollTimer = setTimeout(async () => {
    await refreshJobs().catch(() => undefined);
    schedulePoll();
  }, active ? 2000 : 8000);
}

let statusTimer;
function scheduleStatus() {
  clearTimeout(statusTimer);
  if (document.hidden || !state.signedIn) return;
  statusTimer = setTimeout(async () => {
    await refreshStatus().catch(() => undefined);
    scheduleStatus();
  }, 30000);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden || !state.signedIn) return;
  refreshJobs().catch(() => undefined);
  refreshStatus().catch(() => undefined);
  schedulePoll();
  scheduleStatus();
});

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

async function refreshLibrary() {
  const { files } = await api("/library");
  const list = $("#library");
  list.replaceChildren();
  $("#library-empty").hidden = files.length > 0;
  for (const file of files) {
    const url = `/api/library/${encodeURIComponent(file.name)}`;
    const holder = h("div", { class: "media" });
    const play = h("button", {
      type: "button",
      class: "btn small ghost",
      onclick: () => {
        if (holder.firstChild) {
          holder.replaceChildren();
          play.textContent = "Play";
        } else {
          holder.append(h("video", { controls: true, autoplay: true, playsinline: true, src: url }));
          play.textContent = "Close";
        }
      }
    }, "Play");
    list.append(
      h("li", { class: "card" },
        h("div", { class: "job-head" }, h("span", { class: "tag" }, file.engine === "hosted" ? "Hosted" : "Local"), h("span", { class: "time" }, `${ago(file.modified)} · ${megabytes(file.size)}`)),
        h("p", { class: "clip-name" }, file.name),
        holder,
        h("div", { class: "actions" }, play, h("a", { class: "btn small ghost", href: `${url}?download=1`, download: "" }, "Download"))
      )
    );
  }
}

// ---------------------------------------------------------------------------
// Tabs and start-up
// ---------------------------------------------------------------------------

function showTab(name) {
  state.tab = name;
  for (const section of $$(".view")) section.hidden = section.id !== `view-${name}`;
  for (const button of $$("[data-tab]")) {
    if (button.dataset.tab === name) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  if (name === "jobs") refreshJobs().catch(() => undefined);
  if (name === "library") refreshLibrary().catch(error => toast(error.message, "error"));
  window.scrollTo({ top: 0 });
}
for (const button of $$("[data-tab]")) button.addEventListener("click", () => showTab(button.dataset.tab));

async function boot() {
  const session = await api("/session").catch(() => ({ authenticated: false }));
  if (!session.authenticated) return showLogin();
  state.signedIn = true;
  $("#login").hidden = true;
  $("#signout").hidden = false;
  const [status] = await Promise.allSettled([refreshStatus(), refreshJobs()]);
  if (status.status === "rejected") {
    const note = $("#engine-note");
    note.textContent = status.reason?.message ?? "Can't read your computer's status right now.";
    note.classList.add("bad");
  }
  schedulePoll();
  scheduleStatus();
}

// A QR code opens the page as /#t=<token>. The fragment never goes to the server or into its logs, and it is cleared at once.
// Pasting such a link into a tab that is already open only fires hashchange, so that is handled too.
async function consumeHashToken() {
  const match = /(?:^#|&)t=([^&]+)/.exec(location.hash);
  if (!match) return false;
  history.replaceState(null, "", location.pathname + location.search);
  try {
    await signIn(decodeURIComponent(match[1]));
  } catch (error) {
    showLogin(error.message);
  }
  return true;
}
window.addEventListener("hashchange", () => void consumeHashToken());

async function start() {
  const saved = store.get("engine");
  if (saved === "local" || saved === "hosted") state.engine = saved;
  $("#prompt").value = store.get("prompt") ?? "";
  syncChips();
  renderEngine();
  if (await consumeHashToken()) return;
  await boot();
}

start();
