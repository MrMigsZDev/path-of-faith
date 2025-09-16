import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

/**
 * Path of Faith – MVP (PT/EN)
 * - Monopoly-like board (40 tiles)
 * - Single-player for testing
 * - Dice roll, movement, simple tile effects
 */

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
};

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
    ptA: "Sadraque, Mesaque, Abednego",
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

// Compute coordinates for 40 tiles (10 per side)
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

export default function App() {
  const [lang, setLang] = useState<Lang>("pt");
  const [pos, setPos] = useState(0);
  const [faith, setFaith] = useState(3);
  const [skip, setSkip] = useState(0);
  const [modal, setModal] = useState<string | null>(null);

  const roll = () => Math.floor(Math.random() * 6) + 1;

  const onRoll = () => {
    if (skip > 0) {
      setSkip(skip - 1);
      setFaith((f) => f + 2); // Sabbath rest
      setModal(I18N.restMsg[lang]);
      return;
    }
    const r1 = roll();
    const r2 = roll();
    const steps = r1 + r2;
    const newPos = (pos + steps) % 40;
    setPos(newPos);
    resolveTile(newPos);
    setModal(`${I18N.rolled[lang]} ${steps}`);
  };

  function resolveTile(index: number) {
    const tile = TILES[index];
    switch (tile) {
      case "BENCAO": {
        const c = blessings[Math.floor(Math.random() * blessings.length)];
        if (typeof c.points === "number") setFaith((v) => v + c.points);
        if (typeof c.moveDelta === "number")
          setPos((p) => (p + c.moveDelta + 40) % 40);
        setModal(lang === "pt" ? c.pt : c.en);
        break;
      }
      case "OBSTACULO": {
        const c = obstacles[Math.floor(Math.random() * obstacles.length)];
        if (typeof c.points === "number") setFaith((v) => v + c.points);
        if (typeof c.moveDelta === "number")
          setPos((p) => (p + c.moveDelta + 40) % 40);
        setModal(lang === "pt" ? c.pt : c.en);
        break;
      }
      case "MISSAO": {
        const c = missions[Math.floor(Math.random() * missions.length)];
        if (typeof c.points === "number") setFaith((v) => v + c.points);
        setModal(lang === "pt" ? c.pt : c.en);
        break;
      }
      case "DIZIMO": {
        const c = tithes[0];
        if (typeof c.points === "number") setFaith((v) => v + c.points);
        setModal(lang === "pt" ? c.pt : c.en);
        break;
      }
      case "TENTACAO": {
        const c = temptations[0];
        if (typeof c.points === "number") setFaith((v) => v + c.points);
        setModal(lang === "pt" ? c.pt : c.en);
        break;
      }
      case "SABADO": {
        setSkip(1);
        setFaith((v) => v + 2);
        setModal(I18N.restMsg[lang]);
        break;
      }
      case "PERGUNTA": {
        const c = questions[Math.floor(Math.random() * questions.length)];
        setModal(
          `${lang === "pt" ? c.ptQ : c.enQ}\n\n(${I18N.question[lang]} ➜ ${
            lang === "pt" ? c.ptA : c.enA
          })\n(+1 ${I18N.faith[lang]})`
        );
        setFaith((v) => v + 1);
        break;
      }
      default:
        break;
    }
  }

  const board = useMemo(() => {
    const tiles = [];
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
          {pos === i && <View style={styles.token} />}
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
  }, [lang, pos]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{I18N.title[lang]}</Text>

      <View style={styles.hud}>
        <Text style={styles.hudText}>
          {I18N.pos[lang]}: {pos}
        </Text>
        <Text style={styles.hudText}>
          {I18N.faith[lang]}: {faith}
        </Text>
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
        <Text style={styles.btnText}>{I18N.roll[lang]}</Text>
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
    justifyContent: "space-around",
    alignItems: "center",
  },
  hudText: { fontSize: 16 },
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
  token: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#333",
    position: "absolute",
    bottom: 2,
    right: 2,
  },
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
});
