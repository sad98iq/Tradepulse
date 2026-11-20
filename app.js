(() => {
  "use strict";
  const KEY = "tradepulse_v2_state";
  const defaults = {balance:10000,history:[],lessons:[],name:"Trader",plan:"Starter"};
  let state = loadState();
  let activeRound = null;
  let toastTimer;
  const $ = (id) => document.getElementById(id);
  const markets = [
    {symbol:"EUR/USD",name:"Euro / US Dollar",price:1.08425,change:"+0.18%",up:true,precision:5},
    {symbol:"GBP/USD",name:"British Pound / US Dollar",price:1.27184,change:"−0.12%",up:false,precision:5},
    {symbol:"USD/JPY",name:"US Dollar / Japanese Yen",price:149.325,change:"+0.31%",up:true,precision:3},
    {symbol:"GOLD",name:"Gold (illustrative)",price:2342.65,change:"+0.42%",up:true,precision:2},
    {symbol:"BTC/USD",name:"Bitcoin / US Dollar",price:67420.5,change:"−0.76%",up:false,precision:2},
    {symbol:"ETH/USD",name:"Ether / US Dollar",price:3521.8,change:"+0.09%",up:true,precision:2}
  ];
  const lessons = [
    ["Market basics","Understand what a financial market is, why prices move, and the difference between an asset and a trading instrument.","A market brings buyers and sellers together. A quoted price is the level at which an instrument may be exchanged. Prices can change as expectations, supply, demand, and new information change. This lesson uses fictional examples; it does not provide a prediction or recommendation."],
    ["Reading a price chart","Learn what a chart shows and why one candle or short move cannot tell you what happens next.","A price chart is a visual record of past price observations. Candlesticks commonly show an opening, closing, high, and low price for a chosen period. Past movement is historical information, not a guarantee of future results."],
    ["Risk and position size","Explore why a practice amount should be considered before taking a simulated position.","Risk management starts by knowing what you can afford to lose. In this app, virtual credits are used only for practice. Real financial products can involve rapid losses, fees, leverage, and other risks."],
    ["Volatility","Recognise the difference between a calm market and one with larger price movements.","Volatility describes how much a price changes over time. A volatile instrument may move sharply in either direction. High volatility does not mean a move is more predictable."],
    ["Trading psychology","Notice how urgency, fear, and overconfidence can affect decisions.","A written practice plan can help you slow down and review decisions. Take breaks, avoid chasing losses, and do not treat a simulator result as proof of a repeatable edge."],
    ["Build a learning routine","Create a simple process for learning without risking real money.","Choose one concept, practise with a small virtual amount, record what you expected, then review what happened. Focus on the quality of your reasoning rather than the simulated outcome."]
  ];

  function loadState(){
    try { const saved = JSON.parse(localStorage.getItem(KEY) || "null"); return saved ? {...defaults,...saved} : {...defaults}; }
    catch { return {...defaults}; }
  }
  function save(){ localStorage.setItem(KEY, JSON.stringify(state)); updateUI(); }
  function money(n){ return "$" + Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function escapeHTML(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function notify(message){ const el=$("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2800); }
  function go(view){
    document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+view));
    document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
    $("page-name").textContent=view.replace("-"," ").toUpperCase();
    $("sidebar").classList.remove("open");
    if(view==="history") renderHistory();
    if(view==="markets") renderMarkets();
    if(view==="academy") renderLessons();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  const chartFeeds = new Map();
  const BAR_MS = 1800;
  const TICK_MS = 100;
  const VISIBLE_CANDLES = 30;
  const HISTORY_MS = BAR_MS * VISIBLE_CANDLES;
  const CANDLE_SHIFT_MS = 260;
  let chartMode = "candles";

  function unitNoise(index, phase) {
    const signal = Math.sin((index + phase * 17.31) * 12.9898 + phase * 78.233) * 43758.5453123;
    return signal - Math.floor(signal);
  }

  function boundaryPrice(barIndex, phase) {
    return 100
      + 0.58 * Math.sin(barIndex * 0.18 + phase)
      + 0.24 * Math.sin(barIndex * 0.061 + phase * 1.63)
      + (unitNoise(barIndex, phase) - 0.5) * 0.22;
  }

  function smoothProgress(progress) {
    return progress * progress * (3 - 2 * progress);
  }

  function candlePrice(barIndex, progress, phase) {
    const position = Math.max(0, Math.min(1, progress));
    const open = boundaryPrice(barIndex, phase);
    const close = boundaryPrice(barIndex + 1, phase);
    const intrabarMove = Math.sin(Math.PI * position) * (
      (unitNoise(barIndex * 3 + 1, phase) - 0.5) * 0.30 * Math.sin(position * Math.PI * 1.3)
      + (unitNoise(barIndex * 3 + 2, phase) - 0.5) * 0.16
    );
    return open + (close - open) * smoothProgress(position) + intrabarMove;
  }

  function valueAt(elapsed, phase) {
    const barIndex = Math.floor(elapsed / BAR_MS);
    const progress = (elapsed - barIndex * BAR_MS) / BAR_MS;
    return candlePrice(barIndex, progress, phase);
  }

  function candleData(barIndex, progress, phase) {
    const position = Math.max(0, Math.min(1, progress));
    const open = boundaryPrice(barIndex, phase);
    const close = candlePrice(barIndex, position, phase);
    let high = Math.max(open, close);
    let low = Math.min(open, close);
    const sampleCount = Math.max(6, Math.ceil(position * 12));

    for (let sample = 1; sample < sampleCount; sample++) {
      const price = candlePrice(barIndex, position * sample / sampleCount, phase);
      high = Math.max(high, price);
      low = Math.min(low, price);
    }

    const wick = 0.026 + unitNoise(barIndex * 5 + 4, phase) * 0.044;
    return {open, close, high: high + wick, low: low - wick};
  }

  function makeFeed(id, seed, height, candleMode) {
    const svg = $(id);
    const width = svg.viewBox.baseVal.width;
    svg.innerHTML = `
      <defs>
        <linearGradient id="fill-${id}" x1="0" x2="0" y1="0" y2="100%">
          <stop offset="0%" stop-color="#d6ad55" stop-opacity=".30"/>
          <stop offset="100%" stop-color="#d6ad55" stop-opacity=".015"/>
        </linearGradient>
      </defs>
      <path d="M0 ${height * .25}H${width} M0 ${height * .5}H${width} M0 ${height * .75}H${width}" stroke="#29282d" fill="none"/>
      <path fill="url(#fill-${id})"/>
      <path fill="none" stroke="#d6ad55" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      <path stroke="#20c997" fill="#20c997"/>
      <path stroke="#ef626c" fill="#ef626c"/>
      <path stroke="#d6ad55" stroke-opacity=".55" fill="none"/>
      <circle r="2.8" fill="#f2d58d" stroke="#d6ad55" stroke-width="1.3"/>
    `;
    const [, area, line, rising, falling, guide] = svg.querySelectorAll("path");
    const feed = {
      width, height, area, line, rising, falling, guide, marker: svg.querySelector("circle"),
      view: svg.closest(".view"), candleMode, mode: candleMode ? chartMode : "line",
      phase: seed * 0.73, started: performance.now(), lastRender: null,
    };
    chartFeeds.set(id, feed);
    renderFeed(feed, feed.started);
  }

  function candlePaths(elapsed, phase, right, step, y) {
    const activeStart = Math.floor(elapsed / BAR_MS) * BAR_MS;
    const activeProgress = (elapsed - activeStart) / BAR_MS;
    const shiftProgress = Math.min(1, activeProgress * BAR_MS / CANDLE_SHIFT_MS);
    const bodyWidth = Math.max(5, step * 0.56);
    let rising = "";
    let falling = "";

    for (let barIndex = activeStart / BAR_MS - VISIBLE_CANDLES + 1; barIndex <= activeStart / BAR_MS; barIndex++) {
      const distance = activeStart / BAR_MS - barIndex;
      const candle = candleData(barIndex, distance === 0 ? activeProgress : 1, phase);
      const movedSlots = distance === 0 ? 0 : distance - 1 + shiftProgress;
      const x = right - step * movedSlots;
      const top = y(Math.max(candle.open, candle.close));
      const bottom = y(Math.min(candle.open, candle.close));
      const bodyHeight = Math.max(1.5, bottom - top);
      const bodyTop = (bottom + top - bodyHeight) / 2;
      const path = `M${x.toFixed(2)} ${y(candle.high).toFixed(2)}V${y(candle.low).toFixed(2)}`
        + `M${(x - bodyWidth / 2).toFixed(2)} ${bodyTop.toFixed(2)}h${bodyWidth.toFixed(2)}v${bodyHeight.toFixed(2)}h-${bodyWidth.toFixed(2)}Z`;
      if (candle.close >= candle.open) rising += path;
      else falling += path;
    }

    return {rising, falling, activeX: right, bodyWidth};
  }

  function renderFeed(feed, now) {
    const elapsed = now - feed.started;
    const activeBar = Math.floor(elapsed / BAR_MS);
    const activeProgress = (elapsed - activeBar * BAR_MS) / BAR_MS;
    const step = feed.width / (VISIBLE_CANDLES + 0.55);
    const right = feed.width - step * 0.62;
    const current = candlePrice(activeBar, activeProgress, feed.phase);
    const first = valueAt(elapsed - HISTORY_MS, feed.phase);
    let low = Infinity;
    let high = -Infinity;
    const points = [];

    for (let barIndex = activeBar - VISIBLE_CANDLES + 1; barIndex <= activeBar; barIndex++) {
      const candle = candleData(barIndex, barIndex === activeBar ? activeProgress : 1, feed.phase);
      low = Math.min(low, candle.low);
      high = Math.max(high, candle.high);
    }

    for (let time = elapsed - HISTORY_MS + TICK_MS; time < elapsed; time += TICK_MS) {
      points.push([time, valueAt(time, feed.phase)]);
    }

    const targetLow = low - 0.08;
    const targetHigh = high + 0.08;
    const ease = feed.lastRender === null ? 1 : 1 - Math.exp(-(now - feed.lastRender) / 250);
    feed.low = feed.low === undefined ? targetLow : feed.low + (targetLow - feed.low) * ease;
    feed.high = feed.high === undefined ? targetHigh : feed.high + (targetHigh - feed.high) * ease;
    feed.lastRender = now;

    const padding = Math.min(9, feed.height * 0.14);
    const y = price => feed.height - padding
      - (price - feed.low) / (feed.high - feed.low) * (feed.height - 2 * padding);
    const currentY = y(current).toFixed(2);

    if (feed.mode === "candles") {
      const candles = candlePaths(elapsed, feed.phase, right, step, y);
      const markerX = Math.min(feed.width - 5, candles.activeX + candles.bodyWidth / 2 + 8);
      feed.guide.setAttribute("d", `M${(candles.activeX + candles.bodyWidth / 2).toFixed(2)} ${currentY}H${markerX.toFixed(2)}`);
      feed.rising.setAttribute("d", candles.rising);
      feed.falling.setAttribute("d", candles.falling);
      feed.marker.setAttribute("cx", markerX.toFixed(2));
    } else {
      const start = elapsed - HISTORY_MS;
      const lineRight = feed.width - 9;
      let line = `M0 ${y(first).toFixed(2)}`;
      for (const [time, price] of points) {
        const x = (time - start) / HISTORY_MS * lineRight;
        line += `L${x.toFixed(2)} ${y(price).toFixed(2)}`;
      }
      line += `L${lineRight} ${currentY}`;
      feed.line.setAttribute("d", line);
      if (feed.mode === "area") {
        feed.area.setAttribute("d", `${line}V${feed.height}H0Z`);
      }
      feed.marker.setAttribute("cx", lineRight);
    }
    feed.marker.setAttribute("cy", currentY);
  }

  function setChartMode(mode) {
    if (!["candles", "area", "line"].includes(mode)) return;
    chartMode = mode;
    const now = performance.now();
    for (const feed of chartFeeds.values()) {
      if (!feed.candleMode) continue;
      feed.mode = mode;
      feed.rising.style.display = feed.falling.style.display = feed.guide.style.display = mode === "candles" ? "" : "none";
      feed.line.style.display = mode === "candles" ? "none" : "";
      feed.area.style.display = mode === "area" ? "" : "none";
      renderFeed(feed, now);
    }
    document.querySelectorAll("[data-chart-mode]").forEach(button => {
      const selected = button.dataset.chartMode === mode;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function priceScale(m) { return m.precision === 5 ? 0.00012 : m.precision === 3 ? 0.012 : m.symbol === "GOLD" ? 0.55 : 8; }
  function simulatedPrice(m, feed, now = performance.now()) {
    return m.price + (valueAt(now - feed.started, feed.phase) - 100) * priceScale(m);
  }
  function animateFeeds(now) {
    for (const [id, feed] of chartFeeds) {
      if (!feed.view.classList.contains("active") || now <= feed.lastRender) continue;
      if (!feed.candleMode && now - feed.lastRender < 180) continue;
      renderFeed(feed, now);

      if (id === "hero-chart") {
        const market = markets[0];
        $("hero-price").textContent = simulatedPrice(market, feed, now).toFixed(market.precision);
      } else {
        const market = id === "practice-chart"
          ? markets.find(m => m.symbol === $("instrument-select").value) || markets[0]
          : markets[Number(id.slice("spark-".length))];
        const label = id === "practice-chart" ? $("practice-price")
          : document.querySelector(`[data-market-price="${market.symbol}"]`);
        label.textContent = simulatedPrice(market, feed, now).toLocaleString("en-US", {
          minimumFractionDigits: market.precision, maximumFractionDigits: market.precision,
        });
      }
    }
    requestAnimationFrame(animateFeeds);
  }

  function drawChart(id, seed, height) {
    makeFeed(id, seed, height, id === "hero-chart" || id === "practice-chart");
  }
  function updateUI(){
    $("balance-stat").textContent=money(state.balance); $("ticket-balance").textContent=money(state.balance);
    $("trades-stat").textContent=state.history.length;
    const wins=state.history.filter(t=>t.result==="WIN").length;
    $("winrate-stat").textContent=state.history.length?Math.round(wins/state.history.length*100)+"%":"—";
    $("progress-stat").textContent=Math.round(state.lessons.length/lessons.length*100)+"%";
    $("welcome-user").textContent=state.name; $("side-user").textContent=state.name;
    $("profile-name-display").textContent=state.name; $("name-input").value=state.name;
    renderRecent();
  }
  function tableHTML(rows){
    if(!rows.length)return `<div class="empty-state"><b>No practice rounds yet</b>Start a virtual round in the Practice room. Your activity will appear here.</div>`;
    return `<table class="data-table"><thead><tr><th>INSTRUMENT</th><th>DIRECTION</th><th>AMOUNT</th><th>RESULT</th><th>DATE</th></tr></thead><tbody>${rows.map(t=>`<tr><td><b>${escapeHTML(t.symbol)}</b></td><td>${t.direction}</td><td>${money(t.amount)}</td><td class="${t.result==="WIN"?"positive":"negative"}">${t.result} ${t.result==="WIN"?"+"+money(t.reward):"−"+money(t.amount)}</td><td>${new Date(t.date).toLocaleString()}</td></tr>`).join("")}</tbody></table>`;
  }
  function renderRecent(){ $("recent-table").innerHTML=tableHTML(state.history.slice(0,5)); }
  function renderHistory(){ $("history-table").innerHTML=tableHTML(state.history); }
  function renderMarkets(){
    $("market-grid").innerHTML=markets.map((m,i)=>`<article class="panel market-card market-card-select" role="button" tabindex="0" data-select-market="${m.symbol}" aria-label="Select ${m.symbol}"><div class="market-card-top"><div><div class="market-symbol">${m.symbol}</div><div class="market-desc">${m.name}</div></div><span class="tag">DEMO</span></div><div class="market-value" data-market-price="${m.symbol}">${m.price.toLocaleString("en-US",{minimumFractionDigits:m.precision,maximumFractionDigits:m.precision})}</div><div class="market-foot"><span class="${m.up?"positive":"negative"}">${m.change}</span><small>Illustrative move</small></div><svg class="sparkline" viewBox="0 0 300 40" preserveAspectRatio="none" id="spark-${i}"></svg></article>`).join("");
    markets.forEach((m,i)=>drawChart("spark-"+i,13+i,40));
  }
  function renderLessons(){
    $("lesson-grid").innerHTML=lessons.map((l,i)=>{const done=state.lessons.includes(i);return `<article class="panel lesson-card ${done?"completed":""}"><div class="lesson-number">${done?"✓":String(i+1).padStart(2,"0")}</div><h2>${l[0]}</h2><p>${l[1]}</p><button class="text-button" data-lesson="${i}">${done?"Review lesson →":"Open lesson →"}</button></article>`}).join("");
    document.querySelectorAll("[data-lesson]").forEach(b=>b.addEventListener("click",()=>openLesson(Number(b.dataset.lesson))));
  }
  function openLesson(i){
    const l=lessons[i]; $("modal-title").textContent=l[0]; $("modal-body").textContent=l[2];
    $("modal-action").textContent=state.lessons.includes(i)?"Completed — close":"Mark lesson complete";
    $("modal-action").disabled=state.lessons.includes(i);
    $("modal-action").onclick=()=>{if(!state.lessons.includes(i))state.lessons.push(i);save();renderLessons();closeModal();notify("Lesson marked complete.");};
    $("modal").classList.add("open"); $("modal").setAttribute("aria-hidden","false");
  }
  function closeModal(){ $("modal").classList.remove("open"); $("modal").setAttribute("aria-hidden","true"); }
  function setInstrument(){
    const symbol=$("instrument-select").value; const m=markets.find(x=>x.symbol===symbol)||markets[0];
    $("instrument-select").value=m.symbol;
    $("practice-pair").textContent=m.symbol.replace("/"," / ");
    const feed=chartFeeds.get('practice-chart');
    const price=feed?simulatedPrice(m,feed):m.price;
    $("practice-price").textContent=price.toLocaleString("en-US",{minimumFractionDigits:m.precision,maximumFractionDigits:m.precision});
    document.querySelectorAll('[data-select-market]').forEach(card=>card.classList.toggle('selected',card.dataset.selectMarket===m.symbol));
  }
  function startRound(direction){
    if(activeRound){notify("A practice round is already running.");return;}
    const amount=Number($("stake-input").value),duration=Number($("duration-select").value);
    if(!Number.isFinite(amount)||amount<1){notify("Enter a practice amount of at least $1.");return;}
    if(amount>state.balance){notify("Your virtual balance is too low for that amount.");return;}
    state.balance-=amount; save();
    const symbol=$("instrument-select").value; activeRound={direction,amount,duration,symbol,started:Date.now()};
    $("up-button").disabled=$("down-button").disabled=true;
    const end=Date.now()+duration*1000;
    const tick=()=>{
      if(!activeRound)return;
      const left=Math.max(0,Math.ceil((end-Date.now())/1000));
      $("round-status").innerHTML=`Round in progress<br><strong>${left}s</strong> remaining`;
      if(left<=0){clearInterval(activeRound.timer);finishRound(); }
    };
    activeRound.timer=setInterval(tick,250);tick();
    notify(`${direction} practice round started.`);
  }
  function finishRound(){
    const r=activeRound;if(!r)return;
    // Random outcome is intentionally a game mechanic, not a price prediction.
    const win=Math.random()>=.5;
    const reward=win?r.amount*1.8:0;
    if(win)state.balance+=reward;
    state.history.unshift({symbol:r.symbol,direction:r.direction,amount:r.amount,result:win?"WIN":"LOSS",reward,date:new Date().toISOString()});
    state.history=state.history.slice(0,100);
    activeRound=null;$("up-button").disabled=$("down-button").disabled=false;save();
    $("round-status").innerHTML=win?`<span class="positive">Practice result: WIN</span><br>Virtual return credited: ${money(reward)}`:`<span class="negative">Practice result: LOSS</span><br>Virtual amount used: ${money(r.amount)}`;
    notify(win?"You won this simulated round.":"This simulated round was a loss.");
  }
  function resetAccount(){
    if(!confirm("Reset virtual balance, practice history, and lesson progress?"))return;
    if(activeRound){clearInterval(activeRound.timer);activeRound=null;}
    state={...defaults};save();renderLessons();renderHistory();$("round-status").textContent="Ready when you are."; $("up-button").disabled=$("down-button").disabled=false;notify("Practice account reset.");
  }
  function subscribe(plan){
    const choice=plan==="Plus"?"$4.99/month":"$9.99/month";
    alert(`Demo selection: TradePulse ${plan} (${choice}).\n\nNo payment will be taken. To activate real M-Pesa and card subscriptions, connect approved payment providers and a secure backend as described in README.md.`);
    notify(`${plan} selected for integration preview.`);
  }
  document.addEventListener("click",e=>{
    const target=e.target.closest("[data-view]");if(target){e.preventDefault();go(target.dataset.view);}
  });
  $("mobile-menu").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
  $("reset-demo").addEventListener("click",resetAccount);
  $("up-button").addEventListener("click",()=>startRound("UP"));
  $("down-button").addEventListener("click",()=>startRound("DOWN"));
  const durationSelect=$("duration-select");
  function syncDurationPresets(){
    document.querySelectorAll("[data-duration-preset]").forEach(b=>{
      const selected=Number(b.dataset.durationPreset)===Number(durationSelect.value);
      b.classList.toggle("active",selected);
      b.setAttribute("aria-pressed",selected?"true":"false");
    });
  }
  document.querySelectorAll("[data-duration-preset]").forEach(b=>b.addEventListener("click",()=>{
    if(activeRound){notify("Wait for the current practice round to finish before changing its duration.");return;}
    durationSelect.value=b.dataset.durationPreset;syncDurationPresets();go("practice");
    notify(`Round duration set to ${b.textContent.trim()}.`);
  }));
  durationSelect.addEventListener("change",syncDurationPresets);
  $("instrument-select").addEventListener("change",setInstrument);
  $("market-grid").addEventListener("click",e=>{const card=e.target.closest('[data-select-market]');if(!card)return;$("instrument-select").value=card.dataset.selectMarket;setInstrument();go('practice');});
  $("market-grid").addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const card=e.target.closest('[data-select-market]');if(!card)return;e.preventDefault();$("instrument-select").value=card.dataset.selectMarket;setInstrument();go('practice');});
  document.querySelectorAll("[data-amount]").forEach(b=>b.addEventListener("click",()=>$("stake-input").value=b.dataset.amount));
  $("modal-close").addEventListener("click",closeModal);
  $("modal").addEventListener("click",e=>{if(e.target===$("modal"))closeModal();});
  $("subscribe-plus").addEventListener("click",()=>subscribe("Plus"));
  $("subscribe-pro").addEventListener("click",()=>subscribe("Pro"));
  $("save-profile").addEventListener("click",()=>{const name=$("name-input").value.trim().slice(0,24);if(!name){notify("Enter a display name first.");return;}state.name=name;save();$("profile-feedback").textContent="Profile saved on this device.";notify("Profile updated.");});
  $("clear-data").addEventListener("click",()=>{if(confirm("Permanently clear all locally saved TradePulse practice data?")){localStorage.removeItem(KEY);state={...defaults};save();renderLessons();renderHistory();notify("Local data cleared.");}});
  $("export-data").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="tradepulse-practice-data.json";a.click();URL.revokeObjectURL(url);});
  document.querySelectorAll('[data-chart-mode]').forEach(btn=>btn.addEventListener('click',()=>setChartMode(btn.dataset.chartMode)));
  $("hero-price").textContent=markets[0].price.toFixed(5);drawChart("hero-chart",8,210);drawChart("practice-chart",20,260);setChartMode(chartMode);
  renderMarkets();renderLessons();setInstrument();syncDurationPresets();updateUI();
  requestAnimationFrame(animateFeeds);
  if("serviceWorker" in navigator && location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}
})();
