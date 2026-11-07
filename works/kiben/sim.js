// 姫辯学園琴丘 試合シミュレーター(Discordボット版 hime_sim.py / hime_news.py をブラウザ用に移植)
(function (global) {
  "use strict";

  const TEAM = "姫辯学園琴丘";
  const MANAGER = "高嶋 等";
  const CAPTAIN = "橘 漁介";

  // [名前, 守備, 背番号, ミート, パワー, 走力]
  const LINEUP = [
    ["中島 おきや", "中", 8, 72, 45, 85],
    ["浦上 美守輝", "遊", 6, 84, 55, 80],
    ["鈍 周也", "二", 4, 70, 50, 65],
    ["浅野 県一", "投", 1, 78, 82, 60],
    ["堤 辰屋", "一", 3, 66, 78, 40],
    ["浦上 寿運児", "三", 5, 80, 74, 55],
    ["酒井 湊", "右", 9, 64, 55, 62],
    ["橘 漁介", "左", 7, 68, 50, 60],
    ["池田 壮真", "捕", 2, 60, 52, 45],
  ];

  // 名前: [背番号, 球威, 制球, スタミナ]
  const PITCHERS = {
    "浅野 県一": [1, 86, 78, 125],
    "榊原 悠斗": [10, 74, 72, 70],
    "位田 準兵": [11, 70, 76, 60],
  };

  const BENCH = [
    [10, "榊原 悠斗", "投"], [11, "位田 準兵", "投"], [12, "黒田 大雅", "内"], [13, "本多 陽翔", "内"],
    [14, "小寺 悠真", "内"], [15, "宮本 武瑠", "外"], [16, "井上 両汰", "外"], [17, "浦上 攻勢", "内"],
    [18, "井上 安授", "捕"],
  ];

  // 相手校: [打力, 投手力, 舞台, 球場]
  const OPPONENTS = {
    "報徳学園": [74, 76, "兵庫大会 準決勝", "ウイング姫路球場"],
    "神戸国際大付": [78, 80, "兵庫大会 決勝", "ウイング姫路球場"],
    "北海": [68, 70, "甲子園 1回戦", "阪神甲子園球場"],
    "興南": [72, 74, "甲子園 2回戦", "阪神甲子園球場"],
    "大阪桐蔭": [84, 84, "甲子園 3回戦", "阪神甲子園球場"],
    "智辯和歌山": [82, 78, "甲子園 準々決勝", "阪神甲子園球場"],
    "花巻東": [76, 78, "甲子園 準決勝", "阪神甲子園球場"],
    "横浜": [82, 82, "甲子園 決勝", "阪神甲子園球場"],
  };
  const TOURNAMENT = Object.keys(OPPONENTS);
  const SHORT_NAMES = { "神戸国際大付": "神戸国際", [TEAM]: "姫辯学園" };

  const KANSUJI = "〇一二三四五六七八九";
  function num(n) {
    if (n < 10) return KANSUJI[n];
    if (n < 20) return "十" + (n > 10 ? KANSUJI[n - 10] : "");
    return String(n);
  }

  function short(name) {
    const [family, given] = name.split(" ");
    return family === "浦上" || family === "井上" ? family + given : family;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ---- 1打席 ----
  function atBat(contact, power, stuff, control) {
    const edge = (contact - stuff) / 100;
    const pBB = Math.max(0.04, 0.10 - (control - 60) / 600);
    const pK = Math.max(0.10, 0.20 + (stuff - contact) / 250);
    const pHit = Math.max(0.13, Math.min(0.32, 0.205 + edge * 0.5));
    const pHR = Math.max(0.004, (power - 45) / 1500);
    const pXB = Math.max(0.025, power / 1300);
    let r = Math.random();
    if (r < pBB) return "四球"; r -= pBB;
    if (r < pK) return "三振"; r -= pK;
    if (r < pHR) return "本塁打"; r -= pHR;
    if (r < pXB) return Math.random() < 0.15 ? "三塁打" : "二塁打"; r -= pXB;
    if (r < pHit) return "単打";
    return pick(["ゴロ", "ゴロ", "フライ", "フライ", "ライナー"]);
  }

  function advance(bases, res, speed) {
    const [b1, b2, b3] = bases;
    const on = bases.filter(Boolean).length;
    if (res === "本塁打") return [[null, null, null], 1 + on];
    if (res === "三塁打") return [[null, null, "打"], on];
    if (res === "二塁打") {
      let runs = (b3 ? 1 : 0) + (b2 ? 1 : 0), n3 = null;
      if (b1) { if (Math.random() < 0.45) runs++; else n3 = b1; }
      return [[null, "打", n3], runs];
    }
    if (res === "単打") {
      let runs = b3 ? 1 : 0, n3 = null, n2 = null;
      if (b2) { if (Math.random() < 0.6) runs++; else n3 = b2; }
      if (b1) { if (n3 === null && Math.random() < 0.3 + speed / 400) n3 = b1; else n2 = b1; }
      return [["打", n2, n3], runs];
    }
    if (res === "四球") {
      if (b1 && b2 && b3) return [["打", b1, b2], 1];
      if (b1 && b2) return [["打", b1, b2], 0];
      if (b1) return [["打", b1, b3], 0];
      return [["打", b2, b3], 0];
    }
    return [bases, 0];
  }

  // ---- 試合 ----
  function playOnce(opponent) {
    const [oppBat, oppPitch, stage, stadium] = OPPONENTS[opponent];
    const g = {
      opponent, stage, stadium,
      kibenFirst: Math.random() < 0.5,
      line: { kiben: [], opp: [] }, hits: { kiben: 0, opp: 0 },
      batting: {}, highlights: [], pitchers: ["浅野 県一"], ks: {},
    };
    LINEUP.forEach(p => { g.batting[p[0]] = { ab: 0, h: 0, rbi: 0, hr: 0 }; });
    Object.keys(PITCHERS).forEach(p => { g.ks[p] = 0; });
    let order = 0, pitchCount = 0;

    function kibenHalf(inning, tiebreak, stopAfter) {
      let outs = 0, runs = 0;
      let bases = tiebreak ? ["走", "走", null] : [null, null, null];
      while (outs < 3 && (stopAfter === null || runs <= stopAfter)) {
        const [name, , , contact, power, speed] = LINEUP[order % 9];
        order++;
        const res = atBat(contact, power, oppPitch, 70);
        const st = g.batting[name];
        if (res !== "四球") st.ab++;
        if (["単打", "二塁打", "三塁打", "本塁打"].includes(res)) {
          st.h++; g.hits.kiben++;
          let scored; [bases, scored] = advance(bases, res, speed);
          st.rbi += scored; runs += scored;
          if (res === "本塁打") {
            st.hr++;
            const kind = scored === 1 ? "ソロ本塁打" : scored === 4 ? "満塁本塁打" : `${scored}ラン本塁打`;
            g.highlights.push([inning, "kiben", `${short(name)}が${kind}`]);
          } else if (scored) {
            const w = { "単打": "適時打", "二塁打": "適時二塁打", "三塁打": "適時三塁打" }[res];
            g.highlights.push([inning, "kiben", `${short(name)}の${w}で${scored}点`]);
          }
        } else if (res === "四球") {
          let scored; [bases, scored] = advance(bases, res, speed);
          st.rbi += scored; runs += scored;
          if (scored) g.highlights.push([inning, "kiben", `${short(name)}が押し出し四球を選び1点`]);
        } else {
          outs++;
          if (res === "フライ" && outs < 3 && bases[2] && Math.random() < 0.5) {
            bases[2] = null; runs++; st.rbi++;
            g.highlights.push([inning, "kiben", `${short(name)}の犠牲フライで1点`]);
          }
        }
      }
      return runs;
    }

    function oppHalf(inning, tiebreak, stopAfter) {
      let outs = 0, runs = 0;
      let bases = tiebreak ? ["走", "走", null] : [null, null, null];
      while (outs < 3 && (stopAfter === null || runs <= stopAfter)) {
        const cur = g.pitchers[g.pitchers.length - 1];
        if (pitchCount >= PITCHERS[cur][3]) {
          const next = ["榊原 悠斗", "位田 準兵"].find(p => !g.pitchers.includes(p));
          if (next) {
            g.pitchers.push(next); pitchCount = 0;
            g.highlights.push([inning, "change", `${short(next)}が${inning}回からマウンドへ`]);
          }
        }
        const pname = g.pitchers[g.pitchers.length - 1];
        const [, stuff, control] = PITCHERS[pname];
        pitchCount += 3 + Math.floor(Math.random() * 4);
        const res = atBat(oppBat, oppBat - 10, stuff, control);
        if (["単打", "二塁打", "三塁打", "本塁打"].includes(res)) {
          g.hits.opp++;
          let scored; [bases, scored] = advance(bases, res, 55);
          runs += scored;
          if (scored) g.highlights.push([inning, "opp", `${opponent}が${res === "本塁打" ? "本塁打" : "適時打"}で${scored}点`]);
        } else if (res === "四球") {
          let scored; [bases, scored] = advance(bases, res, 55);
          runs += scored;
        } else {
          outs++;
          if (res === "三振") g.ks[pname]++;
          if (res === "フライ" && outs < 3 && bases[2] && Math.random() < 0.5) {
            bases[2] = null; runs++;
            g.highlights.push([inning, "opp", `${opponent}が犠牲フライで1点`]);
          }
        }
      }
      return runs;
    }

    const sum = arr => arr.reduce((a, x) => a + (typeof x === "number" ? x : parseInt(x, 10) || 0), 0);
    let inning = 1;
    for (;;) {
      const tb = inning >= 10;
      if (g.kibenFirst) {
        g.line.kiben.push(kibenHalf(inning, tb, null));
        let k = sum(g.line.kiben), o = sum(g.line.opp);
        if (inning >= 9 && o > k) { g.line.opp.push("x"); break; }
        g.line.opp.push(oppHalf(inning, tb, inning >= 9 ? k - o : null));
        k = sum(g.line.kiben); o = sum(g.line.opp);
        if (inning >= 9 && k !== o) { if (o > k) g.line.opp[g.line.opp.length - 1] += "x"; break; }
      } else {
        g.line.opp.push(oppHalf(inning, tb, null));
        let k = sum(g.line.kiben), o = sum(g.line.opp);
        if (inning >= 9 && k > o) { g.line.kiben.push("x"); break; }
        g.line.kiben.push(kibenHalf(inning, tb, inning >= 9 ? o - k : null));
        k = sum(g.line.kiben); o = sum(g.line.opp);
        if (inning >= 9 && k !== o) { if (k > o) g.line.kiben[g.line.kiben.length - 1] += "x"; break; }
      }
      if (inning >= 15) break;
      inning++;
    }
    g.innings = inning;
    g.kibenRuns = sum(g.line.kiben);
    g.oppRuns = sum(g.line.opp);
    g.won = g.kibenRuns > g.oppRuns;
    const winSide = g.won ? "kiben" : "opp";
    g.walkoff = g.line[winSide].some(x => typeof x === "string" && x !== "x" && x.includes("x"));
    const scoreOf = ([, s]) => s.rbi * 3 + s.h * 2 + s.hr * 4;
    g.mvp = Object.entries(g.batting).reduce((a, b) => (scoreOf(b) > scoreOf(a) ? b : a));
    return g;
  }

  function playGame(opponent, mustWin) {
    let g;
    for (let i = 0; i < (mustWin ? 200 : 1); i++) {
      g = playOnce(opponent);
      if (!mustWin || g.won) break;
    }
    return g;
  }

  function playTournament(mustWin) {
    const games = [];
    for (const opp of TOURNAMENT) {
      const g = playGame(opp, mustWin);
      games.push(g);
      if (!g.won) break;
    }
    return games;
  }

  // ---- 記事 ----
  function headline(g) {
    const mvp = short(g.mvp[0]);
    if (g.won) {
      if (g.stage === "甲子園 決勝") return pick([`姫辯学園 悲願の全国制覇 ${mvp}躍動`, "琴丘の丘に大旗 姫辯、甲子園初優勝"]);
      if (g.stage === "兵庫大会 決勝") return pick([`姫辯 ${g.opponent}を破り甲子園へ 播磨の丘に歓喜`, `姫辯 ${g.opponent}との兵庫頂上決戦制す 甲子園へ`]);
      if (g.walkoff) return pick([`姫辯 劇的サヨナラ ${mvp}が決めた`, `白鷺の舞うサヨナラ劇 姫辯、${g.opponent}を下す`]);
      if (g.innings >= 10) return `姫辯 延長${num(g.innings)}回の死闘制す`;
      if (g.kibenRuns - g.oppRuns >= 6) return pick([`姫辯打線爆発 ${g.opponent}に大勝`, `${mvp}が火付け役 姫辯、${num(g.kibenRuns)}得点の猛攻`]);
      if (g.oppRuns === 0) return g.pitchers.length === 1 ? `浅野、魂の完封 姫辯が${g.opponent}を零封` : "姫辯投手陣 継投で完封リレー";
      return pick([`姫辯 ${g.opponent}を下し次戦へ ${mvp}が殊勲`, `粘りの姫辯 ${g.opponent}に競り勝つ`]);
    }
    if (g.walkoff) return `姫辯 無念のサヨナラ負け ${g.opponent}に屈す`;
    return pick([`姫辯 ${g.opponent}に惜敗 夏終わる`, `姫辯の夏、${g.stage.split(" ")[1]}で幕`]);
  }

  function article(g) {
    const paras = [];
    const inn = g.innings >= 10 ? `延長${num(g.innings)}回の末、` : "";
    let end = "敗れ、夏を終えた。";
    if (g.won) end = g.stage === "甲子園 決勝" ? "勝ち、悲願の全国制覇を成し遂げた。" : g.stage === "兵庫大会 決勝" ? "勝ち、甲子園への切符をつかんだ。" : "勝ち、次戦へ駒を進めた。";
    paras.push(`第百八回全国高校野球選手権${g.stage.startsWith("兵庫") ? "兵庫大会" : "大会"}は、${g.stadium}で${g.stage.split(" ")[1]}が行われ、${TEAM}(兵庫)は${g.opponent}と対戦。${inn}${num(g.kibenRuns)}―${num(g.oppRuns)}で${end}`);

    const kh = g.highlights.filter(h => h[1] === "kiben");
    const oh = g.highlights.filter(h => h[1] === "opp");
    const ch = g.highlights.filter(h => h[1] === "change");
    const body = [];
    if (kh.length) {
      const f = kh[0];
      const verb = f[2].endsWith("本塁打") ? "を放ち" : "を挙げ";
      const how = !oh.length || oh[0][0] >= f[0] ? "先制" : "反撃";
      body.push(`姫辯は${num(f[0])}回、${f[2]}${verb}${how}。`);
      if (kh.length > 1) body.push(`その後も${kh.slice(1, 3).map(h => `${num(h[0])}回に${h[2]}`).join("、")}と効果的に加点した。`);
    } else {
      body.push(`姫辯打線は${g.opponent}投手陣の前に${num(g.hits.kiben)}安打と沈黙した。`);
    }
    const [mName, m] = g.mvp;
    if (m.h >= 2 || m.rbi >= 2) body.push(`殊勲は${short(mName)}。${m.hr ? "本塁打を含む" : ""}${num(m.ab)}打数${num(m.h)}安打${m.rbi ? num(m.rbi) + "打点の大暴れだった。" : "と大当たりだった。"}`);
    const kAce = g.ks["浅野 県一"];
    if (g.pitchers.length === 1) {
      body.push(`エース浅野は${num(g.hits.opp)}安打${num(g.oppRuns)}失点、${num(kAce)}奪三振で完投。`);
    } else {
      const when = ch.length ? `${num(ch[0][0])}回から` : "終盤";
      body.push(`先発の浅野は${num(kAce)}三振${kAce >= 5 ? "を奪う力投" : "と粘りの投球"}。${when}${g.pitchers.slice(1).map(short).join("、")}がマウンドを引き継いだ。`);
    }
    if (!g.won) {
      const ol = g.line.opp.map(x => (x === "x" ? 0 : parseInt(x, 10) || 0));
      const mx = Math.max(...ol);
      if (mx > 0) body.push(`${num(ol.indexOf(mx) + 1)}回に${num(mx)}点を失ったのが痛かった。`);
    }
    paras.push(body.join(""));

    const mgr = g.won
      ? pick(["選手たちが尊女の遺志を胸に、最後まで粘ってくれた。", "一戦必勝。次も姫辯らしい野球をするだけです。", "スタンドの『アフリカン・シンフォニー』が背中を押してくれました。"])
      : pick(["選手は精一杯やった。この経験を後輩につないでほしい。", `${g.opponent}さんが一枚上でした。悔しさを糧にします。`]);
    const cap = g.won ? pick(["仲間を信じて戦えた。応援してくれた人に恩返しがしたい。", "校歌を歌えて最高です。まだ終わりじゃない。"]) : "このメンバーで野球ができて幸せでした。";
    return { headline: headline(g), paras, comments: [`${MANAGER}監督「${mgr}」`, `${CAPTAIN}主将「${cap}」`] };
  }

  global.Kiben = { TEAM, MANAGER, CAPTAIN, LINEUP, BENCH, OPPONENTS, TOURNAMENT, SHORT_NAMES, playGame, playTournament, article, short };
})(typeof window !== "undefined" ? window : globalThis);
