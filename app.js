/* JavaLab: interactive explanation of the verified Java assignment. */
(() => {
  'use strict';
  const D = window.LAB_DATA;
  if (!D) return;
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smallChart = window.matchMedia('(max-width: 780px)');
  const fmt = (n, decimals = 2) => Number(n).toFixed(decimals).replace('.', ',');
  const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const colors = {0:'#308768',1:'#b87526',2:'#7d73c4'};
  const tooltip = $('chart-tooltip');
  let activeCluster = 'all';
  let replayTimer;
  let toastTimer;

  function chartBase(width, height, dark = false) {
    const m = {left:58, right:23, top:25, bottom:51};
    const x = (v) => m.left + (v - .5) / 12 * (width - m.left - m.right);
    const y = (v) => height - m.bottom - (v - 35) / 60 * (height - m.top - m.bottom);
    const gridColor = dark ? '#a9c49824' : '#dfe5d9';
    const textColor = dark ? '#a7bca3' : '#788573';
    let content = '';
    for (let score = 40; score <= 90; score += 10) {
      content += `<line x1="${m.left}" x2="${width-m.right}" y1="${y(score)}" y2="${y(score)}" stroke="${gridColor}" stroke-dasharray="3 5"/><text x="${m.left-14}" y="${y(score)+4}" text-anchor="end" fill="${textColor}" font-size="11">${score}</text>`;
    }
    for (let hour = 1; hour <= 12; hour++) {
      content += `<line x1="${x(hour)}" x2="${x(hour)}" y1="${m.top}" y2="${height-m.bottom}" stroke="${gridColor}" stroke-dasharray="3 5"/><text x="${x(hour)}" y="${height-m.bottom+23}" text-anchor="middle" fill="${textColor}" font-size="11">${hour}</text>`;
    }
    content += `<text x="${(m.left+width-m.right)/2}" y="${height-7}" text-anchor="middle" fill="${textColor}" font-size="11">Аптасына дайындық сағаты</text><text transform="translate(17 ${(m.top+height-m.bottom)/2}) rotate(-90)" text-anchor="middle" fill="${textColor}" font-size="11">Балл</text>`;
    if (smallChart.matches) content = content.replaceAll('font-size="11"', 'font-size="14"');
    return {x, y, content, width, height};
  }

  // Points with identical coordinates remain at the true location; the tooltip lists all students there.
  const pointGroups = Array.from(D.students.reduce((map, s) => {
    const key = `${s.hours},${s.score}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
    return map;
  }, new Map()).values());

  function dots(chart, mode) {
    return pointGroups.map((students, index) => {
      const s = students[0];
      const interactive = mode !== 'hero';
      const fill = mode === 'regression' ? '#739b83' : colors[s.cluster];
      const radius = mode === 'hero' ? (students.length > 1 ? 6.5 : 5.5) : (students.length > 1 ? 7 : 5.5);
      const label = `${students.length > 1 ? 'Студенттер' : 'Студент'} ${students.map(v=>v.id).join(', ')}: ${s.hours} сағат, ${s.score} балл. ${D.clusters.find(c=>c.id===s.cluster).name}.`;
      return `<circle class="scatter-dot" cx="${chart.x(s.hours)}" cy="${chart.y(s.score)}" r="${radius}" fill="${fill}" data-point="${index}" data-cluster-id="${s.cluster}" style="--delay:${index*20}ms" ${interactive ? `tabindex="0" role="button" aria-label="${esc(label)}"` : ''}/>`;
    }).join('');
  }

  function renderHero() {
    const chart = chartBase(smallChart.matches ? 480 : 580, 360);
    $('hero-plot').innerHTML = `<svg viewBox="0 0 ${chart.width} ${chart.height}" role="img" aria-label="30 студент үш түсті топта: қолдау қажет, орташа және жоғары нәтиже">${chart.content}${dots(chart,'hero')}</svg>`;
  }

  let regressionChart;
  function renderRegression() {
    regressionChart = chartBase(smallChart.matches ? 480 : 620, 400, true);
    const {x,y,content} = regressionChart;
    const predict = (h) => D.regression.slope * h + D.regression.intercept;
    $('regression-plot').innerHTML = `<svg viewBox="0 0 ${regressionChart.width} 400" role="group" aria-label="Дайындық сағаты мен баллдың регрессия графигі">${content}${dots(regressionChart,'regression')}<line x1="${x(1)}" y1="${y(predict(1))}" x2="${x(12)}" y2="${y(predict(12))}" stroke="#d5ed93" stroke-width="2" opacity=".85"/><g id="prediction-marker"><line id="prediction-guide" stroke="#d5ed93" opacity=".5" stroke-dasharray="4 5"/><circle id="prediction-halo" r="15" fill="#d5ed9320"/><circle id="prediction-dot" r="7" fill="#d5ed93" stroke="#192f28" stroke-width="2"/><rect id="prediction-label-bg" width="73" height="26" rx="6" fill="#d5ed93"/><text id="prediction-label" text-anchor="middle" font-size="14" font-weight="600" fill="#192f28"></text></g></svg>`;
    attachPointEvents($('regression-plot'));
    updatePrediction();
  }

  function updatePrediction() {
    const h = Number($('hours').value);
    const score = D.regression.slope * h + D.regression.intercept;
    $('hours-output').textContent = fmt(h, Number.isInteger(h) ? 0 : 1);
    $('prediction-output').textContent = fmt(score);
    const px = regressionChart.x(h), py = regressionChart.y(score);
    ['prediction-dot','prediction-halo'].forEach(id=>{ $(id).setAttribute('cx',px); $(id).setAttribute('cy',py); });
    const guide = $('prediction-guide');
    guide.setAttribute('x1',px);guide.setAttribute('x2',px);guide.setAttribute('y1',py+9);guide.setAttribute('y2',regressionChart.y(35));
    const labelX = Math.min(regressionChart.width - 42, Math.max(42, px));
    $('prediction-label-bg').setAttribute('x',labelX-36.5);
    $('prediction-label-bg').setAttribute('y',py-42);
    $('prediction-label').setAttribute('x',labelX);
    $('prediction-label').setAttribute('y',py-24);
    $('prediction-label').textContent = fmt(score);
    $('hours').setAttribute('aria-valuetext',`${fmt(h, Number.isInteger(h)?0:1)} сағат, болжам ${fmt(score)} балл`);
  }

  function renderClusters() {
    const chart = chartBase(smallChart.matches ? 480 : 1050, 450);
    const centers = D.clusters.map(c=>`<g class="centroid" data-cluster-id="${c.id}" transform="translate(${chart.x(c.hours)} ${chart.y(c.score)})"><circle r="13" stroke="${colors[c.id]}"/><path d="M-6 0H6M0-6V6" stroke="${colors[c.id]}"/></g>`).join('');
    $('cluster-plot').innerHTML = `<svg viewBox="0 0 ${chart.width} 450" role="group" aria-label="K-Means: hours және score белгілері бойынша 3 кластер">${chart.content}${dots(chart,'clusters')}${centers}</svg>`;
    attachPointEvents($('cluster-plot'));
  }

  function tooltipFor(target, event) {
    if (target.classList.contains('dim')) return;
    const rows = pointGroups[Number(target.dataset.point)];
    if (!rows) return;
    const s = rows[0];
    const group = D.clusters.find(c=>c.id===s.cluster);
    tooltip.innerHTML = `<strong>${rows.length > 1 ? 'Студенттер' : 'Студент'} №${rows.map(r=>r.id).join(', ')}</strong>${s.hours} сағат · ${s.score} балл<br>${esc(group.name)} · кластер ${s.cluster}<br>${rows.map(r=>`№${r.id}: қатысу ${r.attendance}%, зертханалық ${r.labs}, ${r.result}`).join('<br>')}`;
    tooltip.hidden = false;
    const rect = target.getBoundingClientRect();
    const pointX = event && Number.isFinite(event.clientX) && event.type !== 'focusin' ? event.clientX : rect.left + rect.width/2;
    const pointY = event && Number.isFinite(event.clientY) && event.type !== 'focusin' ? event.clientY : rect.top;
    tooltip.style.left = `${Math.min(window.innerWidth-tooltip.offsetWidth-12, Math.max(12,pointX+16))}px`;
    tooltip.style.top = `${Math.min(window.innerHeight-tooltip.offsetHeight-12, Math.max(12,pointY-tooltip.offsetHeight-12))}px`;
  }

  function attachPointEvents(container) {
    if (container.dataset.eventsAttached) return;
    container.dataset.eventsAttached = 'true';
    ['pointerover','pointermove','focusin','click'].forEach(type=>container.addEventListener(type,event=>{
      const point = event.target.closest('[data-point]');
      if (point) tooltipFor(point,event);
    }));
    container.addEventListener('pointerout',event=>{if(event.target.closest('[data-point]')) tooltip.hidden=true;});
    container.addEventListener('focusout',()=>{tooltip.hidden=true;});
    container.addEventListener('keydown',event=>{
      if(event.key === 'Escape') tooltip.hidden=true;
      if(event.key==='Enter'||event.key===' '){const point=event.target.closest('[data-point]');if(point){event.preventDefault();tooltipFor(point);}}
    });
  }

  function filterClusters(value) {
    activeCluster = value;
    clearTimeout(replayTimer);
    $('cluster-plot').classList.remove('replaying');
    document.querySelectorAll('[data-cluster]').forEach(button=>{
      const active = button.dataset.cluster===value;
      button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
    });
    $('cluster-plot').querySelectorAll('[data-cluster-id]').forEach(point=>{
      const visible = value==='all'||point.dataset.clusterId===value;
      point.classList.toggle('dim',!visible);
      if(point.classList.contains('scatter-dot')) {
        point.setAttribute('tabindex',visible?'0':'-1');
        point.setAttribute('aria-hidden',String(!visible));
      }
    });
    const cluster = D.clusters.find(c=>String(c.id)===value);
    $('cluster-status').textContent = cluster ? `${cluster.size} студент · ${cluster.name} · кластер ${cluster.id}` : '30 студент · 3 кластер';
    tooltip.hidden=true;
  }

  function updateTree() {
    const hours = Number($('tree-hours').value), attendance=Number($('tree-attendance').value), labs=Number($('tree-labs').value);
    $('tree-hours-value').textContent=hours;$('tree-attendance-value').textContent=`${attendance}%`;$('tree-labs-value').textContent=labs;
    $('tree-svg').querySelectorAll('.active').forEach(el=>el.classList.remove('active'));
    const path=['node-hours'];
    let result, text;
    if(hours<=4){path.push('edge-low','leaf-low');result='no';text=`${hours} ≤ 4 сағат → no`;}
    else {
      path.push('edge-hours','node-attendance');
      if(attendance>59){path.push('edge-high','leaf-high');result='yes';text=`${hours} > 4 сағат → ${attendance}% > 59% → yes`;}
      else {
        path.push('edge-attendance','node-labs');
        if(labs<=8){path.push('edge-labs-low','leaf-labs-low');result='no';text=`${hours} > 4 → ${attendance}% ≤ 59% → ${labs} ≤ 8 жұмыс → no`;}
        else{path.push('edge-labs-high','leaf-labs-high');result='yes';text=`${hours} > 4 → ${attendance}% ≤ 59% → ${labs} > 8 жұмыс → yes`;}
      }
    }
    path.forEach(id=>$(id).classList.add('active'));
    $('tree-result-text').textContent=result==='yes'?'yes — тапсырады':'no — тапсырмайды';
    $('tree-result').classList.toggle('is-no',result==='no');
    $('tree-path-text').textContent=text;
  }

  function renderData(filter='all') {
    const rows=D.students.filter(s=>filter==='all'||s.result===filter);
    $('student-rows').innerHTML=rows.map(s=>`<tr><td>${s.id}</td><td>${s.hours}</td><td>${s.attendance}</td><td>${s.labs}</td><td>${s.score}</td><td><span class="badge ${s.result}">${s.result==='yes'?'yes · тапсырған':'no · тапсырмаған'}</span></td></tr>`).join('');
    $('data-count').textContent=`${rows.length} / 30 студент көрсетілді. Жеке есімдер қолданылмайды.`;
  }

  function highlight(code) {
    return code.split('\n').map(line=>{
      const tokens = /(\/\/.*$|"(?:[^"\\]|\\.)*"|\b(?:int|double|for|new|if|String|List)\b|\b\d+(?:\.\d+)?\b)/g;
      let output='', cursor=0;
      for(const match of line.matchAll(tokens)) {
        output+=esc(line.slice(cursor,match.index));
        const token=match[0];
        const cls=token.startsWith('//')?'comment':token.startsWith('"')?'string':/^\d/.test(token)?'number':'keyword';
        output+=`<span class="${cls}">${esc(token)}</span>`;
        cursor=match.index+token.length;
      }
      return output+esc(line.slice(cursor));
    }).join('\n');
  }

  let codeTab='data';
  function selectCode(key,focus=false) {
    codeTab=key;
    document.querySelectorAll('[data-code]').forEach(button=>{const active=button.dataset.code===key;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;if(active&&focus)button.focus();});
    $('code-panel').setAttribute('aria-labelledby',`tab-${key}`);
    $('code-content').innerHTML=highlight(D.snippets[key].code);
    $('code-description').textContent=D.snippets[key].description;
  }

  const explanations=[
    'Менің нұсқам — 10. 30 студенттің деректерін талдадым. Тапсырма бойынша 3 сағатқа балл болжадым, ал K-Means үшін k = 3 және hours пен score белгілерін таңдадым.',
    'Commons Math арқылы орташа балл 66,57 екенін таптым. Сағат пен баллдың корреляциясы 0,740. Регрессия формуласына 3 сағатты қойғанда, болжам 56,21 балл болды.',
    'Weka-дағы J48 ағашы hours, attendance және labs арқылы result мәнін болжайды. score алдын ала белгісіз болғандықтан алынды. 10-fold тексеруде 30 болжамның 25-і дұрыс, яғни дәлдік 83,3%.',
    'Smile кітапханасындағы K-Means студенттерді 3 топқа бөлді: қолдау қажет — 7, орташа — 11, жоғары нәтиже — 12 студент. Графиктің көлденең осі — сағат, тік осі — балл. Әр түс — бір кластер.'
  ];
  let step=0;
  function selectStep(value) {
    step=value;
    $('explain-text').textContent=explanations[step];
    $('explain-count').textContent=`0${step+1} / 04`;
    document.querySelectorAll('[data-step]').forEach(button=>{const active=Number(button.dataset.step)===step;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    if(!reducedMotion)$('explain-text').animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:300,easing:'ease-out'});
    $('next-explain').innerHTML=step===3?'Бірінші қадам <span aria-hidden="true">↺</span>':'Келесі қадам <span aria-hidden="true">→</span>';
  }

  function toast(text) {clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
  renderHero();renderRegression();renderClusters();renderData();updateTree();selectCode('data');selectStep(0);
  smallChart.addEventListener('change',()=>{renderHero();renderRegression();renderClusters();filterClusters(activeCluster);});
  $('hours').addEventListener('input',updatePrediction);
  $('reset-hours').addEventListener('click',()=>{$('hours').value=3;updatePrediction();});
  ['tree-hours','tree-attendance','tree-labs'].forEach(id=>$(id).addEventListener('input',updateTree));
  $('data-filter').addEventListener('change',event=>renderData(event.target.value));
  document.querySelectorAll('[data-cluster]').forEach(button=>button.addEventListener('click',()=>filterClusters(button.dataset.cluster)));
  $('replay-clusters').addEventListener('click',()=>{
    filterClusters('all');
    if(reducedMotion)return;
    void $('cluster-plot').offsetWidth;
    $('cluster-plot').classList.add('replaying');
    replayTimer=setTimeout(()=>$('cluster-plot').classList.remove('replaying'),1500);
  });
  document.querySelectorAll('[data-code]').forEach(button=>button.addEventListener('click',()=>selectCode(button.dataset.code)));
  document.querySelector('.code-options').addEventListener('keydown',event=>{
    const keys=Object.keys(D.snippets);let index=keys.indexOf(codeTab);
    if(['ArrowDown','ArrowRight'].includes(event.key))index=(index+1)%keys.length;
    else if(['ArrowUp','ArrowLeft'].includes(event.key))index=(index+keys.length-1)%keys.length;
    else if(event.key==='Home')index=0;else if(event.key==='End')index=keys.length-1;else return;
    event.preventDefault();selectCode(keys[index],true);
  });
  $('copy-code').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(D.snippets[codeTab].code);toast('Код үзіндісі көшірілді.');}
    catch{const range=document.createRange();range.selectNodeContents($('code-content'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);toast('Код белгіленді. Көшіру үшін Ctrl+C бас.');}
  });
  document.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>selectStep(Number(button.dataset.step))));
  $('next-explain').addEventListener('click',()=>selectStep((step+1)%explanations.length));
  window.addEventListener('scroll',()=>{
    const max=document.documentElement.scrollHeight-window.innerHeight;
    $('reading-progress').style.width=`${max>0?(window.scrollY/max)*100:0}%`;
    tooltip.hidden=true;
  },{passive:true});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')tooltip.hidden=true;});
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('[data-point]'))tooltip.hidden=true;});

  function animateCount(element) {
    const target=Number(element.dataset.count), digits=Number(element.dataset.digits||0);
    if(reducedMotion){element.textContent=fmt(target,digits);return;}
    const start=performance.now();
    function frame(now){const progress=Math.min(1,(now-start)/950);element.textContent=fmt(target*(1-Math.pow(1-progress,3)),digits);if(progress<1)requestAnimationFrame(frame);}
    requestAnimationFrame(frame);
  }
  if('IntersectionObserver' in window){
    document.documentElement.classList.add('js-enabled');
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      entry.target.classList.add('visible');
      entry.target.querySelectorAll('[data-count]').forEach(animateCount);
      observer.unobserve(entry.target);
    }),{threshold:.08});
    document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
  }
})();
