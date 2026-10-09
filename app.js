"use strict";

/* ================= التخزين ================= */
const DB = {
  load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
};

let warehouses = DB.load("inv_warehouses", []);
let items = DB.load("inv_items", []);
let movements = DB.load("inv_movements", []);

const save = () => {
  DB.save("inv_warehouses", warehouses);
  DB.save("inv_items", items);
  DB.save("inv_movements", movements);
};

/* ================= أدوات ================= */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/* ================= أيقونات SVG ================= */
const svgIc = (paths) =>
  `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const IC = {
  edit: svgIc(`<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>`),
  in: svgIc(`<path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/>`),
  out: svgIc(`<path d="M12 7v14"/><path d="m17 12-5-5-5 5"/><path d="M5 3h14"/>`),
  transfer: svgIc(`<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>`),
  del: svgIc(`<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>`),
  report: svgIc(`<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>`),
  box: svgIc(`<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>`),
  money: svgIc(`<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>`),
  warehouse: svgIc(`<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>`),
  layers: svgIc(`<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>`),
  alert: svgIc(`<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>`),
  clock: svgIc(`<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>`),
  check: svgIc(`<path d="M20 6 9 17l-5-5"/>`)
};

const fmtNum = (n) => Number(n).toLocaleString("ar-EG-u-nu-latn");
const fmtMoney = (n) => Number(n).toLocaleString("ar-EG-u-nu-latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ر.س";
const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" });
};
const esc = (s) => String(s).replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const findItem = (id) => items.find(i => i.id === id);
const findWh = (id) => warehouses.find(w => w.id === id);
const whName = (id) => findWh(id)?.name ?? "—";
const qtyIn = (item, whId) => (item.stock && item.stock[whId]) || 0;
const totalQty = (item) => Object.values(item.stock || {}).reduce((s, n) => s + n, 0);
const isLow = (item) => totalQty(item) <= item.min;
const confirmBox = (msg) => confirm(msg);

function ensureDefaultWarehouse() {
  if (warehouses.length === 0) {
    warehouses = [{ id: uid(), name: "المستودع الرئيسي", location: "المقر الرئيسي" }];
  }
}

/* ================= ترحيل البيانات القديمة ================= */
function migrate() {
  ensureDefaultWarehouse();
  const mainId = warehouses[0].id;
  let dirty = false;

  items.forEach(it => {
    if (!it.stock) {
      it.stock = { [mainId]: it.qty || 0 };
      delete it.qty;
      dirty = true;
    }
    if (it.category) { delete it.category; dirty = true; }
  });

  movements.forEach(m => {
    if (m.type === "in" && !m.to) { m.to = mainId; dirty = true; }
    if (m.type === "out" && !m.from) { m.from = mainId; dirty = true; }
    if (m.type === "adjust" && !m.from) { m.from = mainId; dirty = true; }
  });

  if (dirty) save();
}

/* ================= التبويبات ================= */
$$(".tab").forEach(tab => tab.addEventListener("click", () => {
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab.dataset.tab));
  $$(".panel").forEach(p => p.classList.toggle("active", p.id === tab.dataset.tab));
  $("#pageTitle").textContent = tab.dataset.title || tab.textContent.trim();
  renderAll();
}));

/* ================= المستودعات ================= */
function openWhDialog(wh = null) {
  $("#whDialogTitle").textContent = wh ? "تعديل مستودع" : "إضافة مستودع";
  $("#whId").value = wh ? wh.id : "";
  $("#whName").value = wh ? wh.name : "";
  $("#whLocation").value = wh ? wh.location : "";
  $("#whDialog").showModal();
}

$("#addWhBtn").addEventListener("click", () => openWhDialog());

$("#whForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = $("#whId").value;
  const name = $("#whName").value.trim();
  const location = $("#whLocation").value.trim();

  if (warehouses.some(w => w.name === name && w.id !== id)) {
    alert("يوجد مستودع بهذا الاسم مسبقاً.");
    return;
  }

  if (id) {
    const wh = findWh(id);
    if (wh) { wh.name = name; wh.location = location; }
  } else {
    warehouses.push({ id: uid(), name, location });
  }
  save();
  $("#whDialog").close();
  renderAll();
});

function deleteWh(id) {
  const wh = findWh(id);
  if (!wh) return;
  if (warehouses.length === 1) {
    alert("لا يمكن حذف آخر مستودع في النظام.");
    return;
  }
  const hasStock = items.some(i => qtyIn(i, id) > 0);
  if (hasStock) {
    alert(`لا يمكن حذف "${wh.name}" لوجود كمية مخزون به.\nحوّل المخزون أولاً إلى مستودع آخر.`);
    return;
  }
  if (!confirmBox(`حذف المستودع "${wh.name}"؟`)) return;
  warehouses = warehouses.filter(w => w.id !== id);
  items.forEach(i => { if (i.stock) delete i.stock[id]; });
  save();
  renderAll();
}

/* ================= الأصناف ================= */
function nextCode() {
  let max = 0;
  items.forEach(i => {
    const m = /(\d+)\s*$/.exec(String(i.code || ""));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return "PRD-" + String(max + 1).padStart(3, "0");
}

function openItemDialog(item = null) {
  $("#itemDialogTitle").textContent = item ? "تعديل صنف" : "إضافة صنف";
  $("#itemId").value = item ? item.id : "";
  $("#itemCode").value = item ? item.code : nextCode();
  $("#itemName").value = item ? item.name : "";
  $("#itemUnit").value = item ? item.unit : "قطعة";
  $("#itemMin").value = item ? item.min : 5;
  $("#itemPrice").value = item ? item.price : 0;

  const isNew = !item;
  $("#openingRow").classList.toggle("hidden", !isNew);
  $("#itemHint").classList.toggle("hidden", isNew);
  $("#itemQty").required = isNew;
  $("#itemQty").value = 0;

  $("#itemWh").innerHTML = warehouses.map(w =>
    `<option value="${w.id}">${esc(w.name)}</option>`).join("");

  $("#itemDialog").showModal();
}

$("#addItemBtn").addEventListener("click", () => openItemDialog());

$("#itemForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = $("#itemId").value;
  const code = $("#itemCode").value.trim();
  const data = {
    code,
    name: $("#itemName").value.trim(),
    unit: $("#itemUnit").value.trim(),
    min: Math.max(0, parseInt($("#itemMin").value) || 0),
    price: Math.max(0, parseFloat($("#itemPrice").value) || 0)
  };

  const dup = items.find(i => i.code === code && i.id !== id);
  if (dup) { alert("رمز الصنف مستخدم مسبقاً لصنف آخر."); return; }

  if (id) {
    const it = findItem(id);
    if (it) Object.assign(it, data);
  } else {
    const whId = $("#itemWh").value || warehouses[0].id;
    const qty = Math.max(0, parseInt($("#itemQty").value) || 0);
    const item = { id: uid(), ...data, stock: { [whId]: qty }, createdAt: new Date().toISOString() };
    items.push(item);
    if (qty > 0) {
      movements.unshift({
        id: uid(), type: "in", itemId: item.id, itemName: item.name,
        qty, to: whId, reason: "رصيد افتتاحي", user: "المدير", date: new Date().toISOString()
      });
    }
  }
  save();
  $("#itemDialog").close();
  renderAll();
});

function deleteItem(id) {
  const it = findItem(id);
  if (!it) return;
  if (!confirmBox(`حذف الصنف "${it.name}"؟ سيتم حذف حركاته أيضاً.`)) return;
  items = items.filter(i => i.id !== id);
  movements = movements.filter(m => m.itemId !== id);
  save();
  renderAll();
}

function editItem(id) { const it = findItem(id); if (it) openItemDialog(it); }

function openItemReport(id) {
  const i = findItem(id);
  if (!i) return;
  const ms = movements.filter(m => m.itemId === id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalIn = ms.filter(m => m.type === "in").reduce((s, m) => s + m.qty, 0);
  const totalOut = ms.filter(m => m.type === "out").reduce((s, m) => s + m.qty, 0);
  const transfers = ms.filter(m => m.type === "transfer").length;
  const adjusts = ms.filter(m => m.type === "adjust").length;

  $("#itemReportTitle").textContent = `تقرير حركة الصنف: ${i.name}`;
  $("#itemReportSub").textContent =
    `الرمز: ${i.code} · الرصيد الحالي: ${fmtNum(totalQty(i))} ${i.unit} · عدد الحركات: ${fmtNum(ms.length)}`;

  $("#itemReportStats").innerHTML = `
    <div class="rep-stat in"><span>${IC.in} إجمالي الإدخال</span><b>${fmtNum(totalIn)} ${esc(i.unit)}</b></div>
    <div class="rep-stat out"><span>${IC.out} إجمالي الصرف</span><b>${fmtNum(totalOut)} ${esc(i.unit)}</b></div>
    <div class="rep-stat"><span>${IC.transfer} التحويلات</span><b>${fmtNum(transfers)}</b></div>
    <div class="rep-stat"><span>${IC.report} التسويات</span><b>${fmtNum(adjusts)}</b></div>`;

  $("#itemReportTable").tBodies[0].innerHTML = ms.map(m => {
    let route = "—";
    if (m.type === "in") route = `إلى: <b>${esc(whName(m.to))}</b>`;
    else if (m.type === "out") route = `من: <b>${esc(whName(m.from))}</b>`;
    else if (m.type === "transfer") route = `${esc(whName(m.from))} ← ${esc(whName(m.to))}`;
    else if (m.from) route = `في: <b>${esc(whName(m.from))}</b>`;
    const sign = m.type === "out" ? "−" : m.type === "in" ? "+" : "";
    return `
    <tr>
      <td>${fmtDate(m.date)}</td>
      <td><span class="tag ${typeTag(m.type)}">${typeLabel(m.type)}</span></td>
      <td><b>${sign}${fmtNum(m.qty)} ${esc(i.unit)}</b></td>
      <td>${route}</td>
      <td>${esc(m.reason)}</td>
      <td>${esc(m.user)}</td>
    </tr>`;
  }).join("");

  $("#itemReportEmpty").classList.toggle("hidden", ms.length > 0);
  $("#itemReportDialog").showModal();
}

/* ================= الحركات ================= */
function openMovementDialog(type, itemId = null) {
  if (items.length === 0) { alert("أضف صنفاً أولاً من تبويب الأصناف."); return; }
  if (warehouses.length === 0) { alert("أضف مستودعاً أولاً من تبويب المستودعات."); return; }

  $("#movementType").value = type;
  $("#movementTitle").textContent =
    type === "in" ? "إدخال مخزون" : type === "out" ? "صرف مخزون" : "تحويل بين المستودعات";

  const fromField = $("#fromField"), toField = $("#toField");
  fromField.classList.toggle("hidden", type === "in");
  toField.classList.toggle("hidden", type === "out");

  const whOpts = warehouses.map(w => `<option value="${w.id}">${esc(w.name)}</option>`).join("");
  $("#movementFrom").innerHTML = whOpts;
  $("#movementTo").innerHTML = whOpts;

  $("#movementItem").innerHTML = items.map(i =>
    `<option value="${i.id}">${esc(i.name)} (${esc(i.code)}) — المتاح: ${fmtNum(totalQty(i))} ${esc(i.unit)}</option>`
  ).join("");
  if (itemId) $("#movementItem").value = itemId;

  if (type === "transfer") {
    $("#movementReason").value = "تحويل داخلي";
    if ($("#movementFrom").options.length > 1) $("#movementFrom").selectedIndex = 0;
    $("#movementTo").selectedIndex = Math.min(1, $("#movementTo").options.length - 1);
  } else {
    $("#movementReason").value = type === "in" ? "فاتورة شراء" : "أمر صرف";
  }
  $("#movementQty").value = 1;
  updateMovementHint();
  $("#movementDialog").showModal();
}

function updateMovementHint() {
  const it = findItem($("#movementItem").value);
  if (!it) return;
  const type = $("#movementType").value;
  const q = parseInt($("#movementQty").value) || 0;
  const fromId = $("#movementFrom").value;
  const toId = $("#movementTo").value;

  if (type === "in") {
    const after = qtyIn(it, toId) + q;
    $("#movementHint").textContent =
      `الكمية في "${whName(toId)}" بعد الإدخال: ${fmtNum(after)} ${it.unit}` +
      (totalQty(it) + q <= it.min ? " ⚠️ سيبقى تحت الحد الأدنى" : "");
  } else if (type === "out") {
    const avail = qtyIn(it, fromId);
    $("#movementHint").textContent =
      `المتاح في "${whName(fromId)}": ${fmtNum(avail)} ${it.unit}` +
      (q > avail ? ` ❌ الكمية المطلوبة أكبر من المتاح (${fmtNum(avail)})` : ` — بعد الصرف: ${fmtNum(avail - q)}`);
  } else {
    const avail = qtyIn(it, fromId);
    $("#movementHint").textContent = fromId === toId
      ? "❌ يجب أن يكون المستودعان مختلفين."
      : `من "${whName(fromId)}": ${fmtNum(avail)} ${it.unit}` +
        (q > avail ? ` ❌ الكمية المطلوبة أكبر من المتاح (${fmtNum(avail)})` : ` — بعد التحويل: ${whName(fromId)} ${fmtNum(avail - q)} / ${whName(toId)} ${fmtNum(qtyIn(it, toId) + q)}`);
  }
}
["#movementItem", "#movementQty", "#movementFrom", "#movementTo"].forEach(sel =>
  $(sel).addEventListener("input", updateMovementHint));

$("#stockInBtn").addEventListener("click", () => openMovementDialog("in"));
$("#stockOutBtn").addEventListener("click", () => openMovementDialog("out"));
$("#transferBtn").addEventListener("click", () => openMovementDialog("transfer"));

$("#movementForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const type = $("#movementType").value;
  const it = findItem($("#movementItem").value);
  const qty = parseInt($("#movementQty").value) || 0;
  const fromId = $("#movementFrom").value;
  const toId = $("#movementTo").value;
  if (!it || qty < 1) return;

  if ((type === "out" || type === "transfer") && qty > qtyIn(it, fromId)) {
    alert(`الكمية المطلوبة (${fmtNum(qty)}) أكبر من المتاح في "${whName(fromId)}" (${fmtNum(qtyIn(it, fromId))}).`);
    return;
  }
  if (type === "transfer" && fromId === toId) {
    alert("يجب اختيار مستودعين مختلفين للتحويل.");
    return;
  }

  if (type === "in") {
    it.stock[toId] = qtyIn(it, toId) + qty;
  } else if (type === "out") {
    it.stock[fromId] = qtyIn(it, fromId) - qty;
  } else {
    it.stock[fromId] = qtyIn(it, fromId) - qty;
    it.stock[toId] = qtyIn(it, toId) + qty;
  }

  movements.unshift({
    id: uid(), type, itemId: it.id, itemName: it.name, qty,
    from: type === "in" ? null : fromId,
    to: type === "out" ? null : toId,
    reason: $("#movementReason").value.trim(),
    user: $("#movementUser").value.trim() || "—",
    date: new Date().toISOString()
  });
  save();
  $("#movementDialog").close();
  renderAll();
});

function deleteMovement(id) {
  const m = movements.find(x => x.id === id);
  if (!m) return;
  if (!confirmBox("حذف الحركة؟ سيتم عكس أثرها على كميات المستودعات.")) return;
  const it = findItem(m.itemId);
  if (it) {
    if (m.type === "in" && m.to) it.stock[m.to] = Math.max(0, qtyIn(it, m.to) - m.qty);
    else if (m.type === "out" && m.from) it.stock[m.from] = qtyIn(it, m.from) + m.qty;
    else if (m.type === "transfer") {
      if (m.from) it.stock[m.from] = qtyIn(it, m.from) + m.qty;
      if (m.to) it.stock[m.to] = Math.max(0, qtyIn(it, m.to) - m.qty);
    } else if (m.type === "adjust" && m.from) {
      it.stock[m.from] = Math.max(0, qtyIn(it, m.from) - m.qty);
    }
  }
  movements = movements.filter(x => x.id !== id);
  save();
  renderAll();
}

const typeLabel = (t) => t === "in" ? "إدخال" : t === "out" ? "صرف" : t === "transfer" ? "تحويل" : "تعديل";
const typeTag = (t) => t === "in" ? "tag-in" : t === "out" ? "tag-out" : t === "transfer" ? "tag-transfer" : "tag-ok";

/* ================= البحث والفلاتر ================= */
$("#itemSearch").addEventListener("input", renderItems);
$("#whFilter").addEventListener("change", renderItems);
$("#movementFilter").addEventListener("change", renderMovements);
$("#movementWhFilter").addEventListener("change", renderMovements);
$("#dateFrom").addEventListener("change", renderMovements);
$("#dateTo").addEventListener("change", renderMovements);

/* ================= العرض ================= */
function fillSelect(sel, options, placeholder) {
  const prev = sel.value;
  sel.innerHTML = (placeholder !== undefined ? `<option value="">${placeholder}</option>` : "") +
    options.map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join("");
  if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
}

function renderStats() {
  const totalKinds = items.length;
  const totalQtyAll = items.reduce((s, i) => s + totalQty(i), 0);
  const totalValue = items.reduce((s, i) => s + totalQty(i) * i.price, 0);
  const lowCount = items.filter(isLow).length;
  const today = new Date().toDateString();
  const todayMoves = movements.filter(m => new Date(m.date).toDateString() === today).length;

  $("#heroValue").textContent = fmtMoney(totalValue);
  $("#heroDate").textContent = new Date().toLocaleDateString("ar-EG-u-nu-latn", { weekday: "long", day: "numeric", month: "long" });
  $("#heroSub").textContent = `${fmtNum(totalKinds)} صنف موزّع على ${fmtNum(warehouses.length)} مستودع`;
  $("#heroBadge").innerHTML = lowCount
    ? `<span class="hero-pill danger">${IC.alert}<b>${fmtNum(lowCount)}</b> تحت الحد الأدنى</span>`
    : `<span class="hero-pill ok">${IC.check} المخزون بحالة جيدة</span>`;

  const cards = [
    { v: "blue", ic: IC.box, l: "عدد الأصناف", n: fmtNum(totalKinds) },
    { v: "violet", ic: IC.warehouse, l: "عدد المستودعات", n: fmtNum(warehouses.length) },
    { v: "green", ic: IC.layers, l: "إجمالي الكمية", n: fmtNum(totalQtyAll) },
    { v: "red", ic: IC.alert, l: "تحت الحد الأدنى", n: fmtNum(lowCount), warn: lowCount > 0 },
    { v: "cyan", ic: IC.clock, l: "حركات اليوم", n: fmtNum(todayMoves) }
  ];
  $("#statsCards").innerHTML = cards.map(c => `
    <div class="stat ${c.v}${c.warn ? " warn" : ""}">
      <div class="stat-ic">${c.ic}</div>
      <div class="stat-body"><div class="lbl">${c.l}</div><div class="num">${c.n}</div></div>
    </div>`).join("");

  const badge = $("#alertCount");
  badge.textContent = lowCount;
  badge.classList.toggle("hidden", lowCount === 0);
}

function renderWarehouseSummary() {
  const rows = warehouses.map(w => {
    const qty = items.reduce((s, i) => s + qtyIn(i, w.id), 0);
    const value = items.reduce((s, i) => s + qtyIn(i, w.id) * i.price, 0);
    const kinds = items.filter(i => qtyIn(i, w.id) > 0).length;
    return { w, qty, value, kinds };
  });
  $("#whChartSub").textContent = `${fmtNum(rows.length)} مستودع`;
  const max = Math.max(1, ...rows.map(r => r.qty));
  $("#warehouseChart").innerHTML = rows.length
    ? rows.map((r, idx) => {
        const pct = Math.round(r.qty / max * 100);
        return `<div class="wbar">
          <div class="wbar-top">
            <span class="wbar-name">${IC.warehouse} ${esc(r.w.name)}</span>
            <span class="wbar-val">${fmtNum(r.qty)} وحدة · ${fmtMoney(r.value)}</span>
          </div>
          <div class="wbar-track"><div class="wbar-fill v${idx % 5}" style="width:${pct}%"></div></div>
          <div class="wbar-sub">${fmtNum(r.kinds)} صنف</div>
        </div>`;
      }).join("")
    : `<p class="empty">لا توجد مستودعات.</p>`;
}

function renderLowStock() {
  const low = items.filter(isLow);
  const pill = $("#lowCountPill");
  pill.textContent = low.length ? `${fmtNum(low.length)} صنف` : "لا نواقص";
  pill.className = "pill " + (low.length ? "pill-danger" : "pill-ok");
  $("#lowStockList").innerHTML = low.length
    ? low.map(i => {
        const q = totalQty(i);
        const pct = i.min > 0 ? Math.min(100, Math.round(q / i.min * 100)) : 100;
        return `<div class="low-row">
          <div class="low-info"><span class="low-name">${esc(i.name)}</span>
            <span class="low-meta">${fmtNum(q)} / ${fmtNum(i.min)} ${esc(i.unit)}</span></div>
          <div class="low-track"><div class="low-fill" style="width:${pct}%"></div></div>
        </div>`;
      }).join("")
    : `<p class="empty">لا توجد نواقص 👍</p>`;
}

function renderRecent() {
  const recent = movements.slice(0, 6);
  $("#recentMovements").innerHTML = recent.length
    ? recent.map(m => {
        const unit = findItem(m.itemId)?.unit || "";
        const ic = m.type === "in" ? IC.in : m.type === "out" ? IC.out : m.type === "transfer" ? IC.transfer : IC.edit;
        const sign = m.type === "in" ? "+" : m.type === "out" ? "−" : "";
        return `<div class="tl-row">
          <div class="tl-ic ${m.type}">${ic}</div>
          <div class="tl-body">
            <span class="tl-title">${esc(m.itemName)}</span>
            <span class="tl-time">${fmtDate(m.date)}</span>
          </div>
          <div class="tl-side">
            <span class="tl-qty ${m.type}">${sign}${fmtNum(m.qty)} ${esc(unit)}</span>
            <span class="tag ${typeTag(m.type)}">${typeLabel(m.type)}</span>
          </div>
        </div>`;
      }).join("")
    : `<p class="empty">لا توجد حركات بعد.</p>`;
}

function renderItems() {
  fillSelect($("#whFilter"), warehouses, "كل المستودعات");

  const q = $("#itemSearch").value.trim().toLowerCase();
  const wh = $("#whFilter").value;

  const list = items.filter(i =>
    !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)
  );

  $("#itemsTable").tBodies[0].innerHTML = list.map(i => {
    const showQty = wh ? qtyIn(i, wh) : totalQty(i);
    const low = isLow(i);
    const dist = warehouses
      .filter(w => qtyIn(i, w.id) > 0)
      .map(w => `<span class="wh-chip">${esc(w.name)}: ${fmtNum(qtyIn(i, w.id))}</span>`).join("") || "—";
    return `
    <tr>
      <td>
        <div class="cell-entity">
          <div class="avatar ${low ? "red" : "blue"}">${IC.box}</div>
          <div>
            <div class="entity-main">${esc(i.name)}</div>
            <div class="entity-sub">${esc(i.code)} · ${esc(i.unit)}</div>
          </div>
        </div>
      </td>
      <td><span class="qty-badge ${low ? "low" : "ok"}">${fmtNum(showQty)}<small>${esc(i.unit)}</small></span></td>
      <td>${dist}</td>
      <td class="muted-cell">${fmtNum(i.min)}</td>
      <td>${fmtMoney(i.price)}</td>
      <td><b>${fmtMoney(showQty * i.price)}</b></td>
      <td class="actions">
        <button class="btn btn-primary btn-sm ibtn" title="تعديل" onclick="editItem('${i.id}')">${IC.edit}</button>
        <button class="btn btn-success btn-sm ibtn" title="إدخال" onclick="openMovementDialog('in','${i.id}')">${IC.in}</button>
        <button class="btn btn-warning btn-sm ibtn" title="صرف" onclick="openMovementDialog('out','${i.id}')">${IC.out}</button>
        <button class="btn btn-ghost btn-sm ibtn" title="تحويل" onclick="openMovementDialog('transfer','${i.id}')">${IC.transfer}</button>
        <button class="btn btn-ghost btn-sm ibtn" title="تقرير الحركة" onclick="openItemReport('${i.id}')">${IC.report}</button>
        <button class="btn btn-danger btn-sm ibtn" title="حذف" onclick="deleteItem('${i.id}')">${IC.del}</button>
      </td>
    </tr>`;
  }).join("");

  $("#itemsEmpty").classList.toggle("hidden", list.length > 0);
}

function renderMovements() {
  fillSelect($("#movementWhFilter"), warehouses, "كل المستودعات");
  const type = $("#movementFilter").value;
  const whF = $("#movementWhFilter").value;
  const from = $("#dateFrom").value ? new Date($("#dateFrom").value) : null;
  const to = $("#dateTo").value ? new Date($("#dateTo").value + "T23:59:59") : null;

  const list = movements.filter(m => {
    const d = new Date(m.date);
    const whMatch = !whF || m.from === whF || m.to === whF;
    return (!type || m.type === type) && whMatch &&
      (!from || d >= from) && (!to || d <= to);
  });

  $("#movementsTable").tBodies[0].innerHTML = list.map(m => {
    const unit = findItem(m.itemId)?.unit || "—";
    const ic = m.type === "in" ? IC.in : m.type === "out" ? IC.out : m.type === "transfer" ? IC.transfer : IC.edit;
    const badge = m.type === "in" ? "ok" : m.type === "out" ? "amber" : "";
    const sign = m.type === "in" ? "+" : m.type === "out" ? "−" : "";
    let route = "—";
    if (m.type === "in") route = `إلى: <b>${esc(whName(m.to))}</b>`;
    else if (m.type === "out") route = `من: <b>${esc(whName(m.from))}</b>`;
    else if (m.type === "transfer") route = `${esc(whName(m.from))} ← ${esc(whName(m.to))}`;
    else if (m.from) route = `في: <b>${esc(whName(m.from))}</b>`;
    return `
    <tr>
      <td><span class="tag ${typeTag(m.type)}">${ic}${typeLabel(m.type)}</span></td>
      <td class="entity-main">${esc(m.itemName)}</td>
      <td><span class="qty-badge ${badge}">${sign}${fmtNum(m.qty)}<small>${esc(unit)}</small></span></td>
      <td>${route}</td>
      <td class="muted-cell">${esc(m.reason) || "—"}</td>
      <td class="muted-cell">${esc(m.user) || "—"}</td>
      <td class="muted-cell">${fmtDate(m.date)}</td>
      <td class="actions"><button class="btn btn-danger btn-sm ibtn" title="حذف" onclick="deleteMovement('${m.id}')">${IC.del}</button></td>
    </tr>`;
  }).join("");

  $("#movementsEmpty").classList.toggle("hidden", list.length > 0);
}

function renderWarehouses() {
  $("#whTable").tBodies[0].innerHTML = warehouses.map(w => {
    const kinds = items.filter(i => qtyIn(i, w.id) > 0).length;
    const qty = items.reduce((s, i) => s + qtyIn(i, w.id), 0);
    const value = items.reduce((s, i) => s + qtyIn(i, w.id) * i.price, 0);
    return `
    <tr>
      <td>
        <div class="cell-entity">
          <div class="avatar violet">${IC.warehouse}</div>
          <div>
            <div class="entity-main">${esc(w.name)}</div>
            <div class="entity-sub">${w.location ? esc(w.location) : "بدون موقع"}</div>
          </div>
        </div>
      </td>
      <td><span class="wh-chip">${fmtNum(kinds)} صنف</span></td>
      <td><span class="qty-badge">${fmtNum(qty)}</span></td>
      <td><b>${fmtMoney(value)}</b></td>
      <td class="actions">
        <button class="btn btn-ghost btn-sm ibtn" title="تقرير المستودع" onclick="openWhReport('${w.id}')">${IC.report}</button>
        <button class="btn btn-primary btn-sm ibtn" title="تعديل" onclick="openWhDialog(warehouses.find(x=>x.id==='${w.id}'))">${IC.edit}</button>
        <button class="btn btn-danger btn-sm ibtn" title="حذف" onclick="deleteWh('${w.id}')">${IC.del}</button>
      </td>
    </tr>`;
  }).join("");
  $("#whEmpty").classList.toggle("hidden", warehouses.length > 0);
}

function openWhReport(id) {
  const w = warehouses.find(x => x.id === id);
  if (!w) return;

  const rows = items
    .map(i => ({ i, qty: qtyIn(i, id) }))
    .filter(r => r.qty > 0)
    .sort((a, b) => (b.qty * b.i.price) - (a.qty * a.i.price));

  const totalQtyAll = rows.reduce((s, r) => s + r.qty, 0);
  const totalValue = rows.reduce((s, r) => s + r.qty * r.i.price, 0);
  const ms = movements
    .filter(m => m.from === id || m.to === id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  $("#whReportTitle").textContent = `تقرير مستودع: ${w.name}`;
  $("#whReportSub").textContent =
    `${w.location ? "الموقع: " + w.location + " · " : ""}عدد الحركات المسجلة: ${fmtNum(ms.length)}`;

  $("#whReportStats").innerHTML = `
    <div class="rep-stat"><span>${IC.box} عدد الأصناف</span><b>${fmtNum(rows.length)}</b></div>
    <div class="rep-stat in"><span>${IC.in} إجمالي الكمية</span><b>${fmtNum(totalQtyAll)}</b></div>
    <div class="rep-stat"><span>${IC.money} قيمة المخزون</span><b>${fmtMoney(totalValue)}</b></div>
    <div class="rep-stat out"><span>${IC.transfer} الحركات</span><b>${fmtNum(ms.length)}</b></div>`;

  $("#whReportItems").tBodies[0].innerHTML = rows.map(r => `
    <tr>
      <td>${esc(r.i.code)}</td>
      <td><b>${esc(r.i.name)}</b></td>
      <td class="${r.qty <= r.i.min ? "qty-low" : ""}">${fmtNum(r.qty)} ${r.qty <= r.i.min ? "⚠️" : ""}</td>
      <td>${esc(r.i.unit)}</td>
      <td>${fmtNum(r.i.min)}</td>
      <td>${fmtMoney(r.i.price)}</td>
      <td><b>${fmtMoney(r.qty * r.i.price)}</b></td>
    </tr>`).join("");
  $("#whReportItemsEmpty").classList.toggle("hidden", rows.length > 0);

  $("#whReportMoves").tBodies[0].innerHTML = ms.map(m => {
    let route = "—";
    if (m.type === "in") route = `إلى: <b>${esc(whName(m.to))}</b>`;
    else if (m.type === "out") route = `من: <b>${esc(whName(m.from))}</b>`;
    else if (m.type === "transfer") route = `${esc(whName(m.from))} ← ${esc(whName(m.to))}`;
    else if (m.from) route = `في: <b>${esc(whName(m.from))}</b>`;
    const sign = m.type === "out" ? "−" : m.type === "in" ? "+" : "";
    return `
    <tr>
      <td>${fmtDate(m.date)}</td>
      <td><span class="tag ${typeTag(m.type)}">${typeLabel(m.type)}</span></td>
      <td>${esc(m.itemName)}</td>
      <td><b>${sign}${fmtNum(m.qty)}</b></td>
      <td>${route}</td>
      <td>${esc(m.reason)}</td>
      <td>${esc(m.user)}</td>
    </tr>`;
  }).join("");
  $("#whReportMovesEmpty").classList.toggle("hidden", ms.length > 0);

  $("#whReportDialog").showModal();
}

function renderAll() {
  renderStats();
  renderWarehouseSummary();
  renderLowStock();
  renderRecent();
  renderItems();
  renderMovements();
  renderWarehouses();
}

/* ================= التنبيهات ================= */
$("#alertBtn").addEventListener("click", () => {
  const low = items.filter(isLow);
  alert(low.length
    ? "⚠️ أصناف تحت الحد الأدنى:\n\n" +
      low.map(i => `• ${i.name} — المتاح ${totalQty(i)} / الحد الأدنى ${i.min} ${i.unit}`).join("\n")
    : "👍 لا توجد نواقص في المخزون.");
});

/* ================= تصدير CSV ================= */
$("#exportBtn").addEventListener("click", () => {
  if (items.length === 0) { alert("لا توجد بيانات للتصدير."); return; }
  const rows = [
    ["الرمز", "الاسم", "الوحدة", "الحد الأدنى", "السعر",
      ...warehouses.map(w => w.name), "الإجمالي", "القيمة", "الحالة"],
    ...items.map(i => [i.code, i.name, i.unit, i.min, i.price,
      ...warehouses.map(w => qtyIn(i, w.id)), totalQty(i), totalQty(i) * i.price,
      isLow(i) ? "نقص" : "متوفر"])
  ];
  const csv = "\uFEFF" + rows.map(r =>
    r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `تقرير_المخزون_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ================= طباعة ================= */
