import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

type Card = { pt: string; en: string; points?: number; moveDelta?: number };
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

const blessings: Card[] = [
  {
    pt: "Ajudaste um irmão: +2 pontos.",
    en: "You helped a brother: +2 points.",
    points: +2,
  },
  {
    pt: "Estudo bíblico frutífero: +1.",
    en: "Fruitful Bible study: +1.",
    points: +1,
  },
  { pt: "Oração respondida: +2.", en: "Answered prayer: +2.", points: +2 },
];

const obstacles: Card[] = [
  { pt: "Tentação: -2 pontos.", en: "Temptation: -2 points.", points: -2 },
  { pt: "Dúvidas: -1 ponto.", en: "Doubts: -1 point.", points: -1 },
  { pt: "Tropeço: volta 2.", en: "Stumble: move back 2.", moveDelta: -2 },
];

const missions: Card[] = [
  { pt: "Partilhaste a fé: +2.", en: "Shared your faith: +2.", points: +2 },
  { pt: "Apoio a missão: +1.", en: "Mission support: +1.", points: +1 },
];

const tithes: Card[] = [
  {
    pt: "Dízimo: dás 1, recebes 1. 0 líquido.",
    en: "Tithe: give 1, receive 1. Net 0.",
    points: 0,
  },
];

const temptations: Card[] = [
  { pt: "Tentação: -1 ponto.", en: "Temptation: -1 point.", points: -1 },
];

const questions = [
  {
    ptQ: "Quem construiu a arca?",
    ptA: "Noé",
    enQ: "Who built the ark?",
    enA: "Noah",
  },
  {
    ptQ: "Quem foi engolido por um grande peixe?",
    ptA: "Jonas",
    enQ: "Who was swallowed by a great fish?",
    enA: "Jonah",
  },
  {
    ptQ: "Quem foram os três amigos de Daniel?",
    ptA: "Sadraque, Mesaque e Abednego",
    enQ: "Name Daniel's three friends.",
    enA: "Shadrach, Meshach, Abednego",
  },
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

export default function App() {
  const [lang, setLang] = useState<Lang>("pt");
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [current, setCurrent] = useState(0); // index of current player
  const [modal, setModal] = useState<string | null>(null);

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

  function resolveTileFor(p: Player) {
    const tile = TILES[p.pos];
    switch (tile) {
      case "BENCAO": {
        const c = blessings[Math.floor(Math.random() * blessings.length)];
        if (typeof c.points === "number") p.faith += c.points;
        if (typeof c.moveDelta === "number")
          p.pos = (p.pos + c.moveDelta + 40) % 40;
        setModal(lang === "pt" ? c.pt : c.en);
        break;
      }
      case "OBSTACULO": {
        const c = obstacles[Math.floor(Math.random() * obstacles.length)];
        if (typeof c.points === "number") p.faith += c.points;
        if (typeof c.moveDelta === "number")
          p.pos = (p.pos + c.moveDelta + 40) % 40;
        setModal(lang === "pt" ? c.pt : c.en);
        break;
      }
      case "MISSAO": {
        const c = missions[Math.floor(Math.random() * missions.length)];
        if (typeof c.points === "number") p.faith += c.points;
        setModal(lang === "pt" ? c.pt : c.en);
        break;
      }
      case "DIZIMO": {
        const c = tithes[0];
        if (typeof c.points === "number") p.faith += c.points;
        setModal(lang === "pt" ? c.pt : c.en);
        break;
      }
      case "TENTACAO": {
        const c = temptations[0];
        if (typeof c.points === "number") p.faith += c.points;
        setModal(lang === "pt" ? c.pt : c.en);
        break;
      }
      case "SABADO": {
        p.skip += 1; // rests next turn
        p.faith += 2;
        setModal(I18N.restMsg[lang]);
        break;
      }
      case "PERGUNTA": {
        const c = questions[Math.floor(Math.random() * questions.length)];
        p.faith += 1;
        setModal(
          `${lang === "pt" ? c.ptQ : c.enQ}\n\n(${I18N.question[lang]} ➜ ${
            lang === "pt" ? c.ptA : c.enA
          })\n(+1 ${I18N.faith[lang]})`
        );
        break;
      }
      default:
        break;
    }
  }

  function onRoll() {
    if (!players) return;

    setPlayers((prev) => {
      if (!prev) return prev;
      const copy = prev.map((p) => ({ ...p }));
      const p = copy[current];

      if (p.skip > 0) {
        p.skip -= 1;
        p.faith += 2; // sabbath rest benefit on the skipped turn
        setModal(I18N.restMsg[lang]);
      } else {
        const r1 = roll();
        const r2 = roll();
        const steps = r1 + r2;
        p.pos = (p.pos + steps) % 40;
        resolveTileFor(p);
        setModal((m) => `${I18N.rolled[lang]} ${steps}\n\n${m ?? ""}`.trim());
      }
      return copy;
    });

    // pass turn to next player AFTER state update
    setCurrent((i) => {
      if (!players) return 0;
      return (i + 1) % players.length;
    });
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

  // Setup screen (choose 2–6 players) before starting
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

      <Pressable style={styles.rollBtn} onPress={onRoll}>
        <Text style={styles.btnText}>
          {I18N.roll[lang]} — {players[current]?.name}
        </Text>
      </Pressable>

      <Modal visible={!!modal} transparent animationType="fade">
        <View style={styles.modalBack}>
          <View style={styles.modalBox}>
            <ScrollView>
              <Text style={styles.modalText}>{modal}</Text>
            </ScrollView>
            <Pressable style={styles.closeBtn} onPress={() => setModal(null)}>
              <Text style={styles.btnText}>{I18N.next[lang]}</Text>
            </Pressable>
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
});
