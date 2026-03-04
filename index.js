// ========= Helpers =========
function pad(n) {
  return n < 10 ? "0" + n : n.toString();
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function format1(x) {
  const v = Math.round(x * 10) / 10;
  const safe = Math.abs(v) < 0.05 ? 0 : v;
  return safe.toFixed(1).replace(".", ",");
}

function countdownHMS(target, now) {
  let diff = target.getTime() - now.getTime();
  if (diff < 0) diff = 0;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function setDone(el) {
  el.innerHTML = `<span>Erledigt</span>`;
  el.className = "countdown-done";
}

function setCountdown(el, html) {
  el.className = "countdown-value";
  el.innerHTML = html;
}

function uid() {
  return "s_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

// ========= Workdays (exclude weekends) =========
function isWeekendDate(d) {
  const wd = d.getDay();
  return wd === 0 || wd === 6;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function countWorkdaysBetween(now, target) {
  // workdays remaining between now and target (with fractions), excluding Sat/Sun
  if (target <= now) return 0;

  const start = new Date(now);
  const end = new Date(target);

  const startDay = startOfDay(start);
  const endDay = startOfDay(end);

  // If same day, just fraction (if it's a workday)
  if (startDay.getTime() === endDay.getTime()) {
    if (isWeekendDate(start)) return 0;
    return clamp((end.getTime() - start.getTime()) / 86400000, 0, 1);
  }

  let workdays = 0;

  // remaining fraction of today
  if (!isWeekendDate(start)) {
    const nextMidnight = new Date(startDay);
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    workdays += clamp((nextMidnight.getTime() - start.getTime()) / 86400000, 0, 1);
  }

  // full days between tomorrow and day before endDay
  const cur = new Date(startDay);
  cur.setDate(cur.getDate() + 1);
  while (cur < endDay) {
    if (!isWeekendDate(cur)) workdays += 1;
    cur.setDate(cur.getDate() + 1);
  }

  // fraction of end day up to target
  if (!isWeekendDate(endDay)) {
    workdays += clamp((end.getTime() - endDay.getTime()) / 86400000, 0, 1);
  }

  return Math.max(0, workdays);
}

// ========= Config (localStorage) =========
const STORAGE_KEY = "countdownConfig_v3";

function defaultConfig() {
  // Neutral defaults (nicht Bundesheer-spezifisch)
  return {
    sections: [
      { id: uid(), name: "Mittagspause", type: "daily", hour: 12, minute: 0, weekendAutoDone: true, impliesPrevious: false },
      { id: uid(), name: "Feierabend", type: "daily", hour: 16, minute: 0, weekendAutoDone: true, impliesPrevious: true },
      { id: uid(), name: "Wochenende", type: "weekly", weekday: 5, hour: 16, minute: 0, weekendAutoDone: true, impliesPrevious: false },
      {
        id: uid(),
        name: "Fixer Termin",
        type: "date",
        date: "2026-12-31",
        time: "12:00",
        showMonths: true,
        showWeeks: true,
        showDays: true,
        excludeWeekends: false,
        impliesPrevious: false,
      },
    ],
  };
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.sections)) return defaultConfig();
    parsed.sections = parsed.sections.map((s) => ({
      id: s.id || uid(),
      name: s.name ?? "Section",
      type: s.type ?? "daily",
      hour: Number.isFinite(s.hour) ? s.hour : 16,
      minute: Number.isFinite(s.minute) ? s.minute : 0,
      weekday: Number.isFinite(s.weekday) ? s.weekday : 5,
      date: s.date ?? "2026-12-31",
      time: s.time ?? "12:00",
      weekendAutoDone: s.weekendAutoDone ?? true,
      impliesPrevious: s.impliesPrevious ?? false,
      showMonths: s.showMonths ?? true,
      showWeeks: s.showWeeks ?? true,
      showDays: s.showDays ?? true,
      excludeWeekends: s.excludeWeekends ?? false,
    }));
    return parsed;
  } catch {
    return defaultConfig();
  }
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

// ========= Rendering =========
const countdownContainer = document.getElementById("countdownContainer");
const settingsEl = document.getElementById("settings");
const sectionsEditor = document.getElementById("sectionsEditor");
const toggleSettingsBtn = document.getElementById("toggleSettings");
const addSectionBtn = document.getElementById("addSection");
const resetDefaultsBtn = document.getElementById("resetDefaults");

let config = loadConfig();

function buildCountdownCards() {
  countdownContainer.innerHTML = "";
  for (const section of config.sections) {
    const box = document.createElement("div");
    box.className = "countdown-box";
    box.dataset.sectionId = section.id;

    const title = document.createElement("div");
    title.className = "countdown-title";
    title.textContent = section.name;

    const value = document.createElement("div");
    value.className = "countdown-value";
    value.id = "val_" + section.id;

    box.appendChild(title);
    box.appendChild(value);
    countdownContainer.appendChild(box);
  }
}

function typeLabel(type) {
  switch (type) {
    case "daily": return "Täglich";
    case "weekly": return "Wöchentlich";
    case "date": return "Datum";
    default: return type;
  }
}

function buildEditor() {
  sectionsEditor.innerHTML = "";

  config.sections.forEach((s, idx) => {
    const row = document.createElement("div");
    row.className = "editor-row";

    const head = document.createElement("div");
    head.className = "editor-head";

    const title = document.createElement("div");
    title.className = "editor-title";
    title.textContent = `${idx + 1}. ${typeLabel(s.type)}`;

    const controls = document.createElement("div");
    controls.className = "editor-controls";

    controls.appendChild(btn("↑", "btn btn-ghost", idx === 0, () => move(idx, idx - 1)));
    controls.appendChild(btn("↓", "btn btn-ghost", idx === config.sections.length - 1, () => move(idx, idx + 1)));
    controls.appendChild(btn("Löschen", "btn btn-danger", false, () => del(idx)));

    head.appendChild(title);
    head.appendChild(controls);

    const body = document.createElement("div");
    body.className = "editor-body";

    body.appendChild(fieldText("Name", s.name, (val) => {
      s.name = val;
      saveConfig(config);
      const card = countdownContainer.querySelector(`[data-section-id="${s.id}"] .countdown-title`);
      if (card) card.textContent = val;
    }));

    body.appendChild(fieldSelect("Typ", s.type, [
      { value: "daily", label: "Täglich (Uhrzeit)" },
      { value: "weekly", label: "Wöchentlich (Wochentag + Uhrzeit)" },
      { value: "date", label: "Fixes Datum (Datum + Uhrzeit)" },
    ], (val) => {
      s.type = val;
      if (val === "daily") { s.hour ??= 16; s.minute ??= 0; s.weekendAutoDone ??= true; }
      if (val === "weekly") { s.weekday ??= 5; s.hour ??= 16; s.minute ??= 0; s.weekendAutoDone ??= true; }
      if (val === "date") {
        s.date ??= "2026-12-31"; s.time ??= "12:00";
        s.showMonths ??= true; s.showWeeks ??= true; s.showDays ??= true;
        s.excludeWeekends ??= false;
      }
      saveConfig(config);
      buildEditor(); updateCountdowns();
    }));

    if (s.type === "daily") {
      body.appendChild(fieldTime("Ende (Uhrzeit)", s.hour, s.minute, (h, m) => {
        s.hour = h; s.minute = m; saveConfig(config); updateCountdowns();
      }));
      body.appendChild(fieldCheckbox("Am Wochenende automatisch erledigt", !!s.weekendAutoDone, (v) => {
        s.weekendAutoDone = v; saveConfig(config); updateCountdowns();
      }));
    } else if (s.type === "weekly") {
      body.appendChild(fieldWeekdayTime("Ende (Wochentag + Uhrzeit)", s.weekday, s.hour, s.minute, (wd, h, m) => {
        s.weekday = wd; s.hour = h; s.minute = m; saveConfig(config); updateCountdowns();
      }));
      body.appendChild(fieldCheckbox("Am Wochenende automatisch erledigt", !!s.weekendAutoDone, (v) => {
        s.weekendAutoDone = v; saveConfig(config); updateCountdowns();
      }));
    } else if (s.type === "date") {
      body.appendChild(fieldDateTime("Ende (Datum + Uhrzeit)", s.date, s.time, (d, t) => {
        s.date = d; s.time = t; saveConfig(config); updateCountdowns();
      }));

      const group = document.createElement("div");
      group.className = "field";
      const glab = document.createElement("label");
      glab.textContent = "Anzeige";
      group.appendChild(glab);

      const toggles = document.createElement("div");
      toggles.className = "toggle-grid";
      toggles.appendChild(chipToggle("Monate", !!s.showMonths, (v) => { s.showMonths = v; saveConfig(config); updateCountdowns(); }));
      toggles.appendChild(chipToggle("Wochen", !!s.showWeeks, (v) => { s.showWeeks = v; saveConfig(config); updateCountdowns(); }));
      toggles.appendChild(chipToggle("Tage", !!s.showDays, (v) => { s.showDays = v; saveConfig(config); updateCountdowns(); }));
      group.appendChild(toggles);
      body.appendChild(group);

      body.appendChild(fieldCheckbox("Wochenenden NICHT mitzählen (Arbeitstage)", !!s.excludeWeekends, (v) => {
        s.excludeWeekends = v; saveConfig(config); updateCountdowns();
      }));
    }

    body.appendChild(fieldCheckbox("Wenn erledigt, dann vorherige abhaken", !!s.impliesPrevious, (v) => {
      s.impliesPrevious = v; saveConfig(config); updateCountdowns();
    }));

    row.appendChild(head);
    row.appendChild(body);
    sectionsEditor.appendChild(row);
  });
}

function move(from, to) {
  if (to < 0 || to >= config.sections.length) return;
  const tmp = config.sections[to];
  config.sections[to] = config.sections[from];
  config.sections[from] = tmp;
  saveConfig(config);
  buildEditor(); buildCountdownCards(); updateCountdowns();
}

function del(idx) {
  config.sections.splice(idx, 1);
  if (config.sections.length === 0) config = defaultConfig();
  saveConfig(config);
  buildEditor(); buildCountdownCards(); updateCountdowns();
}

function btn(text, cls, disabled, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = cls;
  b.textContent = text;
  b.disabled = !!disabled;
  b.addEventListener("click", onClick);
  return b;
}

function fieldWrap(labelText) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const label = document.createElement("label");
  label.textContent = labelText;
  wrap.appendChild(label);
  return { wrap, label };
}

function fieldText(label, value, onChange) {
  const { wrap } = fieldWrap(label);
  const input = document.createElement("input");
  input.type = "text";
  input.value = value ?? "";
  input.addEventListener("input", () => onChange(input.value));
  wrap.appendChild(input);
  return wrap;
}

function fieldSelect(label, value, options, onChange) {
  const { wrap } = fieldWrap(label);
  const sel = document.createElement("select");
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === value) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener("change", () => onChange(sel.value));
  wrap.appendChild(sel);
  return wrap;
}

