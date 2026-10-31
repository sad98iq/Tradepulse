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
  const animatedCharts = new Map();
  function points(seed=7,count=65){let x=seed,arr=[];for(let i=0;i<count;i++){x=(x*9301+49297)%233280;arr.push(100+(x/233280)*45+(Math.sin(i/4)*10));}return arr;}
  function drawChart(id,seed=7,height=210){
    const svg=$(id); if(!svg)return;
    const vals=points(seed,65);
    animatedCharts.set(id,{svg,height,values:vals,current:vals[vals.length-1],from:vals[vals.length-1],target:vals[vals.length-1]+(Math.random()-.5)*12,started:performance.now(),duration:850});
    svg.innerHTML=`<defs><linearGradient id="goldFill${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#d6ad55" stop-opacity=".25"/><stop offset="100%" stop-color="#d6ad55" stop-opacity="0"/></linearGradient></defs><g stroke="#29282d" stroke-width="1"><path d="M0 ${height*.25}H760 M0 ${height*.5}H760 M0 ${height*.75}H760"/></g><path class="chart-area" fill="url(#goldFill${id})"/><path class="chart-line" fill="none" stroke="#d6ad55" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
  }
  function paintAnimatedChart(chart,now){
    let progress=Math.min(1,(now-chart.started)/chart.duration);
    const eased=progress*progress*(3-2*progress);
    chart.current=chart.from+(chart.target-chart.from)*eased;
    if(progress>=1){
      chart.values.push(chart.target);chart.values.shift();chart.from=chart.target;
      chart.target=chart.from+(Math.random()-.5)*13;chart.started=now;
      chart.duration=650+Math.random()*650;
    }
    const vals=chart.values.slice();vals[vals.length-1]=chart.current;
    const min=Math.min(...vals)-8,max=Math.max(...vals)+8;
    const xy=vals.map((v,i)=>[(i/(vals.length-1))*760,chart.height-((v-min)/(max-min))*chart.height]);
    let d=`M ${xy[0][0]} ${xy[0][1]}`;
    for(let i=1;i<xy.length;i++){const mx=(xy[i-1][0]+xy[i][0])/2;d+=` Q ${mx} ${xy[i-1][1]} ${mx} ${(xy[i-1][1]+xy[i][1])/2}`;}
    d+=` T ${xy[xy.length-1][0]} ${xy[xy.length-1][1]}`;
    chart.svg.querySelector('.chart-line').setAttribute('d',d);
    chart.svg.querySelector('.chart-area').setAttribute('d',`${d} L 760 ${chart.height} L 0 ${chart.height} Z`);
  }
  let lastFrame=0;
  function animateCharts(now){
    if(now-lastFrame>12){animatedCharts.forEach(chart=>paintAnimatedChart(chart,now));lastFrame=now;}
    requestAnimationFrame(animateCharts);
  }
  requestAnimationFrame(animateCharts);
  function updateSimulatedPrices(){
    markets.forEach((m,i)=>{
      const movement=(Math.random()-.49)*m.price*(i===4||i===5?.00018:.000035);
      m.price=Math.max(m.precision===5?.00001:.01,m.price+movement);
      m.up=movement>=0;m.change=(m.up?'+':'−')+(Math.abs(movement/m.price)*100).toFixed(2)+'%';
      const value=m.price.toLocaleString('en-US',{minimumFractionDigits:m.precision,maximumFractionDigits:m.precision});
      const card=document.querySelectorAll('.market-card')[i];if(card){const price=card.querySelector('.market-value');const change=card.querySelector('.market-foot span');if(price)price.textContent=value;if(change){change.textContent=m.change;change.className=m.up?'positive':'negative';}}
    });
    const hero=$('hero-price');if(hero)hero.textContent=markets[0].price.toFixed(5);
    const selected=markets.find(m=>m.symbol===$('instrument-select')?.value)||markets[0];
    const practice=$('practice-price');if(practice)practice.textContent=selected.price.toLocaleString('en-US',{minimumFractionDigits:selected.precision,maximumFractionDigits:selected.precision});
    setTimeout(updateSimulatedPrices,700);
  }
  setTimeout(updateSimulatedPrices,700);
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
    $("market-grid").innerHTML=markets.map((m,i)=>`<article class="panel market-card"><div class="market-card-top"><div><div class="market-symbol">${m.symbol}</div><div class="market-desc">${m.name}</div></div><span class="tag">DEMO</span></div><div class="market-value">${m.price.toLocaleString("en-US",{minimumFractionDigits:m.precision,maximumFractionDigits:m.precision})}</div><div class="market-foot"><span class="${m.up?"positive":"negative"}">${m.change}</span><small>Illustrative move</small></div><svg class="sparkline" viewBox="0 0 300 40" preserveAspectRatio="none" id="spark-${i}"></svg></article>`).join("");
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
    $("practice-pair").textContent=m.symbol.replace("/"," / "); $("practice-price").textContent=m.price.toLocaleString("en-US",{minimumFractionDigits:m.precision,maximumFractionDigits:m.precision});
    drawChart("practice-chart",markets.indexOf(m)+20,260);
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
  document.querySelectorAll("[data-amount]").forEach(b=>b.addEventListener("click",()=>$("stake-input").value=b.dataset.amount));
  $("modal-close").addEventListener("click",closeModal);
  $("modal").addEventListener("click",e=>{if(e.target===$("modal"))closeModal();});
  $("subscribe-plus").addEventListener("click",()=>subscribe("Plus"));
  $("subscribe-pro").addEventListener("click",()=>subscribe("Pro"));
  $("save-profile").addEventListener("click",()=>{const name=$("name-input").value.trim().slice(0,24);if(!name){notify("Enter a display name first.");return;}state.name=name;save();$("profile-feedback").textContent="Profile saved on this device.";notify("Profile updated.");});
  $("clear-data").addEventListener("click",()=>{if(confirm("Permanently clear all locally saved TradePulse practice data?")){localStorage.removeItem(KEY);state={...defaults};save();renderLessons();renderHistory();notify("Local data cleared.");}});
  $("export-data").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="tradepulse-practice-data.json";a.click();URL.revokeObjectURL(url);});
  $("hero-price").textContent=markets[0].price.toFixed(5);drawChart("hero-chart",8,210);drawChart("practice-chart",20,260);
  renderMarkets();renderLessons();setInstrument();updateUI();
  if("serviceWorker" in navigator && location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}
})();