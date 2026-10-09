"use strict";

/* ================= طبقة السحابة (Supabase) =================
   سكربت عادي يعتمد على المكتبة المحلية vendor/supabase.js.
   عند غياب الإعداد الصحيح يبقى التطبيق يعمل محلياً بلا أي تغيير. */

const SB_URL = window.SUPABASE_URL || "";
const SB_KEY = window.SUPABASE_KEY || "";
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(SB_URL) && !!SB_KEY;

const Cloud = {
  configured,
  ready: false,
  user: null,
  client: null,
  _authCbs: [],

  async init() {
    if (!configured) return;
    if (!window.supabase || !window.supabase.createClient) {
      console.warn("مكتبة Supabase غير متوفرة");
      return;
    }
    try {
      this.client = window.supabase.createClient(SB_URL, SB_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
      try {
        const { data } = await this.client.auth.getSession();
        this.user = (data && data.session && data.session.user) || null;
      } catch (_) { /* يعمل دون اتصال */ }
      this.client.auth.onAuthStateChange((_event, session) => {
        this.user = (session && session.user) || null;
        this._authCbs.forEach(cb => { try { cb(this.user); } catch (e) { console.warn(e); } });
      });
      this.ready = true;
      window.dispatchEvent(new CustomEvent("cloud-ready"));
    } catch (e) {
      console.warn("تعذّر تهيئة السحابة", e);
    }
  },

  onAuth(cb) { this._authCbs.push(cb); },

  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.user = data.user;
    return data.user;
  },

  async signOut() {
    try { await this.client.auth.signOut(); } catch (_) {}
    this.user = null;
  },

  async loadAll() {
    const [w, i, m] = await Promise.all([
      this.client.from("warehouses").select("*"),
      this.client.from("items").select("*"),
      this.client.from("movements").select("*")
    ]);
    if (w.error) throw w.error;
    if (i.error) throw i.error;
    if (m.error) throw m.error;
    return { warehouses: w.data || [], items: i.data || [], movements: m.data || [] };
  },

  async apply(op) {
    if (op.op === "delete") {
      const { error } = await this.client.from(op.table).delete().eq("id", op.id);
      if (error) throw error;
    } else {
      const { error } = await this.client.from(op.table).upsert(op.row);
      if (error) throw error;
    }
  },

  subscribe(onChange) {
    if (!this.client) return;
    const channel = this.client.channel("inv-sync");
    ["warehouses", "items", "movements"].forEach(table => {
      channel.on("postgres_changes", { event: "*", schema: "public", table },
        payload => { try { onChange(table, payload); } catch (e) { console.warn(e); } });
    });
    channel.subscribe();
  }
};

window.Cloud = Cloud;
Cloud.init();
