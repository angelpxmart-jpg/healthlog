import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const COLORS = {
  bg: "#F5F5F7",
  card: "#FFFFFF",
  green: "#E8622A",
  greenLight: "#F5A87A",
  greenPale: "#FFF0E8",
  brown: "#6B7280",
  brownLight: "#9CA3AF",
  brownPale: "#F5F5F7",
  text: "#1A1A1A",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  accent: "#DC4F4F",
  white: "#FFFFFF",
};

// Protein is first — most prominent
const NUTRIENTS = [
  { key: "protein", label: "蛋白質", unit: "g", color: COLORS.green, icon: "💪" },
  { key: "calories", label: "熱量", unit: "kcal", color: COLORS.accent, icon: "🔥" },
  { key: "fat", label: "脂肪", unit: "g", color: COLORS.brownLight, icon: "🥑" },
  { key: "carbs", label: "碳水", unit: "g", color: "#C4956A", icon: "🌾" },
  { key: "fiber", label: "膳食纖維", unit: "g", color: COLORS.greenLight, icon: "🥦" },
];

const MEAL_LABELS = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "點心" };
const NEXT_MEAL_MAP = { breakfast: "午餐", lunch: "晚餐", dinner: "明日早餐", snack: "下一正餐" };

const defaultProfile = { height: "", weight: "", age: "", goal: "減脂", targets: null };
const defaultLog = { breakfast: [], lunch: [], dinner: [], snack: [], exercise: [] };

// ===== FOODS DB (衛福部食品營養成分資料庫 + 小時達包裝參考) =====
const FOODS_DB = {
  meat: {
    label: "肉類", icon: "🍗",
    items: [
      { id: "chicken_breast", name: "雞胸肉", defaultGrams: 300, per100: { calories: 109, protein: 23.1, fat: 1.3, carbs: 0, fiber: 0 } },
      { id: "chicken_thigh", name: "去骨雞腿", defaultGrams: 200, per100: { calories: 157, protein: 18.7, fat: 8.7, carbs: 0, fiber: 0 } },
      { id: "pork_loin", name: "豬里肌", defaultGrams: 200, per100: { calories: 139, protein: 21.1, fat: 5.8, carbs: 0, fiber: 0 } },
      { id: "beef_striploin", name: "牛里肌", defaultGrams: 150, per100: { calories: 125, protein: 21.5, fat: 4.1, carbs: 0, fiber: 0 } },
      { id: "pork_belly", name: "豬五花", defaultGrams: 200, per100: { calories: 332, protein: 13.6, fat: 30.6, carbs: 0, fiber: 0 } },
    ]
  },
  seafood: {
    label: "海鮮", icon: "🐟",
    items: [
      { id: "salmon", name: "鮭魚", defaultGrams: 150, per100: { calories: 208, protein: 20.4, fat: 13.4, carbs: 0, fiber: 0 } },
      { id: "shrimp", name: "蝦子", defaultGrams: 150, per100: { calories: 98, protein: 20.8, fat: 1.1, carbs: 0.2, fiber: 0 } },
      { id: "tuna", name: "鮪魚", defaultGrams: 100, per100: { calories: 109, protein: 24.2, fat: 0.5, carbs: 0, fiber: 0 } },
      { id: "tilapia", name: "鯛魚", defaultGrams: 200, per100: { calories: 96, protein: 19.8, fat: 1.7, carbs: 0, fiber: 0 } },
      { id: "squid", name: "透抽", defaultGrams: 150, per100: { calories: 83, protein: 17.2, fat: 1.0, carbs: 0, fiber: 0 } },
    ]
  },
  eggs_dairy: {
    label: "蛋豆奶", icon: "🥚",
    items: [
      { id: "egg", name: "雞蛋", defaultGrams: 55, per100: { calories: 134, protein: 12.5, fat: 8.8, carbs: 1.6, fiber: 0 } },
      { id: "tofu_firm", name: "板豆腐", defaultGrams: 300, per100: { calories: 88, protein: 8.5, fat: 4.5, carbs: 2.4, fiber: 0.4 } },
      { id: "greek_yogurt", name: "希臘優格", defaultGrams: 170, per100: { calories: 59, protein: 10.3, fat: 0.4, carbs: 4.7, fiber: 0 } },
      { id: "milk", name: "牛奶", defaultGrams: 240, per100: { calories: 63, protein: 3.1, fat: 3.6, carbs: 4.8, fiber: 0 } },
      { id: "edamame", name: "毛豆", defaultGrams: 100, per100: { calories: 125, protein: 11.9, fat: 5.2, carbs: 8.5, fiber: 5.1 } },
    ]
  },
  vegetables: {
    label: "蔬菜", icon: "🥦",
    items: [
      { id: "broccoli", name: "花椰菜", defaultGrams: 200, per100: { calories: 31, protein: 3.4, fat: 0.3, carbs: 3.9, fiber: 2.6 } },
      { id: "spinach", name: "菠菜", defaultGrams: 150, per100: { calories: 22, protein: 2.2, fat: 0.3, carbs: 2.5, fiber: 2.2 } },
      { id: "cabbage", name: "高麗菜", defaultGrams: 200, per100: { calories: 23, protein: 1.5, fat: 0.1, carbs: 4.0, fiber: 1.8 } },
      { id: "mushroom", name: "香菇", defaultGrams: 100, per100: { calories: 34, protein: 2.7, fat: 0.4, carbs: 5.3, fiber: 3.7 } },
      { id: "lettuce", name: "生菜", defaultGrams: 100, per100: { calories: 13, protein: 1.3, fat: 0.2, carbs: 1.5, fiber: 1.3 } },
    ]
  },
  staples: {
    label: "主食", icon: "🍚",
    items: [
      { id: "white_rice", name: "白飯", defaultGrams: 150, per100: { calories: 183, protein: 3.1, fat: 0.4, carbs: 41.6, fiber: 0.4 } },
      { id: "brown_rice", name: "糙米飯", defaultGrams: 150, per100: { calories: 176, protein: 3.5, fat: 1.2, carbs: 37.2, fiber: 2.2 } },
      { id: "oats", name: "燕麥", defaultGrams: 50, per100: { calories: 389, protein: 16.9, fat: 6.9, carbs: 66.3, fiber: 10.6 } },
      { id: "sweet_potato", name: "地瓜", defaultGrams: 150, per100: { calories: 121, protein: 1.8, fat: 0.3, carbs: 28.1, fiber: 2.5 } },
      { id: "whole_bread", name: "全麥吐司", defaultGrams: 60, per100: { calories: 245, protein: 9.0, fat: 3.1, carbs: 44.0, fiber: 5.3 } },
      { id: "potato", name: "馬鈴薯", defaultGrams: 100, per100: { calories: 81, protein: 2.0, fat: 0.1, carbs: 18.8, fiber: 1.3 } },
    ]
  }
};

const ALL_FOODS = Object.values(FOODS_DB).flatMap(cat => cat.items);
const FOOD_BY_ID = Object.fromEntries(ALL_FOODS.map(f => [f.id, f]));

function calcFoodNutrients(food, grams) {
  const ratio = grams / 100;
  return {
    name: food.name,
    grams,
    calories: Math.round(food.per100.calories * ratio * 10) / 10,
    protein: Math.round(food.per100.protein * ratio * 10) / 10,
    fat: Math.round(food.per100.fat * ratio * 10) / 10,
    carbs: Math.round(food.per100.carbs * ratio * 10) / 10,
    fiber: Math.round(food.per100.fiber * ratio * 10) / 10,
  };
}

function getCurrentMeal() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 10) return "breakfast";
  if (hour >= 10 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 21) return "dinner";
  return "snack";
}