let pageStyleEl = null;

function setPrintPage(landscape) {
  if (pageStyleEl) pageStyleEl.remove();
  pageStyleEl = null;
  if (landscape) {
    pageStyleEl = document.createElement("style");
    pageStyleEl.textContent = "@page { size: A4 landscape; margin: 10mm; }";
    document.head.appendChild(pageStyleEl);
  }
}

function printPanel(panelId, title, landscape = false) {
  $("#printTitle").textContent = title;
  $("#printDate").textContent = "تاريخ التصدير: " + fmtDate(new Date().toISOString());
  $$(".panel").forEach(p => p.classList.remove("print-target"));
  $("#printArea").innerHTML = "";
  $("#printArea").classList.remove("print-target");
  document.getElementById(panelId).classList.add("print-target");
  document.body.classList.add("printing");
  setPrintPage(landscape);
  window.print();
}

function printDialog(dialogId, title, landscape = false) {
  const dlg = document.getElementById(dialogId);
  const src = dlg.querySelector(".form") || dlg;
  const area = $("#printArea");
  area.innerHTML = src.innerHTML;
  area.querySelectorAll(".dialog-actions").forEach(el => el.remove());
  const h2 = area.querySelector("h2");
  if (h2) h2.remove();

  $("#printTitle").textContent = title;
  $("#printDate").textContent = "تاريخ التصدير: " + fmtDate(new Date().toISOString());
  $$(".panel").forEach(p => p.classList.remove("print-target"));
  area.classList.add("print-target");
  document.body.classList.add("printing");
  setPrintPage(landscape);
  if (dlg.open) dlg.close();
  window.print();
}

