import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Importa cru e tipa explicitamente
import questionsEN from "./data/questions.en.json"; // ou "./data/question.en.json" se o teu ficheiro for singular
import questionsPT from "./data/questions.pt.json";

import blessingsJson from "./data/blessings.json";
import obstaclesJson from "./data/obstacles.json";
// Tipos dos baralhos
type Card = { pt: string; en: string; points?: number; moveDelta?: number };

// Arrays tipados
const blessingsData = blessingsJson as Card[];
const obstaclesData = obstaclesJson as Card[];

type Lang = "pt" | "en";
type TileType =
  | "START"
  | "PERGUNTA"
  | "DESAFIO"
  | "BENCAO"
  | "OBSTACULO"
  | "SABADO"
  | "DIZIMO"
  | "MISSAO"
  | "TENTACAO";

type Player = {
  id: number;
  name: string;
  pos: number;
  faith: number;
  skip: number;
  color: string;
};

const I18N = {
  title: { pt: "Caminho da Fé", en: "Path of Faith" },
  start: { pt: "Vida Terrena (Início)", en: "Earthly Life (Start)" },
  roll: { pt: "Lançar dados", en: "Roll dice" },
  rolled: { pt: "Saiu", en: "You rolled" },
  pos: { pt: "Posição", en: "Position" },
  faith: { pt: "Pontos de Fé", en: "Faith Points" },
  next: { pt: "Seguinte", en: "Next" },
  lang: { pt: "Idioma", en: "Language" },
  restMsg: {
    pt: "Sábado: descansas este turno e ganhas +2 pontos de fé.",
    en: "Sabbath: you rest this turn and gain +2 faith points.",
  },
  question: { pt: "Pergunta", en: "Question" },
  players: { pt: "Jogadores", en: "Players" },
  startGame: { pt: "Começar Jogo", en: "Start Game" },
};

const COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#f59e0b",
  "#7c3aed",
  "#0ea5e9",
];

const buildTiles = () => {
  const pattern: TileType[] = [
    "START",
    "PERGUNTA",
    "BENCAO",
    "DESAFIO",
    "OBSTACULO",
    "SABADO",
    "PERGUNTA",
    "MISSAO",
    "PERGUNTA",
    "DIZIMO",
    "PERGUNTA",
    "BENCAO",
    "DESAFIO",
    "OBSTACULO",
    "SABADO",
    "PERGUNTA",
    "MISSAO",
    "PERGUNTA",
    "TENTACAO",
    "PERGUNTA",
    "BENCAO",
    "DESAFIO",
    "OBSTACULO",
    "SABADO",
    "PERGUNTA",
    "MISSAO",
    "PERGUNTA",
    "DIZIMO",
    "PERGUNTA",
    "BENCAO",
    "DESAFIO",
    "OBSTACULO",
    "SABADO",
    "PERGUNTA",
    "MISSAO",
    "PERGUNTA",
    "TENTACAO",
    "PERGUNTA",
    "BENCAO",
  ];
  return new Array(40).fill(null).map((_, i) => pattern[i % pattern.length]);
};
const TILES = buildTiles();

function label(type: TileType, lang: Lang) {
  const map = {
    START: { pt: I18N.start.pt, en: I18N.start.en },
    PERGUNTA: { pt: "Pergunta Bíblica", en: "Bible Question" },
    DESAFIO: { pt: "Desafio de Fé", en: "Faith Challenge" },
    BENCAO: { pt: "Bênção", en: "Blessing" },
    OBSTACULO: { pt: "Obstáculo", en: "Obstacle" },
    SABADO: { pt: "Sábado", en: "Sabbath" },
    DIZIMO: { pt: "Dízimo", en: "Tithe" },
    MISSAO: { pt: "Missão", en: "Mission" },
    TENTACAO: { pt: "Tentação", en: "Temptation" },
  } as const;
  return map[type][lang];
}