function estimateTotalMeals(history) {
  const days = Object.values(history).slice(-7);
  if (days.length < 3) return 2;
  const avg = days.reduce((sum, d) => {
    const count = ["breakfast","lunch","dinner"].filter(m => d.log?.[m]?.length > 0).length;
    return sum + count;
  }, 0) / days.length;
  return Math.max(1, Math.round(avg));
}

// ===== HELPERS =====

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function formatDateLabel(dateKey) {
  const d = new Date(dateKey + "T00:00:00");
  const today = getTodayKey();
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  const yKey = yest.toISOString().split("T")[0];
  if (dateKey === today) return "今天";
  if (dateKey === yKey) return "昨天";
  return d.toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "short" });
}

function getScoreColor(score) {
  if (!score) return "#8A8078";
  if (score >= 8) return "#5A7A5A";
  if (score >= 6) return "#C4956A";
  return "#D4845A";
}

function getScoreEmoji(score) {
  if (!score) return "—";
  return "🌿";
}

function calculateTargets(profile) {
  const { height, weight, age, goal } = profile;
  const h = parseFloat(height), w = parseFloat(weight), a = parseFloat(age);
  if (!h || !w || !a) return null;
  const bmr = 10 * w + 6.25 * h - 5 * a + 5;
  const tdee = bmr * 1.4;
  const calories = goal === "減脂" ? Math.round(tdee - 400) : Math.round(tdee + 300);
  const protein = goal === "減脂" ? Math.round(w * 2.0) : Math.round(w * 1.8);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  const fiber = 25;
  return { calories, protein, fat, carbs, fiber };
}

// ===== UI COMPONENTS =====

function NutrientBar({ nutrient, current, target, hero }) {
  const pct = target ? Math.min((current / target) * 100, 100) : 0;
  const over = target && current > target;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{
          fontSize: hero ? 14 : 13,
          color: hero ? COLORS.text : COLORS.textMuted,
          fontFamily: "'Noto Serif TC', serif",
          fontWeight: hero ? 700 : 400,
        }}>
          {nutrient.icon} {nutrient.label}
        </span>
        <span style={{
          fontSize: hero ? 14 : 13,
          fontWeight: 700,
          color: over ? COLORS.accent : (hero ? COLORS.green : COLORS.text),
        }}>
          {Math.round(current)} / {target ?? "—"} {nutrient.unit}
        </span>
      </div>
      <div style={{ height: 8, background: COLORS.border, borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 4,
          width: `${pct}%`,
          background: over ? COLORS.accent : nutrient.color,
          transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)"
        }} />
      </div>
      <div style={{ fontSize: 11, color: hero ? COLORS.green : COLORS.textMuted, textAlign: "right", marginTop: 2, fontWeight: hero ? 700 : 400 }}>
        {target ? `${Math.round(pct)}%` : "請先設定目標"}
      </div>
    </div>
  );
}

function LoadingDots({ messages, current }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 16px" }}>
      <div style={{ fontSize: 36, marginBottom: 12, animation: "spin 2s linear infinite", display: "inline-block" }}>🌿</div>
      <div style={{ color: COLORS.green, fontFamily: "'Noto Serif TC', serif", fontSize: 15, marginBottom: 8 }}>
        {messages[current % messages.length]}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: "50%", background: COLORS.greenLight,
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`
          }} />
        ))}
      </div>
    </div>
  );
}

function renderAdviceLine(text) {
  const clean = text.replace(/^[-•·]\s*/, "");
  if (clean.includes("+") && clean.includes("：")) {
    const colonIdx = clean.indexOf("：");
    const label = clean.slice(0, colonIdx);
    const foods = clean.slice(colonIdx + 1).split("+").map(f => f.trim()).filter(Boolean);
    return (
      <span>
        {label}：
        {foods.map((food, i) => (
          <span key={i}>
            {i > 0 && " "}
            <span style={{
              background: COLORS.greenPale, color: COLORS.green,
              borderRadius: 5, padding: "2px 8px",
              fontWeight: 600, display: "inline-block",
            }}>{food}</span>
          </span>
        ))}
      </span>
    );
  }
  const parts = clean.split(/(\d+(?:\.\d+)?\s*(?:g|kcal|mg|大卡|公克|%))/g);
  return (
    <span>
      {parts.map((part, i) =>
        /^\d+(?:\.\d+)?\s*(?:g|kcal|mg|大卡|公克|%)$/.test(part)
          ? <strong key={i} style={{ color: COLORS.green }}>{part}</strong>
          : part
      )}
    </span>
  );
}

function AdviceCard({ advice }) {
  if (!advice) return null;
  if (typeof advice === "string") {
    const lines = advice.split("\n").map(l => l.trim()).filter(Boolean);
    const sections = [];
    let current = null;
    for (const line of lines) {
      const boldMatch = line.match(/^(.*?)\*\*([^*]+)\*\*/);
      if (boldMatch) {
        if (current) sections.push(current);
        const titleText = (boldMatch[1] + boldMatch[2]).trim();
        const isData = /累積|剩餘/.test(titleText);
        const isAction = /建議|策略|戰術/.test(titleText);
        current = { title: titleText, isData, isAction, items: [] };
      } else if (!current) {
        // skip intro
      } else {
        current.items.push(line);
      }
    }
    if (current) sections.push(current);
    const actionSections = sections.filter(s => s.isAction);
    const otherSections = sections.filter(s => !s.isData && !s.isAction);
    const displaySections = actionSections.length > 0 ? actionSections : otherSections;
    return (
      <div>
        {displaySections.map((sec, i) => (
          <div key={i}>
            {sec.items.map((item, j) => (
              <div key={j} style={{
                fontSize: 14, color: COLORS.text, lineHeight: 1.75,
                paddingBottom: 12, marginBottom: 12,
                borderBottom: j < sec.items.length - 1 ? `1px solid ${COLORS.border}` : "none",
              }}>
                {renderAdviceLine(item)}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (Array.isArray(advice)) {
    return (
      <div>
        {advice.map((item, i) => (
          <div key={i} style={{ marginBottom: 10, padding: "10px 12px", background: COLORS.greenPale, borderRadius: 10, borderLeft: `3px solid ${COLORS.greenLight}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.green, marginBottom: 4 }}>{item.title}</div>
            <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7 }}>{item.suggestion}</div>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

// ===== IF TIMER BAR =====

function IFTimerBar({ firstEatAt, lastEatAt }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(iv);
  }, []);

  const formatDuration = (ms) => {
    if (!ms || ms < 0) return "—";
    const totalMins = Math.floor(ms / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours > 0) return `${hours} 時 ${mins} 分`;
    return `${mins} 分`;
  };

  if (!firstEatAt) return null;

  const windowMs = now - firstEatAt;
  const lastMs = lastEatAt ? now - lastEatAt : null;
  const lastOver4h = lastMs && lastMs > 4 * 3600000;

  return (
    <div style={{
      display: "flex",
      background: "#FFF8F5", borderBottom: `1px solid ${COLORS.border}`,
    }}>
      <div style={{ flex: 1, textAlign: "center", padding: "10px 8px" }}>
        <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 3 }}>⏱ 進食窗口</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.green }}>{formatDuration(windowMs)}</div>
      </div>
      <div style={{ width: 1, background: COLORS.border, margin: "8px 0" }} />
      <div style={{ flex: 1, textAlign: "center", padding: "10px 8px" }}>
        <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 3 }}>🕐 距上次進食</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: lastOver4h ? COLORS.accent : COLORS.text }}>
          {lastMs ? `${formatDuration(lastMs)} 前` : "—"}
        </div>
      </div>
    </div>
  );
}

// ===== FOOD SETUP PAGE =====