window.addEventListener("afterprint", () => {
  document.body.classList.remove("printing");
  $$(".panel").forEach(p => p.classList.remove("print-target"));
  const area = $("#printArea");
  area.classList.remove("print-target");
  area.innerHTML = "";
  if (pageStyleEl) { pageStyleEl.remove(); pageStyleEl = null; }
});

$("#printMovBtn").addEventListener("click", () => printPanel("movements", "قائمة حركات المخزون", true));
$("#printItemRepBtn").addEventListener("click", () => printDialog("itemReportDialog", $("#itemReportTitle").textContent));
$("#printWhRepBtn").addEventListener("click", () => printDialog("whReportDialog", $("#whReportTitle").textContent));

/* ================= إغلاق النوافذ ================= */
$$("[data-close]").forEach(b => b.addEventListener("click", () => b.closest("dialog").close()));

/* ================= البيانات الأولية ================= */
if (items.length === 0 && warehouses.length === 0) {
  const now = Date.now();
  const w1 = uid(), w2 = uid(), w3 = uid();
  warehouses = [
    { id: w1, name: "المستودع الرئيسي", location: "المقر الرئيسي" },
    { id: w2, name: "مستودع الفرع", location: "الرياض" },
    { id: w3, name: "مستودع المعرض", location: "جدة" }
  ];
  items = [
    { id: uid(), code: "PRD-001", name: "لابتوب ديل", unit: "قطعة", min: 3, price: 3200, stock: { [w1]: 8, [w2]: 4 } },
    { id: uid(), code: "PRD-002", name: "طابعة HP", unit: "قطعة", min: 4, price: 850, stock: { [w1]: 2 } },
    { id: uid(), code: "PRD-003", name: "ورق تصوير A4", unit: "رزمة", min: 20, price: 18, stock: { [w1]: 45, [w3]: 15 } },
    { id: uid(), code: "PRD-004", name: "أقلام جافة", unit: "علبة", min: 10, price: 12, stock: { [w1]: 30, [w2]: 20, [w3]: 10 } },
    { id: uid(), code: "PRD-005", name: "مقص مكتبي", unit: "قطعة", min: 5, price: 25, stock: { [w1]: 3 } },
    { id: uid(), code: "PRD-006", name: "كرسي مكتب", unit: "قطعة", min: 2, price: 480, stock: { [w1]: 6, [w2]: 2 } }
  ];
  movements = [
    { id: uid(), type: "in", itemId: items[0].id, itemName: items[0].name, qty: 15, from: null, to: w1, reason: "فاتورة شراء 1024", user: "أحمد", date: new Date(now - 6 * 86400000).toISOString() },
    { id: uid(), type: "transfer", itemId: items[0].id, itemName: items[0].name, qty: 4, from: w1, to: w2, reason: "تحويل لفرع الرياض", user: "سالم", date: new Date(now - 5 * 86400000).toISOString() },
    { id: uid(), type: "out", itemId: items[0].id, itemName: items[0].name, qty: 3, from: w1, to: null, reason: "صرف لقسم المبيعات", user: "سالم", date: new Date(now - 4 * 86400000).toISOString() },
    { id: uid(), type: "in", itemId: items[2].id, itemName: items[2].name, qty: 50, from: null, to: w1, reason: "توريد مخزون", user: "أحمد", date: new Date(now - 3 * 86400000).toISOString() },
    { id: uid(), type: "out", itemId: items[4].id, itemName: items[4].name, qty: 7, from: w1, to: null, reason: "صرف للمخازن", user: "سالم", date: new Date(now - 1 * 86400000).toISOString() },
    { id: uid(), type: "in", itemId: items[3].id, itemName: items[3].name, qty: 20, from: null, to: w2, reason: "فاتورة شراء 1030", user: "أحمد", date: new Date().toISOString() }
  ];
  save();
} else {
  migrate();
}