function fieldCheckbox(label, checked, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "field field-inline";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = !!checked;
  cb.addEventListener("change", () => onChange(cb.checked));
  const lab = document.createElement("label");
  lab.textContent = label;
  wrap.appendChild(cb);
  wrap.appendChild(lab);
  return wrap;
}

function chipToggle(label, checked, onChange) {
  const wrap = document.createElement("label");
  wrap.className = "chip";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = checked;
  cb.addEventListener("change", () => onChange(cb.checked));
  const sp = document.createElement("span");
  sp.textContent = label;
  wrap.appendChild(cb);
  wrap.appendChild(sp);
  return wrap;
}

function fieldTime(label, hour, minute, onChange) {
  const { wrap } = fieldWrap(label);
  const input = document.createElement("input");
  input.type = "time";
  input.value = `${pad(hour ?? 0)}:${pad(minute ?? 0)}`;
  input.addEventListener("change", () => {
    const [h, m] = input.value.split(":").map((x) => parseInt(x, 10));
    onChange(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0);
  });
  wrap.appendChild(input);
  return wrap;
}

function fieldWeekdayTime(label, weekday, hour, minute, onChange) {
  const { wrap } = fieldWrap(label);
  const row = document.createElement("div");
  row.className = "row";

  const sel = document.createElement("select");
  const days = [
    { v: 0, l: "Sonntag" },
    { v: 1, l: "Montag" },
    { v: 2, l: "Dienstag" },
    { v: 3, l: "Mittwoch" },
    { v: 4, l: "Donnerstag" },
    { v: 5, l: "Freitag" },
    { v: 6, l: "Samstag" },
  ];
  for (const d of days) {
    const o = document.createElement("option");
    o.value = String(d.v);
    o.textContent = d.l;
    if (d.v === weekday) o.selected = true;
    sel.appendChild(o);
  }

  const time = document.createElement("input");
  time.type = "time";
  time.value = `${pad(hour ?? 0)}:${pad(minute ?? 0)}`;

  function emit() {
    const wd = parseInt(sel.value, 10);
    const [h, m] = time.value.split(":").map((x) => parseInt(x, 10));
    onChange(Number.isFinite(wd) ? wd : 5, Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0);
  }
  sel.addEventListener("change", emit);
  time.addEventListener("change", emit);

  row.appendChild(sel);
  row.appendChild(time);
  wrap.appendChild(row);
  return wrap;
}