function FoodSetupPage({ onComplete, onCancel }) {
  const [selected, setSelected] = useState(new Set());

  const toggle = (id) => {
    setSelected(s => {
      const ns = new Set(s);
      ns.has(id) ? ns.delete(id) : ns.add(id);
      return ns;
    });
  };

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: COLORS.bg, fontFamily: "'Noto Sans TC', sans-serif", paddingBottom: 100 }}>
      <div style={{ padding: "24px 20px 16px", background: COLORS.card, borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.green, fontFamily: "'Noto Serif TC', serif" }}>選擇常備食材</div>
          {onCancel && (
            <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: COLORS.textMuted, lineHeight: 1, padding: "0 4px" }}>×</button>
          )}
        </div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>勾選常買的食材，記錄頁一鍵快速加入</div>
      </div>

      {Object.entries(FOODS_DB).map(([catKey, cat]) => (
        <div key={catKey} style={{ margin: "10px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.textMuted, marginBottom: 8, padding: "4px 0" }}>
            {cat.icon} {cat.label}
          </div>
          <div style={{ background: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
            {cat.items.map((food, i) => {
              const sel = selected.has(food.id);
              const proteinPerPack = Math.round(food.per100.protein * food.defaultGrams / 100);
              return (
                <div key={food.id} onClick={() => toggle(food.id)}
                  style={{
                    display: "flex", alignItems: "center", padding: "12px 16px", cursor: "pointer",
                    borderBottom: i < cat.items.length - 1 ? `1px solid ${COLORS.border}` : "none",
                    background: sel ? COLORS.greenPale : "transparent",
                  }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: sel ? 700 : 400, color: sel ? COLORS.green : COLORS.text }}>
                      {food.name}
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                      一般 ~{food.defaultGrams}g · 💪 {proteinPerPack}g 蛋白質
                    </div>
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    background: sel ? COLORS.green : "transparent",
                    border: `2px solid ${sel ? COLORS.green : COLORS.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {sel && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430, padding: "12px 16px 28px",
        background: COLORS.card, borderTop: `1px solid ${COLORS.border}`,
      }}>
        <button
          onClick={() => onComplete([...selected])}
          style={{
            width: "100%", background: selected.size > 0 ? COLORS.green : COLORS.border,
            color: selected.size > 0 ? "#fff" : COLORS.textMuted,
            border: "none", borderRadius: 14, padding: "14px",
            fontSize: 16, fontWeight: 700, cursor: selected.size > 0 ? "pointer" : "default",
          }}>
          {selected.size > 0 ? `完成（已選 ${selected.size} 項）→` : "請至少選一項"}
        </button>
      </div>
    </div>
  );
}

// ===== FOOD GRAMS MODAL =====

function FoodGramsModal({ food, defaultGrams, currentMeal, onConfirm, onCancel }) {
  const [grams, setGrams] = useState(String(defaultGrams || food.defaultGrams));
  const [meal, setMeal] = useState(currentMeal || getCurrentMeal());
  const inputRef = useRef();

  useEffect(() => {
    setTimeout(() => inputRef.current?.select(), 100);
  }, []);

  const g = parseFloat(grams) || 0;
  const n = g > 0 ? calcFoodNutrients(food, g) : null;
  const presets = [food.defaultGrams, Math.round(food.defaultGrams * 0.5), Math.round(food.defaultGrams * 1.5)].filter(Boolean);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      zIndex: 100, display: "flex", alignItems: "flex-end",
    }} onClick={onCancel}>
      <div style={{
        width: "100%", maxWidth: 430, margin: "0 auto",
        background: COLORS.card, borderRadius: "20px 20px 0 0",
        padding: "20px 20px 40px",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>{food.name}</div>
          <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: COLORS.textMuted, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>克數</div>
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          value={grams}
          onChange={e => setGrams(e.target.value)}
          style={{
            width: "100%", padding: "14px 16px",
            fontSize: 28, fontWeight: 700, textAlign: "center",
            border: `2px solid ${COLORS.green}`, borderRadius: 12,
            background: COLORS.bg, color: COLORS.text,
            outline: "none", boxSizing: "border-box",
          }}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {presets.map(p => (
            <button key={p}
              onClick={() => setGrams(String(p))}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer",
                background: grams === String(p) ? COLORS.green : COLORS.bg,
                color: grams === String(p) ? "#fff" : COLORS.textMuted,
                border: `1px solid ${grams === String(p) ? COLORS.green : COLORS.border}`,
              }}>
              {p}g
            </button>
          ))}
        </div>

        {n && (
          <div style={{ display: "flex", justifyContent: "space-around", marginTop: 12, padding: "10px 0", background: COLORS.greenPale, borderRadius: 10 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.green }}>{n.protein}g</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>💪蛋白質</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.accent }}>{Math.round(n.calories)}</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>🔥熱量</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#C4956A" }}>{n.carbs}g</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>🌾碳水</div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>加入哪一餐</div>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.entries(MEAL_LABELS).map(([k, v]) => (
              <button key={k}
                onClick={() => setMeal(k)}
                style={{
                  flex: 1, padding: "7px 4px", borderRadius: 10, fontSize: 12, cursor: "pointer",
                  background: meal === k ? COLORS.green : COLORS.bg,
                  color: meal === k ? "#fff" : COLORS.textMuted,
                  border: `1px solid ${meal === k ? COLORS.green : COLORS.border}`,
                  fontWeight: meal === k ? 700 : 400,
                }}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => g > 0 && onConfirm(g, meal)}
          disabled={g <= 0}
          style={{
            width: "100%", marginTop: 16,
            background: g > 0 ? COLORS.green : COLORS.border,
            color: g > 0 ? "#fff" : COLORS.textMuted,
            border: "none", borderRadius: 14, padding: "14px",
            fontSize: 16, fontWeight: 700, cursor: g > 0 ? "pointer" : "default",
          }}>
          加入{MEAL_LABELS[meal]} ✓
        </button>
      </div>
    </div>
  );
}

// ===== QUICK FOOD ROW =====

function QuickFoodRow({ quickFoods, foodFrequency, onSelect, onManage }) {
  const sorted = quickFoods?.length
    ? [...quickFoods].sort((a, b) => (foodFrequency[b] || 0) - (foodFrequency[a] || 0))
    : [];

  return (
    <div style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{
        overflowX: "auto", display: "flex", gap: 8,
        padding: "8px 12px",
        scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
      }}>
        <button
          onClick={onManage}
          style={{
            flexShrink: 0, padding: "6px 10px",
            background: COLORS.bg, border: `1px solid ${COLORS.border}`,
            borderRadius: 20, fontSize: 13, color: COLORS.textMuted,
            cursor: "pointer",
          }}>
          ＋ 管理
        </button>
        {sorted.map(foodId => {
          const food = FOOD_BY_ID[foodId];
          if (!food) return null;
          return (
            <button key={foodId}
              onClick={() => onSelect(food)}
              style={{
                flexShrink: 0, padding: "6px 14px",
                background: COLORS.greenPale, border: `1px solid ${COLORS.greenLight}`,
                borderRadius: 20, fontSize: 13, color: COLORS.green,
                cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif",
                whiteSpace: "nowrap", fontWeight: 500,
              }}>
              {food.name}
            </button>
          );
        })}
        {!sorted.length && (
          <div style={{ fontSize: 12, color: COLORS.textMuted, padding: "6px 4px", whiteSpace: "nowrap", alignSelf: "center" }}>
            點「＋ 管理」設定快速食材
          </div>
        )}
      </div>
    </div>
  );
}

// ===== API FUNCTIONS =====

async function callClaude(messages, systemPrompt) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

const SHEET_URL = "https://script.google.com/macros/s/AKfycbyVG6GYtzUY7BL60hVQDMb1EVyQShCwz2o0L4_oF1PJAQ-l3ewc4fbS224wU3lhnK3Dlw/exec";
const GAS_SYNC_ENABLED = false;

async function syncToSheet(todayLog, score, date) {
  if (!GAS_SYNC_ENABLED) return;
  try {
    const form = new FormData();
    form.append("payload", JSON.stringify({ log: todayLog, score: score || "", date }));
    await fetch(SHEET_URL, { method: "POST", mode: "no-cors", body: form });
  } catch(e) {
    console.warn("Sheet sync failed:", e);
  }
}

async function loadFromSheet(date) {
  if (!GAS_SYNC_ENABLED) return null;
  try {
    const res = await fetch(`${SHEET_URL}?date=${date}`);
    const data = await res.json();
    return data.log || null;
  } catch(e) {
    console.warn("Sheet load failed:", e);
    return null;
  }
}

async function generateDailySummary(log, targets, todayNutrients) {
  const systemPrompt = `你是專業營養師，根據今日飲食記錄產出一句具體正向觀察，只回傳JSON不要其他文字：{"highlight":"一句具體正向觀察，例：蛋白質集中在兩餐攝取，效率高"}`;
  const nutrientSummary = todayNutrients
    ? `今日實際攝取：熱量${Math.round(todayNutrients.calories)}kcal，蛋白質${Math.round(todayNutrients.protein)}g，脂肪${Math.round(todayNutrients.fat)}g，碳水${Math.round(todayNutrients.carbs)}g，膳食纖維${Math.round(todayNutrients.fiber)}g`
    : "";
  const raw = await callClaude([{
    role: "user",
    content: `今日記錄：${JSON.stringify(log)}\n每日目標：${targets ? JSON.stringify(targets) : "未設定"}\n${nutrientSummary}`
  }], systemPrompt);
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return { highlight: raw };
  }
}

async function chatWithNutrition(chatHistory, userText, userImages, profile, todayNutrients, todayLog, ifContext) {
  const { targets, height, weight, age, goal } = profile;

  const mealSummary = Object.entries(MEAL_LABELS).map(([meal, label]) => {
    const items = todayLog[meal];
    if (!items.length) return null;
    return `${label}：${items.map(i => i.name).join("、")}`;
  }).filter(Boolean).join("\n");

  const exerciseSummary = todayLog.exercise.length > 0
    ? todayLog.exercise.map(e => `${e.type} ${e.duration}分鐘`).join("、")
    : "無";

  const remainingProtein = Math.max(0, (targets?.protein || 0) - todayNutrients.protein);
  const { remainingMeals, proteinPerMeal } = ifContext;

  const systemPrompt = `你是「全情境營養領航員」，專業、數據驅動、具備戰略感。語言：繁體中文。

用戶資料：
- 身高${height || "未設定"}cm，體重${weight || "未設定"}kg，年齡${age || "未設定"}歲，目標：${goal}
${targets ? `- 每日目標：熱量${targets.calories}kcal，蛋白質${targets.protein}g，脂肪${targets.fat}g，碳水${targets.carbs}g，膳食纖維${targets.fiber}g` : "- 尚未設定每日目標"}

今日已攝取：熱量${Math.round(todayNutrients.calories)}kcal，蛋白質${Math.round(todayNutrients.protein)}g，脂肪${Math.round(todayNutrients.fat)}g，碳水${Math.round(todayNutrients.carbs)}g，膳食纖維${Math.round(todayNutrients.fiber)}g
${mealSummary ? `已記錄餐點：\n${mealSummary}` : "今日尚無飲食記錄"}
今日運動：${exerciseSummary}

間歇性斷食追蹤：
- 今日剩餘蛋白質：${Math.round(remainingProtein)}g
- 預估剩餘餐數：${remainingMeals}餐
- 每餐建議蛋白質：${proteinPerMeal}g

必須回傳JSON（不要其他文字）：
{
  "hasFood": true或false,
  "hasExercise": true或false,
  "meal": "breakfast|lunch|dinner|snack",
  "items": [{"name":"食物名","grams":0,"calories":0,"protein":0,"fat":0,"carbs":0,"fiber":0}],
  "nutrients": {"calories":0,"protein":0,"fat":0,"carbs":0,"fiber":0},
  "exercise": {"type":"運動類型","duration":0},
  "message": "給用戶的回應"
}

規則：
- 用戶說吃了什麼或上傳食物照片 → hasFood:true，分析五大營養素，message格式如下（嚴格遵守）：
  ⚡ **晚餐戰術建議**
  根據今日剩餘量說明整體策略（一句話，可包含剩餘熱量數字）
  接著列出 2-4 個具體食物建議，每項獨立一行，格式：食物名稱 份量（關鍵營養素數值）
  範例：菠菜 100g（纖維 2.8g）
  最後兩行固定格式→
  建議：食物1+食物2+食物3
  ⚡ 下一餐至少需要 ${proteinPerMeal}g 蛋白質，建議：[2-3種具體食材+份量]
  嚴格禁止：不可在建議前列出熱量/蛋白質/碳水/纖維的數值清單
- 用戶說做了運動 → hasExercise:true，message確認記錄並說明消耗
- 用戶問餐廳/點餐策略 → hasFood:false，message給具體戰術，最後一行同樣用「建議：X+Y+Z」格式
- 用戶問今日狀態 → hasFood:false，message給完整分析報告
- hasFood:false時items為空陣列，nutrients為空物件
- message必須清楚、有戰略感，可用emoji增加可讀性`;

  const content = [];
  if (userImages && userImages.length > 0) {
    userImages.forEach(img => {
      content.push({ type: "image", source: { type: "base64", media_type: img.type, data: img.data } });
    });
  }
  content.push({ type: "text", text: userText || "（圖片）" });

  const recentHistory = chatHistory.slice(-10).map(msg => ({
    role: msg.role === "assistant" ? "assistant" : "user",
    content: msg.rawText || msg.content || ""
  })).filter(m => m.content);

  const messages = [...recentHistory, { role: "user", content }];
  const raw = await callClaude(messages, systemPrompt);
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return { hasFood: false, hasExercise: false, message: raw, items: [], nutrients: {}, exercise: null };
  }
}

// ===== CHAT PAGE =====

function ChatPage({ profile, todayLog, setTodayLog, todayNutrients, setLastAdvice, styles,
  quickFoods, foodFrequency, setFoodFrequency, lastGrams, setLastGrams,
  markEatTime, estimatedTotalMeals, onShowFoodSetup }) {

  const targets = profile.targets;
  const today = new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric" });

  const mealsEaten = ["breakfast","lunch","dinner"].filter(m => todayLog[m].length > 0).length;
  const remainingMeals = Math.max(1, estimatedTotalMeals - mealsEaten);
  const remainingProtein = Math.max(0, (targets?.protein || 0) - todayNutrients.protein);
  const proteinPerMeal = remainingMeals > 0 ? Math.round(remainingProtein / remainingMeals) : 0;
  const ifContext = { remainingMeals, proteinPerMeal };

  const buildInitialMessage = () => {
    if (!targets) {
      return "⚠️ 請先設定個人資料（在今日頁點「編輯目標」），我才能計算你的精準營養配額。";
    }
    const remCal = Math.max(0, targets.calories - todayNutrients.calories);
    const remPro = Math.max(0, targets.protein - todayNutrients.protein);
    const remFiber = Math.max(0, targets.fiber - todayNutrients.fiber);
    if (todayNutrients.calories < 50) {
      return `今日戰況：尚無記錄。\n\n全日配額 → 🔥 **${targets.calories} kcal** · 💪 **${targets.protein}g** · 🥦 **${targets.fiber}g**\n\n輸入你吃了什麼，或丟一張食物照片。`;
    }
    return `今日已攝取 🔥 **${Math.round(todayNutrients.calories)} kcal**（${Math.round(todayNutrients.calories / targets.calories * 100)}%）\n\n剩餘空間 → 熱量 **${Math.round(remCal)} kcal** · 蛋白質 **${Math.round(remPro)}g** · 纖維 **${Math.round(remFiber)}g**\n\n繼續輸入飲食，或問我點餐策略。`;
  };

  const [messages, setMessages] = useState([
    { role: "assistant", content: buildInitialMessage(), rawText: buildInitialMessage() }
  ]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pickerFood, setPickerFood] = useState(null);
  const fileRef = useRef();
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxW = 800;
          const scale = Math.min(1, maxW / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
          setPendingImages(r => r.length >= 3 ? r : [...r, { data: compressed, type: "image/jpeg" }]);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text && pendingImages.length === 0) return;

    const userMsg = { role: "user", content: text || "（照片）", images: pendingImages };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setPendingImages([]);
    setIsLoading(true);

    const result = await chatWithNutrition(messages, text, userMsg.images, profile, todayNutrients, todayLog, ifContext);

    const aiMsg = {
      role: "assistant",
      content: result.message,
      rawText: result.message,
      savedMeal: result.hasFood ? result.meal : null,
      savedExercise: result.hasExercise ? result.exercise : null,
    };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);

    if (result.hasFood && result.items?.length > 0) {
      const meal = result.meal || "snack";
      setTodayLog(log => ({ ...log, [meal]: [...log[meal], ...result.items] }));
      setLastAdvice({
        meal,
        nextMeal: NEXT_MEAL_MAP[meal] || "下一餐",
        text: result.message,
        time: new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }),
      });
      markEatTime();
    }

    if (result.hasExercise && result.exercise?.type) {
      setTodayLog(log => ({
        ...log,
        exercise: [...log.exercise, { type: result.exercise.type, duration: result.exercise.duration || 0 }]
      }));
    }
  };

  const handleQuickFoodConfirm = (grams, meal) => {
    if (!pickerFood) return;
    const food = pickerFood;
    const item = calcFoodNutrients(food, grams);
    setTodayLog(log => ({ ...log, [meal]: [...log[meal], item] }));
    setFoodFrequency(f => ({ ...f, [food.id]: (f[food.id] || 0) + 1 }));
    setLastGrams(lg => ({ ...lg, [food.id]: grams }));
    markEatTime();
    setPickerFood(null);
    setMessages(prev => [...prev, {
      role: "assistant",
      content: `✅ 已加入${MEAL_LABELS[meal]}：${food.name} ${grams}g（💪 ${item.protein}g 蛋白質 · 🔥 ${Math.round(item.calories)} kcal）`,
    }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderText = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <div key={i} style={{ minHeight: line === "" ? 8 : "auto" }}>
          {parts.map((part, j) =>
            part.startsWith("**") && part.endsWith("**")
              ? <strong key={j}>{part.slice(2, -2)}</strong>
              : part
          )}
        </div>
      );
    });
  };

  const hasQuickFoods = quickFoods && quickFoods.length > 0;

  return (
    <div>
      {pickerFood && (
        <FoodGramsModal
          food={pickerFood}
          defaultGrams={lastGrams[pickerFood.id] || pickerFood.defaultGrams}
          currentMeal={getCurrentMeal()}
          onConfirm={handleQuickFoodConfirm}
          onCancel={() => setPickerFood(null)}
        />
      )}

      {/* Mini stats header */}
      <div style={{ ...styles.header, paddingBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={styles.headerTitle}>Track</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>{today}</div>
        </div>
        {targets && (
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { key: "protein", label: "💪", unit: "g" },
              { key: "calories", label: "🔥", unit: "kcal" },
              { key: "fiber", label: "🥦", unit: "g" },
            ].map(n => {
              const curr = Math.round(todayNutrients[n.key]);
              const tgt = targets[n.key];
              const pct = Math.min(100, Math.round(curr / tgt * 100));
              const over = curr > tgt;
              return (
                <div key={n.key} style={{
                  flex: 1, background: COLORS.bg, borderRadius: 8, padding: "5px 8px",
                }}>
                  <div style={{ fontSize: 11, color: over ? COLORS.accent : COLORS.textMuted, fontWeight: over ? 700 : 400 }}>
                    {n.label} {curr}<span style={{ fontSize: 9 }}>{n.unit}</span>
                  </div>
                  <div style={{ height: 3, background: COLORS.border, borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: over ? COLORS.accent : COLORS.green, borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ padding: "12px 16px", paddingBottom: hasQuickFoods ? 198 : 160 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            marginBottom: 14,
            alignItems: "flex-end",
            gap: 8,
          }}>
            {msg.role === "assistant" && (
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: COLORS.greenPale,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, flexShrink: 0,
              }}>🌿</div>
            )}
            <div style={{
              maxWidth: "78%",
              background: msg.role === "user" ? COLORS.green : COLORS.card,
              color: msg.role === "user" ? "#fff" : COLORS.text,
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding: "10px 14px",
              fontSize: 14,
              lineHeight: 1.65,
              border: msg.role === "assistant" ? `1px solid ${COLORS.border}` : "none",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}>
              {msg.images?.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                  {msg.images.map((img, idx) => (
                    <img key={idx} src={`data:${img.type};base64,${img.data}`}
                      style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, opacity: 0.9 }} />
                  ))}
                </div>
              )}
              {renderText(msg.content)}
              {msg.savedMeal && (
                <div style={{
                  display: "inline-block", marginTop: 8,
                  background: COLORS.greenPale, color: COLORS.green,
                  borderRadius: 6, padding: "3px 8px",
                  fontSize: 11, fontWeight: 700,
                }}>
                  ✅ 已儲存至{MEAL_LABELS[msg.savedMeal] || msg.savedMeal}
                </div>
              )}
              {msg.savedExercise && (
                <div style={{
                  display: "inline-block", marginTop: 8,
                  background: COLORS.brownPale, color: COLORS.brown,
                  borderRadius: 6, padding: "3px 8px",
                  fontSize: 11, fontWeight: 700,
                }}>
                  🏃 已記錄運動
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 14 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", background: COLORS.greenPale,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
            }}>🌿</div>
            <div style={{
              background: COLORS.card, border: `1px solid ${COLORS.border}`,
              borderRadius: "18px 18px 18px 4px", padding: "12px 16px",
            }}>
              <div style={{ display: "flex", gap: 5 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: "50%", background: COLORS.greenLight,
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick food row + input bar (fixed) */}
      <div style={{
        position: "fixed", bottom: 62, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430, zIndex: 15,
      }}>
        <QuickFoodRow
          quickFoods={quickFoods}
          foodFrequency={foodFrequency}
          onSelect={setPickerFood}
          onManage={onShowFoodSetup}
        />
        <div style={{
          background: COLORS.card, borderTop: `1px solid ${COLORS.border}`,
          padding: "10px 12px",
        }}>
          {pendingImages.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {pendingImages.map((img, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={`data:${img.type};base64,${img.data}`}
                    style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, border: `1.5px solid ${COLORS.greenLight}` }} />
                  <button onClick={() => setPendingImages(p => p.filter((_, idx) => idx !== i))}
                    style={{
                      position: "absolute", top: -5, right: -5,
                      width: 18, height: 18, borderRadius: "50%",
                      background: COLORS.accent, border: "none", color: "#fff",
                      fontSize: 10, cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center",
                    }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, padding: "4px 2px", flexShrink: 0 }}
              onClick={() => fileRef.current?.click()}>📷</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
            <textarea
              style={{
                flex: 1, padding: "9px 14px", borderRadius: 20,
                border: `1.5px solid ${COLORS.border}`, background: COLORS.bg,
                fontSize: 14, color: COLORS.text, fontFamily: "'Noto Sans TC', sans-serif",
                outline: "none", resize: "none", boxSizing: "border-box",
                maxHeight: 100, lineHeight: 1.5,
              }}
              rows={1}
              placeholder="輸入你吃了什麼，或問點餐策略..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              style={{
                width: 40, height: 40, borderRadius: "50%",
                background: (input.trim() || pendingImages.length > 0) ? COLORS.green : COLORS.border,
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, flexShrink: 0, color: "#fff",
                transition: "background 0.2s",
              }}
              onClick={handleSend}
            >→</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== HOME PAGE =====

function HomePage({ profile, todayLog, setTodayLog, todayNutrients, lastAdvice, summary, summaryLoading, loadingStep, handleSummary, setShowSetup, firstEatAt, lastEatAt, styles }) {
  return (
    <div>
      <div style={styles.header}>
        <div style={styles.headerTitle}>健康日誌</div>
        <div style={styles.headerDate}>{new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</div>
      </div>

      <IFTimerBar firstEatAt={firstEatAt} lastEatAt={lastEatAt} />

      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={styles.sectionTitle}>今日營養進度</div>
          <button style={{ ...styles.btnOutline, padding: "4px 10px", fontSize: 12 }}
            onClick={() => setShowSetup(true)}>編輯目標</button>
        </div>
        {NUTRIENTS.map(n => (
          <NutrientBar key={n.key} nutrient={n} current={todayNutrients[n.key]} target={profile.targets?.[n.key]} hero={n.key === "protein"} />
        ))}
      </div>

      {lastAdvice && (
        <div style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.green }}>
              {lastAdvice.nextMeal}建議
            </div>
            <span style={{ fontSize: 11, color: COLORS.textMuted }}>
              {MEAL_LABELS[lastAdvice.meal] || lastAdvice.meal} 後 · {lastAdvice.time}
            </span>
          </div>
          <AdviceCard advice={lastAdvice.text} />
        </div>
      )}

      {Object.entries(MEAL_LABELS).map(([meal, label]) => {
        const items = todayLog[meal];
        if (items.length === 0) return null;
        return (
          <div key={meal} style={styles.card}>
            <div style={styles.sectionTitle}>{label}</div>
            {items.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", padding: "6px 0", borderBottom: i < items.length - 1 ? `1px solid ${COLORS.border}` : "none", gap: 4 }}>
                <span style={{ fontSize: 14, color: COLORS.text, flex: 1 }}>
                  {item.name}
                  {item.grams > 0 && <span style={{ color: COLORS.textMuted, fontSize: 12, marginLeft: 4 }}>{item.grams}g</span>}
                </span>
                <span style={{ fontSize: 12, color: COLORS.green, fontWeight: 600, minWidth: 48, textAlign: "right" }}>
                  💪 {Math.round(item.protein || 0)}g
                </span>
                <span style={{ fontSize: 13, color: COLORS.textMuted, minWidth: 64, textAlign: "right" }}>
                  {Math.round(item.calories)} kcal
                </span>
                <button
                  onClick={() => setTodayLog(log => ({ ...log, [meal]: log[meal].filter((_, idx) => idx !== i) }))}
                  style={{ background: "none", border: "none", color: COLORS.border, cursor: "pointer", fontSize: 18, padding: "0 0 0 6px", lineHeight: 1, flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
        );
      })}

      {todayLog.exercise.length > 0 && (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>運動記錄</div>
          {todayLog.exercise.map((e, i) => (
            <div key={i} style={{ fontSize: 14, color: COLORS.text, padding: "4px 0" }}>
              🏃 {e.type} · {e.duration} 分鐘
            </div>
          ))}
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.sectionTitle}>今日總結</div>
        {summaryLoading
          ? <LoadingDots messages={["分析今日飲食中...", "計算蛋白質達標率...", "整理亮點中..."]} current={loadingStep} />
          : summary
            ? <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "12px 16px", background: COLORS.bg, borderRadius: 12 }}>
                  <div style={{ flex: 1 }}>
                    {summary.proteinPct !== null && summary.proteinPct !== undefined && (
                      <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.green, fontFamily: "'Noto Serif TC', serif" }}>蛋白質 {summary.proteinPct}%</div>
                    )}
                    {summary.eatingWindowHours !== null && summary.eatingWindowHours !== undefined && (
                      <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 4 }}>⏱ 進食 {summary.eatingWindowHours}h</div>
                    )}
                  </div>
                  <button
                    style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "4px 10px", fontSize: 11, color: COLORS.textMuted, cursor: "pointer" }}
                    onClick={handleSummary}>↺ 重新生成</button>
                </div>
                {summary.highlight && (
                  <div style={{ padding: "10px 14px", background: COLORS.greenPale, borderRadius: 10 }}>
                    <div style={{ fontSize: 13, color: COLORS.green, lineHeight: 1.7 }}>✅ {summary.highlight}</div>
                  </div>
                )}
              </div>
            : <button style={styles.btn} onClick={handleSummary}>生成今日總結 ✨</button>}
      </div>
    </div>
  );
}

// ===== HISTORY PAGE =====

function HistoryPage({ history, todayLog, profile, getTodayNutrients, summary, setShowSetup, styles }) {
  const [expandedDay, setExpandedDay] = useState(null);

  const days = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }

  const getEntry = (key) => {
    const todayKey = getTodayKey();
    if (key === todayKey) {
      const n = getTodayNutrients();
      const hasData = [...todayLog.breakfast,...todayLog.lunch,...todayLog.dinner,...todayLog.snack].length > 0 || todayLog.exercise.length > 0;
      if (!hasData) return null;
      return { log: todayLog, nutrients: n, proteinPct: summary?.proteinPct ?? history[key]?.proteinPct ?? null, eatingWindowHours: summary?.eatingWindowHours ?? history[key]?.eatingWindowHours ?? null, highlight: summary?.highlight || history[key]?.highlight || "" };
    }
    return history[key] || null;
  };

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Monthly</div>
        <div style={styles.headerDate}>點擊日期展開詳情</div>
      </div>

      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={styles.sectionTitle}>每日目標</div>
          <button style={{ ...styles.btnOutline, padding: "4px 10px", fontSize: 12 }} onClick={() => setShowSetup(true)}>編輯</button>
        </div>
        {profile.targets
          ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {NUTRIENTS.map(n => (
                <div key={n.key} style={{ background: COLORS.bg, borderRadius: 8, padding: "6px 10px", fontSize: 12 }}>
                  {n.icon} {n.label} <span style={{ fontWeight: 700, color: COLORS.green }}>{profile.targets[n.key]}{n.unit}</span>
                </div>
              ))}
            </div>
          : <div style={{ fontSize: 13, color: COLORS.textMuted }}>尚未設定目標</div>
        }
      </div>

      {days.map(key => {
        const entry = getEntry(key);
        const isExpanded = expandedDay === key;
        const isToday = key === getTodayKey();
        if (!entry) return null;

        const { log: dayLog, nutrients, proteinPct, eatingWindowHours, highlight } = entry;
        const allMeals = [...(dayLog.breakfast||[]), ...(dayLog.lunch||[]), ...(dayLog.dinner||[]), ...(dayLog.snack||[])];

        return (
          <div key={key} style={{ margin: "6px 16px" }}>
            <div onClick={() => setExpandedDay(isExpanded ? null : key)}
              style={{ background: isToday ? COLORS.greenPale : COLORS.card, borderRadius: isExpanded ? "12px 12px 0 0" : 12, border: `1px solid ${isToday ? COLORS.greenLight : COLORS.border}`, padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: isToday ? COLORS.green : COLORS.text }}>{formatDateLabel(key)}</span>
                  {isToday && <span style={{ fontSize: 10, background: COLORS.green, color: "#fff", borderRadius: 4, padding: "1px 6px" }}>今日</span>}
                </div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 3 }}>
                  🔥 {Math.round(nutrients.calories)} kcal · 💪 {Math.round(nutrients.protein)}g · {allMeals.length} 項食物
                  {dayLog.exercise?.length > 0 && ` · 🏃 ${dayLog.exercise.length} 次運動`}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                {(proteinPct !== null || eatingWindowHours !== null)
                  ? <div>
                      {proteinPct !== null && <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.green }}>蛋白質 {proteinPct}%</div>}
                      {eatingWindowHours !== null && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>進食 {eatingWindowHours}h</div>}
                    </div>
                  : <div style={{ fontSize: 12, color: COLORS.border }}>未記錄</div>
                }
              </div>
            </div>

            {isExpanded && (
              <div style={{ background: COLORS.card, border: `1px solid ${isToday ? COLORS.greenLight : COLORS.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "12px 16px" }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.brown, marginBottom: 8 }}>營養攝取</div>
                  {NUTRIENTS.map(n => (
                    <div key={n.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: COLORS.textMuted }}>{n.icon} {n.label}</span>
                      <span style={{ fontWeight: 600, color: COLORS.text }}>
                        {Math.round(nutrients[n.key])} {n.unit}
                        {profile.targets && <span style={{ color: COLORS.textMuted, marginLeft: 4 }}>({Math.round((nutrients[n.key]/profile.targets[n.key])*100)}%)</span>}
                      </span>
                    </div>
                  ))}
                </div>

                {Object.entries(MEAL_LABELS).map(([meal, label]) => {
                  const items = dayLog[meal] || [];
                  if (!items.length) return null;
                  return (
                    <div key={meal} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.brown, marginBottom: 4 }}>{label}</div>
                      {items.map((item, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", fontSize: 12, color: COLORS.text, paddingLeft: 8, marginBottom: 2, gap: 4 }}>
                          <span style={{ flex: 1 }}>· {item.name}{item.grams > 0 && <span style={{ color: COLORS.textMuted, marginLeft: 4 }}>{item.grams}g</span>}</span>
                          <span style={{ color: COLORS.green, fontWeight: 600, minWidth: 40, textAlign: "right" }}>💪 {Math.round(item.protein || 0)}g</span>
                          <span style={{ color: COLORS.textMuted, minWidth: 56, textAlign: "right" }}>{Math.round(item.calories)} kcal</span>
                        </div>
                      ))}
                    </div>
                  );
                })}

                {dayLog.exercise?.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.brown, marginBottom: 4 }}>運動</div>
                    {dayLog.exercise.map((e, i) => (
                      <div key={i} style={{ fontSize: 12, color: COLORS.text, paddingLeft: 8, marginBottom: 2 }}>
                        · 🏃 {e.type} {e.duration} 分鐘
                      </div>
                    ))}
                  </div>
                )}

                {highlight && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: COLORS.greenPale, borderRadius: 10 }}>
                    <div style={{ fontSize: 12, color: COLORS.green, lineHeight: 1.6 }}>✅ {highlight}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ height: 20 }} />
    </div>
  );
}