/* ================= تشغيل ================= */
renderAll();

/* ================= القفل الرقمي (6 أرقام) ================= */
const PIN_KEY = "inv_pin_hash";
const PIN_SALT = "inv-pin-salt-v1";
let lockMode = "create";
let lockStep = 0;
let pinBuf = "";
let pendingNew = null;
let lockBusy = false;

function hashPin(pin) {
  const data = PIN_SALT + pin;
  if (window.crypto && crypto.subtle && crypto.subtle.digest) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)).then(buf =>
      Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""));
  }
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < data.length; i++) {
    h1 = ((h1 ^ data.charCodeAt(i)) * 16777619) >>> 0;
    h2 = (h2 + data.charCodeAt(i) * (i + 7)) >>> 0;
  }
  return Promise.resolve("f" + h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0"));
}

function lockHint() {
  if (lockMode === "create") return lockStep === 0
    ? "اختر رقماً سرياً من 6 أرقام لحماية بياناتك"
    : "أعد إدخال الرقم السري للتأكيد";
  if (lockMode === "change") return [
    "أدخل رقمك السري الحالي للمتابعة",
    "اختر رقماً سرياً جديداً من 6 أرقام",
    "أعد إدخال الرقم الجديد للتأكيد"
  ][lockStep];
  return "أدخل الرقم السري للدخول إلى البرنامج";
}

