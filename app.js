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
  // Calm, continuous illustrative feed. A global mode keeps the hero and practice charts in sync.
  const chartFeeds = new Map();
  let chartMode = "candles";
  function makeFeed(id, seed, height, candleMode=false){
    const svg=$(id); if(!svg)return;
    let n=seed, rand=()=>{n=(n*16807)%2147483647;return (n-1)/2147483646;};
    const phase=seed*0.73;
    let value=100, points=[];
    for(let i=0;i<90;i++){value+=(rand()-.5)*.18;points.push(value);}
    const feed={id,svg,height,candleMode,mode:candleMode?chartMode:"line",points,current:100,target:100,phase,lastSample:0,lastFrame:0};
    chartFeeds.set(id,feed); renderFeed(feed);
  }
  function smoothPath(coords){
    if(!coords.length)return '';
    let d=`M ${coords[0][0]} ${coords[0][1]}`;
    for(let i=1;i<coords.length;i++){
      const prev=coords[i-1],cur=coords[i],mx=(prev[0]+cur[0])/2;
      d+=` Q ${mx} ${prev[1]} ${cur[0]} ${cur[1]}`;
    }
    return d;
  }
  function renderFeed(f){
    const width=760, h=f.height, vals=f.points;
    const min=Math.min(...vals)-1.2,max=Math.max(...vals)+1.2,span=max-min||1;
    const y=v=>h-((v-min)/span)*(h-18)-9;
    const grid=`<g stroke="#29282d" stroke-width="1"><path d="M0 ${h*.25}H${width} M0 ${h*.5}H${width} M0 ${h*.75}H${width}"/></g>`;
    let visual='';
    if(f.mode==='candles'){
      const group=4, candleWidth=5.4, total=Math.floor(vals.length/group);
      for(let c=0;c<total;c++){
        const a=vals.slice(c*group,(c+1)*group); if(a.length<2)continue;
        const open=a[0],close=a[a.length-1],high=Math.max(...a)+.10,low=Math.min(...a)-.10;
        const x=(c/(total-1||1))*width;
        const up=close>=open, color=up?'#20c997':'#ef626c';
        const top=y(Math.max(open,close)),bottom=y(Math.min(open,close));
        visual+=`<g stroke="${color}" fill="${color}" opacity=".94"><path d="M${x} ${y(high)}V${y(low)}" stroke-width="1.25"/><rect x="${x-candleWidth/2}" y="${top}" width="${candleWidth}" height="${Math.max(2,bottom-top)}" rx=".65"/></g>`;
      }
    } else {
      const coords=vals.map((v,i)=>[i/(vals.length-1)*width,y(v)]);
      const line=smoothPath(coords), area=`${line} L ${width} ${h} L 0 ${h} Z`;
      const fill=f.mode==='area'?`<path d="${area}" fill="url(#fill-${f.id})"/>`:'';
      visual=`<defs><linearGradient id="fill-${f.id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#d6ad55" stop-opacity=".30"/><stop offset="100%" stop-color="#d6ad55" stop-opacity=".015"/></linearGradient></defs>${fill}<path d="${line}" fill="none" stroke="#d6ad55" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    }
    const lastY=y(vals[vals.length-1]);
    f.svg.innerHTML=`${grid}${visual}<circle cx="${width-2}" cy="${lastY}" r="3" fill="#f2d58d" stroke="#d6ad55" stroke-width="1.5"/>`;
  }
  function setChartMode(mode){
    chartMode=mode;
    chartFeeds.forEach(f=>{if(f.candleMode){f.mode=mode;renderFeed(f);}});
    document.querySelectorAll('[data-chart-mode]').forEach(btn=>{
      const active=btn.dataset.chartMode===mode;
      btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));
    });
  }
  function priceScale(m){ return m.precision===5?0.00012:m.precision===3?0.012:m.symbol==="GOLD"?0.55:8; }
  function simulatedPrice(m,feed){ return m.price+(feed.current-100)*priceScale(m); }
  function animateFeeds(now){
    for(const f of chartFeeds.values()){
      // A bounded, time-based curve gives every feed the same smooth cadence: no random jumps or frozen target.
      f.current=100+Math.sin(now/3600+f.phase)*0.92+Math.sin(now/6900+f.phase*1.7)*0.48+Math.sin(now/1450+f.phase*.6)*0.09;
      if(now-f.lastSample>=90){f.lastSample=now;f.points.push(f.current);if(f.points.length>90)f.points.shift();}
      renderFeed(f);
    }
    const main=chartFeeds.get('hero-chart');
    if(main){const m=markets[0];$('hero-price').textContent=simulatedPrice(m,main).toFixed(m.precision);}
    const practice=chartFeeds.get('practice-chart');
    if(practice){const m=markets.find(x=>x.symbol===$('instrument-select').value)||markets[0];$('practice-price').textContent=simulatedPrice(m,practice).toLocaleString('en-US',{minimumFractionDigits:m.precision,maximumFractionDigits:m.precision});}
    markets.forEach((m,i)=>{const f=chartFeeds.get('spark-'+i),el=document.querySelector(`[data-market-price="${m.symbol}"]`);if(f&&el)el.textContent=simulatedPrice(m,f).toLocaleString('en-US',{minimumFractionDigits:m.precision,maximumFractionDigits:m.precision});});
    requestAnimationFrame(animateFeeds);
  }
  function drawChart(id,seed=7,height=210){makeFeed(id,seed,height,id==='hero-chart'||id==='practice-chart');}
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
  renderMarkets();renderLessons();setInstrument();updateUI();
  requestAnimationFrame(animateFeeds);
  if("serviceWorker" in navigator && location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}
})();