function fieldDateTime(label, dateValue, timeValue, onChange) {
  const { wrap } = fieldWrap(label);
  const row = document.createElement("div");
  row.className = "row";

  const date = document.createElement("input");
  date.type = "date";
  date.value = dateValue ?? "";

  const time = document.createElement("input");
  time.type = "time";
  time.value = timeValue ?? "00:00";

  function emit() { onChange(date.value, time.value); }
  date.addEventListener("change", emit);
  time.addEventListener("change", emit);

  row.appendChild(date);
  row.appendChild(time);
  wrap.appendChild(row);
  return wrap;
}

// ========= Countdown logic =========
function computeTarget(section, now) {
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  if (section.type === "daily") {
    const target = new Date(now);
    target.setHours(section.hour ?? 0, section.minute ?? 0, 0, 0);
    const done = now > target || (!!section.weekendAutoDone && isWeekend);
    return { done, html: countdownHMS(target, now) };
  }

  if (section.type === "weekly") {
    if (!!section.weekendAutoDone && isWeekend) return { done: true, html: "" };

    const wd = Number.isFinite(section.weekday) ? section.weekday : 5;
    const target = new Date(now);
    const diffDays = (wd - now.getDay() + 7) % 7;
    target.setDate(now.getDate() + diffDays);
    target.setHours(section.hour ?? 0, section.minute ?? 0, 0, 0);

    if (diffDays === 0 && now > target) return { done: true, html: "" };

    const diffMs = target.getTime() - now.getTime();
    const totalMin = Math.floor(diffMs / 60000);
    const totalH = Math.floor(totalMin / 60);
    const days = Math.floor(totalH / 24);
    const hours = totalH % 24;
    const mins = totalMin % 60;

    if (days >= 1) return { done: false, html: `${days} Tag(e) und ${hours} Stunde(n)` };
    if (totalH >= 1) return { done: false, html: `${totalH} Stunde(n) und ${mins} Minute(n)` };
    return { done: false, html: `${Math.max(0, totalMin)} Minute(n)` };
  }

  if (section.type === "date") {
    const dateStr = section.date ?? "2026-12-31";
    const timeStr = section.time ?? "12:00";
    const [hh, mm] = timeStr.split(":").map((x) => parseInt(x, 10));
    const parts = dateStr.split("-").map((x) => parseInt(x, 10));
    const y = parts[0], mo = (parts[1] ?? 1) - 1, d = parts[2] ?? 1;
    const target = new Date(y, mo, d, Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);

    if (now > target) return { done: true, html: "" };

    const excludeWeekends = !!section.excludeWeekends;
    const showMonths = section.showMonths ?? true;
    const showWeeks = section.showWeeks ?? true;
    const showDays = section.showDays ?? true;

    let daysFloat;
    if (excludeWeekends) daysFloat = countWorkdaysBetween(now, target);
    else daysFloat = (target.getTime() - now.getTime()) / 86400000;

    const weeks = excludeWeekends ? (daysFloat / 5) : (daysFloat / 7);
    const months = excludeWeekends ? (daysFloat / 21.74) : (daysFloat / 30.44);

    const lines = [];

    // avoid showing 0,x months/weeks: only show when >= 1.0
    if (showMonths && months >= 1) lines.push(`${format1(months)} Monat(e)`);
    if (showWeeks && weeks >= 1) lines.push(`${format1(weeks)} Woche(n)`);

    // days or short format
    const diffMs = target.getTime() - now.getTime();
    const totalMin = Math.floor(diffMs / 60000);
    const totalH = Math.floor(totalMin / 60);

    if (showDays) {
      const daysInt = Math.floor(daysFloat);
      if (daysInt >= 1) lines.push(`${daysInt} ${excludeWeekends ? "Arbeitstag(e)" : "Tag(e)"}`);
      else {
        const mins = totalMin % 60;
        if (totalH >= 1) lines.push(`${totalH} Stunde(n) und ${mins} Minute(n)`);
        else lines.push(`${Math.max(0, totalMin)} Minute(n)`);
      }
    }

    return { done: false, html: lines.join("<br>") || countdownHMS(target, now) };
  }

  return { done: false, html: "" };
}