function lockTitle() {
  if (lockMode === "create") return lockStep === 0 ? "إنشاء رقم سري 🔐" : "تأكيد الرقم السري";
  if (lockMode === "change") return ["تغيير الرقم السري", "رقماً سرياً جديداً", "تأكيد الرقم الجديد"][lockStep];
  return "أهلاً بك 👋";
}

function renderLock(msg, cls) {
  $("#lockTitle").textContent = lockTitle();
  $("#lockMsg").textContent = msg || lockHint();
  $("#lockMsg").className = "lock-msg" + (cls ? " " + cls : "");
  $("#pinDots").innerHTML = Array.from({ length: 6 }, (_, i) =>
    `<span class="${i < pinBuf.length ? "on" : ""}"></span>`).join("");
  $("#forgotPin").classList.toggle("hidden", lockMode !== "unlock");
}

function showLock(mode) {
  lockMode = mode;
  lockStep = 0;
  pinBuf = "";
  pendingNew = null;
  $("#lockScreen").classList.remove("hidden");
  renderLock();
}

function hideLock() {
  $("#lockScreen").classList.add("hidden");
  pinBuf = "";
}

function lockFail(msg) {
  pinBuf = "";
  renderLock(msg, "err");
  const card = $("#lockCard");
  card.classList.remove("shake");
  void card.offsetWidth;
  card.classList.add("shake");
}