// 40 tiles (10 per side) coordinates around a square
function getXY(index: number) {
  const side = 10,
    cell = 34,
    size = side * cell;
  let x = 0,
    y = 0;
  if (index <= 9) {
    x = index * cell;
    y = size - cell;
  } else if (index <= 19) {
    x = size - cell;
    y = size - cell - (index - 9) * cell;
  } else if (index <= 29) {
    x = size - cell - (index - 19) * cell;
    y = 0;
  } else {
    x = 0;
    y = (index - 29) * cell;
  }
  return { x, y, cell, size };
}

// offsets for up to 6 tokens on the same tile (3x2 grid)
function tokenOffset(slot: number) {
  const positions = [
    { dx: 2, dy: 2 },
    { dx: 18, dy: 2 },
    { dx: 2, dy: 18 },
    { dx: 18, dy: 18 },
    { dx: 10, dy: 10 },
    { dx: 26, dy: 10 },
  ];
  return positions[slot % positions.length];
}

// --- Multiple choice ---
type MCQuestionActive = {
  q: string;
  opts: [string, string, string];
  correct: 0 | 1 | 2;
};

export default function App() {
  const [lang, setLang] = useState<Lang>("pt");
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [current, setCurrent] = useState(0);
  const [modal, setModal] = useState<string | null>(null);
  const [activeQ, setActiveQ] = useState<MCQuestionActive | null>(null);
  const [awaiting, setAwaiting] = useState(false);

  function startGame() {
    const pc = Math.min(6, Math.max(2, playerCount));
    const ps: Player[] = new Array(pc).fill(null).map((_, i) => ({
      id: i + 1,
      name: `Jogador ${i + 1}`,
      pos: 0,
      faith: 3,
      skip: 0,
      color: COLORS[i % COLORS.length],
    }));
    setPlayers(ps);
    setCurrent(0);
    setModal(null);
  }

  const roll = () => Math.floor(Math.random() * 6) + 1;

  function randomQuestion(lang: Lang): MCQuestionActive {
    const src = lang === "pt" ? questionsPT : questionsEN;
    const raw = src[Math.floor(Math.random() * src.length)];
    return {
      q: raw.q,
      opts: [raw.opts[0], raw.opts[1], raw.opts[2]] as [string, string, string],
      correct: raw.correct as 0 | 1 | 2,
    };
  }

  function resolveTileFor(p: Player) {
    const tile = TILES[p.pos];
    switch (tile) {
      case "BENCAO": {
        const c =
          blessingsData[Math.floor(Math.random() * blessingsData.length)];
        if (typeof c.points === "number") p.faith += c.points;
        if (typeof c.moveDelta === "number")
          p.pos = (p.pos + c.moveDelta + 40) % 40;
        setModal(lang === "pt" ? c.pt : c.en);
        setAwaiting(true);
        break;
      }
      case "OBSTACULO": {
        const c =
          obstaclesData[Math.floor(Math.random() * obstaclesData.length)];
        if (typeof c.points === "number") p.faith += c.points;
        if (typeof c.moveDelta === "number")
          p.pos = (p.pos + c.moveDelta + 40) % 40;
        setModal(lang === "pt" ? c.pt : c.en);
        setAwaiting(true);
        break;
      }
      case "MISSAO": {
        p.faith += 1;
        setModal(lang === "pt" ? "Missão: +1 ponto." : "Mission: +1 point.");
        setAwaiting(true);
        break;
      }
      case "DIZIMO": {
        if (p.faith > 0) p.faith -= 1;
        setModal(
          lang === "pt" ? "Dízimo: deste 1 ponto." : "Tithe: you gave 1 point."
        );
        setAwaiting(true);
        break;
      }
      case "TENTACAO": {
        p.faith -= 1;
        setModal(
          lang === "pt" ? "Tentação: -1 ponto." : "Temptation: -1 point."
        );
        setAwaiting(true);
        break;
      }
      case "SABADO": {
        p.skip += 1;
        p.faith += 2;
        setModal(I18N.restMsg[lang]);
        setAwaiting(true);
        break;
      }
      case "PERGUNTA": {
        const q = randomQuestion(lang);
        setActiveQ(q);
        setAwaiting(true);
        break;
      }
      default: {
        setAwaiting(true);
        break;
      }
    }
  }

  function onRoll() {
    if (!players || awaiting) return;

    setPlayers((prev) => {
      if (!prev) return prev;
      const copy = prev.map((p) => ({ ...p }));
      const p = copy[current];

      if (p.skip > 0) {
        p.skip -= 1;
        p.faith += 2;
        setModal(I18N.restMsg[lang]);
        setAwaiting(true);
      } else {
        const r1 = roll();
        const r2 = roll();
        const steps = r1 + r2;
        p.pos = (p.pos + steps) % 40;
        setModal(`${I18N.rolled[lang]} ${steps}`);
        resolveTileFor(p);
      }
      return copy;
    });
  }

  function closeModalAndNextTurn() {
    setModal(null);
    setActiveQ(null);
    setAwaiting(false);
    setCurrent((i) => (players ? (i + 1) % players.length : 0));
  }

  function answerQuestion(choice: 0 | 1 | 2) {
    if (!players || !activeQ) return;
    setPlayers((prev) => {
      if (!prev) return prev;
      const copy = prev.map((p) => ({ ...p }));
      const p = copy[current];
      if (choice === activeQ.correct) {
        p.faith += 2;
        setModal(
          lang === "pt"
            ? "Certo! +2 Pontos de Fé."
            : "Correct! +2 Faith Points."
        );
      } else {
        p.faith -= 1;
        setModal(
          lang === "pt" ? "Errado. -1 Ponto de Fé." : "Wrong. -1 Faith Point."
        );
      }
      return copy;
    });
    setActiveQ(null);
  }

  const board = useMemo(() => {
    const tiles: React.ReactNode[] = [];
    for (let i = 0; i < 40; i++) {
      const { x, y, cell, size } = getXY(i);
      tiles.push(
        <View
          key={i}
          style={[
            styles.tile,
            {
              left: x,
              top: y,
              width: cell,
              height: cell,
              backgroundColor: colorFor(TILES[i]),
            },
          ]}
        >
          <Text style={styles.tileText}>{label(TILES[i], lang)}</Text>
          {players &&
            players.map((pl, idx) => {
              if (pl.pos !== i) return null;
              const { dx, dy } = tokenOffset(idx);
              return (
                <View
                  key={pl.id}
                  style={[
                    styles.token,
                    { backgroundColor: pl.color, left: dx, top: dy },
                  ]}
                />
              );
            })}
        </View>
      );
      if (i === 39) {
        tiles.push(
          <View
            key="center"
            style={[
              styles.center,
              { left: 0, top: 0, width: size, height: size },
            ]}
          >
            <Text style={styles.centerText}>{I18N.title[lang]}</Text>
          </View>
        );
      }
    }
    return tiles;
  }, [lang, players]);

  // Setup screen
  if (!players) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{I18N.title[lang]}</Text>

        <View style={styles.hud}>
          <Pressable
            style={styles.langBtn}
            onPress={() => setLang((l) => (l === "pt" ? "en" : "pt"))}
          >
            <Text style={styles.btnText}>
              {I18N.lang[lang]}: {lang.toUpperCase()}
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: 12, alignItems: "center", marginTop: 24 }}>
          <Text style={{ fontSize: 16 }}>
            {I18N.players[lang]}: {playerCount}
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => setPlayerCount((p) => Math.max(2, p - 1))}
              style={styles.smallBtn}
            >
              <Text style={styles.smallBtnText}>−</Text>
            </Pressable>
            <Pressable
              onPress={() => setPlayerCount((p) => Math.min(6, p + 1))}
              style={styles.smallBtn}
            >
              <Text style={styles.smallBtnText}>+</Text>
            </Pressable>
          </View>
          <Pressable style={styles.startBtn} onPress={startGame}>
            <Text style={styles.btnText}>{I18N.startGame[lang]}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{I18N.title[lang]}</Text>

      <View style={styles.hud}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "center",
            flex: 1,
          }}
        >
          {players.map((p, idx) => (
            <View
              key={p.id}
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: p.color,
                  borderWidth: 1,
                  borderColor: "#0002",
                }}
              />
              <Text style={{ fontWeight: current === idx ? "700" : "500" }}>
                {p.name}: {p.faith}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          style={styles.langBtn}
          onPress={() => setLang((l) => (l === "pt" ? "en" : "pt"))}
        >
          <Text style={styles.btnText}>
            {I18N.lang[lang]}: {lang.toUpperCase()}
          </Text>
        </Pressable>
      </View>

      <View style={styles.boardWrap}>{board}</View>

      <Pressable style={styles.rollBtn} onPress={onRoll} disabled={awaiting}>
        <Text style={styles.btnText}>
          {I18N.roll[lang]} — {players[current]?.name}
        </Text>
      </Pressable>

      <Modal visible={!!(modal || activeQ)} transparent animationType="fade">
        <View style={styles.modalBack}>
          <View style={styles.modalBox}>
            {activeQ ? (
              <>
                <Text style={styles.modalText}>{activeQ.q}</Text>
                {activeQ.opts.map((opt, idx) => (
                  <Pressable
                    key={idx}
                    style={styles.optionBtn}
                    onPress={() => answerQuestion(idx as 0 | 1 | 2)}
                  >
                    <Text style={styles.optionText}>
                      {String.fromCharCode(65 + idx)}. {opt}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : (
              <ScrollView>
                <Text style={styles.modalText}>{modal}</Text>
              </ScrollView>
            )}

            {!activeQ && (
              <Pressable
                style={styles.closeBtn}
                onPress={closeModalAndNextTurn}
              >
                <Text style={styles.btnText}>{I18N.next[lang]}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function colorFor(type: TileType) {
  switch (type) {
    case "START":
      return "#e7f0ff";
    case "PERGUNTA":
      return "#eaf7ff";
    case "DESAFIO":
      return "#fff1e6";
    case "BENCAO":
      return "#ebfaef";
    case "OBSTACULO":
      return "#fdecea";
    case "SABADO":
      return "#fff7d6";
    case "DIZIMO":
      return "#f3e8ff";
    case "MISSAO":
      return "#e6fff3";
    case "TENTACAO":
      return "#ffe6f2";
    default:
      return "#f0f0f0";
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 48, gap: 12, backgroundColor: "#fafafa" },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  hud: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  langBtn: {
    backgroundColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  boardWrap: {
    alignSelf: "center",
    width: 340,
    height: 340,
    position: "relative",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#ddd",
  },
  tile: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  tileText: { fontSize: 8, textAlign: "center" },
  token: { width: 10, height: 10, borderRadius: 5, position: "absolute" },
  center: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none" as any,
  },
  centerText: { fontSize: 18, fontWeight: "700", opacity: 0.2 },
  rollBtn: {
    alignSelf: "center",
    backgroundColor: "#0f766e",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  btnText: { color: "white", fontWeight: "600" },
  modalBack: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "86%",
    maxHeight: "60%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  modalText: { fontSize: 16, color: "#111827" },
  closeBtn: {
    backgroundColor: "#334155",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  // Setup screen
  smallBtn: {
    backgroundColor: "#1f2937",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallBtnText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  startBtn: {
    backgroundColor: "#0f766e",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  optionBtn: {
    backgroundColor: "#e5e7eb",
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  optionText: { fontSize: 16, color: "#111827" },
});
