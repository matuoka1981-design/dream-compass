import { useState, useRef } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

var C = {bg:"#06080f",bgCard:"#0c1018",border:"#1e2a42",accent:"#f59e0b",accent2:"#3b82f6",accent3:"#10b981",accent4:"#f472b6",accent5:"#8b5cf6",accent6:"#ef4444",text:"#e8edf5",textMuted:"#8b95a8",textDim:"#5a6478",star:"#fcd34d"};
var PAL=["#f59e0b","#3b82f6","#10b981","#f472b6","#8b5cf6","#06b6d4","#f97316","#84cc16"];

function parseLineTalk(text){var lines=text.split("\n"),msgs=[],curDate=null;for(var i=0;i<lines.length;i++){var line=lines[i];var dm=line.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/)||line.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/);if(dm){curDate=dm[1]+"-"+(dm[2].length<2?"0":"")+dm[2]+"-"+(dm[3].length<2?"0":"")+dm[3];continue;}if(!curDate)continue;var m=line.match(/^(\d{1,2}):(\d{2})\t(.+?)\t([\s\S]+)/);if(m){msgs.push({date:curDate,hour:parseInt(m[1]),sender:m[3].trim(),text:m[4].trim()});continue;}m=line.match(/^(午前|午後)(\d{1,2}):(\d{2})\t(.+?)\t([\s\S]+)/);if(m){var h=parseInt(m[2]);if(m[1]==="午後"&&h!==12)h+=12;if(m[1]==="午前"&&h===12)h=0;msgs.push({date:curDate,hour:h,sender:m[4].trim(),text:m[5].trim()});}}return msgs;}

function getSenders(msgs){var s={};for(var i=0;i<msgs.length;i++)s[msgs[i].sender]=(s[msgs[i].sender]||0)+1;return s;}

function buildFullPrompt(msgs,user,goals){
  var senders=getSenders(msgs);var names=Object.keys(senders);var others=names.filter(function(n){return n!==user;});
  var step=Math.max(1,Math.floor(msgs.length/30));
  var sample=msgs.filter(function(_,idx){return idx%step===0;}).slice(0,30).map(function(m){return m.sender+": "+m.text.substring(0,50);}).join("\n");
  return "人間関係コンサルタントとして「"+user+"」のLINEトーク履歴を分析。純粋なJSONのみ返してください。マークダウンや説明文は不要。\n\n"+
    "目標:"+(goals||"未設定")+"\n人物:"+others.join(",")+"\nメッセージ数:"+JSON.stringify(senders)+"\n\n"+sample+
    '\n\n以下のJSON構造で返答（各テキスト30-60字以内）:\n'+
    '{"user_profile":{"personality_type":"性格","traits":["x5"],"style":"コミュスタイル","radar":{"積極性":70,"共感力":80,"ユーモア":60,"論理性":50,"繊細さ":70,"リーダーシップ":40}},'+
    '"people":[{"name":"名","type":"友人等","intimacy":70,"trust":60,"energy":30,"dynamics":"説明","role":"役割","topics":["話題"]}],'+
    '"compatibility":[{"a":"名","b":"名","score":75,"reason":"理由","potential":"予測"}],'+
    '"goal":{"summary":"要約","allies":[{"name":"名","why":"理由","action":"行動"}],"missing":[{"role":"役割","desc":"説明","find":"方法"}],"bridges":[{"from":"A","to":"B","why":"目的"}],"steps":["x3"]},'+
    '"team":{"members":[{"name":"名","team_role":"役割","why":"理由","strength":"貢献"}],"dynamics":"説明","gaps":[{"position":"名","priority":"high","desc":"説明"}],"steps":["x3"]},'+
    '"comms":[{"person":"名","approach":"アプローチ","dos":["x3"],"donts":["x2"],"timing":"タイミング","phrases":["x2"],"deepen":"コツ"}],'+
    '"invites":[{"person":"名","scene":"シーン","tone":"トーン","message":"メッセージ60-100字","when":"タイミング","followup":"フォロー文"}],'+
    '"roadmap":{"phases":[{"num":1,"title":"名","duration":"期間","goals":["x2"],"actions":[{"action":"内容","who":"人","outcome":"結果"}],"milestone":"マイル"}],"critical":"最重要パス","risks":["x2"],"metrics":["x3"]},'+
    '"insights":{"blindspots":["x2"],"health":"健康度","growth":"成長メッセージ","dream":"夢メッセージ"}}';
}