// ===== MAIN COMPONENT =====

export default function HealthLog() {
  const [page, setPage] = useState("home");
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hl_profile")) || defaultProfile; } catch { return defaultProfile; }
  });
  const [todayLog, setTodayLog] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("hl_log"));
      return saved?.date === getTodayKey() ? saved.log : defaultLog;
    } catch { return defaultLog; }
  });
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hl_history")) || {}; } catch { return {}; }
  });
  const [showSetup, setShowSetup] = useState(!profile.targets);
  const [showFoodSetup, setShowFoodSetup] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [lastAdvice, setLastAdvice] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hl_lastadvice")) || null; } catch { return null; }
  });
  const [profileForm, setProfileForm] = useState(profile);

  // Quick food state
  const [quickFoods, setQuickFoods] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hl_quickfoods")); } catch { return null; }
  });
  const [foodFrequency, setFoodFrequency] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hl_food_freq")) || {}; } catch { return {}; }
  });
  const [lastGrams, setLastGrams] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hl_last_grams")) || {}; } catch { return {}; }
  });

  // IF timing state
  const [firstEatAt, setFirstEatAt] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("hl_if_times"));
      return saved?.date === getTodayKey() ? saved.firstEatAt : null;
    } catch { return null; }
  });
  const [lastEatAt, setLastEatAt] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("hl_if_times"));
      return saved?.date === getTodayKey() ? saved.lastEatAt : null;
    } catch { return null; }
  });

  const hasLoaded = useRef(false);

  const markEatTime = useCallback(() => {
    const now = Date.now();
    setLastEatAt(now);
    setFirstEatAt(prev => prev ?? now);
  }, []);

  const estimatedTotalMeals = useMemo(() => estimateTotalMeals(history), [history]);

  // Persist IF times
  useEffect(() => {
    if (firstEatAt || lastEatAt) {
      localStorage.setItem("hl_if_times", JSON.stringify({ date: getTodayKey(), firstEatAt, lastEatAt }));
    }
  }, [firstEatAt, lastEatAt]);

  // Persist quick food settings
  useEffect(() => {
    if (quickFoods !== null) localStorage.setItem("hl_quickfoods", JSON.stringify(quickFoods));
  }, [quickFoods]);
  useEffect(() => {
    localStorage.setItem("hl_food_freq", JSON.stringify(foodFrequency));
  }, [foodFrequency]);
  useEffect(() => {
    localStorage.setItem("hl_last_grams", JSON.stringify(lastGrams));
  }, [lastGrams]);

  useEffect(() => {
    const today = getTodayKey();
    loadFromSheet(today).then(sheetLog => {
      if (sheetLog) {
        setTodayLog(current => {
          const sheetCount = Object.values(sheetLog).flat().length;
          const localCount = Object.values(current).flat().length;
          return sheetCount >= localCount ? sheetLog : current;
        });
      }
    });
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) { hasLoaded.current = true; return; }
    const hasData = todayLog.breakfast.length || todayLog.lunch.length ||
      todayLog.dinner.length || todayLog.snack.length || todayLog.exercise.length;
    if (hasData) syncToSheet(todayLog, null, getTodayKey());
  }, [todayLog]);

  useEffect(() => { localStorage.setItem("hl_profile", JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem("hl_log", JSON.stringify({ date: getTodayKey(), log: todayLog })); }, [todayLog]);
  useEffect(() => { localStorage.setItem("hl_history", JSON.stringify(history)); }, [history]);
  useEffect(() => { if (lastAdvice) localStorage.setItem("hl_lastadvice", JSON.stringify(lastAdvice)); }, [lastAdvice]);
  useEffect(() => {
    if (summaryLoading) {
      const iv = setInterval(() => setLoadingStep(s => s + 1), 1200);
      return () => clearInterval(iv);
    }
  }, [summaryLoading]);

  const getTodayNutrients = () => {
    const all = [...todayLog.breakfast, ...todayLog.lunch, ...todayLog.dinner, ...todayLog.snack];
    return all.reduce((acc, item) => ({
      calories: acc.calories + (item.calories || 0),
      protein: acc.protein + (item.protein || 0),
      fat: acc.fat + (item.fat || 0),
      carbs: acc.carbs + (item.carbs || 0),
      fiber: acc.fiber + (item.fiber || 0),
    }), { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 });
  };

  const handleSaveProfile = () => {
    const targets = calculateTargets(profileForm);
    setProfile({ ...profileForm, targets });
    setShowSetup(false);
  };

  const handleSummary = async () => {
    setSummaryLoading(true);
    setLoadingStep(0);
    const nutrients = getTodayNutrients();
    const proteinPct = profile.targets?.protein ? Math.round((nutrients.protein / profile.targets.protein) * 100) : null;
    const eatingWindowHours = firstEatAt && lastEatAt ? Math.round((lastEatAt - firstEatAt) / 360000) / 10 : null;
    const result = await generateDailySummary(todayLog, profile.targets, nutrients);
    const fullResult = { ...result, proteinPct, eatingWindowHours };
    setSummary(fullResult);
    const todayKey = getTodayKey();
    setHistory(h => ({
      ...h,
      [todayKey]: {
        log: todayLog, nutrients,
        proteinPct,
        eatingWindowHours,
        highlight: result.highlight || "",
      }
    }));
    await syncToSheet(todayLog, null, todayKey);
    setSummaryLoading(false);
  };

  const todayNutrients = getTodayNutrients();

  const styles = {
    app: {
      maxWidth: 430, margin: "0 auto", minHeight: "100vh",
      background: COLORS.bg, fontFamily: "'Noto Sans TC', sans-serif",
      position: "relative", paddingBottom: 80,
    },
    header: {
      background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`,
      padding: "16px 20px 12px", position: "sticky", top: 0, zIndex: 10,
    },
    headerTitle: {
      fontFamily: "'Noto Serif TC', serif", fontSize: 20, fontWeight: 700,
      color: COLORS.green, letterSpacing: 1,
    },
    headerDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    card: {
      background: COLORS.card, borderRadius: 16, padding: "16px 20px",
      margin: "10px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      border: `1px solid ${COLORS.border}`,
    },
    sectionTitle: {
      fontFamily: "'Noto Sans TC', sans-serif", fontSize: 12, fontWeight: 700,
      color: COLORS.textMuted, letterSpacing: 0.5, textTransform: "uppercase",
      marginBottom: 14,
    },
    btn: {
      background: COLORS.green, color: "#fff", border: "none",
      borderRadius: 12, padding: "12px 24px", fontSize: 15, fontWeight: 600,
      cursor: "pointer", width: "100%", fontFamily: "'Noto Sans TC', sans-serif",
    },
    btnOutline: {
      background: "transparent", color: COLORS.green,
      border: `1.5px solid ${COLORS.green}`, borderRadius: 12,
      padding: "10px 20px", fontSize: 14, cursor: "pointer",
      fontFamily: "'Noto Sans TC', sans-serif",
    },
    input: {
      width: "100%", padding: "10px 14px", borderRadius: 10,
      border: `1.5px solid ${COLORS.border}`, background: COLORS.bg,
      fontSize: 14, color: COLORS.text, fontFamily: "'Noto Sans TC', sans-serif",
      outline: "none", boxSizing: "border-box",
    },
    bottomNav: {
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 430, background: COLORS.card,
      borderTop: `1px solid ${COLORS.border}`, display: "flex",
      padding: "14px 0 20px", zIndex: 20,
    },
    navItem: (active) => ({
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      gap: 3, cursor: "pointer", color: active ? COLORS.green : COLORS.textMuted,
    }),
    tag: (active) => ({
      padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer",
      background: active ? COLORS.greenPale : COLORS.border,
      color: active ? COLORS.green : COLORS.textMuted,
      border: active ? `1px solid ${COLORS.greenLight}` : "1px solid transparent",
      fontWeight: active ? 600 : 400,
    }),
  };

  // Food setup screen
  if (showFoodSetup) return (
    <div style={styles.app}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&family=Noto+Sans+TC:wght@400;600&display=swap');`}</style>
      <FoodSetupPage
        onComplete={(selected) => { setQuickFoods(selected); setShowFoodSetup(false); }}
        onCancel={() => setShowFoodSetup(false)}
      />
    </div>
  );

  // Profile setup screen
  if (showSetup) return (
    <div style={styles.app}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&family=Noto+Sans+TC:wght@400;600&display=swap');
      @keyframes spin { to { transform: rotate(360deg) } }
      @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
      <div style={{ padding: "40px 20px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
          <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 24, fontWeight: 700, color: COLORS.green }}>健康日誌</div>
          <div style={{ color: COLORS.textMuted, fontSize: 14, marginTop: 6 }}>先設定你的基本資料，AI 幫你計算每日目標</div>
        </div>
        <div style={styles.card}>
          <div style={styles.sectionTitle}>基本資料</div>
          {[
            { label: "身高 (cm)", key: "height", placeholder: "例：158" },
            { label: "體重 (kg)", key: "weight", placeholder: "例：46" },
            { label: "年齡", key: "age", placeholder: "例：30" },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 6 }}>{f.label}</div>
              <input style={styles.input} placeholder={f.placeholder} value={profileForm[f.key]}
                onChange={e => setProfileForm(p => ({ ...p, [f.key]: e.target.value }))} type="number" />
            </div>
          ))}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 8 }}>目標</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["減脂", "增重", "維持"].map(g => (
                <button key={g} style={styles.tag(profileForm.goal === g)}
                  onClick={() => setProfileForm(p => ({ ...p, goal: g }))}>{g}</button>
              ))}
            </div>
          </div>
          <button style={styles.btn} onClick={handleSaveProfile}>計算我的目標 →</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&family=Noto+Sans+TC:wght@400;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: ${COLORS.bg}; -webkit-font-smoothing: antialiased; }
        textarea:focus, input:focus { border-color: ${COLORS.greenLight} !important; }
      `}</style>

      {page === "home" && <HomePage
        profile={profile} todayLog={todayLog} setTodayLog={setTodayLog} todayNutrients={todayNutrients}
        lastAdvice={lastAdvice} summary={summary} summaryLoading={summaryLoading}
        loadingStep={loadingStep} handleSummary={handleSummary}
        setShowSetup={setShowSetup}
        firstEatAt={firstEatAt} lastEatAt={lastEatAt}
        styles={styles}
      />}

      {page === "chat" && <ChatPage
        profile={profile}
        todayLog={todayLog}
        setTodayLog={setTodayLog}
        todayNutrients={todayNutrients}
        setLastAdvice={setLastAdvice}
        styles={styles}
        quickFoods={quickFoods || []}
        foodFrequency={foodFrequency}
        setFoodFrequency={setFoodFrequency}
        lastGrams={lastGrams}
        setLastGrams={setLastGrams}
        markEatTime={markEatTime}
        estimatedTotalMeals={estimatedTotalMeals}
        onShowFoodSetup={() => setShowFoodSetup(true)}
      />}

      {page === "history" && <HistoryPage
        history={history} todayLog={todayLog} profile={profile}
        getTodayNutrients={getTodayNutrients} summary={summary}
        setShowSetup={setShowSetup} styles={styles}
      />}

      <div style={styles.bottomNav}>
        <div style={styles.navItem(page === "home")} onClick={() => setPage("home")}>
          <span style={{ fontSize: 13, fontWeight: page === "home" ? 700 : 400 }}>Today</span>
        </div>
        <div style={styles.navItem(page === "chat")} onClick={() => setPage("chat")}>
          <span style={{ fontSize: 13, fontWeight: page === "chat" ? 700 : 400 }}>Track</span>
        </div>
        <div style={styles.navItem(page === "history")} onClick={() => setPage("history")}>
          <span style={{ fontSize: 13, fontWeight: page === "history" ? 700 : 400 }}>Monthly</span>
        </div>
      </div>
    </div>
  );
}