function updateCountdowns() {
  const now = new Date();
  const states = config.sections.map((s) => computeTarget(s, now));

  for (let i = 0; i < config.sections.length; i++) {
    if (states[i]?.done && config.sections[i]?.impliesPrevious) {
      for (let j = 0; j < i; j++) states[j].done = true;
    }
  }

  for (let i = 0; i < config.sections.length; i++) {
    const s = config.sections[i];
    const el = document.getElementById("val_" + s.id);
    if (!el) continue;
    if (states[i].done) setDone(el);
    else setCountdown(el, states[i].html);
  }
}

// ========= UI wire-up =========
toggleSettingsBtn.addEventListener("click", () => {
  const isHidden = settingsEl.classList.contains("hidden");
  settingsEl.classList.toggle("hidden");
  settingsEl.setAttribute("aria-hidden", isHidden ? "false" : "true");
});

addSectionBtn.addEventListener("click", () => {
  config.sections.push({ id: uid(), name: "Neue Section", type: "daily", hour: 16, minute: 0, weekendAutoDone: true, impliesPrevious: false });
  saveConfig(config);
  buildCountdownCards(); buildEditor(); updateCountdowns();
});

resetDefaultsBtn.addEventListener("click", () => {
  config = defaultConfig();
  saveConfig(config);
  buildCountdownCards(); buildEditor(); updateCountdowns();
});

// initial render
buildCountdownCards();
buildEditor();
updateCountdowns();
setInterval(updateCountdowns, 1000);