function repairJSON(text){
  var c=text.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
  var fb=c.indexOf("{");if(fb>0)c=c.substring(fb);if(fb<0)throw new Error("No JSON");
  try{return JSON.parse(c);}catch(e){}
  var lb=c.lastIndexOf("}");if(lb>0){try{return JSON.parse(c.substring(0,lb+1));}catch(e){}}
  var a=c.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}[\]]*$/,"").replace(/,\s*$/,"");
  var ob=0,oq=0,inS=false,esc=false;
  for(var j=0;j<a.length;j++){var ch=a[j];if(esc){esc=false;continue;}if(ch==="\\"){esc=true;continue;}if(ch==='"'){inS=!inS;continue;}if(inS)continue;if(ch==="{")ob++;if(ch==="}")ob--;if(ch==="[")oq++;if(ch==="]")oq--;}
  if(inS)a+='"';for(var q=0;q<oq;q++)a+="]";for(var b=0;b<ob;b++)a+="}";
  try{return JSON.parse(a);}catch(e){throw new Error("Repair failed");}
}

function Tag(props){return <span style={{display:"inline-block",padding:"3px 11px",borderRadius:14,background:(props.color||C.accent)+"18",color:props.color||C.accent,fontSize:11,fontWeight:500,marginRight:5,marginBottom:5}}>{props.children}</span>;}
function Ring(props){var size=props.size||56,score=props.score||0,color=props.color||C.accent,r=(size-8)/2,ci=2*Math.PI*r,off=ci-(score/100)*ci;return <div style={{textAlign:"center"}}><svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border+"60"} strokeWidth={4}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4} strokeDasharray={ci} strokeDashoffset={off} strokeLinecap="round"/></svg><div style={{marginTop:-size+8,height:size-8,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:size*0.28,fontWeight:800,color:color}}>{score}</span></div>{props.label&&<div style={{fontSize:10,color:C.textDim,marginTop:2}}>{props.label}</div>}</div>;}

function arr(x){return Array.isArray(x)?x:[];}
function str(x){return typeof x==="string"?x:"";}
function num(x){return typeof x==="number"?x:0;}
function obj(x){return x&&typeof x==="object"?x:{};}

