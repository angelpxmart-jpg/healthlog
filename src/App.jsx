import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#F7F3EE",
  card: "#FFFDF9",
  green: "#5A7A5A",
  greenLight: "#8FAF8F",
  greenPale: "#E8F0E8",
  brown: "#7A5C3A",
  brownLight: "#C4A882",
  brownPale: "#F2EBE0",
  text: "#2C2C2C",
  textMuted: "#8A8078",
  border: "#E0D8CE",
  accent: "#D4845A",
  white: "#FFFDF9",
};

const NUTRIENTS = [
  { key: "calories", label: "熱量", unit: "kcal", color: COLORS.accent, icon: "🔥" },
  { key: "protein", label: "蛋白質", unit: "g", color: COLORS.green, icon: "💪" },
  { key: "fat", label: "脂肪", unit: "g", color: COLORS.brownLight, icon: "🥑" },
  { key: "carbs", label: "碳水", unit: "g", color: "#C4956A", icon: "🌾" },
  { key: "fiber", label: "膳食纖維", unit: "g", color: COLORS.greenLight, icon: "🥦" },
];

const MEAL_LABELS = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "點心" };

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

function AdviceCard({ advice }) {
  if (!advice) return null;

  // Support both old string format and new array format
  if (typeof advice === "string") {
    // Parse bullet points from string
    const lines = advice.split(/[•·\n]/).map(l => l.trim()).filter(Boolean);
    return (
      <div>
        {lines.map((line, i) => {
          const colonIdx = line.indexOf("：");
          const title = colonIdx > -1 ? line.slice(0, colonIdx) : null;
          const body = colonIdx > -1 ? line.slice(colonIdx + 1) : line;
          return (
            <div key={i} style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(255,255,255,0.6)", borderRadius: 10, borderLeft: `3px solid ${COLORS.greenLight}` }}>
              {title && <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.green, marginBottom: 4 }}>{title}</div>}
              <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7 }}>{body}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // New array format
  if (Array.isArray(advice)) {
    return (
      <div>
        {advice.map((item, i) => (
          <div key={i} style={{ marginBottom: 10, padding: "10px 12px", background: "rgba(255,255,255,0.6)", borderRadius: 10, borderLeft: `3px solid ${COLORS.greenLight}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.green }}>{item.title}</div>
              {item.pct && (
                <div style={{ fontSize: 11, background: COLORS.greenPale, color: COLORS.green, borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>
                  {item.pct}%
                </div>
              )}
            </div>
            <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7 }}>{item.suggestion}</div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

async function callClaude(messages, systemPrompt) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

const SHEET_URL = "https://script.google.com/macros/s/AKfycbwvcuh2P98KShJJkrExBm2JPG2P7FTrRfv-QoSYwKyid1vy2LbghD-OuJryJaBZASb1RQ/exec";

async function syncToSheet(todayLog, score, date) {
  try {
    const form = new FormData();
    form.append("payload", JSON.stringify({ log: todayLog, score: score || "", date }));
    await fetch(SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      body: form,
    });
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

const NEXT_MEAL_MAP = {
  breakfast: "午餐",
  lunch: "晚餐",
  dinner: "明日早餐",
  snack: "下一正餐",
};

async function analyzeFood(text, images, targets, todayNutrients, meal = "breakfast") {
  const nextMeal = NEXT_MEAL_MAP[meal] || "下一餐";
  const systemPrompt = `你是一位專業的營養師助理。請分析用戶輸入的食物，回傳 JSON 格式：
{
  "items": [{"name":"食物名","calories":0,"protein":0,"fat":0,"carbs":0,"fiber":0}],
  "total": {"calories":0,"protein":0,"fat":0,"carbs":0,"fiber":0},
  "advice": [
    {"title": "營養素名稱補強", "pct": 57, "suggestion": "具體建議內容，含食物和份量"},
    {"title": "另一營養素", "pct": 35, "suggestion": "具體建議"},
    {"title": "第三項建議", "pct": 68, "suggestion": "具體建議"}
  ]"
}
只回傳 JSON，不要其他文字。`;

  const content = [];
  if (images && images.length > 0) {
    images.forEach(image => {
      content.push({ type: "image", source: { type: "base64", media_type: image.type, data: image.data } });
    });
  }
  const todayInfo = targets ? `目前餐別：${meal}（${NEXT_MEAL_MAP[meal]}建議）\n今日已攝取（含本餐前）：熱量${Math.round(todayNutrients.calories)}/${targets.calories}kcal, 蛋白質${Math.round(todayNutrients.protein)}/${targets.protein}g, 脂肪${Math.round(todayNutrients.fat)}/${targets.fat}g, 碳水${Math.round(todayNutrients.carbs)}/${targets.carbs}g, 纖維${Math.round(todayNutrients.fiber)}/${targets.fiber}g` : "";
  content.push({ type: "text", text: `食物內容：${text}\n${todayInfo}` });

  const raw = await callClaude([{ role: "user", content }], systemPrompt);
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

async function generateDailySummary(log, targets) {
  const systemPrompt = `你是專業營養師，根據今日飲食和運動記錄評分，只回傳JSON不要其他文字：{"score":8,"scoreLabel":"表現不錯","highlights":"今日優點...","improvements":"需改善...","tomorrowAdvice":"明日建議...","summary":"整體評語..."}`;
  const logText = JSON.stringify(log);
  const targetText = targets ? JSON.stringify(targets) : "未設定";
  const raw = await callClaude([{
    role: "user",
    content: `今日記錄：${logText}\n每日目標：${targetText}`
  }], systemPrompt);
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { score: null, summary: raw, highlights: "", improvements: "", tomorrowAdvice: "" };
  }
}

// Home Page
function HomePage({ profile, todayLog, todayNutrients, lastAdvice, summary, summaryLoading, loadingStep, handleSummary, setShowSetup, styles }) {
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
        <div style={{ ...styles.card, background: COLORS.greenPale, border: `1px solid ${COLORS.greenLight}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ ...styles.sectionTitle, marginBottom: 0, color: COLORS.green }}>
              🥗 {lastAdvice.nextMeal}建議
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
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < items.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
                <span style={{ fontSize: 14, color: COLORS.text }}>{item.name}</span>
                <span style={{ fontSize: 13, color: COLORS.textMuted }}>{Math.round(item.calories)} kcal</span>
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
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: getScoreColor(summary.score) }}>{getScoreEmoji(summary.score)} {summary.scoreLabel}</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>滿分 10 分</div>
                  </div>
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

// Record Page
function RecordPage({ recordState, recordInput, setRecordInput, recordResult, loadingStep, handleRecord, handleConfirm, setRecordState, fileRef, handleImageUpload, todayLog, setTodayLog, styles }) {
  return (
    <div>
      <div style={styles.header}>
        <div style={styles.headerTitle}>📝 新增記錄</div>
      </div>
      <div style={styles.card}>
        <div style={styles.sectionTitle}>餐別</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
          {Object.entries(MEAL_LABELS).map(([k, v]) => (
            <button key={k} style={styles.tag(recordInput.meal === k)}
              onClick={() => setRecordInput(r => ({ ...r, meal: k }))}>{v}</button>
          ))}
        </div>
      </div>

      {recordState === "idle" && (
        <>
          <div style={styles.card}>
            <div style={styles.sectionTitle}>輸入食物</div>
            <textarea style={{ ...styles.textarea, minHeight: 100 }} rows={4}
              placeholder="例：1顆水煮蛋、60克馬鈴薯、1/5顆苦瓜（涼拌）"
              value={recordInput.text}
              onChange={e => setRecordInput(r => ({ ...r, text: e.target.value }))} />
            <div style={{ marginTop: 12 }}>
              {/* 圖片縮圖列 */}
              {recordInput.images.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  {recordInput.images.map((img, i) => (
                    <div key={i} style={{ position: "relative", width: 72, height: 72 }}>
                      <img src={`data:${img.type};base64,${img.data}`}
                        style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: `1.5px solid ${COLORS.greenLight}` }} />
                      <button onClick={() => setRecordInput(r => ({ ...r, images: r.images.filter((_, idx) => idx !== i) }))}
                        style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: COLORS.accent, border: "none", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              {/* 上傳按鈕：最多3張 */}
              {recordInput.images.length < 3 && (
                <button style={{ ...styles.btnOutline, width: "100%" }} onClick={() => fileRef.current?.click()}>
                  📷 上傳照片 {recordInput.images.length > 0 ? `（${recordInput.images.length}/3）` : "（最多 3 張）"}
                </button>
              )}
              {recordInput.images.length >= 3 && (
                <div style={{ fontSize: 12, color: COLORS.textMuted, textAlign: "center", padding: "6px 0" }}>
                  已達上限 3 張，請刪除後再添加
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*"
                style={{ display: "none" }} onChange={handleImageUpload} />
            </div>
          </div>
          <div style={{ margin: "0 16px" }}>
            <button style={styles.btn} onClick={handleRecord}
              disabled={!recordInput.text.trim() && recordInput.images.length === 0}>
              AI 分析 →
            </button>
          </div>
        </>
      )}

      {recordState === "loading" && (
        <div style={styles.card}>
          <LoadingDots messages={["辨識食物中...", "計算營養成分...", "生成飲食建議...", "整理分析結果..."]} current={loadingStep} />
        </div>
      )}

      {recordState === "result" && recordResult && (
        <>
          <div style={styles.card}>
            <div style={styles.sectionTitle}>📊 這餐分析</div>
            {(recordResult.items || []).map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                <span style={{ fontSize: 14, color: COLORS.text }}>{item.name}</span>
                <span style={{ fontSize: 13, color: COLORS.textMuted }}>{Math.round(item.calories)} kcal</span>
              </div>
            ))}
            <div style={{ marginTop: 12, padding: "10px 14px", background: COLORS.greenPale, borderRadius: 10 }}>
              {NUTRIENTS.map(n => (
                <div key={n.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: COLORS.textMuted }}>{n.icon} {n.label}</span>
                  <span style={{ fontWeight: 600, color: COLORS.text }}>{Math.round(recordResult.total?.[n.key] || 0)} {n.unit}</span>
                </div>
              ))}
            </div>
          </div>
          {recordResult.advice && (
            <div style={styles.card}>
              <div style={styles.sectionTitle}>🥗 下一餐建議</div>
              <AdviceCard advice={recordResult.advice} />
            </div>
          )}
          <div style={{ margin: "0 16px", display: "flex", gap: 10 }}>
            <button style={{ ...styles.btnOutline, flex: 1 }} onClick={() => setRecordState("idle")}>重新輸入</button>
            <button style={{ ...styles.btn, flex: 2 }} onClick={handleConfirm}>確認儲存 ✓</button>
          </div>
        </>
      )}

      <div style={styles.card}>
        <div style={styles.sectionTitle}>🏃 運動記錄</div>
        <ExerciseQuickAdd setTodayLog={setTodayLog} styles={styles} />
      </div>
    </div>
  );
}

function ExerciseQuickAdd({ setTodayLog, styles }) {
    const [type, setType] = useState("");
    const [duration, setDuration] = useState("");
    const add = () => {
      if (!type || !duration) return;
      setTodayLog(log => ({ ...log, exercise: [...log.exercise, { type, duration: parseInt(duration) }] }));
      setType(""); setDuration("");
    };
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <input style={{ ...styles.input, flex: 2 }} placeholder="運動類型（慢跑）" value={type} onChange={e => setType(e.target.value)} />
        <input style={{ ...styles.input, flex: 1 }} placeholder="分鐘" type="number" value={duration} onChange={e => setDuration(e.target.value)} />
        <button style={{ ...styles.btn, width: "auto", padding: "10px 16px" }} onClick={add}>＋</button>
      </div>
    );
}

// History Page
function HistoryPage({ history, todayLog, profile, getTodayNutrients, summary, setShowSetup, styles }) {
    const [expandedDay, setExpandedDay] = useState(null);

    // Build 14-day list (today + 13 days back)
    const days = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days.push(key);
    }

    // Merge today's live log into history view
    const getEntry = (key) => {
      const todayKey = getTodayKey();
      if (key === todayKey) {
        const n = getTodayNutrients();
        const hasData = [...todayLog.breakfast,...todayLog.lunch,...todayLog.dinner,...todayLog.snack].length > 0 || todayLog.exercise.length > 0;
        if (!hasData) return null;
        return { log: todayLog, nutrients: n, score: summary?.score || history[key]?.score || null, scoreLabel: summary?.scoreLabel || history[key]?.scoreLabel || "", highlights: summary?.highlights || history[key]?.highlights || "", improvements: summary?.improvements || history[key]?.improvements || "" };
      }
      return history[key] || null;
    }

    return (
      <div>
        <div style={styles.header}>
          <div style={styles.headerTitle}>📅 兩週記錄</div>
          <div style={styles.headerDate}>點擊日期展開詳情</div>
        </div>

        {/* Target settings */}
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

        {/* 14-day list */}
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
              {/* Day row */}
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

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ background: COLORS.card, border: `1px solid ${isToday ? COLORS.greenLight : COLORS.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "12px 16px" }}>
                  {/* Nutrients */}
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

                  {/* Meals */}
                  {Object.entries(MEAL_LABELS).map(([meal, label]) => {
                    const items = dayLog[meal] || [];
                    if (!items.length) return null;
                    return (
                      <div key={meal} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.brown, marginBottom: 4 }}>{label}</div>
                        {items.map((item, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.text, paddingLeft: 8, marginBottom: 2 }}>
                            <span>· {item.name}</span>
                            <span style={{ color: COLORS.textMuted }}>{Math.round(item.calories)} kcal</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  {/* Exercise */}
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

                  {/* Score breakdown */}
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
  const [recordState, setRecordState] = useState("idle"); // idle | loading | result
  const [recordInput, setRecordInput] = useState({ text: "", meal: "breakfast", images: [] });
  const [recordResult, setRecordResult] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [lastAdvice, setLastAdvice] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hl_lastadvice")) || null; } catch { return null; }
  });
  const [profileForm, setProfileForm] = useState(profile);
  const fileRef = useRef();
  const hasLoaded = useRef(false);

  // 啟動時從 Google Sheet 載入今日資料，取筆數較多者
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

  // 每次 todayLog 變動（非首次載入）自動同步到 Sheet
  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      return;
    }
    const hasData = todayLog.breakfast.length || todayLog.lunch.length ||
      todayLog.dinner.length || todayLog.snack.length || todayLog.exercise.length;
    if (hasData) {
      syncToSheet(todayLog, null, getTodayKey());
    }
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
    if (recordState === "loading") {
      const iv = setInterval(() => setLoadingStep(s => s + 1), 1200);
      return () => clearInterval(iv);
    }
  }, [recordState]);

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
          setRecordInput(r => {
            if (r.images.length >= 3) return r; // 最多 3 張
            return { ...r, images: [...r.images, { data: compressed, type: "image/jpeg" }] };
          });
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = ""; // reset input so same file can be re-added
  };

  const handleRecord = async () => {
    if (!recordInput.text.trim() && recordInput.images.length === 0) return;
    setRecordState("loading");
    setLoadingStep(0);
    const nutrients = getTodayNutrients();
    const result = await analyzeFood(recordInput.text, recordInput.images, profile.targets, nutrients, recordInput.meal);
    setRecordResult(result);
    setRecordState("result");
  };

  const handleConfirm = () => {
    if (!recordResult) return;
    const meal = recordInput.meal;
    const items = recordResult.items || [];
    setTodayLog(log => ({ ...log, [meal]: [...log[meal], ...items] }));
    if (recordResult.advice) {
      setLastAdvice({
        meal,
        nextMeal: NEXT_MEAL_MAP[meal] || "下一餐",
        text: recordResult.advice,
        time: new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }),
      });
    }
    setRecordInput({ text: "", meal: "breakfast", images: [] });
    setRecordResult(null);
    setRecordState("idle");
    setPage("home");
  };

  const handleSaveProfile = () => {
    const targets = calculateTargets(profileForm);
    const updated = { ...profileForm, targets };
    setProfile(updated);
    setShowSetup(false);
  };

  const handleSummary = async () => {
    setSummaryLoading(true);
    const result = await generateDailySummary(todayLog, profile.targets);
    setSummary(result);
    // Save to history with score
    const todayKey = getTodayKey();
    const nutrients = getTodayNutrients();
    setHistory(h => ({
      ...h,
      [todayKey]: {
        log: todayLog,
        nutrients,
        score: result.score || null,
        scoreLabel: result.scoreLabel || "",
        highlights: result.highlights || "",
        improvements: result.improvements || "",
        tomorrowAdvice: result.tomorrowAdvice || "",
        summary: result.summary || "",
      }
    }));
    // Sync to Google Sheet
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
      margin: "12px 16px", boxShadow: "0 2px 12px rgba(90,122,90,0.08)",
      border: `1px solid ${COLORS.border}`,
    },
    sectionTitle: {
      fontFamily: "'Noto Serif TC', serif", fontSize: 15, fontWeight: 700,
      color: COLORS.brown, marginBottom: 14,
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
    textarea: {
      width: "100%", padding: "12px 14px", borderRadius: 10,
      border: `1.5px solid ${COLORS.border}`, background: COLORS.bg,
      fontSize: 14, color: COLORS.text, fontFamily: "'Noto Sans TC', sans-serif",
      outline: "none", resize: "none", boxSizing: "border-box",
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
    addBtn: {
      width: 56, height: 56, borderRadius: "50%", background: COLORS.green,
      border: "none", cursor: "pointer", display: "flex", alignItems: "center",
      justifyContent: "center", boxShadow: "0 4px 16px rgba(90,122,90,0.35)",
      fontSize: 28, color: "#fff",
    },
    tag: (active) => ({
      padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer",
      background: active ? COLORS.greenPale : COLORS.border,
      color: active ? COLORS.green : COLORS.textMuted,
      border: active ? `1px solid ${COLORS.greenLight}` : "1px solid transparent",
      fontWeight: active ? 600 : 400,
    }),
  };

  // Setup Modal
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
            { label: "身高 (cm)", key: "height", placeholder: "例：170" },
            { label: "體重 (kg)", key: "weight", placeholder: "例：65" },
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
        body { margin: 0; background: ${COLORS.bg}; }
        textarea:focus, input:focus { border-color: ${COLORS.greenLight} !important; }
      `}</style>

      {page === "home" && <HomePage
        profile={profile} todayLog={todayLog} todayNutrients={todayNutrients}
        lastAdvice={lastAdvice} summary={summary} summaryLoading={summaryLoading}
        loadingStep={loadingStep} handleSummary={handleSummary}
        setShowSetup={setShowSetup} styles={styles}
      />}
      {page === "record" && <RecordPage
        recordState={recordState} recordInput={recordInput} setRecordInput={setRecordInput}
        recordResult={recordResult} loadingStep={loadingStep} handleRecord={handleRecord}
        handleConfirm={handleConfirm} setRecordState={setRecordState}
        fileRef={fileRef} handleImageUpload={handleImageUpload}
        todayLog={todayLog} setTodayLog={setTodayLog} styles={styles}
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <button style={styles.addBtn} onClick={() => setPage("record")}>＋</button>
        </div>
        <div style={styles.navItem(page === "history")} onClick={() => setPage("history")}>
          <span style={{ fontSize: 22 }}>📊</span>
          <span style={{ fontSize: 11 }}>詳情</span>
        </div>
      </div>
    </div>
  );
}
