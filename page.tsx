"use client";
import { FormEvent,useEffect,useState } from "react";
import type { InputHTMLAttributes } from "react";

type Part="전체"|"소프라노"|"알토"|"테너"|"베이스";
type Confidence="확실"|"확인 필요"|"사용 금지";
type Candidate={title:string;description:string;channel:string;channelId:string;videoId:string;thumbnail:string};
type Result=Candidate&{part:Part;score:number;confidence:Confidence;reasons:string[]};

const parts:Part[]=["전체","소프라노","알토","테너","베이스"];
const partSearch:Record<Part,string>={전체:"전체 합창 SATB",소프라노:"소프라노 soprano",알토:"알토 alto",테너:"테너 tenor",베이스:"베이스 bass"};
const partWords:Record<Part,string[]>={
 전체:["전체","합창","full","satb","all parts","4부"],
 소프라노:["소프라노","soprano"],
 알토:["알토","alto"],
 테너:["테너","tenor"],
 베이스:["베이스","bass"]
};

function nextSunday(){const d=new Date();d.setDate(d.getDate()+((7-d.getDay())%7||7));return `${d.getMonth()+1}/${d.getDate()}`;}
function clean(s:string){return s.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"');}
function normalize(s:string){return clean(s).normalize("NFKC").toLowerCase().replace(/[\s'"“”‘’.,!?·:;()[\]{}_\-–—&/]/g,"");}
function hasWord(text:string,word:string){const lower=text.toLowerCase();if(/^[a-z ]+$/.test(word))return new RegExp(`\\b${word.replace(" ","\\s+")}\\b`,"i").test(lower);return lower.includes(word);}
function hasPart(text:string,part:Part){return partWords[part].some(word=>hasWord(text,word));}
function scoreCandidate(item:Candidate,part:Part,song:string,publisher:string,book:string,channelParts:Map<string,Set<Part>>){
 const searchable=`${item.title} ${item.description}`;
 const normalized=normalize(searchable);const songNorm=normalize(song);const bookNorm=normalize(book);const publisherNorm=normalize(publisher);
 let score=0;const reasons:string[]=[];
 if(songNorm&&normalized.includes(songNorm)){score+=45;reasons.push("곡명 일치");}else{score-=35;reasons.push("곡명 불확실");}
 const specificParts=parts.slice(1) as Part[];
 if(part==="전체"){
  if(hasPart(searchable,"전체")){score+=25;reasons.push("전체 합창 표시");}
  else if(!specificParts.some(p=>hasPart(searchable,p))){score+=15;reasons.push("특정 파트 표기 없음");}
  else{score-=50;reasons.push("특정 파트 영상");}
 }else{
  if(hasPart(searchable,part)){score+=25;reasons.push(`${part} 표시`);}else{score-=35;reasons.push("파트 불확실");}
  if(specificParts.some(p=>p!==part&&hasPart(searchable,p))){score-=45;reasons.push("다른 파트 표기");}
 }
 if(bookNorm&&normalized.includes(bookNorm)){score+=15;reasons.push("성가곡집 일치");}
 if(publisherNorm&&normalized.includes(publisherNorm)){score+=10;reasons.push("출판사 일치");}
 if((channelParts.get(item.channelId)?.size??0)>=3){score+=10;reasons.push("파트 영상 묶음 확인");}
 const finalScore=Math.max(0,Math.min(100,score));
 const confidence:Confidence=finalScore>=80?"확실":finalScore>=60?"확인 필요":"사용 금지";
 return {score:finalScore,confidence,reasons};
}
function ClearableInput({value,onClear,...props}:InputHTMLAttributes<HTMLInputElement>&{value:string;onClear:()=>void}){return <span className="field-wrap"><input {...props} value={value}/>{value&&<button type="button" className="clear-input" onClick={onClear} aria-label="입력 내용 지우기">×</button>}</span>}

export default function Home(){
 const [choir,setChoir]=useState("예루살렘");const [date,setDate]=useState(nextSunday());const [publisher,setPublisher]=useState("중앙아트");const [book,setBook]=useState("중앙성가31");const [song,setSong]=useState("이 세상에 근심된 일이 많고");const [page,setPage]=useState("132");
 const [apiKey,setApiKey]=useState("");const [showSettings,setShowSettings]=useState(false);const [results,setResults]=useState<Result[]>([]);const [loading,setLoading]=useState(false);const [error,setError]=useState("");const [copied,setCopied]=useState<"choir"|"caption"|"">("");const [hasSearched,setHasSearched]=useState(false);
 useEffect(()=>setApiKey(localStorage.getItem("youtube-api-key")??""),[]);
 function saveKey(){localStorage.setItem("youtube-api-key",apiKey.trim());setShowSettings(false);setError("");}
 async function fetchCandidates(query:string){
  const params=new URLSearchParams({part:"snippet",q:query,type:"video",maxResults:"15",relevanceLanguage:"ko",regionCode:"KR",key:apiKey.trim()});
  const res=await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);const data=await res.json();
  if(!res.ok)throw new Error(data?.error?.message||"검색에 실패했습니다.");
  return (data.items??[]).map((x:{snippet:{title:string;description:string;channelTitle:string;channelId:string;thumbnails?:{medium?:{url:string};default?:{url:string}}};id:{videoId:string}}):Candidate=>({
   title:clean(x.snippet.title),description:clean(x.snippet.description||""),channel:clean(x.snippet.channelTitle),channelId:x.snippet.channelId,videoId:x.id.videoId,thumbnail:x.snippet.thumbnails?.medium?.url||x.snippet.thumbnails?.default?.url||""
  }));
 }
 async function search(e:FormEvent){
  e.preventDefault();if(!song.trim()){setError("찬양곡 제목을 입력해 주세요.");return}if(!apiKey.trim()){setShowSettings(true);setError("처음 한 번만 YouTube API 키를 입력해 주세요.");return}
  setLoading(true);setError("");setHasSearched(false);setResults([]);
  try{
   const base=`${publisher} ${book} "${song}"`.trim();
   const batches=await Promise.all(parts.map(part=>fetchCandidates(`${base} ${partSearch[part]}`)));
   const unique=new Map<string,Candidate>();batches.flat().forEach(item=>unique.set(item.videoId,item));const candidates=[...unique.values()];
   const channelParts=new Map<string,Set<Part>>();
   for(const item of candidates){if(!normalize(`${item.title} ${item.description}`).includes(normalize(song)))continue;const found=new Set<Part>();for(const p of parts){if(hasPart(`${item.title} ${item.description}`,p))found.add(p);}if(!channelParts.has(item.channelId))channelParts.set(item.channelId,new Set());found.forEach(p=>channelParts.get(item.channelId)?.add(p));}
   const used=new Set<string>();const selected:Result[]=[];
   for(const part of parts){
    const ranked=candidates.map(item=>({...item,part,...scoreCandidate(item,part,song,publisher,book,channelParts)})).filter(item=>!used.has(item.videoId)).sort((a,b)=>b.score-a.score);
    const best=ranked[0];if(best&&best.score>=40){selected.push(best);used.add(best.videoId);}
   }
   setResults(selected);setHasSearched(true);
  }catch(err){setError(err instanceof Error?err.message:"검색에 실패했습니다.");setHasSearched(true);}finally{setLoading(false);}
 }
 const confirmed=results.filter(r=>r.confidence==="확실");const choirReady=hasSearched&&parts.every(part=>confirmed.some(r=>r.part===part));const fullVideo=confirmed.find(r=>r.part==="전체");const captionReady=hasSearched&&Boolean(fullVideo);
 const heading=`다음 주(${date}) 찬양곡은 ${book}, "${song}"${page?` (${page} 페이지)`:""}입니다.`;
 const choirText=choirReady?heading+"\n"+parts.map(part=>{const r=confirmed.find(x=>x.part===part);return `\n${part}\nhttps://youtu.be/${r?.videoId}`;}).join("\n"):"⚠️ 공유 보류: 정확도가 낮거나 확인되지 않은 파트 영상이 있습니다.";
 const captionText=captionReady?`${choir.trim()?`${choir.trim()} `:""}${heading}\nhttps://youtu.be/${fullVideo?.videoId}`:"⚠️ 공유 보류: 전체 합창 영상을 정확하게 확인하지 못했습니다.";
 async function copyMessage(kind:"choir"|"caption"){if((kind==="choir"&&!choirReady)||(kind==="caption"&&!captionReady))return;await navigator.clipboard.writeText(kind==="choir"?choirText:captionText);setCopied(kind);setTimeout(()=>setCopied(""),1800);}
 return <main><header className="topbar"><a className="brand" href="#top"><img className="brand-icon" src="/app-icon.png" alt=""/> 찬양링크</a><button className="settings-button" onClick={()=>setShowSettings(!showSettings)}>⚙ 설정</button></header>
  <section className="search-section" id="top"><div className="eyebrow">CHOIR PRACTICE LINK FINDER</div><h1>찬양곡 하나로<br/><em>파트별 연습 영상</em>을 찾습니다.</h1><p className="intro">영상의 곡명과 파트를 검증해, 안전하게 공유할 수 있는 링크만 정리합니다.</p>
   <form className="choir-form" onSubmit={search}><label>찬양대<ClearableInput value={choir} onChange={e=>setChoir(e.target.value)} onClear={()=>setChoir("")} placeholder="예루살렘"/></label><label>날짜<ClearableInput value={date} onChange={e=>setDate(e.target.value)} onClear={()=>setDate("")} placeholder="8/30" inputMode="numeric"/></label><label>출판사<ClearableInput value={publisher} onChange={e=>setPublisher(e.target.value)} onClear={()=>setPublisher("")} placeholder="중앙아트"/></label><label>성가곡집<ClearableInput value={book} onChange={e=>setBook(e.target.value)} onClear={()=>setBook("")} placeholder="중앙성가31"/></label><label className="song-field">찬양곡 제목<ClearableInput value={song} onChange={e=>setSong(e.target.value)} onClear={()=>setSong("")} placeholder="주 내게 오셔서"/></label><label>페이지<ClearableInput value={page} onChange={e=>setPage(e.target.value)} onClear={()=>setPage("")} inputMode="numeric" placeholder="123"/></label><button disabled={loading}>{loading?"영상 검증 중…":"연습 영상 찾기"}</button></form>
   {error&&<p className="error">{error}</p>}{showSettings&&<div className="settings-panel"><div><strong>YouTube API 키</strong><small>처음 한 번만 입력하면 이 기기에 저장됩니다.</small></div><ClearableInput type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} onClear={()=>setApiKey("")} placeholder="AIza…"/><button onClick={saveKey}>저장</button><a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noreferrer">API 키 만들기</a></div>}
  </section>
  <section className="results-section"><div className="section-title"><div><span>검색 결과</span><h2>{song||"찬양곡"} 파트 연습</h2></div><p>{confirmed.length}/5개 영상이 공유 가능합니다</p></div>
   {hasSearched&&<div className={`safety-banner ${choirReady?"safe":"warn"}`}><strong>{choirReady?"✓ 찬양대용 공유 가능":"⚠ 찬양대용 공유 보류"}</strong><span>{choirReady?"다섯 파트가 모두 높은 신뢰도로 확인되었습니다.":"확인 필요 영상은 공지문에 포함되지 않으며 복사 버튼도 잠깁니다."}</span></div>}
   <div className="part-list">{parts.map((part,index)=>{const r=results.find(x=>x.part===part);return <article className="part-row" key={part}><div className="part-number">0{index+1}</div><div className="part-name">{part}</div>{r?<><a className="mini-thumb" href={`https://youtu.be/${r.videoId}`} target="_blank" rel="noreferrer"><img src={r.thumbnail} alt=""/><span>▶</span></a><div className="part-video"><div className="video-title-line"><strong>{r.title}</strong><span className={`confidence ${r.confidence==="확실"?"reliable":r.confidence==="확인 필요"?"review":"blocked"}`}>{r.confidence} · {r.score}점</span></div><small>{r.channel}</small><small className="reason">{r.reasons.slice(0,3).join(" · ")}</small></div><a className="open-link" href={`https://youtu.be/${r.videoId}`} target="_blank" rel="noreferrer">{r.confidence==="확실"?"영상 열기":"직접 확인"}</a></>:<div className="missing">{hasSearched?"정확한 영상을 찾지 못했습니다.":"검색하면 검증 결과가 표시됩니다."}</div>}</article>})}</div>
   <div className="message-grid">
    <div className={`message-box ${choirReady?"":"message-locked"}`}><div className="message-head"><div><span>찬양대용 공지문</span><strong>{choirReady?"파트별 연습 링크 포함":"다섯 파트 확인 후 복사 가능"}</strong></div><button disabled={!choirReady} onClick={()=>copyMessage("choir")}>{copied==="choir"?"✓ 복사됨":choirReady?"찬양대용 복사":"공유 보류"}</button></div><pre>{choirText}</pre></div>
    <div className={`message-box caption-box ${captionReady?"":"message-locked"}`}><div className="message-head"><div><span>자막팀용 공지문</span><strong>{captionReady?"전체 연주 링크 확인됨":"전체 영상 확인 후 복사 가능"}</strong></div><button disabled={!captionReady} onClick={()=>copyMessage("caption")}>{copied==="caption"?"✓ 복사됨":captionReady?"자막팀용 복사":"공유 보류"}</button></div><pre>{captionText}</pre></div>
   </div>
  </section><footer><strong>찬양링크</strong><span>확실한 연습 영상만 안전하게 공유합니다.</span></footer></main>
}