// Chat component
function ChatMode(props){
  var ai=props.ai||{},user=props.user||"",goals=props.goals||"";
  var _m=useState([{role:"assistant",content:"こんにちは！分析結果をもとに何でも相談してください。\n\n例:\n・「○○さんをプロジェクトに誘いたい」\n・「チームを最適化するには？」\n・「優先順位を整理して」"}]);
  var msgs2=_m[0],setMsgs2=_m[1];
  var _i=useState(""),inp=_i[0],setInp=_i[1];
  var _ld=useState(false),ld=_ld[0],setLd=_ld[1];
  function send(){
    if(!inp.trim()||ld)return;var t=inp.trim();setInp("");
    setMsgs2(function(p){return p.concat([{role:"user",content:t}]);});setLd(true);
    var ctx="あなたは"+user+"専属の人間関係コンサルタント。性格="+(ai.user_profile?ai.user_profile.personality_type:"")+
      " 人物="+JSON.stringify(arr(ai.people).map(function(p){return p.name;}))+" 目標="+(goals||"");
    var apiMsgs=[{role:"user",content:ctx},{role:"assistant",content:"はい、アドバイスします。"}];
    msgs2.forEach(function(m){apiMsgs.push({role:m.role,content:m.content});});
    apiMsgs.push({role:"user",content:t});
    fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,messages:apiMsgs})
    }).then(function(r){return r.text();}).then(function(raw){
      var data=JSON.parse(raw);var txt="";if(data.content){for(var i=0;i<data.content.length;i++){if(data.content[i].type==="text")txt+=data.content[i].text;}}
      setMsgs2(function(p){return p.concat([{role:"assistant",content:txt||"エラーが発生しました"}]);});setLd(false);
    }).catch(function(){setMsgs2(function(p){return p.concat([{role:"assistant",content:"エラーが発生しました"}]);});setLd(false);});
  }
  return <div style={{display:"flex",flexDirection:"column",height:460,background:C.bgCard,border:"1px solid "+C.border,borderRadius:12,overflow:"hidden"}}>
    <div style={{padding:"10px 14px",borderBottom:"1px solid "+C.border,fontWeight:700,fontSize:13}}>🧭 AI相談モード</div>
    <div style={{flex:1,overflowY:"auto",padding:12}}>{msgs2.map(function(m,i){return <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:8}}>
      <div style={{maxWidth:"80%",padding:"8px 12px",borderRadius:10,background:m.role==="user"?C.accent2+"30":C.border+"40",fontSize:12,lineHeight:1.7,color:C.text,whiteSpace:"pre-wrap"}}>{m.content}</div></div>;})}
      {ld&&<div style={{color:C.textDim,fontSize:11,padding:6}}>考え中...</div>}</div>
    <div style={{padding:8,borderTop:"1px solid "+C.border,display:"flex",gap:6}}>
      <input value={inp} onChange={function(e){setInp(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")send();}}
        placeholder="相談内容..." style={{flex:1,padding:"8px 10px",borderRadius:6,border:"1px solid "+C.border,background:C.bg,color:C.text,fontSize:12,fontFamily:"inherit",outline:"none"}}/>
      <button onClick={send} style={{padding:"8px 14px",borderRadius:6,border:"none",background:C.accent,color:"#000",fontWeight:600,fontSize:12,cursor:"pointer"}}>送信</button>
    </div>
  </div>;
}

// ═══ MAIN ═══
export default function DreamCompass(){
  var _p=useState("start"),phase=_p[0],setPhase=_p[1];
  var _u=useState(""),user=_u[0],setUser=_u[1];
  var _g=useState(""),goals=_g[0],setGoals=_g[1];
  var _m=useState([]),msgs=_m[0],setMsgs=_m[1];
  var _f=useState([]),files=_f[0],setFiles=_f[1]; // {label,msgs,senders}
  var _r=useState(null),ai=_r[0],setAi=_r[1];
  var _e=useState(""),err=_e[0],setErr=_e[1];
  var _pr=useState(0),prog=_pr[0],setProg=_pr[1];
  var _t=useState("map"),tab=_t[0],setTab=_t[1];
  var fileRef=useRef();

  var allMsgs=[];files.forEach(function(f){allMsgs=allMsgs.concat(f.msgs);});
  var allNames={};files.forEach(function(f){var s=f.senders;for(var k in s)allNames[k]=(allNames[k]||0)+s[k];});
  var nameList=Object.keys(allNames);

  function addFile(file){
    var reader=new FileReader();
    reader.onload=function(e){
      var parsed=parseLineTalk(e.target.result);
      if(!parsed.length){setErr("メッセージが見つかりません");return;}
      var senders=getSenders(parsed);
      setFiles(function(p){return p.concat([{label:file.name,msgs:parsed,senders:senders}]);});
      setErr("");
      if(!user){var first=Object.keys(senders)[0];if(first)setUser(first);}
    };reader.readAsText(file);
  }

  function analyze(){
    setPhase("analyzing");setProg(10);setErr("");
    var prompt=buildFullPrompt(allMsgs,user,goals);
    fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:8000,messages:[{role:"user",content:prompt}]})
    }).then(function(res){setProg(60);return res.text();
    }).then(function(raw){
      setProg(70);
      var data=JSON.parse(raw);
      if(data.error)throw new Error(data.error.message||"API error");
      var text="";for(var i=0;i<(data.content||[]).length;i++){if(data.content[i].type==="text")text+=data.content[i].text;}
      if(!text||text.length<10)throw new Error("Empty response");
      setProg(85);
      var result=repairJSON(text);
      setProg(100);
      setAi(result);
      setPhase("results");
    }).catch(function(e){
      setErr("分析失敗: "+e.message);
      setPhase("goals");
    });
  }

  var card={background:C.bgCard,border:"1px solid "+C.border,borderRadius:12,padding:20,marginBottom:12};
  var btn=function(color,ghost){return{padding:"9px 22px",borderRadius:8,border:ghost?"1px solid "+(color||C.accent)+"40":"none",background:ghost?"transparent":(color||C.accent),color:ghost?(color||C.accent):"#000",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"};};
  var hd={fontSize:16,fontWeight:700,marginBottom:10};

  var tabs=[{id:"map",l:"🌌 マップ"},{id:"people",l:"👥 人物"},{id:"team",l:"⚡ チーム"},{id:"comms",l:"💬 コミュ"},{id:"invite",l:"✉️ 誘い方"},{id:"road",l:"🗺️ ロードマップ"},{id:"me",l:"🪞 自分"},{id:"chat",l:"🧭 相談"}];

  return <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Noto Sans JP',sans-serif"}}>
    <style>{"@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}"}</style>
    <div style={{maxWidth:820,margin:"0 auto",padding:"0 18px"}}>

    {/* Header */}
    <div style={{textAlign:"center",padding:"36px 0 20px"}}>
      <div style={{fontSize:11,color:C.accent,fontWeight:600,letterSpacing:3}}>★ DREAM COMPASS ★</div>
      <h1 style={{fontSize:28,fontWeight:800,background:"linear-gradient(135deg,"+C.star+","+C.accent+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:4}}>あなたの夢を叶える人間関係ナビ</h1>
    </div>

    {err&&<div style={Object.assign({},card,{borderColor:C.accent6,background:C.accent6+"10"})}><p style={{color:C.accent6,fontSize:12}}>⚠️ {err}</p></div>}

    {/* START */}
    {phase==="start"&&<div style={Object.assign({},card,{textAlign:"center",padding:36,maxWidth:420,margin:"0 auto"})}>
      <div style={{fontSize:36,marginBottom:10}}>🌟</div>
      <h2 style={{fontSize:18,fontWeight:700,marginBottom:12}}>LINEの表示名は？</h2>
      <div style={{display:"flex",gap:8,maxWidth:280,margin:"0 auto"}}>
        <input value={user} onChange={function(e){setUser(e.target.value);}} placeholder="例: たろう" onKeyDown={function(e){if(e.key==="Enter"&&user.trim())setPhase("upload");}}
          style={{flex:1,padding:"10px 12px",borderRadius:6,border:"1px solid "+C.border,background:C.bg,color:C.text,fontSize:14,fontFamily:"inherit",outline:"none"}}/>
        <button onClick={function(){if(user.trim())setPhase("upload");}} style={btn()}>次へ</button>
      </div>
    </div>}

    {/* UPLOAD */}
    {phase==="upload"&&<div>
      <div style={{border:"2px dashed "+C.border,borderRadius:12,padding:"28px 18px",textAlign:"center",cursor:"pointer"}}
        onClick={function(){fileRef.current.click();}}>
        <div style={{fontSize:28,marginBottom:4}}>📂</div>
        <p style={{fontWeight:600,fontSize:13}}>LINEトーク履歴を追加（.txt）</p>
        <input ref={fileRef} type="file" accept=".txt" multiple style={{display:"none"}} onChange={function(e){for(var i=0;i<e.target.files.length;i++)addFile(e.target.files[i]);}}/>
      </div>
      {files.length>0&&<div style={{marginTop:12}}>
        <p style={{fontSize:11,color:C.textMuted,marginBottom:6}}>{files.length}件 / {allMsgs.length}メッセージ</p>
        {files.map(function(f,i){var ot=Object.keys(f.senders).filter(function(n){return n!==user;});return <div key={i} style={Object.assign({},card,{padding:12,display:"flex",justifyContent:"space-between"})}>
          <div><div style={{fontWeight:600,fontSize:13}}>{ot.join(",")||f.label}</div><div style={{fontSize:10,color:C.textDim}}>{f.msgs.length}件</div></div>
          <button onClick={function(){setFiles(function(p){return p.filter(function(_,j){return j!==i;});});}} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer"}}>✕</button>
        </div>;})}
        {nameList.length>1&&<div style={Object.assign({},card,{padding:12})}>
          <div style={{fontSize:12,fontWeight:600,marginBottom:4}}>👤 あなたは？</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{nameList.map(function(n){return <button key={n} onClick={function(){setUser(n);}} style={btn(user===n?C.accent:C.border,user!==n)}>{n}</button>;})}</div>
        </div>}
      </div>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:6,marginTop:12,marginBottom:24}}>
        <button onClick={function(){setPhase("start");}} style={btn(C.textDim,true)}>← 戻る</button>
        <button onClick={function(){if(files.length&&user)setPhase("goals");}} style={btn()}>目標設定へ →</button>
      </div>
    </div>}

    {/* GOALS */}
    {phase==="goals"&&<div>
      <div style={Object.assign({},card,{padding:20})}>
        <div style={{fontSize:24,textAlign:"center",marginBottom:6}}>⭐</div>
        <h2 style={{fontSize:16,fontWeight:700,textAlign:"center",marginBottom:10}}>あなたの夢・目標</h2>
        <textarea value={goals} onChange={function(e){setGoals(e.target.value);}} placeholder="例: 起業したい / スキルアップ / 新しい人脈"
          style={{width:"100%",minHeight:90,background:C.bg,border:"1px solid "+C.border,borderRadius:6,padding:10,color:C.text,fontSize:13,fontFamily:"inherit",resize:"vertical",outline:"none"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:10,marginBottom:24}}>
        <button onClick={function(){setPhase("upload");}} style={btn(C.textDim,true)}>← 戻る</button>
        <button onClick={analyze} style={Object.assign({},btn(),{padding:"12px 28px",fontSize:14})}>🔮 AI分析を開始</button>
      </div>
    </div>}

    {/* ANALYZING */}
    {phase==="analyzing"&&<div style={Object.assign({},card,{textAlign:"center",padding:44})}>
      <div style={{fontSize:40,marginBottom:10}}>🔮</div>
      <h2 style={{fontSize:16,fontWeight:700,marginBottom:4}}>分析中...</h2>
      <div style={{maxWidth:280,margin:"10px auto"}}>
        <div style={{height:5,borderRadius:3,background:C.border+"60"}}>
          <div style={{height:"100%",borderRadius:3,width:prog+"%",background:"linear-gradient(90deg,"+C.accent+","+C.accent4+")",transition:"width 0.3s"}}/>
        </div>
        <div style={{color:C.textDim,fontSize:10,marginTop:3}}>{prog}%</div>
      </div>
    </div>}

    {/* ═══ RESULTS ═══ */}
    {phase==="results"&&ai&&<div>
      <div style={{display:"flex",gap:2,marginBottom:10,overflowX:"auto",background:C.bgCard,borderRadius:8,padding:2,border:"1px solid "+C.border}}>
        {tabs.map(function(t){return <button key={t.id} onClick={function(){setTab(t.id);}} style={{padding:"6px 8px",borderRadius:6,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:tab===t.id?600:400,whiteSpace:"nowrap",flex:"1 1 auto",background:tab===t.id?C.accent+"20":"transparent",color:tab===t.id?C.accent:C.textMuted}}>{t.l}</button>;})}
      </div>

      {/* MAP */}
      {tab==="map"&&<div>
        <div style={card}>
          <h3 style={hd}>🌌 人間関係マップ</h3>
          {(function(){
            var people=arr(ai.people);if(!people.length)return <p style={{color:C.textMuted,fontSize:12}}>データなし</p>;
            var w=520,h=320,cx=w/2,cy=h/2,count=people.length||1;
            return <svg viewBox={"0 0 "+w+" "+h} style={{width:"100%",maxHeight:320}}>
              <circle cx={cx} cy={cy} r={140} fill={C.accent+"08"}/>
              {people.map(function(p,i){var angle=(2*Math.PI*i)/count-Math.PI/2;var dist=80+(100-num(p.intimacy))*1;var px=cx+Math.cos(angle)*dist;var py=cy+Math.sin(angle)*dist;
                return <g key={i}><line x1={cx} y1={cy} x2={px} y2={py} stroke={PAL[i%PAL.length]+"40"} strokeWidth={1+num(p.intimacy)*0.015}/>
                  <circle cx={px} cy={py} r={12+num(p.intimacy)*0.08} fill={PAL[i%PAL.length]+"20"} stroke={PAL[i%PAL.length]} strokeWidth={1.5}/>
                  <text x={px} y={py+24} textAnchor="middle" fill={C.text} fontSize={10} fontFamily="sans-serif">{str(p.name)}</text></g>;})}
              <circle cx={cx} cy={cy} r={22} fill={C.accent+"20"} stroke={C.accent} strokeWidth={2.5}/>
              <text x={cx} y={cy+4} textAnchor="middle" fill={C.accent} fontSize={14}>★</text>
              <text x={cx} y={cy+36} textAnchor="middle" fill={C.text} fontSize={11} fontWeight="700" fontFamily="sans-serif">{user}</text>
            </svg>;
          })()}
        </div>
        {ai.insights&&<div style={Object.assign({},card,{textAlign:"center"})}>
          <p style={{fontSize:15,fontWeight:700,lineHeight:1.6}}>💫 {str(ai.insights.dream)}</p>
          <p style={{color:C.textMuted,fontSize:11,marginTop:4}}>{str(ai.insights.health)}</p>
        </div>}
      </div>}

      {/* PEOPLE */}
      {tab==="people"&&<div>{arr(ai.people).map(function(p,i){return <div key={i} style={Object.assign({},card,{padding:14})}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:26,height:26,borderRadius:"50%",background:PAL[i%PAL.length]+"25",border:"2px solid "+PAL[i%PAL.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:PAL[i%PAL.length]}}>{str(p.name)[0]||"?"}</div>
            <div><div style={{fontWeight:700,fontSize:13}}>{str(p.name)}</div><Tag color={PAL[i%PAL.length]}>{str(p.type)}</Tag></div>
          </div>
          <div style={{display:"flex",gap:6}}><Ring score={num(p.intimacy)} size={44} color={C.accent4} label="親密度"/><Ring score={num(p.trust)} size={44} color={C.accent2} label="信頼度"/></div>
        </div>
        <p style={{color:C.textMuted,fontSize:11,lineHeight:1.5}}>{str(p.dynamics)}</p>
        <div style={{fontSize:10,color:C.textDim,marginTop:4}}>役割: <span style={{color:C.accent3}}>{str(p.role)}</span> ・ エネルギー: <span style={{color:num(p.energy)>=0?C.accent3:C.accent6}}>{num(p.energy)>=0?"+":""}{num(p.energy)}</span></div>
      </div>;})}</div>}

      {/* TEAM */}
      {tab==="team"&&<div>
        {obj(ai.team).members&&<div style={card}>
          <h3 style={hd}>⚡ 理想のチーム</h3>
          <p style={{color:C.textMuted,fontSize:11,marginBottom:10}}>{str(obj(ai.team).dynamics)}</p>
          {arr(obj(ai.team).members).map(function(m,i){return <div key={i} style={{padding:10,marginBottom:6,borderRadius:6,background:PAL[i%PAL.length]+"08",borderLeft:"3px solid "+PAL[i%PAL.length]}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,color:PAL[i%PAL.length],fontSize:13}}>{str(m.name)}</span><Tag color={PAL[i%PAL.length]}>{str(m.team_role)}</Tag></div>
            <p style={{color:C.textMuted,fontSize:11,marginTop:2}}>{str(m.why)}</p>
            <p style={{color:C.accent3,fontSize:10,marginTop:2}}>💪 {str(m.strength)}</p>
          </div>;})}
        </div>}
        {arr(obj(ai.team).gaps).length>0&&<div style={card}>
          <h3 style={hd}>🔍 不足ポジション</h3>
          {arr(obj(ai.team).gaps).map(function(g,i){return <div key={i} style={{padding:8,marginBottom:4,borderRadius:6,background:C.bg+"60",border:"1px dashed "+C.accent6+"30"}}>
            <span style={{fontWeight:700,color:C.accent,fontSize:12}}>{str(g.position)}</span> <Tag color={str(g.priority)==="high"?C.accent6:C.accent}>{str(g.priority)}</Tag>
            <p style={{color:C.textMuted,fontSize:11,marginTop:2}}>{str(g.desc)}</p>
          </div>;})}
        </div>}
        {arr(obj(ai.team).steps).length>0&&<div style={card}>
          <h3 style={hd}>📋 結成ステップ</h3>
          {arr(obj(ai.team).steps).map(function(s,i){return <div key={i} style={{display:"flex",gap:8,marginBottom:6}}>
            <div style={{minWidth:22,height:22,borderRadius:"50%",background:C.accent,color:"#000",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>{i+1}</div>
            <p style={{fontSize:12,lineHeight:1.5}}>{s}</p></div>;})}
        </div>}
      </div>}

      {/* COMMS */}
      {tab==="comms"&&<div>{arr(ai.comms).map(function(cs,i){return <div key={i} style={Object.assign({},card,{padding:14})}>
        <div style={{fontWeight:700,fontSize:13,color:PAL[i%PAL.length],marginBottom:6}}>{str(cs.person)}</div>
        <div style={{padding:"6px 10px",borderRadius:5,background:C.accent2+"10",marginBottom:8,fontSize:12,color:C.accent2}}>🎯 {str(cs.approach)}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:6}}>
          <div><div style={{fontSize:10,color:C.accent3,fontWeight:600,marginBottom:3}}>✅ すべきこと</div>
            {arr(cs.dos).map(function(d,j){return <div key={j} style={{fontSize:11,color:C.textMuted,lineHeight:1.4,paddingLeft:6,borderLeft:"2px solid "+C.accent3+"30",marginBottom:2}}>{d}</div>;})}</div>
          <div><div style={{fontSize:10,color:C.accent6,fontWeight:600,marginBottom:3}}>❌ 避けること</div>
            {arr(cs.donts).map(function(d,j){return <div key={j} style={{fontSize:11,color:C.textMuted,lineHeight:1.4,paddingLeft:6,borderLeft:"2px solid "+C.accent6+"30",marginBottom:2}}>{d}</div>;})}</div>
        </div>
        <div style={{fontSize:10,color:C.textDim}}>⏰ {str(cs.timing)} ・ 💡 {str(cs.deepen)}</div>
        {arr(cs.phrases).length>0&&<div style={{marginTop:4,display:"flex",gap:3,flexWrap:"wrap"}}>{arr(cs.phrases).map(function(p,j){return <Tag key={j} color={C.accent5}>💬 {p}</Tag>;})}</div>}
      </div>;})}</div>}

      {/* INVITE */}
      {tab==="invite"&&<div>{arr(ai.invites).map(function(inv,i){return <div key={i} style={Object.assign({},card,{padding:14})}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontWeight:700,fontSize:13}}>{str(inv.person)}</span><Tag color={PAL[i%PAL.length]}>{str(inv.scene)}</Tag></div>
        <div style={{padding:10,borderRadius:6,background:C.bg+"80",border:"1px solid "+C.border,marginBottom:6,position:"relative"}}>
          <div style={{fontSize:9,color:C.accent,fontWeight:600,marginBottom:3}}>📱 テンプレート</div>
          <p style={{fontSize:12,lineHeight:1.6}}>{str(inv.message)}</p>
          <button onClick={function(){try{navigator.clipboard.writeText(str(inv.message));}catch(e){}}} style={{position:"absolute",top:6,right:6,background:C.accent+"20",border:"none",borderRadius:4,padding:"2px 6px",fontSize:9,color:C.accent,cursor:"pointer"}}>コピー</button>
        </div>
        <div style={{fontSize:10,color:C.accent3}}>⏰ {str(inv.when)}</div>
        {str(inv.followup)&&<div style={{marginTop:4,padding:"4px 8px",borderRadius:4,background:C.accent5+"08",fontSize:11,color:C.textMuted}}>🔄 {str(inv.followup)}</div>}
      </div>;})}</div>}

      {/* ROADMAP */}
      {tab==="road"&&ai.roadmap&&<div>
        <div style={card}>
          <h3 style={hd}>🗺️ ロードマップ</h3>
          <p style={{color:C.textMuted,fontSize:11,marginBottom:10}}>📍 {str(obj(ai.roadmap).critical)}</p>
          <div style={{paddingLeft:20,position:"relative"}}>
            <div style={{position:"absolute",left:8,top:0,bottom:0,width:2,background:C.accent+"30"}}/>
            {arr(obj(ai.roadmap).phases).map(function(ph,i){return <div key={i} style={{marginBottom:14,position:"relative"}}>
              <div style={{position:"absolute",left:-14,top:2,width:12,height:12,borderRadius:"50%",background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:800,color:"#000"}}>{num(ph.num)||i+1}</div>
              <div style={{padding:10,borderRadius:6,background:C.bgCard,border:"1px solid "+C.border}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontWeight:700,fontSize:12}}>{str(ph.title)}</span><Tag color={C.textMuted}>{str(ph.duration)}</Tag></div>
                {arr(ph.goals).map(function(g,j){return <div key={j} style={{fontSize:11,color:C.accent3}}>🎯 {g}</div>;})}
                {arr(ph.actions).map(function(a,j){return <div key={j} style={{padding:"3px 6px",marginTop:3,borderRadius:3,background:C.bg+"60",fontSize:11}}>
                  {str(a.action)} {str(a.who)&&<span style={{color:C.accent4}}>👤 {a.who}</span>}
                </div>;})}
                <div style={{marginTop:3,fontSize:10,color:C.accent}}>🏁 {str(ph.milestone)}</div>
              </div>
            </div>;})}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div style={card}><h4 style={{fontSize:12,fontWeight:600,marginBottom:4,color:C.accent6}}>⚠️ リスク</h4>{arr(obj(ai.roadmap).risks).map(function(r,i){return <p key={i} style={{fontSize:11,color:C.textMuted,lineHeight:1.4,marginBottom:3}}>{r}</p>;})}</div>
          <div style={card}><h4 style={{fontSize:12,fontWeight:600,marginBottom:4,color:C.accent3}}>📏 成功指標</h4>{arr(obj(ai.roadmap).metrics).map(function(m,i){return <p key={i} style={{fontSize:11,color:C.textMuted,lineHeight:1.4,marginBottom:3}}>{m}</p>;})}</div>
        </div>
      </div>}

      {/* ME */}
      {tab==="me"&&ai.user_profile&&<div>
        <div style={Object.assign({},card,{textAlign:"center"})}>
          <div style={{display:"inline-block",padding:"5px 18px",borderRadius:16,background:C.accent5+"20",border:"1px solid "+C.accent5+"30",fontSize:16,fontWeight:700}}>{str(obj(ai.user_profile).personality_type)}</div>
          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:3,marginTop:8}}>
            {arr(obj(ai.user_profile).traits).map(function(t,i){return <Tag key={i} color={PAL[i%PAL.length]}>{t}</Tag>;})}
          </div>
          <p style={{color:C.textMuted,fontSize:12,marginTop:8}}>{str(obj(ai.user_profile).style)}</p>
        </div>
        {obj(ai.user_profile).radar&&<div style={card}>
          <h3 style={hd}>📡 レーダー</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={Object.keys(obj(ai.user_profile).radar).map(function(k){return{subject:k,value:obj(ai.user_profile).radar[k]};})}>
              <PolarGrid stroke={C.border}/><PolarAngleAxis dataKey="subject" tick={{fill:C.textMuted,fontSize:10}}/><PolarRadiusAxis angle={30} domain={[0,100]} tick={false} axisLine={false}/>
              <Radar dataKey="value" stroke={C.accent} fill={C.accent} fillOpacity={0.2} strokeWidth={2}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>}
        {ai.insights&&<div style={card}>
          <h3 style={hd}>🫣 盲点</h3>
          {arr(obj(ai.insights).blindspots).map(function(b,i){return <div key={i} style={{padding:"6px 10px",marginBottom:4,borderRadius:4,background:C.accent6+"08",borderLeft:"2px solid "+C.accent6+"40",color:C.textMuted,fontSize:11}}>{b}</div>;})}
        </div>}
      </div>}

      {/* CHAT */}
      {tab==="chat"&&<ChatMode ai={ai} user={user} goals={goals}/>}

      <div style={{textAlign:"center",padding:"16px 0 36px",display:"flex",justifyContent:"center",gap:6}}>
        <button onClick={function(){setPhase("upload");setAi(null);setTab("map");}} style={btn(C.textDim,true)}>🔄 再分析</button>
        <button onClick={function(){setPhase("start");setFiles([]);setAi(null);setUser("");setGoals("");setTab("map");}} style={btn(C.textDim,true)}>最初から</button>
      </div>
    </div>}

    </div>
  </div>;
}
