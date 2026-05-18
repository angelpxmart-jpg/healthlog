import { useState, useEffect, useRef } from "react";

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

const NUTRIENTS = [
  { key: "calories", label: "熱量", unit: "kcal", color: COLORS.accent, icon: "🔥" },
  { key: "protein", label: "蛋白質", unit: "g", color: COLORS.green, icon: "💪" },
  { key: "fat", label: "脂肪", unit: "g", color: COLORS.brownLight, icon: "🥑" },
  { key: "carbs", label: "碳水", unit: "g", color: "#C4956A", icon: "🌾" },
  { key: "fiber", label: "膳食纖維", unit: "g", color: COLORS.greenLight, icon: "🥦" },
];

const MEAL_LABELS = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "點心" };
const NEXT_MEAL_MAP = { breakfast: "午餐", lunch: "晚餐", dinner: "明日早餐", snack: "下一正餐" };

const defaultProfile = { height: "", weight: "", age: "", goal: "減脂", targets: null };
const defaultLog = { breakfast: [], lunch: [], dinner: [], snack: [], exercise: [] };

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

function NutrientBar({ nutrient, current, target }) {
  const pct = target ? Math.min((current / target) * 100, 100) : 0;
  const over = target && current > target;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: COLORS.textMuted, fontFamily: "'Noto Serif TC', serif" }}>
          {nutrient.icon} {nutrient.label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: over ? COLORS.accent : COLORS.text }}>
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
      <div style={{ fontSize: 11, color: COLORS.textMuted, textAlign: "right", marginTop: 2 }}>
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

  // 食物建議行：「建議：X+Y+Z」格式 → 每個食物加橘色 pill
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

  // 數字 + 單位（如 42g、611 kcal、2.8g）→ 橘色粗體
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

    const intro = [];
    const sections = [];
    let current = null;

    for (const line of lines) {
      // 修正：移除 \s*$ 限制，允許 ** 後方有額外文字
      const boldMatch = line.match(/^(.*?)\*\*([^*]+)\*\*/);
      if (boldMatch) {
        if (current) sections.push(current);
        const titleText = (boldMatch[1] + boldMatch[2]).trim();
        const isData = /累積|剩餘/.test(titleText);
        const isAction = /建議|策略|戰術/.test(titleText);
        current = { title: titleText, isData, isAction, items: [] };
      } else if (!current) {
        intro.push(line);
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

// ===== API FUNCTIONS =====

async function callClaude(messages, systemPrompt) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

const SHEET_URL = "https://script.google.com/macros/s/AKfycbyVG6GYtzUY7BL60hVQDMb1EVyQShCwz2o0L4_oF1PJAQ-l3ewc4fbS224wU3lhnK3Dlw/exec";

async function syncToSheet(todayLog, score, date) {
  try {
    const form = new FormData();
    form.append("payload", JSON.stringify({ log: todayLog, score: score || "", date }));
    await fetch(SHEET_URL, { method: "POST", mode: "no-cors", body: form });
  } catch(e) {
    console.warn("Sheet sync failed:", e);
  }
}

async function loadFromSheet(date) {
  try {
    const res = await fetch(`${SHEET_URL}?date=${date}`);
    const data = await res.json();
    return data.log || null;
  } catch(e) {
    console.warn("Sheet load failed:", e);
    return null;
  }
}

async function generateDailySummary(log, targets) {
  const systemPrompt = `你是專業營養師，根據今日飲食和運動記錄評分，只回傳JSON不要其他文字：{"score":8,"scoreLabel":"表現不錯","highlights":"今日優點...","improvements":"需改善...","tomorrowAdvice":"明日建議...","summary":"整體評語..."}`;
  const raw = await callClaude([{
    role: "user",
    content: `今日記錄：${JSON.stringify(log)}\n每日目標：${targets ? JSON.stringify(targets) : "未設定"}`
  }], systemPrompt);
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return { score: null, summary: raw, highlights: "", improvements: "", tomorrowAdvice: "" };
  }
}

async function chatWithNutrition(chatHistory, userText, userImages, profile, todayNutrients, todayLog) {
  const { targets, height, weight, age, goal } = profile;

  const mealSummary = Object.entries(MEAL_LABELS).map(([meal, label]) => {
    const items = todayLog[meal];
    if (!items.length) return null;
    return `${label}：${items.map(i => i.name).join("、")}`;
  }).filter(Boolean).join("\n");

  const exerciseSummary = todayLog.exercise.length > 0
    ? todayLog.exercise.map(e => `${e.type} ${e.duration}分鐘`).join("、")
    : "無";

  const systemPrompt = `你是「全情境營養領航員」，專業、數據驅動、具備戰略感。語言：繁體中文。

用戶資料：
- 身高${height || "未設定"}cm，體重${weight || "未設定"}kg，年齡${age || "未設定"}歲，目標：${goal}
${targets ? `- 每日目標：熱量${targets.calories}kcal，蛋白質${targets.protein}g，脂肪${targets.fat}g，碳水${targets.carbs}g，膳食纖維${targets.fiber}g` : "- 尚未設定每日目標"}

今日已攝取：熱量${Math.round(todayNutrients.calories)}kcal，蛋白質${Math.round(todayNutrients.protein)}g，脂肪${Math.round(todayNutrients.fat)}g，碳水${Math.round(todayNutrients.carbs)}g，膳食纖維${Math.round(todayNutrients.fiber)}g
${mealSummary ? `已記錄餐點：\n${mealSummary}` : "今日尚無飲食記錄"}
今日運動：${exerciseSummary}

必須回傳JSON（不要其他文字）：
{
  "hasFood": true或false,
  "hasExercise": true或false,
  "meal": "breakfast|lunch|dinner|snack",
  "items": [{"name":"食物名","calories":0,"protein":0,"fat":0,"carbs":0,"fiber":0}],
  "nutrients": {"calories":0,"protein":0,"fat":0,"carbs":0,"fiber":0},
  "exercise": {"type":"運動類型","duration":0},
  "message": "給用戶的回應"
}

規則：
- 用戶說吃了什麼或上傳食物照片 → hasFood:true，分析五大營養素，message格式如下（嚴格遵守，禁止增加其他內容）：
  ⚡ **晚餐戰術建議**
  根據今日剩餘量說明整體策略（一句話，可包含剩餘熱量數字）
  接著列出 2-4 個具體食物建議，每項獨立一行，格式：食物名稱 份量（關鍵營養素數值）
  範例：菠菜 100g（纖維 2.8g）
  範例：糙米飯半碗 75g（碳水 27g，纖維 1.8g）
  最後一行固定格式→ 建議：食物1+食物2+食物3（例：建議：蒸蛋白+大量青菜+少量澱粉）
  嚴格禁止：不可在建議前列出熱量/蛋白質/碳水/纖維的數值清單
- 用戶說做了運動 → hasExercise:true，message確認記錄並說明消耗
- 用戶問餐廳/點餐策略 → hasFood:false，message給具體戰術（優先選擇、雷區、纖維補償），食物建議同樣附上份量與關鍵營養素數值，最後一行同樣用「建議：X+Y+Z」格式
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

// ===== CHAT PAGE (新的記錄頁) =====

function ChatPage({ profile, todayLog, setTodayLog, todayNutrients, setLastAdvice, styles }) {
  const targets = profile.targets;
  const today = new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric" });

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

    const userMsg = {
      role: "user",
      content: text || "（照片）",
      images: pendingImages,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setPendingImages([]);
    setIsLoading(true);

    const result = await chatWithNutrition(messages, text, userMsg.images, profile, todayNutrients, todayLog);

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
    }

    if (result.hasExercise && result.exercise?.type) {
      setTodayLog(log => ({
        ...log,
        exercise: [...log.exercise, { type: result.exercise.type, duration: result.exercise.duration || 0 }]
      }));
    }
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

  return (
    <div>
      {/* Mini stats header */}
      <div style={{ ...styles.header, paddingBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={styles.headerTitle}>💬 飲食記錄</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>{today}</div>
        </div>
        {targets && (
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { key: "calories", label: "🔥", unit: "kcal" },
              { key: "protein", label: "💪", unit: "g" },
              { key: "fiber", label: "🥦", unit: "g" },
            ].map(n => {
              const curr = Math.round(todayNutrients[n.key]);
              const tgt = targets[n.key];
              const pct = Math.min(100, Math.round(curr / tgt * 100));
              const over = curr > tgt;
              return (
                <div key={n.key} style={{ flex: 1, background: COLORS.bg, borderRadius: 8, padding: "5px 8px" }}>
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
      <div style={{ padding: "12px 16px", paddingBottom: 160 }}>
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

      {/* Input bar */}
      <div style={{
        position: "fixed", bottom: 62, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430,
        background: COLORS.card, borderTop: `1px solid ${COLORS.border}`,
        padding: "10px 12px", zIndex: 15,
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
  );
}

// ===== HOME PAGE =====

function HomePage({ profile, todayLog, setTodayLog, todayNutrients, lastAdvice, summary, summaryLoading, loadingStep, handleSummary, setShowSetup, styles }) {
  return (
    <div>
      <div style={styles.header}>
        <div style={styles.headerTitle}>🌿 健康日誌</div>
        <div style={styles.headerDate}>{new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</div>
      </div>
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={styles.sectionTitle}>今日營養進度</div>
          <button style={{ ...styles.btnOutline, padding: "4px 10px", fontSize: 12 }}
            onClick={() => setShowSetup(true)}>編輯目標</button>
        </div>
        {NUTRIENTS.map(n => (
          <NutrientBar key={n.key} nutrient={n} current={todayNutrients[n.key]} target={profile.targets?.[n.key]} />
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
                <span style={{ fontSize: 14, color: COLORS.text, flex: 1 }}>{item.name}</span>
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
          ? <LoadingDots messages={["分析今日飲食中...", "計算營養平衡...", "AI 評分中...", "整理建議中..."]} current={loadingStep} />
          : summary
            ? <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "12px 16px", background: COLORS.bg, borderRadius: 12 }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color: getScoreColor(summary.score), fontFamily: "'Noto Serif TC', serif" }}>
                    {summary.score ?? "—"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: getScoreColor(summary.score) }}>{getScoreEmoji(summary.score)} {summary.scoreLabel}</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>滿分 10 分</div>
                  </div>
                  <button
                    style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "4px 10px", fontSize: 11, color: COLORS.textMuted, cursor: "pointer" }}
                    onClick={handleSummary}>↺ 重新生成</button>
                </div>
                {summary.highlights && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 12, color: COLORS.green, fontWeight: 700, marginBottom: 4 }}>✅ 做得好</div><div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7 }}>{summary.highlights}</div></div>}
                {summary.improvements && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 12, color: COLORS.accent, fontWeight: 700, marginBottom: 4 }}>📌 可改善</div><div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7 }}>{summary.improvements}</div></div>}
                {summary.tomorrowAdvice && <div style={{ padding: "10px 14px", background: COLORS.brownPale, borderRadius: 10 }}><div style={{ fontSize: 12, color: COLORS.brown, fontWeight: 700, marginBottom: 4 }}>🌅 明日建議</div><div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7 }}>{summary.tomorrowAdvice}</div></div>}
              </div>
            : <button style={styles.btn} onClick={handleSummary}>生成今日總結與評分 ✨</button>}
      </div>
    </div>
  );
}

// ===== HISTORY PAGE =====

function HistoryPage({ history, todayLog, profile, getTodayNutrients, summary, setShowSetup, styles }) {
  const [expandedDay, setExpandedDay] = useState(null);

  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }

  const getEntry = (key) => {
    const todayKey = getTodayKey();
    if (key === todayKey) {
      const n = getTodayNutrients();
      const hasData = [...todayLog.breakfast,...todayLog.lunch,...todayLog.dinner,...todayLog.snack].length > 0 || todayLog.exercise.length > 0;
      if (!hasData) return null;
      return { log: todayLog, nutrients: n, score: summary?.score || history[key]?.score || null, scoreLabel: summary?.scoreLabel || history[key]?.scoreLabel || "", highlights: summary?.highlights || history[key]?.highlights || "", improvements: summary?.improvements || history[key]?.improvements || "" };
    }
    return history[key] || null;
  };

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.headerTitle}>📅 兩週記錄</div>
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
        if (!entry) return (
          <div key={key} style={{ margin: "4px 16px", padding: "12px 16px", background: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.5 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMuted }}>{formatDateLabel(key)}</span>
              <span style={{ fontSize: 11, color: COLORS.border, marginLeft: 8 }}>{key}</span>
            </div>
            <span style={{ fontSize: 12, color: COLORS.border }}>無記錄</span>
          </div>
        );

        const { log: dayLog, nutrients, score, scoreLabel, highlights, improvements } = entry;
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
                {score
                  ? <div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: getScoreColor(score), fontFamily: "'Noto Serif TC', serif" }}>{score}</div>
                      <div style={{ fontSize: 10, color: getScoreColor(score) }}>{getScoreEmoji(score)}</div>
                    </div>
                  : <div style={{ fontSize: 12, color: COLORS.border }}>未評分</div>
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
                          <span style={{ flex: 1 }}>· {item.name}</span>
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

                {score && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: COLORS.bg, borderRadius: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: getScoreColor(score), marginBottom: 6 }}>{getScoreEmoji(score)} 評分 {score}/10 · {scoreLabel}</div>
                    {highlights && <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 4 }}>✅ {highlights}</div>}
                    {improvements && <div style={{ fontSize: 12, color: COLORS.text }}>📌 {improvements}</div>}
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
  const [loadingStep, setLoadingStep] = useState(0);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [lastAdvice, setLastAdvice] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hl_lastadvice")) || null; } catch { return null; }
  });
  const [profileForm, setProfileForm] = useState(profile);
  const hasLoaded = useRef(false);

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

  useEffect(() => {
    localStorage.setItem("hl_profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("hl_log", JSON.stringify({ date: getTodayKey(), log: todayLog }));
  }, [todayLog]);

  useEffect(() => {
    localStorage.setItem("hl_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (lastAdvice) localStorage.setItem("hl_lastadvice", JSON.stringify(lastAdvice));
  }, [lastAdvice]);

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
    const result = await generateDailySummary(todayLog, profile.targets);
    setSummary(result);
    const todayKey = getTodayKey();
    const nutrients = getTodayNutrients();
    setHistory(h => ({
      ...h,
      [todayKey]: {
        log: todayLog, nutrients,
        score: result.score || null,
        scoreLabel: result.scoreLabel || "",
        highlights: result.highlights || "",
        improvements: result.improvements || "",
        tomorrowAdvice: result.tomorrowAdvice || "",
      }
    }));
    await syncToSheet(todayLog, result.score, todayKey);
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
      padding: "8px 0 12px", zIndex: 20,
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
        setShowSetup={setShowSetup} styles={styles}
      />}

      {page === "chat" && <ChatPage
        profile={profile}
        todayLog={todayLog}
        setTodayLog={setTodayLog}
        todayNutrients={todayNutrients}
        setLastAdvice={setLastAdvice}
        styles={styles}
      />}

      {page === "history" && <HistoryPage
        history={history} todayLog={todayLog} profile={profile}
        getTodayNutrients={getTodayNutrients} summary={summary}
        setShowSetup={setShowSetup} styles={styles}
      />}

      <div style={styles.bottomNav}>
        <div style={styles.navItem(page === "home")} onClick={() => setPage("home")}>
          <span style={{ fontSize: 22 }}>🏠</span>
          <span style={{ fontSize: 11 }}>今日</span>
        </div>
        <div style={styles.navItem(page === "chat")} onClick={() => setPage("chat")}>
          <span style={{ fontSize: 22 }}>💬</span>
          <span style={{ fontSize: 11 }}>記錄</span>
        </div>
        <div style={styles.navItem(page === "history")} onClick={() => setPage("history")}>
          <span style={{ fontSize: 22 }}>📅</span>
          <span style={{ fontSize: 11 }}>詳情</span>
        </div>
      </div>
    </div>
  );
}