function lockKey(k) {
  if (lockBusy) return;
  if (k === "del") { pinBuf = pinBuf.slice(0, -1); renderLock(); return; }
  if (k === "clr") { pinBuf = ""; renderLock(); return; }
  if (!/^[0-9]$/.test(k) || pinBuf.length >= 6) return;
  pinBuf += k;
  renderLock();
  if (pinBuf.length === 6) setTimeout(lockSubmit, 180);
}

async function lockSubmit() {
  if (lockBusy || pinBuf.length !== 6) return;
  lockBusy = true;
  const buf = pinBuf;
  try {
    if (lockMode === "unlock") {
      const h = await hashPin(buf);
      if (h === localStorage.getItem(PIN_KEY)) {
        renderLock("تم فتح القفل ✓", "ok");
        setTimeout(hideLock, 250);
      } else {
        lockFail("الرقم السري غير صحيح ❌");
      }
    } else if (lockMode === "create") {
      if (lockStep === 0) {
        pendingNew = buf;
        lockStep = 1;
        pinBuf = "";
        renderLock("أعد إدخال الرقم للتأكيد", "ok");
      } else if (buf === pendingNew) {
        localStorage.setItem(PIN_KEY, await hashPin(buf));
        renderLock("تم الحفظ ✓", "ok");
        setTimeout(hideLock, 250);
      } else {
        pendingNew = null;
        lockStep = 0;
        lockFail("الرقمان غير متطابينين ⚠️");
      }
    } else {
      if (lockStep === 0) {
        const h = await hashPin(buf);
        if (h === localStorage.getItem(PIN_KEY)) {
          lockStep = 1;
          pinBuf = "";
          renderLock("اختر رقماً سرياً جديداً", "ok");
        } else {
          lockFail("الرقم السري الحالي غير صحيح ❌");
        }
      } else if (lockStep === 1) {
        pendingNew = buf;
        lockStep = 2;
        pinBuf = "";
        renderLock("أعد إدخال الرقم الجديد للتأكيد", "ok");
      } else if (buf === pendingNew) {
        localStorage.setItem(PIN_KEY, await hashPin(buf));
        renderLock("تم تغيير الرقم السري ✓", "ok");
        setTimeout(hideLock, 350);
      } else {
        pendingNew = null;
        lockStep = 1;
        lockFail("الرقمان غير متطابينين ⚠️");
      }
    }
  } finally {
    lockBusy = false;
  }
}

$("#keypad").addEventListener("click", (e) => {
  const k = e.target.closest("[data-k]")?.dataset.k;
  if (k) lockKey(k);
});

/* منع التكبير (pinch/double-tap zoom) على شاشة القفل */
["gesturestart", "gesturechange", "gestureend"].forEach(evt =>
  $("#lockScreen").addEventListener(evt, e => e.preventDefault())
);

document.addEventListener("keydown", (e) => {
  if ($("#lockScreen").classList.contains("hidden")) return;
  if (/^[0-9]$/.test(e.key)) lockKey(e.key);
  else if (e.key === "Backspace") { e.preventDefault(); lockKey("del"); }
  else if (e.key === "Enter") lockSubmit();
});

$("#forgotPin").addEventListener("click", () => {
  if (!confirm("سيتم إزالة الرقم السري وإنشاء رقم جديد.\n(ستبقى بيانات المخزون محفوظة)\n\nهل تريد المتابعة؟")) return;
  localStorage.removeItem(PIN_KEY);
  showLock("create");
});

$("#changePinBtn").addEventListener("click", () => showLock("change"));

if (localStorage.getItem(PIN_KEY)) showLock("unlock");
else showLock("create");
