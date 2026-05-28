import { useState, useMemo, useCallback, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { createClient } from "@supabase/supabase-js";
var SB_URL='https://oumgqrfqxljcnkbnqdmg.supabase.co';
var SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91bWdxcmZxeGxqY25rYm5xZG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NDcxNTcsImV4cCI6MjA5MTUyMzE1N30.YmJmaZy_4TacpH8Lw9j0OxoKm5BJ7qiMvIsTZBabRTg';
var sb=createClient(SB_URL,SB_KEY);
var TMDB='eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJhYTIwMzZiNDljZDZlN2YzYTA5YTkzZmMyM2M2MjVhMSIsIm5iZiI6MTc3NjQ5NzQxNC4zMTIsInN1YiI6IjY5ZTMzMzA2NTk2NTBkMmNkODBkMTJlMiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.16jLY3bdwIUi2CFxf0R-c_offds9IZORUchk_MxS9hI';

// ============================================================
// NEUTRAL — editorial light palette used everywhere EXCEPT the hero block
// The hero keeps its full themed palette for dramatic effect; the rest of
// the dashboard stays calm, functional, and reads the same regardless of theme.
// Only T.primary (the theme's accent color) leaks into the dashboard for pills,
// ratings, hover, etc.
// ============================================================
var NEUTRAL={
  paper:'#F5F0E6',surface:'#EDE6D8',surfaceAlt:'#E8E0CE',
  border:'#E0D9C9',borderStrong:'#C9C1AE',
  ink:'#1A1A1A',inkSoft:'#3A3A38',muted:'#6B6B68',mutedSoft:'#8B8B85',
  dark:false
};

// ============================================================
// THEMES — 36 cinematic palettes (each used ONLY in the hero block)
// Each theme: {id, name, paper, ink, muted, mutedSoft, border, borderStrong, surface, surfaceAlt, primary, secondary?, dark?}
// `dark` is true when the theme has a dark background (affects text contrast in bars).
// Primary is the SIGNATURE accent — drives ratings gradient, year gradient, +/- gradient.
// Secondary is optional and used for accents (e.g. labels).
// ============================================================
var THEMES=[
  {id:'matrix',name:'Matrix',dark:true,paper:'#000000',surface:'#050B05',surfaceAlt:'#0B170B',border:'#0B270B',borderStrong:'#0F3A0F',ink:'#00FF55',inkSoft:'#00CC44',muted:'#008833',mutedSoft:'#005522',primary:'#00FF55',secondary:'#FF1A1A',gradient:['#000000','#020602','#000000'],accentTh:'#00FF55',accentRt:'#00FF55',accentPct:'#FF1A1A',dots:['#00FF55','#FF1A1A','#FFFFFF'],glow:'#00FF55',chartTextColor:'#000000'},
  {id:'br2049',name:'Blade Runner 2049',dark:true,paper:'#180F2A',surface:'#221842',surfaceAlt:'#2A1F55',border:'#3A2A6A',borderStrong:'#4A3590',ink:'#F0C79A',inkSoft:'#E0945C',muted:'#A878A0',mutedSoft:'#7050A0',primary:'#180F2A',secondary:'#FF8030',gradient:['#10082A','#1A1140','#240F3A'],accentTh:'#E0258A',accentRt:'#E0258A',accentPct:'#FF8030',dots:['#E0258A','#FF8030','#5570B8'],glow:'#E0258A',metricColor:'#E0258A'},
  {id:'amelie',name:'Amélie',dark:false,paper:'#2A4F2A',surface:'#345A34',surfaceAlt:'#3E6A3E',border:'#3E5F3E',borderStrong:'#5A7A5A',ink:'#E8AC2F',inkSoft:'#D89A1A',muted:'#B0985A',mutedSoft:'#85734A',primary:'#2A4F2A',secondary:'#E8AC2F',gradient:['#2A4F2A','#345A34','#3E6A3E'],accentTh:'#E8AC2F',accentRt:'#E8AC2F',accentPct:'#C42820',dots:['#E8AC2F','#C42820','#2A4F2A'],metricColor:'#C42820'},
  {id:'lalaland',name:'La La Land',dark:true,paper:'#0E1B39',surface:'#1B274B',surfaceAlt:'#232F56',border:'#2F406C',borderStrong:'#42538B',ink:'#F5F0E6',inkSoft:'#E8E0CE',muted:'#8D9BC4',mutedSoft:'#61719C',primary:'#1A2D5A',secondary:'#F5F0E6',gradient:['#0A1A3F','#162553','#1E2D5E'],accentTh:'#F5F0E6',accentRt:'#F5F0E6',accentPct:'#1A2D5A',dots:['#F5F0E6','#FFD85A','#1A2D5A'],glow:'#F5F0E6',metricColor:'#FFFFFF',titleColor:'#1A2D5A'},
  {id:'budapest',name:'Grand Budapest',dark:false,paper:'#F5BFC8',surface:'#F5BFC8',surfaceAlt:'#F5BFC8',border:'#D8859A',borderStrong:'#8B4A6B',ink:'#5B2A4A',inkSoft:'#7B3D5C',muted:'#9C796D',mutedSoft:'#B59A8A',primary:'#8B4A6B',secondary:'#E8C97A',gradient:['#F5BFC8','#F5BFC8','#F5BFC8'],accentTh:'#8B4A6B',accentRt:'#8B4A6B',accentPct:'#E8C97A',dots:['#8B4A6B','#E8C97A','#5B2A4A'],subColor:'#8B4A6B'},
  {id:'mood',name:'In the Mood for Love',dark:true,paper:'#8B0815',surface:'#9B1220',surfaceAlt:'#A8202C',border:'#5A0810',borderStrong:'#3A0508',ink:'#1A0A0A',inkSoft:'#3A1A1A',muted:'#D8A0A0',mutedSoft:'#A85A5A',primary:'#C8302A',secondary:'#1A0A0A',gradient:['#8B0815','#9B1220','#A8202C'],accentTh:'#1A0A0A',accentRt:'#1A0A0A',accentPct:'#2A5A38',dots:['#1A0A0A','#2A5A38','#E8D5A8'],glow:'#C8302A',metricColor:'#1A0A0A',subColor:'#1A0A0A'},
  {id:'interstellar',name:'Interstellar',dark:true,paper:'#050811',surface:'#0A1119',surfaceAlt:'#0F1A2D',border:'#152134',borderStrong:'#1F3548',ink:'#F0F4F8',inkSoft:'#D0D8E0',muted:'#7090BD',mutedSoft:'#4060A0',primary:'#2D4FA5',secondary:'#FFFFFF',gradient:['#050811','#0A1119','#0F1A2D'],accentTh:'#2D4FA5',accentRt:'#FFFFFF',accentPct:'#FFFFFF',dots:['#FFFFFF','#2D4FA5','#FF8C28'],glow:'#FFFFFF',titleColor:'#2D4FA5',metricColor:'#FFFFFF'},
  {id:'killbill',name:'Kill Bill',dark:false,paper:'#FFD400',surface:'#FFD400',surfaceAlt:'#FFD400',border:'#1A0A05',borderStrong:'#1A0A05',ink:'#1A0A05',inkSoft:'#3A1A0A',muted:'#7A4810',mutedSoft:'#8B5510',primary:'#E10510',secondary:'#1A0A05',gradient:['#FFD400','#FFD400','#FFD400'],accentTh:'#E10510',accentRt:'#E10510',accentPct:'#1A0A05',dots:['#E10510','#1A0A05','#FFD400'],metricColor:'#1A0A05',subColor:'#E10510'},
  {id:'akira',name:'Akira',dark:true,paper:'#0A0808',surface:'#150A0A',surfaceAlt:'#1F0A0A',border:'#2A0808',borderStrong:'#3F1010',ink:'#F0F0F0',inkSoft:'#C8C8C8',muted:'#00B5B5',mutedSoft:'#007575',primary:'#FF0033',secondary:'#00E5E5',gradient:['#0A0808','#150A0A','#1F0A0A'],accentTh:'#FF0033',accentRt:'#FF0033',accentPct:'#00E5E5',dots:['#FF0033','#00E5E5','#FFD800'],glow:'#FF0033',titleColor:'#FF0033'},
  {id:'incredibles',name:'The Incredibles',dark:true,paper:'#D81B1B',surface:'#C81515',surfaceAlt:'#B01010',border:'#1A1A1A',borderStrong:'#1A1A1A',ink:'#F5B43A',inkSoft:'#E8A82A',muted:'#FFE085',mutedSoft:'#D88B5A',primary:'#D81B1B',secondary:'#F5B43A',gradient:['#D81B1B','#C81515','#B01010'],accentTh:'#F5B43A',accentRt:'#F5B43A',accentPct:'#1A1A1A',dots:['#F5B43A','#1A1A1A','#FFFFFF'],metricColor:'#F5B43A',descriptorColor:'#1A1A1A',subColor:'#1A1A1A'},
  {id:'space2001',name:'2001: A Space Odyssey',dark:false,paper:'#F0EFEC',surface:'#F0EFEC',surfaceAlt:'#F0EFEC',border:'#C0BFB8',borderStrong:'#8B8A85',ink:'#1A1A1A',inkSoft:'#3A3A3A',muted:'#5A5A5A',mutedSoft:'#7A7A7A',primary:'#D80808',secondary:'#FF6510',gradient:['#F0EFEC','#F0EFEC','#F0EFEC'],accentTh:'#D80808',accentRt:'#FF6510',accentPct:'#1A4A85',dots:['#D80808','#FF6510','#FFD428']},
  {id:'lighthouse',name:'The Lighthouse',dark:false,paper:'#D9D6CE',surface:'#CCC9C1',surfaceAlt:'#B8B5AD',border:'#1A1410',borderStrong:'#1A1410',ink:'#1A1410',inkSoft:'#3A3530',muted:'#5A554F',mutedSoft:'#7A7570',primary:'#1A1410',secondary:'#1A1410',gradient:['#D9D6CE','#CCC9C1','#B8B5AD'],accentTh:'#1A1410',accentRt:'#1A1410',accentPct:'#1A1410',dots:['#1A1410','#5A554F','#E8A82A']},
  {id:'substance',name:'The Substance',dark:false,paper:'#FFFFFF',surface:'#F5F5F0',surfaceAlt:'#EAEAE0',border:'#000000',borderStrong:'#000000',ink:'#000000',inkSoft:'#1A1A1A',muted:'#3A3A3A',mutedSoft:'#5A5A5A',primary:'#7BC828',secondary:'#FFE026',gradient:['#FFFFFF','#F5F5F0','#EAEAE0'],accentTh:'#7BC828',accentRt:'#7BC828',accentPct:'#D8281A',dots:['#7BC828','#FFE026','#D8281A'],glow:'#7BC828'},
  {id:'barbie',name:'Barbie',dark:false,paper:'#F5C0D5',surface:'#F0AECA',surfaceAlt:'#EA9CC0',border:'#C8225A',borderStrong:'#8B1A4A',ink:'#8B1A4A',inkSoft:'#A82058',muted:'#B0386A',mutedSoft:'#C8588A',primary:'#E62F7A',secondary:'#8B1A4A',gradient:['#F5C0D5','#F0AECA','#EA9CC0'],accentTh:'#E62F7A',accentRt:'#E62F7A',accentPct:'#8B1A4A',dots:['#E62F7A','#FFE85A','#8FCEEB']}
];
var THEME_BY_ID={};THEMES.forEach(function(t){THEME_BY_ID[t.id]=t});

// ============================================================
// THEME COPY — masthead/title/heroLabel/heroSuffix per theme
// {n} = YoY signed integer (e.g. "+18"), {year} = current year, {total} = films count
// fonts: 'sans' (default), 'serif', 'mono', 'impact'
// ============================================================
var FONT_MAP={
  sans:'"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
  serif:'"Playfair Display", Georgia, "Times New Roman", serif',
  mono:'"JetBrains Mono", ui-monospace, "SF Mono", "Courier New", monospace',
  monoX:'"Major Mono Display", "JetBrains Mono", ui-monospace, monospace',
  impact:'"Bebas Neue", "Impact", "Arial Black", "Helvetica Neue", sans-serif',
  anton:'"Anton", "Bebas Neue", Impact, "Arial Black", sans-serif',
  typewriter:'"Special Elite", "American Typewriter", "Courier New", ui-monospace, monospace',
  cinzel:'"Cinzel", Georgia, serif',
  blackletter:'"UnifrakturMaguntia", "Pirata One", Georgia, serif',
  script:'"Yellowtail", "Brush Script MT", cursive',
  handwrite:'"Caveat", "Marker Felt", cursive',
  oldserif:'"IM Fell English", "Bodoni Moda", Georgia, serif',
  block:'"Bungee", "Bebas Neue", Impact, sans-serif',
  japdisplay:'"Dela Gothic One", "Noto Sans JP", sans-serif',
  marker:'"Permanent Marker", "Marker Felt", cursive',
  jost:'"Jost", "Futura", "Avenir", sans-serif',
  cyberpunk:'"Audiowide", "Orbitron", "Bebas Neue", sans-serif',
  artdeco:'"Limelight", "Poiret One", "Playfair Display", serif',
  military:'"Black Ops One", "Bebas Neue", Impact, sans-serif',
  futurist:'"Orbitron", "Audiowide", "Bebas Neue", sans-serif',
  iceberg:'"Iceberg", "Orbitron", "Bebas Neue", sans-serif',
  bungeeInline:'"Bungee Inline", "Bungee", "Bebas Neue", sans-serif'
};
function fontOf(name){return FONT_MAP[name]||FONT_MAP.sans}

var THEME_COPY={
  matrix:{masthead:'$ ./films --year {year}',title:'> rendering archive...',heroLabel:'red.pills.taken',heroSuffix:'[\u0394 {n} from prev cycle]',fonts:{hero:'monoX',label:'mono',title:'mono'}},
  br2049:{masthead:'— REPLICANT LOG —',title:'Memories archived',heroLabel:'Miracles witnessed',heroSuffix:'{n} since last scan',fonts:{hero:'iceberg',label:'mono',title:'iceberg'}},
  amelie:{masthead:'~ Le cinéma fabuleux de ~',title:'Babylonian Poulain',heroLabel:'Petits bonheurs',heroSuffix:'soit {n} de plus !',fonts:{hero:'handwrite',label:'handwrite',title:'handwrite'}},
  lalaland:{masthead:'— City of stars —',title:'a year in pictures',heroLabel:'Dreams chased',heroSuffix:'{n} more than before',fonts:{hero:'artdeco',label:'serif',title:'artdeco'}},
  budapest:{masthead:'— ★ —',title:'The Grand Cinema Archive',heroLabel:'Items in the registry',heroSuffix:'— a most extraordinary year, {n} more —',fonts:{hero:'cinzel',label:'serif',title:'cinzel'}},
  mood:{masthead:'— 花樣年華 —',title:'那些逸去的年华 · Those vanished years',heroLabel:'Glances exchanged 一佛一代',heroSuffix:'{n} since',fonts:{hero:'serif',label:'sans',title:'serif'}},
  interstellar:{masthead:'LOG · CYCLE {year}',title:'Do not go gentle',heroLabel:'Light-years traversed',heroSuffix:'{n} // Δt = 1y',fonts:{hero:'bungeeInline',label:'mono',title:'bungeeInline'}},
  killbill:{masthead:'VOL. IV · {year}',title:"The Bride's catalog",heroLabel:'Names crossed off',heroSuffix:'{n} names crossed off',fonts:{hero:'japdisplay',label:'sans',title:'japdisplay'}},
  akira:{masthead:'// NEO-TOKYO · {year}',title:'アーカイブ ARCHIVE',heroLabel:'Bikes drifted バイク・ドリフト',heroSuffix:'[Δ {n} ↗]',fonts:{hero:'monoX',label:'mono',title:'japdisplay'}},
  incredibles:{masthead:'— VOL. {total} · {year} —',title:'THE INCREDIBLE BABYLONIAN',heroLabel:'Super Suits Found',heroSuffix:'{n} SINCE LAST ISSUE!',fonts:{hero:'block',label:'marker',title:'block'}},
  space2001:{masthead:'DISCOVERY ONE / {year}',title:'The Annual Mission Log',heroLabel:'Monoliths approached',heroSuffix:'> DELTA {n} // STAR GATE OPEN',fonts:{hero:'sans',label:'sans',title:'sans'}},
  lighthouse:{masthead:'— LOG · MMXXV —',title:"Why'd ye spill yer beans?",heroLabel:'Watches kept',heroSuffix:'{n} // damn ye to the brine',fonts:{hero:'blackletter',label:'oldserif',title:'oldserif'}},
  substance:{masthead:'— THE SUBSTANCE® —',title:'A better version of yourself',heroLabel:'Doses · activated',heroSuffix:'{n} · remember, you are one',fonts:{hero:'anton',label:'serif',title:'serif'}},
  barbie:{masthead:'— BARBIELAND · {year} —',title:'Hi Barbie! Hi Babylonian!',heroLabel:'Outfits worn',heroSuffix:'{n} · Kenough',fonts:{hero:'script',label:'sans',title:'script'}}
};

// Build the final theme: palette + copy/fonts merged
function fullTheme(id){var t=THEME_BY_ID[id]||THEMES[0];var c=THEME_COPY[id]||{};return Object.assign({},t,{copy:c,fonts:c.fonts||{}})}
function applyCopy(s,ctx){if(!s)return'';return s.replace(/\{n\}/g,ctx.n||'').replace(/\{year\}/g,ctx.year||'').replace(/\{total\}/g,ctx.total||'')}

// ============================================================
// THEME ORNAMENTS — small decorative SVG/HTML per theme
// Positioned absolutely within the hero container
// ============================================================
var ThemeOrnament=function(p){var T=p.T;var id=T.id;
  var orn={position:'absolute',pointerEvents:'none',zIndex:0};

  // MATRIX — Japanese kana digit rain (vertical strands of katakana + numbers)
  // Matches the iconic green katakana rain from the films
  if(id==='matrix'){
    var matrixChars='アシオエユカキストナヤラモノ01279';
    var strands=[];
    for(var i=0;i<12;i++){
      var col=[];
      for(var j=0;j<18;j++)col.push(matrixChars.charAt((i*7+j*3)%matrixChars.length));
      strands.push({chars:col.join('\n'),left:(i*8.5)+'%',dur:(5+(i%4)*1.3),delay:-i*0.7});
    }
    return <div style={Object.assign({},orn,{top:0,right:0,bottom:0,width:'55%',opacity:0.42,overflow:'hidden'})}>
      {strands.map(function(s,i){return <div key={i} style={{position:'absolute',top:-50,left:s.left,color:T.primary,fontFamily:FONT_MAP.mono,fontSize:13,letterSpacing:'0.08em',lineHeight:1.15,animation:'matrixfall '+s.dur+'s linear infinite',animationDelay:s.delay+'s',whiteSpace:'pre',textShadow:'0 0 6px '+T.primary+'aa'}}>{s.chars}</div>})}
    </div>;
  }

  // BLADE RUNNER 2049 — denser rain (16 strands instead of 8, more visible)
  if(id==='br2049'){
    var rs=[];for(var k=0;k<16;k++)rs.push({left:(k*6.2)+'%',dur:(2+(k%4)*0.5),delay:-k*0.25});
    return <div style={Object.assign({},orn,{top:0,right:0,bottom:0,width:'55%',opacity:0.32,overflow:'hidden'})}>
      {rs.map(function(s,i){return <div key={i} style={{position:'absolute',top:-50,left:s.left,width:1.2,height:'140%',background:'linear-gradient(180deg, transparent 0%, '+T.primary+'ee 50%, transparent 100%)',animation:'brrain '+s.dur+'s linear infinite',animationDelay:s.delay+'s'}}/>})}
    </div>;
  }

  // DRIVE — neon strip top, raised to clear "In theaters" text below
  if(id==='drive')return <div style={Object.assign({},orn,{top:-6,left:0,right:0,height:3,background:'linear-gradient(90deg, transparent 0%, '+T.primary+' 30%, '+T.primary+' 70%, transparent 100%)',boxShadow:'0 0 12px '+T.primary+'aa, 0 0 24px '+T.primary+'55'})}/>;

  // INTERSTELLAR — visible grid lines (boosted opacity)
  if(id==='interstellar')return <div style={Object.assign({},orn,{top:0,left:0,right:0,bottom:0,opacity:0.22,backgroundImage:'linear-gradient('+NEUTRAL.muted+' 1px, transparent 1px), linear-gradient(90deg, '+NEUTRAL.muted+' 1px, transparent 1px)',backgroundSize:'40px 40px'})}/>;

  // SHINING (Hotel) — old wallpaper geometric pattern (chevrons), not the carpet
  if(id==='shining_hotel')return <div style={Object.assign({},orn,{top:0,left:0,right:0,bottom:0,opacity:0.08,backgroundImage:'repeating-linear-gradient(90deg, '+NEUTRAL.ink+' 0px, '+NEUTRAL.ink+' 1px, transparent 1px, transparent 18px), repeating-linear-gradient(0deg, '+NEUTRAL.ink+' 0px, '+NEUTRAL.ink+' 1px, transparent 1px, transparent 36px)'})}/>;

  // SPIRITED AWAY — lantern inside hero square (like matrix rain), with the 油 kanji and gentle glow
  if(id==='spirited')return <div style={Object.assign({},orn,{top:0,left:0,right:0,bottom:0,overflow:'hidden'})}>
    <div style={{position:'absolute',top:18,right:'8%',width:64,height:96,opacity:0.75}}>
      <svg viewBox="0 0 64 96" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="8" width="28" height="44" rx="4" fill={T.primary} stroke={NEUTRAL.borderStrong} strokeWidth="1.5"/><line x1="32" y1="0" x2="32" y2="8" stroke={NEUTRAL.borderStrong} strokeWidth="1.5"/><line x1="32" y1="52" x2="32" y2="58" stroke={NEUTRAL.borderStrong} strokeWidth="1.5"/><text x="32" y="36" textAnchor="middle" fontSize="22" fontFamily={FONT_MAP.japdisplay} fill={NEUTRAL.paper} fontWeight="700">油</text></svg>
    </div>
    <div style={{position:'absolute',top:20,right:'8%',width:64,height:64,background:'radial-gradient(circle, '+T.primary+'33 0%, transparent 60%)',animation:'trinitybreathe 5s ease-in-out infinite'}}/>
  </div>;

  // LIGHTHOUSE — beam from the right (lighthouse source off-screen right) widening leftward toward the 142
  // LIGHTHOUSE — beam removed per user request

  // BARBIE — moved inside hero square (subtle hearts/dots)
  if(id==='barbie')return <div style={Object.assign({},orn,{top:0,left:0,right:0,bottom:0,overflow:'hidden'})}>
    <div style={{position:'absolute',top:24,right:'7%',width:80,height:60,opacity:0.65}}>
      <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg"><path d="M40,52 C20,38 10,22 22,14 C30,9 36,14 40,20 C44,14 50,9 58,14 C70,22 60,38 40,52 Z" fill={T.primary}/></svg>
    </div>
    <div style={{position:'absolute',top:14,right:'24%',width:8,height:8,borderRadius:'50%',background:T.secondary,opacity:0.7}}/>
    <div style={{position:'absolute',top:40,right:'4%',width:6,height:6,borderRadius:'50%',background:T.primary,opacity:0.5}}/>
    <div style={{position:'absolute',top:80,right:'18%',width:5,height:5,borderRadius:'50%',background:T.secondary,opacity:0.6}}/>
  </div>;

  // OPPENHEIMER — Trinity glow removed per request

  // DTRT — top zigzag stripe (poster yellow/red) + faint diagonal pattern on background
  if(id==='dtrt')return <div style={Object.assign({},orn,{top:0,left:0,right:0,bottom:0,overflow:'hidden'})}>
    <div style={{position:'absolute',inset:0,opacity:0.08,backgroundImage:'repeating-linear-gradient(45deg, '+T.dots[0]+' 0px, '+T.dots[0]+' 6px, transparent 6px, transparent 14px)'}}/>
    <div style={{position:'absolute',top:0,left:0,right:0,height:10,background:'repeating-linear-gradient(45deg, '+T.dots[0]+' 0px, '+T.dots[0]+' 12px, '+T.dots[1]+' 12px, '+T.dots[1]+' 24px)',opacity:0.9}}/>
  </div>;

  return null;
};

// Inject CSS animations once
var ANIM_CSS='@keyframes matrixfall{0%{transform:translateY(-30%)}100%{transform:translateY(140%)}}@keyframes brrain{0%{transform:translateY(-30%)}100%{transform:translateY(120%)}}@keyframes halpulse{0%,100%{opacity:0.85;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}@keyframes trinitybreathe{0%,100%{opacity:0.6}50%{opacity:1}}';


// hexToRgb / rgbToHex helpers for color manipulation
function hexToRgb(h){var x=h.replace('#','');return{r:parseInt(x.slice(0,2),16),g:parseInt(x.slice(2,4),16),b:parseInt(x.slice(4,6),16)}}
function rgbToHex(r,g,b){var to=function(v){var s=Math.max(0,Math.min(255,Math.round(v))).toString(16);return s.length<2?'0'+s:s};return'#'+to(r)+to(g)+to(b)}
// Blend a color toward another (paper) by factor [0..1]; 0 = original, 1 = paper
function blend(hex,paper,f){var a=hexToRgb(hex),b=hexToRgb(paper);return rgbToHex(a.r+(b.r-a.r)*f,a.g+(b.g-a.g)*f,a.b+(b.b-a.b)*f)}
// Saturate (move further from paper) — used for "+" indicators
function vivid(hex,paper,f){var a=hexToRgb(hex),b=hexToRgb(paper);var dr=a.r-b.r,dg=a.g-b.g,db=a.b-b.b;return rgbToHex(a.r+dr*f,a.g+dg*f,a.b+db*f)}

// Theme-aware rating color (5 buckets, more saturated = higher rating)
// Returns T.primary uniformly for all ratings (no more gradient based on note)
function rCT(r,T){if(!r||r===0)return NEUTRAL.mutedSoft;return T.primary}

// Year color — fixed qualitative palette, independent of theme.
// Each year gets a distinct color from a 12-color palette (cycles if needed).
// Based on ColorBrewer "Set3" / "Paired" but tuned for editorial cream background.
var YEAR_PALETTE=['#B73E36','#4A6B8C','#C89A4A','#5A8F6B','#A65277','#7B5B8C','#8B6B2A','#3F8DAD','#C8584A','#6B7A4A','#A85E2A','#506B5C'];
function yC(year,allYears,T){var y=parseInt(year);if(isNaN(y))return NEUTRAL.muted;return YEAR_PALETTE[Math.abs(y)%YEAR_PALETTE.length]}

// Theme-aware YoY / diff sign colors
function signColor(v,T,opts){opts=opts||{};var pos=opts.positiveIsGood!==false;var good=v>0?pos:!pos;if(Math.abs(v)<0.005)return NEUTRAL.muted;return good?T.primary:blend(T.primary,NEUTRAL.paper,0.55)}

// Series palette for stacked charts (subs / tickets / rentals)
function seriesColors(T){return[T.primary,blend(T.primary,NEUTRAL.paper,0.35),blend(T.primary,NEUTRAL.paper,0.6)]}

// Heatmap intensity color
// Heatmap: always blend T.primary toward white. Text on filled cells should always be black/dark for contrast.
function hmColor(count,max,year,currentYr,T){if(!count)return NEUTRAL.surface;var intensity=0.2+(count/max)*0.7;return blend(T.primary,'#FFFFFF',1-intensity)}

// Read-only category styling — keeps using fixed colors for tag admin (rarely used, not worth theming)
var CI_BASE={
  platform_paid:{l:'Paid platform'},platform_free:{l:'Free platform'},platform_rental:{l:'Rental'},
  sub_venue:{l:'Sub venue'},indie_venue:{l:'Indie venue'},friend:{l:'Friend'},
  taste:{l:'Taste'},meta:{l:'Meta'},price:{l:'Price'}
};

function getNowYM(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
function simpleHash(s){var h=0;for(var i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h=h&h}return String(h)}
function pCSVL(l){var f=[],c='',q=false;for(var i=0;i<l.length;i++){var ch=l[i];if(ch==='"'){if(q&&i+1<l.length&&l[i+1]==='"'){c+='"';i++}else q=!q}else if(ch===','&&!q){f.push(c);c=''}else c+=ch}f.push(c);return f}
function fixEnc(s){if(!s)return'';var r=s;try{var P=[['√©','é'],['√®','è'],['√¨','è'],['√ê','ê'],['√†','à'],['√¢','â'],['√Æ','î'],['√ô','ô'],['√ª','û'],['√´','ë'],['√Ø','ï'],['√á','á'],['√ß','ç'],['√±','ñ'],['√ü','ü'],['√Å','Å'],['¬∞','°'],['‚Äì','–'],['‚Äî','—'],['‚Äú','"'],['‚Äù','"'],['‚Äô',"'"],['‚Äò',"'"],['‚Ä¶','…']];for(var i=0;i<P.length;i++){if(r.indexOf(P[i][0])!==-1)r=r.split(P[i][0]).join(P[i][1])}}catch(e){}return r}
function csvToPipe(raw){try{var cl=fixEnc(raw).replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');var lines=cl.split('\n').filter(function(l){return l.trim()});if(lines.length<2)return{pipe:'',w:[],e:['No data rows'],count:0};var hdr=pCSVL(lines[0]).map(function(h){return h.trim().replace(/^\uFEFF/,'')});var hi={};hdr.forEach(function(h,i){hi[h]=i;var lc=h.toLowerCase();if(hi[lc]===undefined)hi[lc]=i});var gi=function(c){if(hi[c]!==undefined)return hi[c];var lc=c.toLowerCase();if(hi[lc]!==undefined)return hi[lc];for(var k in hi){if(k.toLowerCase()===lc)return hi[k]}return undefined};var nI=gi('Name'),yI=gi('Year'),wI=gi('Watched Date'),rI=gi('Rating'),rwI=gi('Rewatch'),tI=gi('Tags');if(nI===undefined||yI===undefined||wI===undefined)return{pipe:'',w:[],e:['Missing columns'],count:0};var ent=[];for(var i=1;i<lines.length;i++){var f=pCSVL(lines[i]);var gf=function(idx){return idx!==undefined&&idx<f.length?(f[idx]||'').trim():''};var nm=gf(nI),yr=gf(yI),wd=gf(wI),rt=gf(rI),rw=gf(rwI),tr=gf(tI);if(!nm||!wd)continue;var tg=tr.split(',').map(function(t){return t.trim().toLowerCase()}).filter(Boolean);ent.push({wd:wd,nm:nm,yr:yr,rt:rt,rw:rw==='Yes'?'R':'',tg:tg.join(',')})}ent.sort(function(a,b){return a.wd<b.wd?-1:a.wd>b.wd?1:0});return{pipe:ent.map(function(e){return e.wd+'|'+e.nm+'|'+e.yr+'|'+e.rt+'|'+e.rw+'|'+e.tg}).join('\n'),w:[],e:[],count:ent.length}}catch(err){return{pipe:'',w:[],e:['Error: '+String(err)],count:0}}}
function parsePipe(raw){if(!raw||!raw.trim())return[];return raw.trim().split('\n').filter(function(l){return l.trim()}).map(function(l){var p=l.split('|');var tags=p[5]?p[5].split(',').map(function(t){return t.trim()}).filter(Boolean):[];var r=p[3]?p[3].trim():'';return{date:p[0],name:p[1],year:parseInt(p[2]),rating:r&&!isNaN(parseFloat(r))?parseFloat(r):null,rewatch:p[4]==='R',tags:tags}}).filter(function(e){return e.tags.indexOf('series')===-1&&e.tags.indexOf('short')===-1})}
var CATS=['platform_paid','platform_free','platform_rental','sub_venue','indie_venue','friend','taste','meta','price'];
// Category styling — neutral, theme-independent (admin pages only, rarely seen)
var CI={
  platform_paid:{l:'Paid platform'},
  platform_free:{l:'Free platform'},
  platform_rental:{l:'Rental'},
  sub_venue:{l:'Sub venue'},
  indie_venue:{l:'Indie venue'},
  friend:{l:'Friend'},
  taste:{l:'Taste'},
  meta:{l:'Meta'},
  price:{l:'Price'}
};
var MS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var MF=['January','February','March','April','May','June','July','August','September','October','November','December'];
var DSUBS=[{id:'rat',name:'Rat+',platforms:['canal','netflix','hbo','paramount'],periods:[{from:'2021-10',to:'',price:40}]},{id:'disney',name:'Disney+',platforms:['disney'],periods:[{from:'2023-01',to:'',price:9}]},{id:'mubi',name:'Mubi',platforms:['mubi'],periods:[{from:'2021-11',to:'',price:11}]},{id:'prime',name:'Prime Video',platforms:['prime'],periods:[{from:'2022-01',to:'',price:7}]},{id:'theater',name:'Pathé/UGC Pass',platforms:['_theater_sub'],periods:[{from:'2023-07',to:'',price:22}]}];
function getDn(t,reg){var e=reg[t];return(e&&e.dn)?e.dn:t}
function getCat(t,reg){var e=reg[t];return e?e.cat:null}
function isPlatform(cat){return cat==='platform_paid'||cat==='platform_free'||cat==='platform_rental'}
function gP(tags,reg){for(var i=0;i<tags.length;i++){var c=getCat(tags[i],reg);if(isPlatform(c))return getDn(tags[i],reg);if(c==='sub_venue'||c==='indie_venue')return'Theater'}return'Other'}
function gV(tags,reg){for(var i=0;i<tags.length;i++){var c=getCat(tags[i],reg);if(c==='sub_venue'||c==='indie_venue')return tags[i]}return null}
function gC(tags,reg){var r=[];for(var i=0;i<tags.length;i++){if(getCat(tags[i],reg)==='friend')r.push(getDn(tags[i],reg))}return r}
function gTP(tags,reg){for(var i=tags.length-1;i>=0;i--){if(getCat(tags[i],reg)==='price')return parseInt(tags[i])/100}return null}
function isSubCovAt(filmDate,subs){var ym=filmDate.slice(0,7);var now=getNowYM();return subs.some(function(s){if(s.platforms.indexOf('_theater_sub')===-1)return false;return s.periods.some(function(p){if(!p.from)return false;var to=p.to||now;return ym>=p.from&&ym<=to})})}
function fmtM(ym){var p=ym.split('-');return MF[parseInt(p[1])-1]+' '+p[0]}
function fY(v,t){if(v==null||isNaN(v))return null;if(t==='abs'){var r=Math.round(v);if(!r)return null;return(r>0?'+':'')+r}if(t==='r'){if(Math.abs(v)<0.005)return null;return(v>0?'+':'')+v.toFixed(2)}if(t==='pp'){var r2=Math.round(v);if(!r2)return null;return(r2>0?'+':'')+r2+'pp'}return null}
function mBt(f,t){var fp=f.split('-').map(Number),tp=t.split('-').map(Number);return Math.max(0,(tp[0]-fp[0])*12+(tp[1]-fp[1])+1)}
function subCostForMonth(ym,subs){var t=0;subs.forEach(function(s){s.periods.forEach(function(p){if(!p.from||!p.price)return;var to=p.to||getNowYM();if(ym>=p.from&&ym<=to)t+=p.price})});return t}
function avgR(films){var r=films.filter(function(e){return e.rating!==null});return r.length?r.reduce(function(s,e){return s+e.rating},0)/r.length:0}
function agg(arr,kf){var m={};arr.forEach(function(e){var k=kf(e);if(!m[k])m[k]={c:0,s:0,r:0};m[k].c++;if(e.rating!==null){m[k].s+=e.rating;m[k].r++}});return Object.keys(m).map(function(n){var v=m[n];return{name:n,Films:v.c,Avg:v.r?parseFloat((v.s/v.r).toFixed(2)):0}})}
function getWeekMon(ds){var d=new Date(ds+'T12:00:00');var day=d.getDay();d.setDate(d.getDate()-(day===0?6:day-1));return d.toISOString().slice(0,10)}
function calcStreaks(films){var dates=Array.from(new Set(films.map(function(e){return e.date}))).sort();if(!dates.length)return{day:0,week:0,wr:''};var ds=new Set(dates),last=dates[dates.length-1],dayS=0,cd=new Date(last+'T12:00:00');while(ds.has(cd.toISOString().slice(0,10))){dayS++;cd.setDate(cd.getDate()-1)}var weeks=new Set(dates.map(function(d){return getWeekMon(d)})),weekS=0,cm=new Date(getWeekMon(last)+'T12:00:00');while(weeks.has(cm.toISOString().slice(0,10))){weekS++;cm.setDate(cm.getDate()-7)}var ws=new Date(cm);ws.setDate(ws.getDate()+7);var we=new Date(getWeekMon(last)+'T12:00:00');we.setDate(we.getDate()+6);var wr='';if(weekS>0){var a=ws.toISOString().slice(0,10).split('-').map(Number),b=we.toISOString().slice(0,10).split('-').map(Number);wr=MS[a[1]-1]+' '+a[2]+', '+a[0]+' \u2013 '+MS[b[1]-1]+' '+b[2]+', '+b[0]}return{day:dayS,week:weekS,wr:wr}}
function calcWrapped(all,reg){return Array.from(new Set(all.map(function(e){return e.date.slice(0,4)}))).sort().map(function(yr){var f=all.filter(function(e){return e.date.indexOf(yr)===0}),rated=f.filter(function(e){return e.rating!==null}),avg=rated.length?rated.reduce(function(s,e){return s+e.rating},0)/rated.length:0;var cc={};f.forEach(function(e){gC(e.tags,reg).forEach(function(n){cc[n]=(cc[n]||0)+1})});var topC=null,topCC=0;Object.keys(cc).forEach(function(n){if(cc[n]>topCC){topCC=cc[n];topC=n}});var mc={};f.forEach(function(e){mc[e.date.slice(5,7)]=(mc[e.date.slice(5,7)]||0)+1});var topMo=null,topMC=0;Object.keys(mc).forEach(function(m){if(mc[m]>topMC){topMC=mc[m];topMo=m}});var thN=f.filter(function(e){return gP(e.tags,reg)==='Theater'||gV(e.tags,reg)!==null}).length;return{yr:yr,total:f.length,avg:avg,topC:topC,topCC:topCC,topMo:topMo?MF[parseInt(topMo)-1]:null,topMC:topMC,thPct:f.length?Math.round(thN/f.length*100):0}})}
function calcDQ(all,reg,subs){var nV=[],nS=[],nP=[],nRP=[],sP=[];all.forEach(function(e){var hTP=e.tags.some(function(t){return isPlatform(getCat(t,reg))&&getDn(t,reg)==='Theater'});var vn=gV(e.tags,reg);if(hTP&&!vn)nV.push(e);if(!hTP&&vn)nS.push(e);if(vn){var isSub=getCat(vn,reg)==='sub_venue';var cov=isSub&&isSubCovAt(e.date,subs);if(isSub&&cov){var pr=gTP(e.tags,reg);if(pr!==null)sP.push({e:e,price:pr})}if(isSub&&!cov&&gTP(e.tags,reg)===null)nP.push(e);if(getCat(vn,reg)==='indie_venue'&&gTP(e.tags,reg)===null)nP.push(e)}var isR=e.tags.some(function(t){return getCat(t,reg)==='platform_rental'});if(isR&&gTP(e.tags,reg)===null)nRP.push(e)});return{unrated:all.filter(function(e){return e.rating===null}),nV:nV,nS:nS,nP:nP,nRP:nRP,sP:sP}}

// ============================================================
// SHARED VISUAL COMPONENTS — all accept theme T as prop
// ============================================================
var CTooltip=function(p){var T=p.T;if(!p.active||!p.payload||!p.payload.length)return null;return <div style={{background:NEUTRAL.paper,border:'0.5px solid '+NEUTRAL.borderStrong,borderRadius:0,padding:'8px 12px',fontSize:11}}><div style={{color:NEUTRAL.ink,fontWeight:500,marginBottom:4}}>{p.label}</div>{p.payload.filter(function(x){return x.value!=null}).map(function(x,i){return <div key={i} style={{color:x.color||NEUTRAL.ink}}>{x.name}: {typeof x.value==='number'?(Number.isInteger(x.value)?x.value:x.value.toFixed(2)):x.value}</div>})}</div>};
var CostTip=function(p){var T=p.T;if(!p.active||!p.payload||!p.payload.length)return null;return <div style={{background:NEUTRAL.paper,border:'0.5px solid '+NEUTRAL.borderStrong,borderRadius:0,padding:'8px 12px',fontSize:11}}><div style={{color:NEUTRAL.ink,fontWeight:500,marginBottom:4}}>{p.label}</div>{p.payload.filter(function(x){return x.value!=null&&x.value>0}).map(function(x,i){return <div key={i} style={{color:x.color||NEUTRAL.ink}}>{x.name}: {"\u20AC"}{x.value.toFixed(2)}</div>})}</div>};

// SectionHead — used everywhere instead of plain h3
function SectionHead(p){var T=p.T;return <div className="flex items-baseline justify-between mb-3 pb-2" style={{borderBottom:'0.5px solid '+NEUTRAL.border}}><div className="text-base" style={{color:NEUTRAL.ink,fontWeight:500,letterSpacing:'-0.01em'}}>{p.title}{p.count!=null&&<span className="ml-2 text-xs font-normal" style={{color:NEUTRAL.muted}}>{p.count}</span>}</div>{p.aside}</div>}

// Stat — Editorial label / large number / optional sub.
function Stat(p){var T=p.T;var yoyColor=p.yoy?(p.yoy.charAt(0)==='+'?T.primary:p.yoy.charAt(0)==='-'?blend(T.primary,NEUTRAL.paper,0.55):NEUTRAL.muted):NEUTRAL.muted;return <div className="px-4 py-3" style={{borderRight:p.noBorder?'none':'0.5px solid '+NEUTRAL.border}}><div className="mb-1.5" style={{fontSize:9,letterSpacing:'0.15em',color:NEUTRAL.muted,textTransform:'uppercase'}}>{p.label}</div><div style={{fontSize:p.large?28:20,fontWeight:500,lineHeight:1,color:p.color||NEUTRAL.ink}}>{p.value}</div>{(p.sub||p.yoy)&&<div className="mt-1.5 flex items-baseline gap-2">{p.sub&&<span style={{fontSize:11,color:NEUTRAL.muted}}>{p.sub}</span>}{p.yoy&&<span style={{fontSize:11,color:yoyColor,fontWeight:500}}>{p.yoy}</span>}</div>}</div>}

// SrtB — Sort toggle pill
function SrtB(p){var T=p.T;return <button onClick={p.onToggle} className="text-xs px-2 py-0.5 transition-colors" style={{color:NEUTRAL.muted,border:'0.5px solid '+NEUTRAL.border,borderRadius:0,background:'transparent'}}>{p.val==='avg'?'by count':'by rating'}</button>}

// CTbl — Horizontal bar table
function CTbl(p){var T=p.T;var sorted=p.sortMode==='avg'?[].concat(p.data).sort(function(a,b){return(b.Avg||0)-(a.Avg||0)}):p.data;var mc=Math.max.apply(null,sorted.map(function(d){return d.Films}).concat([1]));var chartText=T.chartTextColor||NEUTRAL.ink;return <div className="space-y-0.5">{sorted.map(function(d,i){var ac=p.sel===d.name;var barColor=rCT(d.Avg,T);return <div key={i} onClick={function(){p.onSel(ac?null:d.name)}} title={d.tip||''} className="flex items-center gap-2 cursor-pointer py-0.5 px-1" style={{borderRadius:0,background:ac?NEUTRAL.surfaceAlt:'transparent',boxShadow:ac?'inset 0 0 0 1px '+T.primary:'none'}}><div className="w-20 md:w-32 text-xs text-right truncate" style={{color:NEUTRAL.inkSoft}} title={d.name}>{d.name}</div><div className="flex-1 h-6 flex items-center" style={{background:NEUTRAL.surface,borderRadius:0,overflow:'hidden'}}><div className="h-full flex items-center px-2" style={{width:Math.max((d.Films/mc)*100,8)+'%',minWidth:30,backgroundColor:barColor,borderRadius:0}}><span className="text-xs" style={{color:chartText,fontWeight:500}}>{d.Films}</span></div></div><div className="w-12 text-xs text-right font-mono" style={{color:chartText}}>{d.Avg>0?d.Avg.toFixed(1)+'\u2605':'\u2014'}</div></div>})}</div>}

// FilmList — Selected film panel
function FilmList(p){var T=p.T;if(!p.films||!p.films.length)return null;return <div className="mt-3 p-4" style={{background:NEUTRAL.surface,border:'0.5px solid '+T.primary,borderRadius:0}}><div className="flex justify-between items-center mb-2"><div className="text-sm" style={{color:NEUTRAL.ink,fontWeight:500}}>{p.title} <span style={{color:NEUTRAL.muted,fontWeight:400}}>({p.films.length})</span></div><button onClick={p.onClose} className="text-xs px-2 py-0.5" style={{color:NEUTRAL.muted,background:NEUTRAL.surfaceAlt,borderRadius:0}}>{'\u2715'}</button></div><div className="max-h-72 overflow-y-auto">{p.films.map(function(f,i){return <div key={i} className="text-xs py-1.5 flex justify-between" style={{borderBottom:'0.5px solid '+NEUTRAL.border}}><span className="truncate mr-2" style={{color:NEUTRAL.inkSoft}}>{f.name} <span style={{color:NEUTRAL.muted}}>({f.year})</span>{f.rating!==null&&<span className="ml-1" style={{color:rCT(f.rating,T)}}>{f.rating}{'\u2605'}</span>}</span><span className="whitespace-nowrap" style={{color:NEUTRAL.muted}}>{f.date}</span></div>})}</div></div>}

// DQPanel — Data Quality (all colors derived from theme primary via blend)
function DQPanel(p){var T=p.T;var d=p.data;if(!d)return null;var c1=T.primary,c2=blend(T.primary,NEUTRAL.paper,0.4),c3=blend(T.primary,NEUTRAL.paper,0.65);return <div className="p-4" style={{background:NEUTRAL.surface,border:'0.5px solid '+NEUTRAL.border,borderRadius:0}}><SectionHead T={N} title="Data quality"/><div className="space-y-3">{d.unrated.length>0&&<div><div className="text-xs mb-1" style={{color:NEUTRAL.muted}}>Unrated: {d.unrated.length} films</div><div className="ml-4 max-h-32 overflow-y-auto">{d.unrated.map(function(e,i){return <div key={i} className="text-xs" style={{color:NEUTRAL.mutedSoft}}>{e.name} ({e.date})</div>})}</div></div>}{d.sP.length>0&&<div><div className="text-xs mb-1" style={{color:c3}}>Sub venue premium: {d.sP.length} payments</div><div className="ml-4 max-h-32 overflow-y-auto">{d.sP.map(function(x,i){return <div key={i} className="text-xs" style={{color:NEUTRAL.muted}}>{x.e.name} ({x.e.date}) - {x.price.toFixed(2)} EUR</div>})}</div></div>}{d.nP.length>0&&<div><div className="text-xs mb-1" style={{color:c1}}>Non-sub venue, no price: {d.nP.length}</div><div className="ml-4 max-h-32 overflow-y-auto">{d.nP.map(function(e,i){return <div key={i} className="text-xs" style={{color:NEUTRAL.muted}}>{e.name} ({e.date})</div>})}</div></div>}{d.nRP.length>0&&<div><div className="text-xs mb-1" style={{color:c1}}>Rental, no price: {d.nRP.length}</div><div className="ml-4 max-h-32 overflow-y-auto">{d.nRP.map(function(e,i){return <div key={i} className="text-xs" style={{color:NEUTRAL.muted}}>{e.name} ({e.date})</div>})}</div></div>}{d.nV.length>0&&<div><div className="text-xs mb-1" style={{color:c2}}>Theater tag, no venue: {d.nV.length}</div><div className="ml-4 max-h-32 overflow-y-auto">{d.nV.map(function(e,i){return <div key={i} className="text-xs" style={{color:NEUTRAL.muted}}>{e.name} ({e.date})</div>})}</div></div>}{d.nS.length>0&&<div><div className="text-xs mb-1" style={{color:c2}}>Venue tag, no theater: {d.nS.length}</div><div className="ml-4 max-h-32 overflow-y-auto">{d.nS.map(function(e,i){return <div key={i} className="text-xs" style={{color:NEUTRAL.muted}}>{e.name} ({e.date})</div>})}</div></div>}{d.nV.length===0&&d.nS.length===0&&d.nP.length===0&&d.nRP.length===0&&<div className="text-xs" style={{color:T.primary}}>No pricing issues</div>}</div></div>}

function parseRatings(raw){try{var cl=fixEnc(raw).replace(/^\uFEFF/,"").replace(/\r\n/g,"\n").replace(/\r/g,"\n");var lines=cl.split("\n").filter(function(l){return l.trim()});if(lines.length<2)return[];var hdr=pCSVL(lines[0]).map(function(h){return h.trim()});var hi={};hdr.forEach(function(h,i){hi[h]=i});var res=[];for(var i=1;i<lines.length;i++){var flds=pCSVL(lines[i]);var dt=(flds[hi["Date"]]||"").trim();var nm=(flds[hi["Name"]]||"").trim();var yr=parseInt((flds[hi["Year"]]||"").trim());var rt=parseFloat((flds[hi["Rating"]]||"").trim());if(nm&&yr&&!isNaN(rt))res.push({date:dt,name:nm,year:yr,rating:rt})}return res}catch(e){return[]}}
function parseTop50(raw){try{var cl=fixEnc(raw).replace(/^\uFEFF/,"").replace(/\r\n/g,"\n").replace(/\r/g,"\n");var lines=cl.split("\n").filter(function(l){return l.trim()});var si=-1;for(var i=0;i<lines.length;i++){if(lines[i].indexOf("Position")!==-1){si=i;break}}if(si===-1)return[];var hdr=pCSVL(lines[si]).map(function(h){return h.trim()});var hi={};hdr.forEach(function(h,i){hi[h]=i});var res=[];for(var i=si+1;i<lines.length;i++){var flds=pCSVL(lines[i]);var pos=parseInt((flds[hi["Position"]]||"").trim());var nm=(flds[hi["Name"]]||"").trim();var yr=parseInt((flds[hi["Year"]]||"").trim());if(nm&&yr&&!isNaN(pos))res.push({pos:pos,name:nm,year:yr})}return res}catch(e){return[]}}
function parseWatchlist(raw){try{var cl=fixEnc(raw).replace(/^\uFEFF/,"").replace(/\r\n/g,"\n").replace(/\r/g,"\n");var lines=cl.split("\n").filter(function(l){return l.trim()});if(lines.length<2)return[];var hdr=pCSVL(lines[0]).map(function(h){return h.trim()});var hi={};hdr.forEach(function(h,i){hi[h]=i});var res=[];for(var i=1;i<lines.length;i++){var flds=pCSVL(lines[i]);var dt=(flds[hi["Date"]]||"").trim();var nm=(flds[hi["Name"]]||"").trim();var yr=parseInt((flds[hi["Year"]]||"").trim());var uri=(flds[hi["Letterboxd URI"]]||"").trim();if(nm&&yr)res.push({date:dt,name:nm,year:yr,uri:uri})}return res}catch(e){return[]}}
function parseReviews(raw){try{var cl=fixEnc(raw).replace(/^\uFEFF/,"").replace(/\r\n/g,"\n").replace(/\r/g,"\n");var lines=cl.split("\n");if(lines.length<2)return[];var hdr=pCSVL(lines[0]).map(function(h){return h.trim()});var hi={};hdr.forEach(function(h,i){hi[h]=i});var res=[];var buf=[];for(var i=1;i<lines.length;i++){buf.push(lines[i]);var joined=buf.join("\n");var flds=pCSVL(joined);if(flds.length>=hdr.length){var nm=(flds[hi["Name"]]||"").trim();var yr=parseInt((flds[hi["Year"]]||"").trim());var rv=(flds[hi["Review"]]||"").trim();var tg=(flds[hi["Tags"]]||"").trim().toLowerCase();var rt=(flds[hi["Rating"]]||"").trim();if(nm&&tg.indexOf("yesmine")!==-1){var cleaned=rv.replace(/\u2019/g,"'").replace(/\u2018/g,"'");var yMatch=cleaned.match(/Y.s\s*rating\s*[:\=]\s*([\d.]+|sleep|memory)\/5/i);if(yMatch){var yVal=yMatch[1];var yNum=parseFloat(yVal);res.push({name:nm,year:yr,yRating:isNaN(yNum)?yVal:yNum,myRating:rt?parseFloat(rt):null})}}buf=[]}}return res}catch(e){return[]}}

export default function Dashboard(){
  var[loading,sLoading]=useState(true);var[pd,sPd]=useState('');var[subscriptions,sSubscriptions]=useState(DSUBS);var[reg,sReg]=useState({});var[pwHash,sPwHash]=useState('');
  var[sI,sSI]=useState(false);var[csv,sCsv]=useState('');var[iR,sIR]=useState(null);
  var[tab,sTab]=useState('overview');var[yr,sYr]=useState('All');var[iRW,sIRW]=useState(true);
  var[sR,sSR]=useState(null);var[sP,sSP]=useState(null);var[sVe,sSVe]=useState(null);var[sCo,sSCo]=useState(null);var[sDe,sSDe]=useState(null);var[sTg,sSTg]=useState(null);var[sDir,sSDir]=useState(null);var[ySort,sYSort]=useState("dateNew");var[sGenre,sSGenre]=useState(null);var[sCountry,sSCountry]=useState(null);var[sCast,sSCast]=useState(null);var[dirUniq,sDirUniq]=useState(false);
  var[sorts,sSorts]=useState({});var[sq,sSq]=useState('');var[selHM,sSelHM]=useState(null);
  var[dSrt,sDSrt]=useState({col:'date',asc:false});var[dSrch,sDSrch]=useState('');
  var[tagSearch,sTagSearch]=useState('');var[tagSel,sTagSel]=useState({});var[bulkCat,sBulkCat]=useState('');
  var[costEs,sCostEs]=useState(null);var[costYr,sCostYr]=useState('All');var[dateFrom,sDateFrom]=useState('');var[dateTo,sDateTo]=useState('');
  var[isAdmin,sIsAdmin]=useState(false);var[showPwModal,sShowPwModal]=useState(false);var[pwInput,sPwInput]=useState('');var[pwErr,sPwErr]=useState('');
  var[saving,sSaving]=useState(false);var[expYrs,sExpYrs]=useState({});var[rankMode,sRankMode]=useState('sub');
  var[filmMeta,sFilmMeta]=useState({});var[enriching,sEnriching]=useState(false);var[enrichProg,sEnrichProg]=useState('');var[wlData,sWlData]=useState([]);var[yRatings,sYRatings]=useState({});var[allRatings,sAllRatings]=useState([]);var[top50s,sTop50s]=useState([]);
  // Theme system: randomly pick at mount, persist in localStorage, avoid immediate repeat
  var[themeId,sThemeId]=useState(function(){try{var prev=localStorage.getItem('dashboard_theme_current')||'';var pool=THEMES.filter(function(t){return t.id!==prev});if(!pool.length)pool=THEMES;var pick=pool[Math.floor(Math.random()*pool.length)].id;localStorage.setItem('dashboard_theme_previous',prev);localStorage.setItem('dashboard_theme_current',pick);return pick}catch(e){return THEMES[0].id}});
  var[showPicker,sShowPicker]=useState(false);
  var T=fullTheme(themeId);
  // Resolved colors with fallback: metricColor for big numbers, descriptorColor for "In theaters" labels, subColor for percentages
  var heroMetricC=T.metricColor||T.primary;
  var heroDescriptorC=T.descriptorColor||T.muted;
  var heroSubC=T.subColor||T.secondary||T.primary;
  // N = neutral editorial palette + T.primary as accent. Used everywhere EXCEPT in the hero block.
  var N=Object.assign({},NEUTRAL,{primary:T.primary,secondary:T.primary,glow:T.glow,id:T.id,name:T.name,fonts:{},copy:{}});
  var pickTheme=useCallback(function(id){try{localStorage.setItem('dashboard_theme_previous',themeId);localStorage.setItem('dashboard_theme_current',id)}catch(e){}sThemeId(id);sShowPicker(false)},[themeId]);
  var ts=function(k){sSorts(function(p){var u={};u[k]=p[k]==='avg'?'vol':'avg';return Object.assign({},p,u)})};
  var cls=function(){sSR(null);sSP(null);sSVe(null);sSCo(null);sSDe(null);sSTg(null);sSelHM(null);sSDir(null);sSGenre(null);sSCountry(null);sSCast(null)};
  useEffect(function(){Promise.all([sb.from('pipe_data').select('data').eq('id',1).single(),sb.from('tag_registry').select('data').eq('id',1).single(),sb.from('subscriptions').select('data').eq('id',1).single(),sb.from('admin_password').select('hash').eq('id',1).single(),sb.from('film_metadata').select('*'),sb.from('watchlist_data').select('data').eq('id',1).single(),sb.from('review_data').select('data').eq('id',1).single(),sb.from('ratings_data').select('data').eq('id',1).single(),sb.from('top50_data').select('*')]).then(function(r){if(r[0].data&&r[0].data.data)sPd(r[0].data.data);if(r[1].data&&r[1].data.data)sReg(r[1].data.data);if(r[2].data&&r[2].data.data&&Array.isArray(r[2].data.data))sSubscriptions(r[2].data.data);if(r[3].data)sPwHash(r[3].data.hash||'');if(r[4].data){var fm={};r[4].data.forEach(function(m){fm[m.title+'|||'+m.year]=m});sFilmMeta(fm)}if(r[5].data&&r[5].data.data){try{var wld=typeof r[5].data.data==='string'?JSON.parse(r[5].data.data):r[5].data.data;if(Array.isArray(wld))sWlData(wld)}catch(e){}}if(r[6].data&&r[6].data.data){var revd=r[6].data.data;if(Array.isArray(revd)){var yr={};revd.forEach(function(x){yr[x.name+'|||'+x.year]=x.yRating});sYRatings(yr)}}if(r[7].data&&r[7].data.data){try{var rd=typeof r[7].data.data==='string'?JSON.parse(r[7].data.data):r[7].data.data;if(Array.isArray(rd))sAllRatings(rd)}catch(e){}}if(r[8].data){sTop50s(r[8].data.map(function(x){return{year:x.list_year,films:x.data}}).sort(function(a,b){return a.year-b.year}))}sLoading(false)}).catch(function(){sLoading(false)})},[]);
  var savePipe=useCallback(function(d){sSaving(true);sb.from('pipe_data').update({data:d,updated_at:new Date().toISOString()}).eq('id',1).then(function(){sSaving(false)}).catch(function(){sSaving(false)})},[]);
  var saveReg=useCallback(function(d){sb.from('tag_registry').update({data:d,updated_at:new Date().toISOString()}).eq('id',1).then(function(){})},[]);
  var saveSubs=useCallback(function(d){sb.from('subscriptions').update({data:d,updated_at:new Date().toISOString()}).eq('id',1).then(function(){})},[]);
  var savePw=useCallback(function(h){sb.from('admin_password').update({hash:h,updated_at:new Date().toISOString()}).eq('id',1).then(function(){})},[]);
  var saveWl=useCallback(function(d){sb.from('watchlist_data').update({data:JSON.stringify(d),updated_at:new Date().toISOString()}).eq('id',1).then(function(){})},[]);
  var saveRevs=useCallback(function(d){sb.from('review_data').update({data:d,updated_at:new Date().toISOString()}).eq('id',1).then(function(){})},[]);
  var saveRatings=useCallback(function(d){sb.from('ratings_data').update({data:d,updated_at:new Date().toISOString()}).eq('id',1).then(function(){})},[]);
  var saveTop50=useCallback(function(year,d){sb.from('top50_data').upsert({list_year:year,data:d,updated_at:new Date().toISOString()},{onConflict:'list_year'}).then(function(){})},[]);
  var doImport=useCallback(function(){if(!csv.trim())return;var r=csvToPipe(csv);sIR(r);if(r.pipe&&r.count>0){sPd(r.pipe);savePipe(r.pipe);if(!r.e.length){sSI(false);sYr('All')}}},[csv,savePipe]);
  var doClear=useCallback(function(){if(confirm('Clear all data?')){sPd('');sReg({});sSubscriptions(DSUBS);savePipe('');saveReg({});saveSubs(DSUBS);sSI(false)}},[savePipe,saveReg,saveSubs]);
  var handlePwSubmit=useCallback(function(){if(!pwHash){if(pwInput.length<4){sPwErr('Min 4 chars');return}var h=simpleHash(pwInput);sPwHash(h);savePw(h);sIsAdmin(true);sShowPwModal(false);sPwInput('');sPwErr('')}else{if(simpleHash(pwInput)===pwHash){sIsAdmin(true);sShowPwModal(false);sPwInput('');sPwErr('')}else{sPwErr('Wrong password')}}},[pwInput,pwHash,savePw]);
  var doSetTag=function(t,cat){sReg(function(p){var n=Object.assign({},p);n[t]=Object.assign({},n[t]||{},{cat:cat||null});saveReg(n);return n})};
  var doSetDn=function(t,dn){sReg(function(p){var n=Object.assign({},p);n[t]=Object.assign({},n[t]||{},{dn:dn||''});saveReg(n);return n})};
  var doBulkTag=function(){if(!bulkCat)return;sReg(function(p){var n=Object.assign({},p);Object.keys(tagSel).forEach(function(t){if(tagSel[t])n[t]=Object.assign({},n[t]||{},{cat:bulkCat})});saveReg(n);return n});sTagSel({});sBulkCat('')};
  var doUpSubs=function(fn){sSubscriptions(function(p){var n=fn(p);saveSubs(n);return n})};
  var doEnrich=useCallback(function(){if(enriching)return;sEnriching(true);sEnrichProg('Starting...');var unique={};all.forEach(function(e){var k=e.name+'|||'+e.year;if(!unique[k])unique[k]={title:e.name,year:e.year}});var todo=Object.keys(unique).filter(function(k){return!filmMeta[k]});if(!todo.length){sEnrichProg('All '+Object.keys(unique).length+' films already enriched');sEnriching(false);return}var total=todo.length,done=0,batch=[];var doOne=function(idx){if(idx>=total){if(batch.length){sb.from('film_metadata').upsert(batch,{onConflict:'title,year'}).then(function(r){var fm=Object.assign({},filmMeta);batch.forEach(function(m){fm[m.title+'|||'+m.year]=m});sFilmMeta(fm);sEnrichProg('Done! '+total+' films enriched');sEnriching(false)})}else{sEnrichProg('Done!');sEnriching(false)}return}var item=unique[todo[idx]];sEnrichProg((done+1)+'/'+total+': '+item.title);fetch('https://api.themoviedb.org/3/search/movie?query='+encodeURIComponent(item.title)+'&year='+item.year+'&language=en-US',{headers:{Authorization:'Bearer '+TMDB}}).then(function(r){return r.json()}).then(function(data){var m=data.results&&data.results[0];if(!m){done++;batch.push({title:item.title,year:item.year,tmdb_id:null,poster:null,directors:null,genres:null,runtime:null,countries:null,cast_members:null});if(batch.length>=20){var b=batch.slice();batch=[];sb.from('film_metadata').upsert(b,{onConflict:'title,year'}).then(function(){var fm2=Object.assign({},filmMeta);b.forEach(function(x){fm2[x.title+'|||'+x.year]=x});sFilmMeta(fm2)})}setTimeout(function(){doOne(idx+1)},100);return}return fetch('https://api.themoviedb.org/3/movie/'+m.id+'?append_to_response=credits&language=en-US',{headers:{Authorization:'Bearer '+TMDB}}).then(function(r2){return r2.json()}).then(function(det){var dirs=(det.credits&&det.credits.crew||[]).filter(function(c){return c.job==='Director'}).map(function(c){return c.name}).join(', ');var genres=(det.genres||[]).map(function(g){return g.name}).join(', ');var countries=(det.production_countries||[]).map(function(c){return c.iso_3166_1}).join(', ');var cast=(det.credits&&det.credits.cast||[]).slice(0,5).map(function(c){return c.name}).join(', ');var poster=m.poster_path?'https://image.tmdb.org/t/p/w92'+m.poster_path:null;done++;batch.push({title:item.title,year:item.year,tmdb_id:m.id,poster:poster,directors:dirs||null,genres:genres||null,runtime:det.runtime||null,countries:countries||null,cast_members:cast||null});if(batch.length>=20){var b2=batch.slice();batch=[];sb.from('film_metadata').upsert(b2,{onConflict:'title,year'}).then(function(){var fm3=Object.assign({},filmMeta);b2.forEach(function(x){fm3[x.title+'|||'+x.year]=x});sFilmMeta(fm3)})}setTimeout(function(){doOne(idx+1)},100)})}).catch(function(){done++;setTimeout(function(){doOne(idx+1)},100)})};doOne(0)},[all,filmMeta,enriching]);
  var all=useMemo(function(){return parsePipe(pd)},[pd]);
  var allTagCounts=useMemo(function(){var c={};all.forEach(function(e){e.tags.forEach(function(t){c[t]=(c[t]||0)+1})});return c},[all]);
  var fullReg=useMemo(function(){var r={};Object.keys(allTagCounts).forEach(function(t){r[t]=reg[t]||{cat:null,dn:''}});return r},[allTagCounts,reg]);
  var unclass=useMemo(function(){return Object.keys(fullReg).filter(function(t){return!fullReg[t].cat}).length},[fullReg]);
  var paidPlatTags=useMemo(function(){return Object.keys(fullReg).filter(function(t){return fullReg[t].cat==='platform_paid'}).sort()},[fullReg]);
  var yrs=useMemo(function(){return['All'].concat(Array.from(new Set(all.map(function(e){return e.date.slice(0,4)}))).sort())},[all]);
  var ef=useMemo(function(){var d=yr==='All'?all:all.filter(function(e){return e.date.indexOf(yr)===0});if(dateFrom)d=d.filter(function(e){return e.date>=dateFrom});if(dateTo)d=d.filter(function(e){return e.date<=dateTo});if(!iRW)d=d.filter(function(e){return!e.rewatch});return d},[all,yr,iRW,dateFrom,dateTo]);
  var ea=useMemo(function(){return iRW?all:all.filter(function(e){return!e.rewatch})},[all,iRW]);
  var dq=useMemo(function(){return calcDQ(all,fullReg,subscriptions)},[all,fullReg,subscriptions]);
  var streaks=useMemo(function(){return calcStreaks(ef)},[ef]);
  var wrapped=useMemo(function(){return calcWrapped(ea,fullReg)},[ea,fullReg]);
  var isT=useCallback(function(e){return gP(e.tags,fullReg)==='Theater'||gV(e.tags,fullReg)!==null},[fullReg]);
  var stats=useMemo(function(){var f=ef,rt=f.filter(function(e){return e.rating!==null}),av=rt.length?rt.reduce(function(s,e){return s+e.rating},0)/rt.length:0;return{total:f.length,avg:av.toFixed(2),th:f.filter(isT).length,rw:f.filter(function(e){return e.rewatch}).length,fo:f.filter(function(e){return e.tags.indexOf('foreign')!==-1}).length,fr:f.filter(function(e){return gC(e.tags,fullReg).length>0}).length}},[ef,fullReg,isT]);
  var yoy=useMemo(function(){if(yr==='All')return null;var py=String(parseInt(yr)-1),pv=all.filter(function(e){return e.date.indexOf(py)===0});if(!pv.length)return null;if(!iRW)pv=pv.filter(function(e){return!e.rewatch});var pN=pv.length,cN=ef.length;if(!pN||!cN)return null;var pp=function(cf,pf){return(cf/cN*100)-(pf/pN*100)};var pR=pv.filter(function(e){return e.rating!==null}),cR=ef.filter(function(e){return e.rating!==null});return{films:cN-pN,avg:(pR.length&&cR.length)?(cR.reduce(function(s,e){return s+e.rating},0)/cR.length)-(pR.reduce(function(s,e){return s+e.rating},0)/pR.length):null,th:pp(ef.filter(isT).length,pv.filter(isT).length),rw:iRW?pp(ef.filter(function(e){return e.rewatch}).length,pv.filter(function(e){return e.rewatch}).length):null,fo:pp(ef.filter(function(e){return e.tags.indexOf('foreign')!==-1}).length,pv.filter(function(e){return e.tags.indexOf('foreign')!==-1}).length),fr:pp(ef.filter(function(e){return gC(e.tags,fullReg).length>0}).length,pv.filter(function(e){return gC(e.tags,fullReg).length>0}).length)}},[yr,ef,all,iRW,fullReg,isT]);
  var searchRes=useMemo(function(){if(!sq||sq.length<2)return[];var q=sq.toLowerCase();return all.filter(function(e){return e.name.toLowerCase().indexOf(q)!==-1}).slice(0,12)},[all,sq]);
  var binge=useMemo(function(){var dt=Array.from(new Set(ef.map(function(e){return e.date}))).sort();if(dt.length<2)return{streak:1,range:dt[0]||'N/A'};var ms=1,cs=1,mi=0,ci=0;for(var i=1;i<dt.length;i++){var d=Math.round((new Date(dt[i])-new Date(dt[i-1]))/864e5);if(d===1){cs++;if(cs>ms){ms=cs;mi=ci}}else{cs=1;ci=i}}var sd=dt.slice(mi,mi+ms),s0=sd[0].split('-').map(Number),sL=sd[sd.length-1].split('-').map(Number);var r;if(ms===1)r=MF[s0[1]-1]+' '+s0[2]+', '+s0[0];else if(s0[0]===sL[0]&&s0[1]===sL[1])r=MF[s0[1]-1]+' '+s0[2]+'\u2013'+sL[2]+', '+s0[0];else r=MS[s0[1]-1]+' '+s0[2]+' \u2013 '+MS[sL[1]-1]+' '+sL[2]+', '+s0[0];return{streak:ms,range:r}},[ef]);
  var busiest=useMemo(function(){var c={};ef.forEach(function(e){c[e.date]=(c[e.date]||0)+1});var en=Object.entries(c).sort(function(a,b){return b[1]-a[1]});if(!en.length)return{count:0,fmt:'N/A',films:[]};var d=en[0][0],n=en[0][1],p=d.split('-').map(Number);return{count:n,fmt:MF[p[1]-1]+' '+p[2]+', '+p[0],films:ef.filter(function(e){return e.date===d}).map(function(e){return e.name})}},[ef]);
  var bestMo=useMemo(function(){var c={};ef.forEach(function(e){var m=e.date.slice(0,7);c[m]=(c[m]||0)+1});return Object.entries(c).sort(function(a,b){return b[1]-a[1]}).slice(0,1).map(function(x){return{label:fmtM(x[0]),count:x[1]}})},[ef]);
  var hmData=useMemo(function(){var yy=Array.from(new Set(ea.map(function(e){return e.date.slice(0,4)}))).sort(),g={};yy.forEach(function(y){g[y]=Array(12).fill(0)});ea.forEach(function(e){var y=e.date.slice(0,4),m=parseInt(e.date.slice(5,7))-1;if(g[y])g[y][m]++});return{years:yy,grid:g,max:Math.max.apply(null,Object.values(g).map(function(a){return Math.max.apply(null,a)}).concat([1]))}},[ea]);
  var hmFilms=useMemo(function(){if(!selHM)return[];return ea.filter(function(e){return e.date.slice(0,4)===selHM.yr&&parseInt(e.date.slice(5,7))===selHM.mo+1})},[ea,selHM]);
  var cumData=useMemo(function(){var yy=Array.from(new Set(ea.map(function(e){return parseInt(e.date.slice(0,4))}))).sort(function(a,b){return a-b}),last={},first={};ea.forEach(function(e){var y=parseInt(e.date.slice(0,4)),m=parseInt(e.date.slice(5,7));last[y]=Math.max(last[y]||0,m);first[y]=Math.min(first[y]||13,m)});var rows=[];for(var m=1;m<=12;m++){var row={month:MS[m-1]};yy.forEach(function(y){row[y]=m<(first[y]||1)||m>(last[y]||12)?null:ea.filter(function(e){return parseInt(e.date.slice(0,4))===y&&parseInt(e.date.slice(5,7))<=m}).length});rows.push(row)}return{data:rows,years:yy}},[ea]);
  var rDist=useMemo(function(){var c={};for(var r=0.5;r<=5;r+=0.5)c[r]=0;ef.forEach(function(e){if(e.rating!==null)c[e.rating]=(c[e.rating]||0)+1});return Object.entries(c).sort(function(a,b){return parseFloat(a[0])-parseFloat(b[0])}).map(function(x){return{rating:x[0],count:x[1]}})},[ef]);
  var selFilms=useMemo(function(){return sR===null?[]:ef.filter(function(e){return e.rating===sR})},[ef,sR]);
  var platD=useMemo(function(){return agg(ef,function(e){return gP(e.tags,fullReg)}).sort(function(a,b){return b.Films-a.Films})},[ef,fullReg]);
  var platF=useMemo(function(){return sP?ef.filter(function(e){return gP(e.tags,fullReg)===sP}):[]},[ef,sP,fullReg]);
  var venD=useMemo(function(){var v={};ef.forEach(function(e){var vn=gV(e.tags,fullReg);if(!vn)return;var dn=getDn(vn,fullReg);if(!v[dn])v[dn]={c:0,s:0,r:0};v[dn].c++;if(e.rating!==null){v[dn].s+=e.rating;v[dn].r++}});return Object.keys(v).map(function(n){var d=v[n];return{name:n,Films:d.c,Avg:d.r?parseFloat((d.s/d.r).toFixed(2)):0}}).sort(function(a,b){return b.Films-a.Films})},[ef,fullReg]);
  var venF=useMemo(function(){return sVe?ef.filter(function(e){var vn=gV(e.tags,fullReg);return vn&&getDn(vn,fullReg)===sVe}):[]},[ef,sVe,fullReg]);
  var compD=useMemo(function(){var c={},ft={};ef.forEach(function(e){gC(e.tags,fullReg).forEach(function(n){if(!c[n])c[n]={c:0,s:0,r:0};c[n].c++;if(e.rating!==null){c[n].s+=e.rating;c[n].r++}if(!ft[n])ft[n]=[];ft[n].push(e)})});return Object.keys(c).map(function(n){var v=c[n],t3=(ft[n]||[]).filter(function(e){return e.rating!==null}).sort(function(a,b){return b.rating-a.rating}).slice(0,3).map(function(e){return e.name+' ('+e.rating+'\u2605)'}).join(', ');return{name:n,Films:v.c,Avg:v.r?parseFloat((v.s/v.r).toFixed(2)):0,tip:t3?'Top: '+t3:''}}).sort(function(a,b){return b.Films-a.Films})},[ef,fullReg]);
  var compF=useMemo(function(){return sCo?ef.filter(function(e){return gC(e.tags,fullReg).indexOf(sCo)!==-1}):[]},[ef,sCo,fullReg]);
  var solo=useMemo(function(){var s=ef.filter(function(e){return gC(e.tags,fullReg).length>0}).length;return{solo:ef.length-s,social:s}},[ef,fullReg]);
  var decD=useMemo(function(){return agg(ef,function(e){return Math.floor(e.year/10)*10+'s'}).sort(function(a,b){return a.name<b.name?-1:1})},[ef]);
  var decF=useMemo(function(){return sDe?ef.filter(function(e){return Math.floor(e.year/10)*10===parseInt(sDe)}):[]},[ef,sDe]);
  var tasteTags=useMemo(function(){return Object.keys(fullReg).filter(function(t){return fullReg[t].cat==='taste'})},[fullReg]);
  var tagD=useMemo(function(){return tasteTags.map(function(t){var m=ef.filter(function(e){return e.tags.indexOf(t)!==-1}),r=m.filter(function(e){return e.rating!==null});return{name:getDn(t,fullReg),tag:t,Films:m.length,Avg:r.length?parseFloat((r.reduce(function(s,e){return s+e.rating},0)/r.length).toFixed(2)):0}}).sort(function(a,b){return b.Films-a.Films})},[ef,tasteTags,fullReg]);
  var tagF=useMemo(function(){if(!sTg)return[];var entry=tagD.find(function(d){return d.name===sTg});return entry?ef.filter(function(e){return e.tags.indexOf(entry.tag)!==-1}):[]},[ef,sTg,tagD]);
  var gMeta=function(e){var k=e.name+"|||"+e.year;if(filmMeta[k])return filmMeta[k];var nk=e.name.replace(/[\u2018\u2019\u0060\u00B4]/g,"'")+"|||"+e.year;if(filmMeta[nk])return filmMeta[nk];for(var key in filmMeta){if(key.split("|||")[1]===String(e.year)&&key.split("|||")[0].replace(/[\u2018\u2019\u0060\u00B4]/g,"'")===nk.split("|||")[0])return filmMeta[key]}return null};
  var efMeta=useMemo(function(){if(!dirUniq)return ef;var seen={};return ef.filter(function(e){if(e.rewatch)return false;var k=e.name+"|||"+e.year;if(seen[k])return false;seen[k]=true;return true})},[ef,dirUniq]);
  var dirD=useMemo(function(){var d={},ft={};efMeta.forEach(function(e){var m=gMeta(e);if(!m||!m.directors)return;m.directors.split(", ").forEach(function(dir){if(!dir)return;if(!d[dir])d[dir]={c:0,s:0,r:0};d[dir].c++;if(e.rating!==null){d[dir].s+=e.rating;d[dir].r++}if(!ft[dir])ft[dir]=[];ft[dir].push(e)})});return Object.keys(d).map(function(n){var v=d[n];var t3=(ft[n]||[]).filter(function(e){return e.rating!==null}).sort(function(a,b){return b.rating-a.rating}).slice(0,3).map(function(e){return e.name+" ("+e.rating+"\u2605)"}).join(", ");return{name:n,Films:v.c,Avg:v.r?parseFloat((v.s/v.r).toFixed(2)):0,tip:t3?"Top: "+t3:""}}).sort(function(a,b){return b.Films-a.Films})},[efMeta,filmMeta]);
  var dirF=useMemo(function(){if(!sDir)return[];return efMeta.filter(function(e){var m=gMeta(e);return m&&m.directors&&m.directors.split(", ").indexOf(sDir)!==-1})},[efMeta,sDir,filmMeta]);
  var dirStats=useMemo(function(){var totalR=0,totalH=0,rtCount=0;efMeta.forEach(function(e){var m=gMeta(e);if(m&&m.runtime){totalR+=m.runtime;rtCount++}});totalH=Math.round(totalR/60);var uDir=new Set();efMeta.forEach(function(e){var m=gMeta(e);if(m&&m.directors)m.directors.split(", ").forEach(function(d){if(d)uDir.add(d)})});return{totalH:totalH,totalR:totalR,uDir:uDir.size,avgRun:rtCount?Math.round(totalR/rtCount):0,rtCount:rtCount,rtTotal:efMeta.length,rtMissingPct:efMeta.length?Math.round((efMeta.length-rtCount)/efMeta.length*100):0}},[efMeta,filmMeta]);
  var genreD=useMemo(function(){var g={};efMeta.forEach(function(e){var m=gMeta(e);if(!m||!m.genres)return;m.genres.split(", ").forEach(function(gn){if(!gn)return;if(!g[gn])g[gn]={c:0,s:0,r:0};g[gn].c++;if(e.rating!==null){g[gn].s+=e.rating;g[gn].r++}})});return Object.keys(g).map(function(n){var v=g[n];return{name:n,Films:v.c,Avg:v.r?parseFloat((v.s/v.r).toFixed(2)):0}}).sort(function(a,b){return b.Films-a.Films})},[efMeta,filmMeta]);
  var countryD=useMemo(function(){var c={};efMeta.forEach(function(e){var m=gMeta(e);if(!m||!m.countries)return;m.countries.split(", ").forEach(function(cn){if(!cn)return;if(!c[cn])c[cn]={c:0,s:0,r:0};c[cn].c++;if(e.rating!==null){c[cn].s+=e.rating;c[cn].r++}})});return Object.keys(c).map(function(n){var v=c[n];return{name:n,Films:v.c,Avg:v.r?parseFloat((v.s/v.r).toFixed(2)):0}}).sort(function(a,b){return b.Films-a.Films})},[efMeta,filmMeta]);
  var castD=useMemo(function(){var c={},ft={};efMeta.forEach(function(e){var m=gMeta(e);if(!m||!m.cast_members)return;m.cast_members.split(", ").forEach(function(a){if(!a)return;if(!c[a])c[a]={c:0,s:0,r:0};c[a].c++;if(e.rating!==null){c[a].s+=e.rating;c[a].r++}if(!ft[a])ft[a]=[];ft[a].push(e)})});return Object.keys(c).map(function(n){var v=c[n];var t3=(ft[n]||[]).filter(function(e){return e.rating!==null}).sort(function(a,b){return b.rating-a.rating}).slice(0,3).map(function(e){return e.name+" ("+e.rating+"\u2605)"}).join(", ");return{name:n,Films:v.c,Avg:v.r?parseFloat((v.s/v.r).toFixed(2)):0,tip:t3?"Top: "+t3:""}}).sort(function(a,b){return b.Films-a.Films})},[efMeta,filmMeta]);
  var castF=useMemo(function(){if(!sCast)return[];return efMeta.filter(function(e){var m=gMeta(e);return m&&m.cast_members&&m.cast_members.split(", ").indexOf(sCast)!==-1})},[efMeta,sCast,filmMeta]);
  var genreF=useMemo(function(){if(!sGenre)return[];return efMeta.filter(function(e){var m=gMeta(e);return m&&m.genres&&m.genres.split(", ").indexOf(sGenre)!==-1})},[efMeta,sGenre,filmMeta]);
  var countryF=useMemo(function(){if(!sCountry)return[];return efMeta.filter(function(e){var m=gMeta(e);return m&&m.countries&&m.countries.split(", ").indexOf(sCountry)!==-1})},[efMeta,sCountry,filmMeta]);
  var normName=function(s){return(s||'').replace(/[\u2018\u2019\u0060\u00B4]/g,"'").trim().toLowerCase()};
  var yRatingsNorm=useMemo(function(){var n={};Object.keys(yRatings).sort().forEach(function(k){var p=k.split('|||');var nk=normName(p[0])+'|||'+p[1];if(!(nk in n))n[nk]=yRatings[k]});return n},[yRatings]);
  var gYR=function(name,year){var nk=normName(name)+'|||'+year;return nk in yRatingsNorm?yRatingsNorm[nk]:undefined};
  var yFilms=useMemo(function(){return ef.filter(function(e){return gC(e.tags,fullReg).some(function(n){return n.toLowerCase().indexOf("yesmine")!==-1})}).map(function(e){var yr=gYR(e.name,e.year);return{name:e.name,year:e.year,date:e.date,rating:e.rating,yRating:yr!==undefined?yr:null,diff:e.rating!==null&&typeof yr==="number"?Math.abs(e.rating-yr):null}})},[ef,yRatingsNorm,fullReg])
  var yStats=useMemo(function(){if(!yFilms.length)return{count:0,rated:0,myAvg:0,yAvg:0,agree:0,disagree:[]};var myS=0,myC=0,yS=0,yC=0,rated=0;yFilms.forEach(function(f){if(f.rating!==null){myS+=f.rating;myC++}if(typeof f.yRating==="number"){yS+=f.yRating;yC++;rated++}});var sorted=yFilms.filter(function(f){return f.diff!==null}).sort(function(a,b){return b.diff-a.diff});var agree=yFilms.filter(function(f){return f.diff!==null&&f.diff<=0.5}).length;return{count:yFilms.length,rated:rated,myAvg:myC?myS/myC:0,yAvg:yC?yS/yC:0,agree:agree,disagree:sorted.slice(0,10)}},[yFilms]);
  var yMissing=useMemo(function(){return ef.filter(function(e){return gC(e.tags,fullReg).some(function(n){return n.toLowerCase().indexOf("yesmine")!==-1})&&gYR(e.name,e.year)===undefined}).slice().sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:a.name<b.name?-1:1})},[ef,yRatingsNorm,fullReg])
  var yScatter=useMemo(function(){return yFilms.filter(function(f){return f.rating!==null&&typeof f.yRating==="number"})},[yFilms]);
  var rwCandidates=useMemo(function(){var lastWatch={};all.forEach(function(e){var k=e.name+"|||"+e.year;if(!lastWatch[k]||e.date>lastWatch[k])lastWatch[k]=e.date});var bestRating={};if(allRatings.length){allRatings.forEach(function(e){var k=e.name+"|||"+e.year;bestRating[k]=e.rating;if(!lastWatch[k]||e.date>lastWatch[k])lastWatch[k]=e.date})}all.forEach(function(e){if(e.rating!==null){var k=e.name+"|||"+e.year;if(bestRating[k]===undefined)bestRating[k]=e.rating}});var seen={};return Object.keys(bestRating).filter(function(k){return bestRating[k]>=4}).map(function(k){var p=k.split("|||");return{name:p[0],year:parseInt(p[1]),rating:bestRating[k],lastWatch:lastWatch[k]||"unknown",months:lastWatch[k]?Math.round((new Date()-new Date(lastWatch[k]+"T12:00:00"))/(1000*60*60*24*30)):999}}).sort(function(a,b){return b.months-a.months||b.rating-a.rating})},[all,allRatings]);
  var top50Evo=useMemo(function(){if(!top50s.length)return{years:[],films:[]};var yrs=top50s.map(function(t){return t.year}).sort();var fm={};top50s.forEach(function(t){(t.films||[]).forEach(function(fi){var k=fi.name+"|||"+fi.year;if(!fm[k])fm[k]={name:fi.name,year:fi.year,ranks:{}};fm[k].ranks[t.year]=fi.pos})});var films=Object.values(fm);films.sort(function(a,b){var la=a.ranks[yrs[yrs.length-1]]||999;var lb=b.ranks[yrs[yrs.length-1]]||999;return la-lb});return{years:yrs,films:films}},[top50s]);
var diaryData=useMemo(function(){var d=ef.filter(function(e){return!dSrch||e.name.toLowerCase().indexOf(dSrch.toLowerCase())!==-1});return[].concat(d).sort(function(a,b){var c=dSrt.col,m=dSrt.asc?1:-1;if(c==='date')return(a.date<b.date?-1:1)*m;if(c==='name')return a.name.toLowerCase()<b.name.toLowerCase()?-m:m;if(c==='year')return(a.year-b.year)*m;if(c==='rating')return((a.rating||0)-(b.rating||0))*m;return 0})},[ef,dSrt,dSrch]);
  var tagAllSorted=useMemo(function(){return Object.keys(fullReg).sort(function(a,b){return(allTagCounts[b]||0)-(allTagCounts[a]||0)})},[fullReg,allTagCounts]);
  var tagFiltered=useMemo(function(){return tagAllSorted.filter(function(t){return!tagSearch||t.indexOf(tagSearch.toLowerCase())!==-1})},[tagAllSorted,tagSearch]);
  var tagSelCount=useMemo(function(){return Object.keys(tagSel).filter(function(k){return tagSel[k]}).length},[tagSel]);
  var tagGrouped=useMemo(function(){var g={_un:[]};CATS.forEach(function(c){g[c]=[]});tagFiltered.forEach(function(t){var c=fullReg[t]&&fullReg[t].cat;if(c&&g[c])g[c].push(t);else g._un.push(t)});return g},[tagFiltered,fullReg]);
  var costYrs=useMemo(function(){return['All'].concat(Array.from(new Set(all.map(function(e){return e.date.slice(0,4)}))).sort())},[all]);
  var costData=useMemo(function(){var now=getNowYM();return Array.from(new Set(all.map(function(e){return e.date.slice(0,4)}))).sort().map(function(y){
    var films=all.filter(function(e){return e.date.indexOf(y)===0});var st=0,sbk=[];subscriptions.forEach(function(sub){sub.periods.forEach(function(pr){if(!pr.from||!pr.price)return;var pTo=pr.to||now,yS=y+'-01',yE=y+'-12',eF=pr.from>yS?pr.from:yS,eT=pTo<yE?pTo:yE;if(eF>eT)return;var mo=mBt(eF,eT),co=mo*pr.price;st+=co;sbk.push({name:sub.name,mo:mo,price:pr.price,cost:co})})});
    var tt=0,tc=0,rt=0,rc=0;films.forEach(function(e){var vn=gV(e.tags,fullReg);if(vn&&getCat(vn,fullReg)==='sub_venue'&&!isSubCovAt(e.date,subscriptions)){var p=gTP(e.tags,fullReg);if(p!==null){tt+=p;tc++}}if(vn&&getCat(vn,fullReg)==='indie_venue'){var p2=gTP(e.tags,fullReg);if(p2!==null){tt+=p2;tc++}}if(vn&&getCat(vn,fullReg)==='sub_venue'&&isSubCovAt(e.date,subscriptions)){var p3=gTP(e.tags,fullReg);if(p3!==null){tt+=p3;tc++}}if(e.tags.some(function(t){return getCat(t,fullReg)==='platform_rental'})){var p4=gTP(e.tags,fullReg);if(p4!==null){rt+=p4;rc++}}});
    var platRows=[];subscriptions.forEach(function(sub){var subCost=0;sub.periods.forEach(function(pr){if(!pr.from||!pr.price)return;var pTo=pr.to||now,yS=y+'-01',yE=y+'-12',eF=pr.from>yS?pr.from:yS,eT=pTo<yE?pTo:yE;if(eF>eT)return;subCost+=mBt(eF,eT)*pr.price});if(sub.platforms.indexOf('_theater_sub')!==-1){var covF=films.filter(function(e){var vn=gV(e.tags,fullReg);return vn&&getCat(vn,fullReg)==='sub_venue'&&isSubCovAt(e.date,subscriptions)});if(covF.length>0)platRows.push({plat:'Sub Theaters',films:covF.length,sub:sub.name,cost:subCost,cpf:subCost/covF.length})}else{var subFC=films.filter(function(e){return e.tags.some(function(t){return sub.platforms.indexOf(t)!==-1})}).length;var cpf=subFC?subCost/subFC:0;sub.platforms.forEach(function(pt){var cnt=films.filter(function(e){return e.tags.indexOf(pt)!==-1}).length;if(cnt>0)platRows.push({plat:getDn(pt,fullReg),films:cnt,sub:sub.name,cost:cpf*cnt,cpf:cpf})})}});
    var renF=films.filter(function(e){return e.tags.some(function(t){return getCat(t,fullReg)==='platform_rental'})});var renC=0;renF.forEach(function(e){var p=gTP(e.tags,fullReg);if(p!==null)renC+=p});if(renF.length)platRows.push({plat:'Rental',films:renF.length,sub:'Per use',cost:renC,cpf:renC/renF.length});
    var tkAll=[],tkC=0;films.forEach(function(e){var vn=gV(e.tags,fullReg);if(!vn)return;var cat=getCat(vn,fullReg);if(cat==='indie_venue'||(cat==='sub_venue'&&!isSubCovAt(e.date,subscriptions))){tkAll.push(e);var p=gTP(e.tags,fullReg);if(p!==null)tkC+=p}});if(tkAll.length&&tkC>0)platRows.push({plat:'Theaters (per ticket)',films:tkAll.length,sub:'Per ticket',cost:tkC,cpf:tkC/tkAll.length});
    var tot=st+tt+rt;return{yr:y,films:films.length,st:st,sbk:sbk,tt:tt,tc:tc,rt:rt,rc:rc,tot:tot,pf:films.length?tot/films.length:0,platRows:platRows}})},[all,subscriptions,fullReg]);
  var costDataFilt=useMemo(function(){return costYr==='All'?costData:costData.filter(function(d){return d.yr===costYr})},[costData,costYr]);
  var moneySpent=useMemo(function(){var t=0;if(yr==='All'){costData.forEach(function(d){t+=d.tot})}else{var d=costData.find(function(d){return d.yr===yr});if(d)t=d.tot}return t},[costData,yr]);
  var allTimeTotals=useMemo(function(){var st=0,tt=0,tc=0,rt=0,rc=0,fn=0,pr=[];costData.forEach(function(d){st+=d.st;tt+=d.tt;tc+=d.tc;rt+=d.rt;rc+=d.rc;fn+=d.films;d.platRows.forEach(function(r){var ex=pr.find(function(x){return x.plat===r.plat});if(ex){ex.cost+=r.cost;ex.films+=r.films}else{pr.push({plat:r.plat,films:r.films,sub:r.sub,cost:r.cost})}})});pr.forEach(function(r){r.cpf=r.films?r.cost/r.films:0});var tot=st+tt+rt;return{st:st,tt:tt,tc:tc,rt:rt,rc:rc,tot:tot,films:fn,pf:fn?tot/fn:0,platRows:pr}},[costData]);
  var monthlySpend=useMemo(function(){if(!all.length)return[];var now=getNowYM();var months=[];var first=all[0].date.slice(0,7),last=all[all.length-1].date.slice(0,7);var cur=first;while(cur<=last){months.push(cur);var p=cur.split('-').map(Number);p[1]++;if(p[1]>12){p[0]++;p[1]=1}cur=p[0]+'-'+String(p[1]).padStart(2,'0')}return months.map(function(ym){var sc=subCostForMonth(ym,subscriptions);var mF=all.filter(function(e){return e.date.slice(0,7)===ym});var tk=0,rl=0;mF.forEach(function(e){var vn=gV(e.tags,fullReg);if(vn){var pr=gTP(e.tags,fullReg);if(pr!==null)tk+=pr}if(e.tags.some(function(t){return getCat(t,fullReg)==='platform_rental'})){var p2=gTP(e.tags,fullReg);if(p2!==null)rl+=p2}});return{m:MS[parseInt(ym.slice(5))-1]+' '+ym.slice(2,4),ym:ym,subs:sc,tickets:tk,rentals:rl,total:sc+tk+rl}})},[all,subscriptions,fullReg]);
  var monthlyFilt=useMemo(function(){if(costYr==='All')return monthlySpend;return monthlySpend.filter(function(m){return m.ym.indexOf(costYr)===0})},[monthlySpend,costYr]);
  var cpfData=useMemo(function(){var src=monthlyFilt;if(src.length<2)return[];var cs=costYr==='All'?3:1;var res=[];for(var i=0;i<src.length;i+=cs){var ch=src.slice(i,i+cs);var cost=ch.reduce(function(s,m){return s+m.total},0);var fl=ch[0].m,ll=ch[ch.length-1].m;var fc=0;ch.forEach(function(m){fc+=all.filter(function(e){return e.date.slice(0,7)===m.ym}).length});res.push({q:fl,period:cs===1?fl:fl+' \u2013 '+ll,cost:cost,films:fc,cpf:fc?cost/fc:0})}return res},[monthlyFilt,all,costYr]);
  var platRankSub=useMemo(function(){var now=getNowYM();var src=costYr==='All'?all:all.filter(function(e){return e.date.indexOf(costYr)===0});var rows=[];subscriptions.forEach(function(sub){var tc=0;sub.periods.forEach(function(pr){if(!pr.from||!pr.price)return;var to=pr.to||now;if(costYr!=='All'){var yS=costYr+'-01',yE=costYr+'-12',eF=pr.from>yS?pr.from:yS,eT=to<yE?to:yE;if(eF>eT)return;tc+=mBt(eF,eT)*pr.price}else{tc+=mBt(pr.from,to)*pr.price}});var covF=src.filter(function(e){var ym=e.date.slice(0,7);var inP=sub.periods.some(function(pr){if(!pr.from)return false;return ym>=pr.from&&ym<=(pr.to||now)});if(!inP)return false;if(sub.platforms.indexOf('_theater_sub')!==-1){var vn=gV(e.tags,fullReg);return vn&&getCat(vn,fullReg)==='sub_venue'}return e.tags.some(function(t){return sub.platforms.indexOf(t)!==-1})});if(covF.length>0&&tc>0)rows.push({name:sub.name,cost:tc,films:covF.length,cpf:tc/covF.length,avg:avgR(covF)})});var rc=0,rn=0,rF=[];src.forEach(function(e){if(e.tags.some(function(t){return getCat(t,fullReg)==='platform_rental'})){rn++;rF.push(e);var p=gTP(e.tags,fullReg);if(p!==null)rc+=p}});if(rn>0&&rc>0)rows.push({name:'Rental',cost:rc,films:rn,cpf:rc/rn,avg:avgR(rF)});var tkF=[],tkC=0;src.forEach(function(e){var vn=gV(e.tags,fullReg);if(!vn)return;var cat=getCat(vn,fullReg);if(cat==='indie_venue'||(cat==='sub_venue'&&!isSubCovAt(e.date,subscriptions))){tkF.push(e);var p=gTP(e.tags,fullReg);if(p!==null)tkC+=p}});if(tkF.length&&tkC>0)rows.push({name:'Theaters (per ticket)',cost:tkC,films:tkF.length,cpf:tkC/tkF.length,avg:avgR(tkF)});var cl=[T.primary,T.primary,T.primary,T.primary,T.primary,T.primary,T.primary,T.primary,T.primary];return rows.map(function(r,i){return Object.assign({},r,{color:cl[i%cl.length]})}).sort(function(a,b){return a.cpf-b.cpf})},[all,subscriptions,fullReg,costYr]);
  var platRankPlat=useMemo(function(){var now=getNowYM();var src=costYr==="All"?all:all.filter(function(e){return e.date.indexOf(costYr)===0});var pm={};paidPlatTags.forEach(function(pt){var dn=getDn(pt,fullReg);if(!pm[dn])pm[dn]={films:[],cost:0};src.filter(function(e){if(e.tags.indexOf(pt)===-1)return false;return subscriptions.some(function(sub){if(sub.platforms.indexOf(pt)===-1)return false;return sub.periods.some(function(pr){if(!pr.from)return false;return e.date.slice(0,7)>=pr.from&&e.date.slice(0,7)<=(pr.to||now)})})}).forEach(function(e){if(pm[dn].films.indexOf(e)===-1)pm[dn].films.push(e)})});subscriptions.forEach(function(sub){sub.platforms.forEach(function(pt){if(pt==="_theater_sub")return;var dn=getDn(pt,fullReg);if(!pm[dn])return;var sc=0;sub.periods.forEach(function(pr){if(!pr.from||!pr.price)return;var to=pr.to||now;if(costYr!=="All"){var yS=costYr+"-01",yE=costYr+"-12",eF=pr.from>yS?pr.from:yS,eT=to<yE?to:yE;if(eF>eT)return;sc+=mBt(eF,eT)*pr.price}else{sc+=mBt(pr.from,to)*pr.price}});var ac=src.filter(function(e){return e.tags.some(function(t){return sub.platforms.indexOf(t)!==-1})&&sub.periods.some(function(pr){if(!pr.from)return false;return e.date.slice(0,7)>=pr.from&&e.date.slice(0,7)<=(pr.to||now)})}).length;if(ac>0){var pc=pm[dn].films.filter(function(e){return sub.periods.some(function(pr){if(!pr.from)return false;return e.date.slice(0,7)>=pr.from&&e.date.slice(0,7)<=(pr.to||now)})}).length;pm[dn].cost+=(pc/ac)*sc}})});var subThF=src.filter(function(e){var vn=gV(e.tags,fullReg);return vn&&getCat(vn,fullReg)==="sub_venue"&&isSubCovAt(e.date,subscriptions)});var subThC=0;subscriptions.forEach(function(sub){if(sub.platforms.indexOf("_theater_sub")===-1)return;sub.periods.forEach(function(pr){if(!pr.from||!pr.price)return;var to=pr.to||now;if(costYr!=="All"){var yS=costYr+"-01",yE=costYr+"-12",eF=pr.from>yS?pr.from:yS,eT=to<yE?to:yE;if(eF>eT)return;subThC+=mBt(eF,eT)*pr.price}else{subThC+=mBt(pr.from,to)*pr.price}})});if(subThF.length>0&&subThC>0)pm["Sub Theaters"]={films:subThF,cost:subThC};var tkF=[],tkC=0;src.forEach(function(e){var vn=gV(e.tags,fullReg);if(!vn)return;var cat=getCat(vn,fullReg);if(cat==="indie_venue"||(cat==="sub_venue"&&!isSubCovAt(e.date,subscriptions))){tkF.push(e);var p=gTP(e.tags,fullReg);if(p!==null)tkC+=p}});if(tkF.length&&tkC>0)pm["Theaters (per ticket)"]={films:tkF,cost:tkC};var rF=[],rC2=0;src.forEach(function(e){if(e.tags.some(function(t){return getCat(t,fullReg)==="platform_rental"})){rF.push(e);var p=gTP(e.tags,fullReg);if(p!==null)rC2+=p}});if(rF.length&&rC2>0)pm["Rental"]={films:rF,cost:rC2};var cl=[T.primary,T.primary,T.primary,T.primary,T.primary,T.primary,T.primary,T.primary,T.primary];return Object.keys(pm).filter(function(n){return pm[n].cost>0&&pm[n].films.length>0}).map(function(n,i){var d=pm[n];return{name:n,cost:d.cost,films:d.films.length,cpf:d.cost/d.films.length,avg:avgR(d.films),color:cl[i%cl.length]}}).sort(function(a,b){return a.cpf-b.cpf})},[all,subscriptions,fullReg,costYr,paidPlatTags]);
  var platRanking=rankMode==='sub'?platRankSub:platRankPlat;

  // ============================================================
  // SHARED INLINE STYLES
  // ============================================================
  var inputStyle={background:N.paper,border:'0.5px solid '+N.border,borderRadius:0,color:N.ink,padding:'6px 10px',fontSize:13,outline:'none'};
  var btnSecondary={background:'transparent',border:'0.5px solid '+N.border,borderRadius:0,color:N.muted,padding:'4px 10px',fontSize:11,cursor:'pointer'};
  var btnPrimary={background:N.ink,border:'0.5px solid '+N.ink,borderRadius:0,color:N.paper,padding:'6px 14px',fontSize:12,fontWeight:500,cursor:'pointer'};

  var renderTagRow=function(t,showCheck){var e=fullReg[t]||{};return <div key={t} className="flex items-center gap-2 py-1" style={{borderBottom:'0.5px solid '+N.border}}>{showCheck&&<input type="checkbox" checked={!!tagSel[t]} onChange={function(){sTagSel(function(p){var n=Object.assign({},p);n[t]=!n[t];return n})}} style={{accentColor:T.primary}}/>}<div className="flex-1 text-xs truncate min-w-0" title={t} style={{color:N.inkSoft}}>{t}</div><div className="text-xs w-8 text-right shrink-0" style={{color:N.mutedSoft}}>{allTagCounts[t]||0}</div>{isAdmin?<select className="text-xs w-28 shrink-0" style={{background:N.paper,border:'0.5px solid '+N.border,borderRadius:0,color:N.inkSoft,padding:'2px 4px'}} value={e.cat||''} onChange={function(ev){doSetTag(t,ev.target.value)}}><option value="">—</option>{CATS.map(function(c){return <option key={c} value={c}>{CI[c].l}</option>})}</select>:<div className="text-xs w-28 shrink-0 text-right" style={{color:e.cat?N.inkSoft:N.mutedSoft}}>{e.cat?CI[e.cat].l:'—'}</div>}{isAdmin?<input className="text-xs w-28 shrink-0" style={{background:N.paper,border:'0.5px solid '+N.border,borderRadius:0,color:N.inkSoft,padding:'2px 4px'}} placeholder="Display name" value={e.dn||''} onChange={function(ev){doSetDn(t,ev.target.value)}}/>:<div className="text-xs w-28 shrink-0 text-right truncate" style={{color:N.muted}}>{e.dn||''}</div>}</div>};

  var TABS_ALL=[{id:'overview',l:'Overview'},{id:'where',l:'Where'},{id:'who',l:'Who'},{id:'yesmine',l:'Yesmine'},{id:'taste',l:'Taste'},{id:'films',l:'Films'},{id:'diary',l:'Diary'},{id:'rankings',l:'Rankings'},{id:'costs',l:'Costs'},{id:'tags',l:'Tags'}];
  var TABS=isAdmin?TABS_ALL:TABS_ALL.filter(function(t){return t.id!=='tags'});

  var themePickerModal=showPicker?<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60,padding:'40px 20px',overflowY:'auto'}} onClick={function(){sShowPicker(false)}}><div style={{background:N.paper,border:'0.5px solid '+N.borderStrong,borderRadius:0,padding:24,maxWidth:720,width:'100%',maxHeight:'90vh',overflowY:'auto'}} onClick={function(e){e.stopPropagation()}}><div className="flex justify-between items-baseline mb-4 pb-3" style={{borderBottom:'0.5px solid '+N.border}}><div><div style={{fontSize:9,letterSpacing:'0.22em',color:N.muted,textTransform:'uppercase'}}>Choose a theme</div><div style={{fontSize:18,fontWeight:500,color:N.ink,marginTop:4}}>{THEMES.length} cinematic palettes</div></div><button onClick={function(){sShowPicker(false)}} style={btnSecondary}>{'\u2715'}</button></div><div className="grid grid-cols-2 md:grid-cols-3 gap-2">{THEMES.map(function(theme){var isActive=theme.id===themeId;return <button key={theme.id} onClick={function(){pickTheme(theme.id)}} style={{background:theme.paper,border:isActive?'2px solid '+T.primary:'0.5px solid '+theme.border,borderRadius:0,padding:'10px 12px',cursor:'pointer',textAlign:'left',transition:'transform 0.1s'}}><div style={{fontSize:9,letterSpacing:'0.15em',color:theme.muted,textTransform:'uppercase',marginBottom:4}}>Theme</div><div style={{fontSize:14,fontWeight:500,color:theme.ink,marginBottom:6}}>{theme.name}</div><div style={{display:'flex',gap:4,alignItems:'center'}}><div style={{fontSize:24,fontWeight:600,color:theme.metricColor||theme.primary,lineHeight:1,fontFamily:'ui-monospace,monospace'}}>142</div><div style={{display:'flex',flexDirection:'column',gap:2,marginLeft:'auto'}}><div style={{width:18,height:6,background:theme.metricColor||theme.primary,borderRadius:0}}/><div style={{width:18,height:6,background:theme.secondary||blend(theme.primary,theme.paper,0.35),borderRadius:0}}/><div style={{width:18,height:6,background:theme.ink,borderRadius:0}}/></div></div></button>})}</div><div className="mt-4 pt-3 text-xs" style={{borderTop:'0.5px solid '+N.border,color:N.muted}}>The theme is randomly picked at each reload (never the same twice in a row). Click any theme to lock it for this session.</div></div></div>:null;
  var pwModal=showPwModal?<div style={{position:'fixed',inset:0,background:'rgba(26,26,26,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}} onClick={function(){sShowPwModal(false);sPwInput('');sPwErr('')}}><div style={{background:N.paper,border:'0.5px solid '+N.borderStrong,borderRadius:0,padding:24,width:320}} onClick={function(e){e.stopPropagation()}}><div className="mb-4" style={{fontSize:14,fontWeight:500,color:N.ink}}>{pwHash?'Enter password':'Set admin password'}</div><input type="password" style={Object.assign({},inputStyle,{width:'100%',marginBottom:8})} value={pwInput} onChange={function(e){sPwInput(e.target.value);sPwErr('')}} onKeyDown={function(e){if(e.key==='Enter')handlePwSubmit()}}/>{pwErr&&<div className="text-xs mb-2" style={{color:T.primary}}>{pwErr}</div>}<div className="flex gap-2"><button onClick={handlePwSubmit} style={Object.assign({},btnPrimary,{flex:1})}>Enter</button><button onClick={function(){sShowPwModal(false);sPwInput('');sPwErr('')}} style={Object.assign({},btnSecondary,{flex:1})}>Cancel</button></div></div></div>:null;

  // Cost view
  var renderCostCards=function(d,label){return <div className="space-y-3 mb-6"><div className="flex items-baseline gap-3 pb-2" style={{borderBottom:'0.5px solid '+N.border}}><div style={{fontSize:14,fontWeight:500,color:N.ink}}>{label}</div><div style={{fontSize:11,color:N.muted}}>{d.films} films</div></div><div className="grid grid-cols-3 md:grid-cols-5">
    <Stat T={N} label="Subscriptions" value={'\u20AC'+d.st.toFixed(0)} color={N.ink}/>
    <Stat T={N} label={'Tickets ('+d.tc+')'} value={'\u20AC'+d.tt.toFixed(2)} color={N.ink}/>
    <Stat T={N} label={'Rentals ('+d.rc+')'} value={'\u20AC'+d.rt.toFixed(2)} color={N.ink}/>
    <Stat T={N} label="Total" value={'\u20AC'+d.tot.toFixed(2)} color={T.primary}/>
    <Stat T={N} label="Per film" value={'\u20AC'+d.pf.toFixed(2)} color={N.ink} noBorder/>
  </div>{d.platRows&&d.platRows.filter(function(r){return r.cost>0}).length>0&&<button onClick={function(){sExpYrs(function(p){var n=Object.assign({},p);n[label]=!n[label];return n})}} className="text-xs" style={{color:N.muted}}>{expYrs[label]?'\u25BE Hide breakdown':'\u25B8 Per platform breakdown'}</button>}{expYrs[label]&&d.platRows&&<table className="w-full text-xs"><thead><tr style={{color:N.muted,borderBottom:'0.5px solid '+N.border}}><th className="text-left py-1.5" style={{fontWeight:400,letterSpacing:'0.1em',textTransform:'uppercase',fontSize:10}}>Platform</th><th className="text-right py-1.5" style={{fontWeight:400,letterSpacing:'0.1em',textTransform:'uppercase',fontSize:10}}>Films</th><th className="text-right py-1.5" style={{fontWeight:400,letterSpacing:'0.1em',textTransform:'uppercase',fontSize:10}}>Via</th><th className="text-right py-1.5" style={{fontWeight:400,letterSpacing:'0.1em',textTransform:'uppercase',fontSize:10}}>Cost</th><th className="text-right py-1.5" style={{fontWeight:400,letterSpacing:'0.1em',textTransform:'uppercase',fontSize:10}}>/Film</th></tr></thead><tbody>{d.platRows.filter(function(r){return r.cost>0}).map(function(r,i){return <tr key={i} style={{borderBottom:'0.5px solid '+N.border}}><td className="py-1.5" style={{color:N.inkSoft}}>{r.plat}</td><td className="py-1.5 text-right" style={{color:N.muted}}>{r.films}</td><td className="py-1.5 text-right" style={{color:N.mutedSoft}}>{r.sub}</td><td className="py-1.5 text-right" style={{color:N.inkSoft}}>{'\u20AC'}{r.cost.toFixed(2)}</td><td className="py-1.5 text-right" style={{color:T.primary}}>{'\u20AC'}{r.cpf.toFixed(2)}</td></tr>})}</tbody></table>}</div>};

  var costView=<div className="space-y-6">
    <div className="flex gap-1 flex-wrap">{costYrs.map(function(y){return <button key={y} onClick={function(){sCostYr(y)}} style={costYr===y?{background:N.ink,border:'0.5px solid '+N.ink,borderRadius:0,color:N.paper,padding:'4px 10px',fontSize:11,fontWeight:500}:{background:'transparent',border:'0.5px solid '+N.border,borderRadius:0,color:N.muted,padding:'4px 10px',fontSize:11}}>{y}</button>})}</div>
    {costYr==='All'?renderCostCards(allTimeTotals,'All Time'):costDataFilt.map(function(d){return <div key={d.yr}>{renderCostCards(d,d.yr)}</div>})}
    {platRanking.length>0&&<div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:0}}><SectionHead T={N} title="Platform value ranking" aside={<button onClick={function(){sRankMode(function(v){return v==='sub'?'plat':'sub'})}} style={btnSecondary}>{rankMode==='sub'?'Per subscription':'Per platform'}</button>}/><div className="space-y-1.5">{platRanking.map(function(d,i){var maxC=Math.max.apply(null,platRanking.map(function(r){return r.cpf}).concat([1]));return <div key={i} className="flex items-center gap-2"><span className="text-xs w-5 text-right" style={{color:N.mutedSoft,fontWeight:500}}>{i+1}</span><span className="text-xs w-20 md:w-32 truncate" style={{color:N.inkSoft}}>{d.name}</span><div className="flex-1 h-6 flex items-center" style={{background:N.surfaceAlt,borderRadius:0,overflow:'hidden'}}><div className="h-full flex items-center px-2" style={{width:Math.max((d.cpf/maxC)*100,8)+'%',backgroundColor:d.color,borderRadius:0}}><span className="text-xs" style={{color:N.paper,fontWeight:500}}>{'\u20AC'}{d.cpf.toFixed(2)}</span></div></div><span className="text-xs w-14 text-right" style={{color:N.muted}}>{d.films} films</span><span className="text-xs w-12 text-right font-mono" style={{color:rCT(d.avg,T)}}>{d.avg?d.avg.toFixed(1)+'\u2605':'\u2014'}</span></div>})}</div></div>}
    {cpfData.length>1&&<div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:0}}><SectionHead T={N} title="Cost per film, over time"/><ResponsiveContainer width="100%" height={220}><LineChart data={cpfData}><CartesianGrid strokeDasharray="3 3" stroke={N.border}/><XAxis dataKey="q" tick={{fill:N.muted,fontSize:9}} angle={-45} textAnchor="end" height={50}/><YAxis tick={{fill:N.muted,fontSize:10}}/><Tooltip content={function(p){if(!p.active||!p.payload||!p.payload.length)return null;var d=p.payload[0].payload;return <div style={{background:N.paper,border:'0.5px solid '+N.borderStrong,borderRadius:0,padding:'8px 12px',fontSize:11}}><div style={{color:N.ink,fontWeight:500}}>{d.period}</div><div style={{color:T.primary}}>{'\u20AC'}{d.cpf.toFixed(2)}/film</div><div style={{color:N.muted}}>{d.films} films {'\u00B7'} {'\u20AC'}{d.cost.toFixed(0)} spent</div></div>}}/><Line type="monotone" dataKey="cpf" stroke={T.primary} strokeWidth={2} dot={{fill:T.primary,r:2}}/></LineChart></ResponsiveContainer></div>}
    {monthlyFilt.length>3&&<div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:0}}><SectionHead T={N} title="Monthly spend"/><ResponsiveContainer width="100%" height={250}><BarChart data={monthlyFilt}><CartesianGrid strokeDasharray="3 3" stroke={N.border}/><XAxis dataKey="m" tick={{fill:N.muted,fontSize:9}} angle={-45} textAnchor="end" height={50}/><YAxis tick={{fill:N.muted,fontSize:10}}/><Tooltip content={function(p){return <CostTip {...p} T={N}/>}}/><Bar dataKey="subs" name="Subscriptions" stackId="a" fill={T.primary}/><Bar dataKey="tickets" name="Tickets" stackId="a" fill={blend(T.primary,N.paper,0.35)}/><Bar dataKey="rentals" name="Rentals" stackId="a" fill={T.secondary||T.primary}/></BarChart></ResponsiveContainer><div className="flex gap-4 mt-2 justify-center"><div className="flex items-center gap-1.5"><div style={{width:10,height:10,background:T.primary,borderRadius:0}}/><span className="text-xs" style={{color:N.muted}}>Subscriptions</span></div><div className="flex items-center gap-1.5"><div style={{width:10,height:10,background:blend(T.primary,N.paper,0.35),borderRadius:0}}/><span className="text-xs" style={{color:N.muted}}>Tickets</span></div><div className="flex items-center gap-1.5"><div style={{width:10,height:10,background:T.secondary||T.primary,borderRadius:0}}/><span className="text-xs" style={{color:N.muted}}>Rentals</span></div></div></div>}
  </div>;

  if(loading)return <div style={{background:N.paper,color:N.ink,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div className="text-center"><div style={{fontSize:11,letterSpacing:'0.2em',color:N.muted,textTransform:'uppercase',marginBottom:8}}>Loading</div></div></div>;

  if(sI||(isAdmin&&!all.length))return(<div style={{background:N.paper,color:N.ink,minHeight:'100vh'}} className="p-4 md:p-10">{pwModal}{themePickerModal}<div className="max-w-4xl mx-auto"><div className="flex justify-between items-baseline mb-6 pb-3" style={{borderBottom:'0.5px solid '+N.border}}><div><div style={{fontSize:10,letterSpacing:'0.2em',color:N.muted,textTransform:'uppercase'}}>Import</div><div style={{fontSize:24,fontWeight:500,marginTop:4,color:N.ink}}>Letterboxd export</div></div>{all.length>0&&<button onClick={function(){sSI(false)}} style={btnSecondary}>{'\u2190'} Back</button>}</div><div className="p-10 text-center mb-3" style={{border:'1px dashed '+N.borderStrong,borderRadius:0,background:N.surface}}><input type="file" webkitdirectory="" directory="" multiple className="hidden" id="folderPick" onChange={function(e){var files=e.target.files;if(!files||!files.length)return;var found={};for(var i=0;i<files.length;i++){var rp=files[i].webkitRelativePath||"";var parts=rp.split("/");if(parts.length!==2)continue;var fn=parts[1].toLowerCase();if(fn==="diary.csv")found.diary=files[i];if(fn==="reviews.csv")found.reviews=files[i];if(fn==="watchlist.csv")found.watchlist=files[i];if(fn==="ratings.csv")found.ratings=files[i];if(parts.length===3&&parts[1]==="lists"&&fn.indexOf("top-50-all-time")!==-1){if(!found.top50)found.top50=[];found.top50.push(files[i])}}var status=[];if(found.diary)status.push("diary.csv");if(found.reviews)status.push("reviews.csv");if(found.watchlist)status.push("watchlist.csv");if(found.ratings)status.push("ratings.csv");if(found.top50)status.push(found.top50.length+" top 50 lists");sIR({pipe:"",w:[],e:[],count:0,status:status});if(found.diary){var r1=new FileReader();r1.onload=function(ev){sCsv(ev.target.result)};r1.readAsText(found.diary)}if(found.reviews){var r2=new FileReader();r2.onload=function(ev){var revs=parseReviews(ev.target.result);var yr2={};revs.forEach(function(x){yr2[x.name+"|||"+x.year]=x.yRating});sYRatings(yr2);saveRevs(revs)};r2.readAsText(found.reviews)}if(found.ratings){var r4=new FileReader();r4.onload=function(ev){var rats=parseRatings(ev.target.result);sAllRatings(rats);saveRatings(JSON.stringify(rats))};r4.readAsText(found.ratings)}if(found.top50){found.top50.forEach(function(file){var r5=new FileReader();r5.onload=function(ev){var fn3=file.name.toLowerCase();var ym=fn3.match(/(\d{4})/);var listYr=ym?parseInt(ym[1]):new Date().getFullYear();if(fn3.indexOf("version")===-1&&fn3.indexOf("top-50-all-time")!==-1)listYr=new Date().getFullYear();var films=parseTop50(ev.target.result);if(films.length>0){saveTop50(listYr,films);sTop50s(function(p){var n=p.filter(function(x){return x.year!==listYr});n.push({year:listYr,films:films});return n.sort(function(a,b){return a.year-b.year})})}};r5.readAsText(file)})}if(found.watchlist){var r3=new FileReader();r3.onload=function(ev){var wl=parseWatchlist(ev.target.result);sWlData(wl);saveWl(wl)};r3.readAsText(found.watchlist)}}}/><label htmlFor="folderPick" className="cursor-pointer"><div style={{fontSize:13,color:N.inkSoft,marginBottom:4}}>Select your Letterboxd export folder</div><div style={{fontSize:11,color:N.muted}}>Automatically finds diary.csv, reviews.csv, watchlist.csv</div></label></div>{iR&&iR.status&&iR.status.length>0&&<div className="flex gap-2 mb-3">{iR.status.map(function(s,i){return <div key={i} className="text-xs px-2 py-1" style={{background:N.surface,border:'0.5px solid '+T.primary,borderRadius:0,color:T.primary}}>{s}</div>})}</div>}{csv&&<div className="text-xs mb-2" style={{color:T.primary}}>{csv.split("\n").length} diary lines loaded</div>}<div className="flex gap-2 mb-3"><button onClick={doImport} disabled={!csv.trim()} style={Object.assign({},btnPrimary,{opacity:csv.trim()?1:0.4})}>Parse & save diary</button></div><div className="text-xs mb-3" style={{color:N.muted}}>Or upload files individually:</div><div className="grid grid-cols-3 gap-2 mb-3"><div className="p-3 text-center" style={{border:'0.5px solid '+N.border,borderRadius:0,background:N.surface}}><input type="file" accept=".csv" className="hidden" id="csvFile" onChange={function(e){var file=e.target.files&&e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){sCsv(ev.target.result);sIR(null)};reader.readAsText(file)}}/><label htmlFor="csvFile" className="cursor-pointer text-xs" style={{color:N.inkSoft}}>diary.csv</label></div><div className="p-3 text-center" style={{border:'0.5px solid '+N.border,borderRadius:0,background:N.surface}}><input type="file" accept=".csv" className="hidden" id="wlFile" onChange={function(e){var file=e.target.files&&e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){var wl=parseWatchlist(ev.target.result);sWlData(wl);saveWl(wl)};reader.readAsText(file)}}/><label htmlFor="wlFile" className="cursor-pointer text-xs" style={{color:N.inkSoft}}>watchlist.csv</label></div><div className="p-3 text-center" style={{border:'0.5px solid '+N.border,borderRadius:0,background:N.surface}}><input type="file" accept=".csv" className="hidden" id="revFile" onChange={function(e){var file=e.target.files&&e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){var revs=parseReviews(ev.target.result);var yr2={};revs.forEach(function(x){yr2[x.name+"|||"+x.year]=x.yRating});sYRatings(yr2);saveRevs(revs)};reader.readAsText(file)}}/><label htmlFor="revFile" className="cursor-pointer text-xs" style={{color:N.inkSoft}}>reviews.csv</label></div></div>{iR&&iR.count>0&&<div className="mt-4 space-y-3"><div className="p-3 text-sm" style={{background:N.surface,border:'0.5px solid '+T.primary,borderRadius:0,color:T.primary}}>{iR.count} diary entries</div>{!iR.e.length&&<button onClick={function(){sSI(false)}} style={btnPrimary}>{'\u2192'} Continue</button>}</div>}{iR&&iR.e&&iR.e.length>0&&<div className="p-4 mt-3" style={{background:N.surface,border:'0.5px solid '+T.primary,borderRadius:0}}>{iR.e.map(function(e,i){return <div key={i} className="text-xs" style={{color:blend(T.primary,N.paper,-0.2)}}>{e}</div>})}</div>}</div></div>);

  if(unclass>0&&isAdmin)return(<div style={{background:N.paper,color:N.ink,minHeight:'100vh'}} className="p-4 md:p-10">{pwModal}{themePickerModal}<div className="max-w-5xl mx-auto"><div className="mb-6 pb-3" style={{borderBottom:'0.5px solid '+N.border}}><div style={{fontSize:10,letterSpacing:'0.2em',color:N.muted,textTransform:'uppercase'}}>Tag registry</div><div style={{fontSize:24,fontWeight:500,marginTop:4,color:N.ink}}>Classify tags</div><div className="mt-2 text-sm" style={{color:T.primary}}>{unclass} unsorted.</div></div><div className="flex flex-wrap gap-2 mb-4 items-center"><input style={Object.assign({},inputStyle,{flex:1,minWidth:192})} placeholder="Filter..." value={tagSearch} onChange={function(e){sTagSearch(e.target.value)}}/>{tagSelCount>0&&<div className="flex items-center gap-2 px-3 py-1.5" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:0}}><span className="text-xs" style={{color:N.inkSoft}}>{tagSelCount} sel</span><select className="text-xs" style={{background:N.paper,border:'0.5px solid '+N.border,borderRadius:0,color:N.inkSoft,padding:'2px 4px'}} value={bulkCat} onChange={function(e){sBulkCat(e.target.value)}}><option value="">Assign...</option>{CATS.map(function(c){return <option key={c} value={c}>{CI[c].l}</option>})}</select><button onClick={doBulkTag} disabled={!bulkCat} style={Object.assign({},btnPrimary,{padding:'2px 8px',fontSize:11,opacity:bulkCat?1:0.4})}>Apply</button><button onClick={function(){sTagSel({})}} className="text-xs" style={{color:N.muted}}>Clear</button></div>}<button onClick={function(){var n={};tagFiltered.forEach(function(t){n[t]=true});sTagSel(n)}} style={btnSecondary}>Select visible</button></div>{tagGrouped._un.length>0&&<div className="p-4 mb-4" style={{background:N.surface,border:'0.5px solid '+T.primary,borderRadius:0}}><div className="mb-2" style={{fontSize:13,fontWeight:500,color:blend(T.primary,N.paper,-0.2)}}>Unsorted ({tagGrouped._un.length})</div><div className="space-y-0">{tagGrouped._un.map(function(t){return renderTagRow(t,true)})}</div></div>}{CATS.map(function(cat){var tags=tagGrouped[cat];if(!tags||!tags.length)return null;return <div key={cat} className="p-4 mb-3" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:0}}><div style={{fontSize:13,fontWeight:500,color:N.inkSoft,marginBottom:8}}>{CI[cat].l} ({tags.length})</div><div className="space-y-0 max-h-64 overflow-y-auto">{tags.map(function(t){return renderTagRow(t,true)})}</div></div>})}</div></div>);

  if(!all.length&&!isAdmin)return(<div style={{background:N.paper,color:N.ink,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>{pwModal}{themePickerModal}<div className="text-center"><div style={{fontSize:11,letterSpacing:'0.2em',color:N.muted,textTransform:'uppercase',marginBottom:12}}>Awaiting data</div><button onClick={function(){sShowPwModal(true)}} style={btnSecondary}>Admin</button></div></div>);

  var tagGroupedDash={};CATS.forEach(function(c){tagGroupedDash[c]=[]});tagAllSorted.filter(function(t){return!tagSearch||t.indexOf(tagSearch.toLowerCase())!==-1}).forEach(function(t){var c=fullReg[t]&&fullReg[t].cat;if(c&&tagGroupedDash[c])tagGroupedDash[c].push(t)});

  // ============================================================
  // HEADER + YEAR SELECTOR (used by all tabs)
  // ============================================================
  var heroYearLabel=yr==='All'?'All time':yr;
  var copyCtx={year:yr==='All'?String(new Date().getFullYear()):yr,total:stats.total,n:yoy&&yoy.films!=null?fY(yoy.films,'abs')||'':''};
  var fontHero=fontOf((T.fonts&&T.fonts.hero)||'sans');
  var fontLabel=fontOf((T.fonts&&T.fonts.label)||'sans');
  var fontTitle=fontOf((T.fonts&&T.fonts.title)||'sans');
  var copyMasthead=applyCopy((T.copy&&T.copy.masthead)||"Babylonian's Letterboxd",copyCtx);
  var copyTitle=applyCopy((T.copy&&T.copy.title)||'A year at the movies',copyCtx);
  var copyHeroLabel=applyCopy((T.copy&&T.copy.heroLabel)||'Films watched',copyCtx);
  var copyHeroSuffix=applyCopy((T.copy&&T.copy.heroSuffix)||'{n} vs '+(yr==='All'?'':String(parseInt(yr)-1)),copyCtx);

  return(<div style={{background:N.paper,color:N.ink,minHeight:'100vh',fontFeatureSettings:'"ss01","cv01"',fontFamily:fontOf('sans')}} className="px-4 md:px-10 py-6 md:py-10"><style>{ANIM_CSS}</style>{pwModal}{themePickerModal}<div className="max-w-6xl mx-auto">

    {/* MASTHEAD — themed (copy + font + colors per theme) */}
    <div className="flex justify-between items-baseline mb-8 pb-4" style={{borderBottom:'0.5px solid '+N.border}}>
      <div>
        <div style={{fontSize:10,letterSpacing:'0.22em',color:T.muted,textTransform:'uppercase',fontFamily:fontLabel}}>{copyMasthead}</div>
        <div style={{fontSize:24,fontWeight:500,marginTop:4,color:T.titleColor||T.ink,letterSpacing:'-0.01em',fontFamily:fontTitle}}>{copyTitle}</div>
        <button onClick={function(){sShowPicker(true)}} className="mt-2 text-xs" style={{background:'transparent',border:'none',color:N.muted,cursor:'pointer',padding:0,letterSpacing:'0.05em',fontStyle:'italic'}}>{'\u25BE '}{T.name}</button>
      </div>
      <div className="flex gap-2 items-center">
        {isAdmin&&<span className="text-xs" style={{color:T.primary,letterSpacing:'0.1em',textTransform:'uppercase'}}>Admin</span>}
        {isAdmin?<button onClick={function(){sIsAdmin(false)}} style={btnSecondary}>Lock</button>:<button onClick={function(){sShowPwModal(true)}} style={btnSecondary}>Admin</button>}
        {isAdmin&&<button onClick={doEnrich} disabled={enriching} style={btnSecondary}>{enriching?enrichProg:'TMDB'}</button>}
        {isAdmin&&<button onClick={function(){sSI(true)}} style={btnSecondary}>Import</button>}
        {isAdmin&&<button onClick={doClear} style={btnSecondary}>Clear</button>}
      </div>
    </div>

    {unclass>0&&!isAdmin&&<div className="p-3 mb-4 text-xs" style={{background:N.surface,border:'0.5px solid '+blend(T.primary,N.paper,0.35),borderRadius:0,color:'#8E6A1F'}}>{unclass} tags unclassified.</div>}

    {/* SEARCH */}
    <div className="relative mb-4">
      <input style={Object.assign({},inputStyle,{width:'100%'})} placeholder="Search films..." value={sq} onChange={function(e){sSq(e.target.value)}}/>
      {searchRes.length>0&&<div className="absolute z-50 w-full mt-1 max-h-72 overflow-y-auto" style={{background:N.paper,border:'0.5px solid '+N.borderStrong,borderRadius:0,boxShadow:'0 4px 12px rgba(26,26,26,0.08)'}}>{searchRes.map(function(f,i){return <div key={i} className="px-3 py-2 flex justify-between text-sm" style={{borderBottom:'0.5px solid '+N.border}}><span className="truncate mr-2" style={{color:N.inkSoft}}>{f.name} <span style={{color:N.muted}}>({f.year})</span>{f.rating!==null&&<span style={{color:rCT(f.rating,T)}}> {f.rating}{'\u2605'}</span>}</span><span className="text-xs" style={{color:N.muted}}>{f.date}</span></div>})}</div>}
    </div>

    {/* TABS */}
    <div className="flex gap-0 mb-6 flex-wrap" style={{borderBottom:'0.5px solid '+N.border}}>{TABS.map(function(t){var active=tab===t.id;return <button key={t.id} onClick={function(){sTab(t.id);cls();sSq('')}} style={{padding:'8px 14px',fontSize:12,fontWeight:active?500:400,color:active?T.primary:N.muted,background:'transparent',border:'none',borderBottom:active?'1.5px solid '+T.primary:'1.5px solid transparent',marginBottom:-1,cursor:'pointer',letterSpacing:'0.02em'}}>{t.l}</button>})}</div>

    {/* FILTER BAR */}
    {['overview','ratings','where','who','yesmine','taste','films','rankings','diary'].indexOf(tab)!==-1&&<div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="flex gap-1 flex-wrap">{yrs.map(function(y){var active=yr===y;return <button key={y} onClick={function(){sYr(y);cls()}} style={active?{padding:'4px 10px',fontSize:11,fontWeight:500,color:T.chartTextColor||NEUTRAL.ink,background:T.primary,border:'0.5px solid '+T.primary,borderRadius:0}:{padding:'4px 10px',fontSize:11,color:N.muted,background:'transparent',border:'0.5px solid '+N.border,borderRadius:0}}>{y}</button>})}</div>
      <button onClick={function(){sIRW(function(v){return!v});cls()}} style={iRW?{padding:'4px 10px',fontSize:11,color:N.muted,background:'transparent',border:'0.5px solid '+N.border,borderRadius:0}:{padding:'4px 10px',fontSize:11,fontWeight:500,color:N.paper,background:blend(T.primary,N.paper,0.35),border:'0.5px solid '+blend(T.primary,N.paper,0.35),borderRadius:0}}>{iRW?'Excl. rewatches':'Incl. rewatches'}</button>
      <div className="flex items-center gap-1"><input type="date" style={Object.assign({},inputStyle,{fontSize:11,padding:'4px 6px'})} value={dateFrom} onChange={function(e){sDateFrom(e.target.value)}}/><span className="text-xs" style={{color:N.mutedSoft}}>{"\u2192"}</span><input type="date" style={Object.assign({},inputStyle,{fontSize:11,padding:'4px 6px'})} value={dateTo} onChange={function(e){sDateTo(e.target.value)}}/>{(dateFrom||dateTo)&&<button onClick={function(){sDateFrom('');sDateTo('')}} className="text-xs" style={{color:N.muted}}>{"\u2715"}</button>}</div>
      {tab==='films'&&<button onClick={function(){sDirUniq(function(v){return!v})}} style={dirUniq?{padding:'4px 10px',fontSize:11,fontWeight:500,color:N.paper,background:blend(T.primary,N.paper,0.35),border:'0.5px solid '+blend(T.primary,N.paper,0.35),borderRadius:0}:{padding:'4px 10px',fontSize:11,color:N.muted,background:'transparent',border:'0.5px solid '+N.border,borderRadius:0}}>{dirUniq?'All watches':'Unique films only'}</button>}
    </div>}

    {/* ===== OVERVIEW ===== */}
    {tab==='overview'&&<div className="space-y-10">

      {/* HERO */}
      <div className="grid md:grid-cols-3 gap-8 items-start relative" style={{minHeight:180,background:T.gradient?'linear-gradient(135deg, '+T.gradient[0]+' 0%, '+T.gradient[1]+' 50%, '+T.gradient[2]+' 100%)':'transparent',borderRadius:0,padding:'24px 22px',border:T.gradient?'0.5px solid '+T.border:'none',overflow:'hidden'}}>
        {T.bgImage&&<div style={{position:'absolute',inset:0,backgroundImage:'url('+T.bgImage+')',backgroundSize:T.bgImageSize||'cover',backgroundPosition:T.bgImagePosition||'center',backgroundRepeat:T.bgImageRepeat||'no-repeat',opacity:T.bgImageOpacity||0.18,mixBlendMode:T.bgImageBlend||'normal',pointerEvents:'none',zIndex:0}}/>}
        {T.heroImage&&<div style={{position:'absolute',top:'10%',left:'10%',width:'60%',height:'80%',backgroundImage:'url('+T.heroImage+')',backgroundSize:'contain',backgroundPosition:T.heroImagePosition||'left center',backgroundRepeat:'no-repeat',opacity:T.heroImageOpacity||0.35,mixBlendMode:T.heroImageBlend||'normal',pointerEvents:'none',zIndex:0}}/>}
        <ThemeOrnament T={T}/>
        {T.dots&&T.dots.length>=3&&<div style={{position:'absolute',top:14,right:18,display:'flex',gap:6,alignItems:'center',zIndex:2}}>
          <div style={{width:10,height:10,background:T.dots[0],borderRadius:'50%',boxShadow:T.glow?'0 0 8px '+T.dots[0]+'aa':'none'}}/>
          <div style={{width:7,height:7,background:T.dots[1],borderRadius:'50%'}}/>
          <div style={{width:5,height:5,background:T.dots[2],borderRadius:'50%'}}/>
        </div>}
        <div className="md:col-span-2" style={{position:'relative',zIndex:1}}>
          <div style={{fontSize:10,letterSpacing:'0.22em',color:heroDescriptorC,textTransform:'uppercase',marginBottom:14,fontFamily:fontLabel}}>{copyHeroLabel}{yr==='All'?'':' · '+yr}</div>
          <div style={{fontSize:'clamp(72px, 12vw, 128px)',lineHeight:0.85,fontWeight:(T.fonts&&(T.fonts.hero==='handwrite'||T.fonts.hero==='script'||T.fonts.hero==='marker'||T.fonts.hero==='serif'))?700:400,color:heroMetricC,letterSpacing:'-0.04em',fontFamily:fontHero,textShadow:T.glow?'0 0 24px '+T.glow+'66, 0 0 48px '+T.glow+'33':'none'}}>{stats.total}</div>
          {yoy&&yoy.films!=null&&<div className="mt-3" style={{fontSize:13,color:heroSubC,fontFamily:fontLabel}}>{copyHeroSuffix}</div>}
        </div>
        <div className="md:pl-8 grid grid-cols-2 gap-x-4 gap-y-4" style={{borderLeft:'0.5px solid '+T.border,position:'relative',zIndex:1}}>
          <div>
            <div style={{fontSize:9,letterSpacing:'0.18em',color:heroDescriptorC,textTransform:'uppercase',marginBottom:3,fontWeight:500}}>In theaters</div>
            <div style={{fontSize:22,fontWeight:600,color:heroMetricC,letterSpacing:'-0.01em',fontFamily:fontHero,lineHeight:1}}>{stats.th}<span className="ml-1.5" style={{fontSize:12,color:heroSubC,fontWeight:500,fontFamily:fontOf('sans')}}>{stats.total?Math.round(stats.th/stats.total*100)+'%':''}</span></div>
            {yoy&&yoy.th!=null&&<div style={{fontSize:10,color:heroSubC,marginTop:2}}>{fY(yoy.th,'pp')}</div>}
          </div>
          <div>
            <div style={{fontSize:9,letterSpacing:'0.18em',color:heroDescriptorC,textTransform:'uppercase',marginBottom:3,fontWeight:500}}>With friends</div>
            <div style={{fontSize:22,fontWeight:600,color:heroMetricC,letterSpacing:'-0.01em',fontFamily:fontHero,lineHeight:1}}>{stats.fr}<span className="ml-1.5" style={{fontSize:12,color:heroSubC,fontWeight:500,fontFamily:fontOf('sans')}}>{stats.total?Math.round(stats.fr/stats.total*100)+'%':''}</span></div>
            {yoy&&yoy.fr!=null&&<div style={{fontSize:10,color:heroSubC,marginTop:2}}>{fY(yoy.fr,'pp')}</div>}
          </div>
          <div>
            <div style={{fontSize:9,letterSpacing:'0.18em',color:heroDescriptorC,textTransform:'uppercase',marginBottom:3,fontWeight:500}}>Best friend</div>
            <div style={{fontSize:18,fontWeight:600,color:heroMetricC,letterSpacing:'-0.01em',fontFamily:fontHero,lineHeight:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{compD.length?compD[0].name:'\u2014'}</div>
            {compD.length>0&&<div style={{fontSize:10,color:heroSubC,marginTop:2,fontFamily:fontOf('sans')}}>{compD[0].Films} films</div>}
          </div>
          <div>
            <div style={{fontSize:9,letterSpacing:'0.18em',color:heroDescriptorC,textTransform:'uppercase',marginBottom:3,fontWeight:500}}>Avg rating</div>
            <div style={{fontSize:22,fontWeight:600,color:heroMetricC,letterSpacing:'-0.01em',fontFamily:fontHero,lineHeight:1}}>{stats.avg}<span className="ml-1" style={{fontSize:15,color:heroSubC}}>{'\u2605'}</span></div>
            {yoy&&yoy.avg!=null&&<div style={{fontSize:10,color:heroSubC,marginTop:2}}>{fY(yoy.avg,'r')}</div>}
          </div>
          <div>
            <div style={{fontSize:9,letterSpacing:'0.18em',color:heroDescriptorC,textTransform:'uppercase',marginBottom:3,fontWeight:500}}>Runtime</div>
            <div style={{fontSize:22,fontWeight:600,color:heroMetricC,letterSpacing:'-0.01em',fontFamily:fontHero,lineHeight:1}}>{dirStats.totalH>0?dirStats.totalH+'h':'\u2014'}</div>
          </div>
          <div>
            <div style={{fontSize:9,letterSpacing:'0.18em',color:heroDescriptorC,textTransform:'uppercase',marginBottom:3,fontWeight:500}}>Money spent</div>
            <div style={{fontSize:22,fontWeight:600,color:heroMetricC,letterSpacing:'-0.01em',fontFamily:fontHero,lineHeight:1}}>{moneySpent>0?'\u20AC'+Math.round(moneySpent):'\u2014'}</div>
            {stats.total>0&&moneySpent>0&&<div style={{fontSize:10,color:heroSubC,marginTop:2,fontFamily:fontOf('sans')}}>{'\u20AC'+(moneySpent/stats.total).toFixed(2)}/film</div>}
          </div>
        </div>
      </div>

      {/* MINI-STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4" style={{borderTop:'0.5px solid '+N.border,borderBottom:'0.5px solid '+N.border}}>
        <Stat T={N} label="Longest binge" value={binge.streak+' days'} sub={binge.range}/>
        <Stat T={N} label="Current streak" value={streaks.week+' weeks'} sub={streaks.wr}/>
        <Stat T={N} label="Most in a day" value={busiest.count+' films'} sub={busiest.fmt}/>
        <Stat T={N} label="Busiest month" value={bestMo.length?bestMo[0].count+' films':'—'} sub={bestMo.length?bestMo[0].label:''} noBorder/>
      </div>

      {/* HEATMAP */}
      <div>
        <SectionHead T={N} title="The viewing calendar" aside={<span className="text-xs" style={{color:N.mutedSoft,fontStyle:'italic'}}>click a cell to see the films</span>}/>
        <div className="overflow-x-auto"><div style={{minWidth:380}}>
          <div className="flex items-center mb-1"><div style={{width:36}}/>{MS.map(function(m,i){return <div key={i} className="flex-1 text-center" style={{fontSize:10,color:N.muted,letterSpacing:'0.05em'}}>{m}</div>})}</div>
          {hmData.years.map(function(y){var isCurrentYr=yr===y;return <div key={y} className="flex items-center gap-1 mb-1" style={isCurrentYr?{outline:'1px solid '+T.primary,borderRadius:0,padding:'1px'}:{}}><div style={{width:36,fontSize:10,color:N.muted,textAlign:'right',paddingRight:8}}>{y}</div>{hmData.grid[y].map(function(c,m){var iS=selHM&&selHM.yr===y&&selHM.mo===m;var bgColor=hmColor(c,hmData.max,y,yr,T);return <div key={m} onClick={function(){sSelHM(c>0?(iS?null:{yr:y,mo:m}):null)}} className={'flex-1 flex items-center justify-center '+(c>0?'cursor-pointer':'')} style={{height:26,background:bgColor,color:c>0?'#000000':'transparent',borderRadius:0,outline:iS?'1.5px solid '+N.ink:'none'}}><span style={{fontSize:10,fontWeight:500}}>{c>0?c:''}</span></div>})}</div>})}
        </div></div>
        {selHM&&<FilmList T={N} title={MF[selHM.mo]+' '+selHM.yr} films={hmFilms} onClose={function(){sSelHM(null)}}/>}
      </div>

      {/* CUMULATIVE */}
      <div>
        <SectionHead T={N} title="Cumulative films, year over year"/>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={cumData.data}>
            <CartesianGrid strokeDasharray="3 3" stroke={N.border}/>
            <XAxis dataKey="month" tick={{fill:N.muted,fontSize:10}}/>
            <YAxis tick={{fill:N.muted,fontSize:10}}/>
            <Tooltip content={function(p){return <CTooltip {...p} T={N}/>}}/>
            {cumData.years.map(function(y,i){return <Line key={y} type="monotone" dataKey={String(y)} stroke={yC(y,cumData.years,T)} strokeWidth={yr!=='All'&&yr===String(y)?2.5:1.25} dot={false} connectNulls={false} opacity={yr!=='All'&&yr!==String(y)?0.25:1}/>})}
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-3 flex-wrap mt-2">{cumData.years.map(function(y){return <div key={y} className="flex items-center gap-1.5"><div style={{width:14,height:2,background:yC(y,cumData.years,T),borderRadius:0}}/><span className="text-xs" style={{color:N.muted}}>{y}</span></div>})}</div>
      </div>

      {/* RATING DISTRIBUTION */}
      <div>
        <SectionHead T={N} title="Rating distribution" aside={<span className="text-xs" style={{color:N.muted}}>average <span style={{color:blend(T.primary,N.paper,0.35),fontWeight:500}}>{stats.avg}{'\u2605'}</span></span>}/>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={rDist}>
            <CartesianGrid strokeDasharray="3 3" stroke={N.border}/>
            <XAxis dataKey="rating" tick={{fill:N.muted,fontSize:11}}/>
            <YAxis tick={{fill:N.muted,fontSize:10}}/>
            <Tooltip content={function(p){return <CTooltip {...p} T={N}/>}}/>
            <Bar dataKey="count" name="Films" radius={[3,3,0,0]} cursor="pointer" onClick={function(d){sSR(function(p){return p===parseFloat(d.rating)?null:parseFloat(d.rating)})}}>
              {rDist.map(function(d,i){var r=parseFloat(d.rating),a=sR===r;return <Cell key={i} fill={rCT(r,T)} fillOpacity={sR!==null&&!a?0.2:0.95} stroke={a?N.ink:'none'} strokeWidth={a?1.5:0}/>})}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {sR!==null&&<FilmList T={N} title={sR+'\u2605'} films={selFilms} onClose={function(){sSR(null)}}/>}
      </div>

    </div>}

    {/* ===== WHERE ===== */}
    {tab==='where'&&<div className="space-y-6">
      <div><SectionHead T={N} title="Platforms" aside={<SrtB T={N} val={sorts.pl} onToggle={function(){ts('pl')}}/>}/><CTbl T={N} data={platD} sel={sP} onSel={function(v){sSP(v);sSVe(null)}} sortMode={sorts.pl}/></div>
      <FilmList T={N} title={sP} films={platF} onClose={function(){sSP(null)}}/>
      <div><SectionHead T={N} title="Theaters" aside={<SrtB T={N} val={sorts.ve} onToggle={function(){ts('ve')}}/>}/><div className="max-h-96 overflow-y-auto"><CTbl T={N} data={venD} sel={sVe} onSel={function(v){sSVe(v);sSP(null)}} sortMode={sorts.ve}/></div></div>
      <FilmList T={N} title={sVe} films={venF} onClose={function(){sSVe(null)}}/>
    </div>}

    {/* ===== WHO ===== */}
    {tab==='who'&&<div className="space-y-6">
      <div className="grid grid-cols-2" style={{borderTop:'0.5px solid '+N.border,borderBottom:'0.5px solid '+N.border}}>
        <Stat T={N} label="Solo" value={solo.solo} sub={(ef.length?((solo.solo/ef.length)*100).toFixed(0):0)+'%'} yoy={yoy&&fY(-yoy.fr,'pp')}/>
        <Stat T={N} label="With friends" value={solo.social} sub={(ef.length?((solo.social/ef.length)*100).toFixed(0):0)+'%'} yoy={yoy&&fY(yoy.fr,'pp')} noBorder/>
      </div>
      <div><SectionHead T={N} title="Companions" aside={<span className="text-xs" style={{color:N.mutedSoft,fontStyle:'italic'}}>hover for top films</span>}/><div className="flex justify-end mb-2"><SrtB T={N} val={sorts.co} onToggle={function(){ts('co')}}/></div><div className="max-h-96 overflow-y-auto"><CTbl T={N} data={compD} sel={sCo} onSel={sSCo} sortMode={sorts.co}/></div></div>
      <FilmList T={N} title={sCo} films={compF} onClose={function(){sSCo(null)}}/>
    </div>}

    {/* ===== YESMINE ===== */}
    {tab==='yesmine'&&<div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4" style={{borderTop:'0.5px solid '+N.border,borderBottom:'0.5px solid '+N.border}}>
        <Stat T={N} label="Films together" value={yStats.count} color={T.primary}/>
        <Stat T={N} label="My average" value={yStats.myAvg?yStats.myAvg.toFixed(2):'\u2014'}/>
        <Stat T={N} label="Yesmine's average" value={yStats.yAvg?yStats.yAvg.toFixed(2):'\u2014'} color={blend(T.primary,N.paper,0.25)}/>
        <Stat T={N} label="Agree (±0.5)" value={yStats.agree} color={T.primary} noBorder/>
      </div>
      <div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:0}}>
        <SectionHead T={N} title="Ratings side by side" aside={<div className="flex gap-1 flex-wrap"><button onClick={function(){sYSort(ySort==="dateNew"?"dateOld":"dateNew")}} style={(ySort==="dateNew"||ySort==="dateOld")?{padding:'3px 8px',fontSize:10,fontWeight:500,color:N.paper,background:T.primary,border:'0.5px solid '+T.primary,borderRadius:0}:btnSecondary}>{ySort==="dateOld"?"Newest first":"Oldest first"}</button><button onClick={function(){sYSort(ySort==="agree"?"disagree":"agree")}} style={(ySort==="agree"||ySort==="disagree")?{padding:'3px 8px',fontSize:10,fontWeight:500,color:N.paper,background:T.primary,border:'0.5px solid '+T.primary,borderRadius:0}:btnSecondary}>{ySort==="agree"?"Most divided":"Most aligned"}</button><button onClick={function(){sYSort(ySort==="myHigh"?"myLow":"myHigh")}} style={(ySort==="myHigh"||ySort==="myLow")?{padding:'3px 8px',fontSize:10,fontWeight:500,color:N.paper,background:T.primary,border:'0.5px solid '+T.primary,borderRadius:0}:btnSecondary}>{ySort==="myHigh"?"My least favorites":"My favorites"}</button></div>}/>
        <div className="max-h-96 overflow-y-auto"><table className="w-full text-xs"><thead><tr style={{color:N.muted,borderBottom:'0.5px solid '+N.border}}><th className="text-left py-1.5" style={{fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>Film</th><th className="text-right py-1.5" style={{fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>Me</th><th className="text-right py-1.5" style={{fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>Y</th><th className="text-right py-1.5" style={{fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>Diff</th></tr></thead><tbody>{yFilms.slice().sort(function(a,b){if(ySort==="dateNew"||ySort==="date")return a.date>b.date?-1:1;if(ySort==="dateOld")return a.date<b.date?-1:1;if(ySort==="agree")return(a.diff===null?99:a.diff)-(b.diff===null?99:b.diff);if(ySort==="disagree")return(b.diff===null?-1:b.diff)-(a.diff===null?-1:a.diff);if(ySort==="myHigh")return(b.rating||0)-(a.rating||0);if(ySort==="myLow")return(a.rating||99)-(b.rating||99);return 0}).map(function(f,i){return <tr key={i} style={{borderBottom:'0.5px solid '+N.border}}><td className="py-1.5" style={{color:N.inkSoft}}>{f.name} <span style={{color:N.muted}}>({f.year})</span></td><td className="py-1.5 text-right" style={{color:f.rating!==null?rCT(f.rating,T):N.mutedSoft}}>{f.rating!==null?f.rating+'★':'—'}</td><td className="py-1.5 text-right" style={{color:typeof f.yRating==="number"?rCT(f.yRating,T):N.mutedSoft}}>{typeof f.yRating==="number"?f.yRating+'★':(f.yRating||'—')}</td><td className="py-1.5 text-right" style={{color:f.diff!==null?(f.diff<=0.5?T.primary:f.diff>=2?T.primary:blend(T.primary,N.paper,0.35)):N.mutedSoft}}>{f.diff!==null?f.diff.toFixed(1):'—'}</td></tr>})}</tbody></table></div>
      </div>
      {yMissing.length>0&&<div className="p-4" style={{background:N.surface,border:'0.5px solid '+blend(T.primary,N.paper,0.35),borderRadius:0}}><div className="mb-2" style={{fontSize:13,fontWeight:500,color:'#8E6A1F'}}>Missing Yesmine ratings ({yMissing.length})</div><div className="max-h-48 overflow-y-auto">{yMissing.map(function(e,i){return <div key={i} className="text-xs py-0.5" style={{color:N.muted}}>{e.name} ({e.year}) — {e.date}</div>})}</div></div>}
    </div>}

    {/* ===== TASTE ===== */}
    {tab==='taste'&&<div className="space-y-6">
      <div><SectionHead T={N} title="Decades" aside={<SrtB T={N} val={sorts.de} onToggle={function(){ts('de')}}/>}/><CTbl T={N} data={decD} sel={sDe} onSel={function(v){sSDe(v);sSTg(null)}} sortMode={sorts.de}/></div>
      <FilmList T={N} title={sDe} films={decF} onClose={function(){sSDe(null)}}/>
      <div><SectionHead T={N} title="Tags" aside={<SrtB T={N} val={sorts.tg} onToggle={function(){ts('tg')}}/>}/><CTbl T={N} data={tagD} sel={sTg} onSel={function(v){sSTg(v);sSDe(null)}} sortMode={sorts.tg}/></div>
      <FilmList T={N} title={sTg} films={tagF} onClose={function(){sSTg(null)}}/>
    </div>}

    {/* ===== FILMS ===== */}
    {tab==='films'&&<div className="space-y-6">
      <div className="grid grid-cols-3" style={{borderTop:'0.5px solid '+N.border,borderBottom:'0.5px solid '+N.border}}>
        <Stat T={N} label="Directors" value={dirStats.uDir}/>
        <Stat T={N} label="Total runtime" value={dirStats.totalH+'h'}/>
        <Stat T={N} label="Avg runtime" value={dirStats.avgRun+'min'} sub={dirStats.rtCount<dirStats.rtTotal?dirStats.rtCount+'/'+dirStats.rtTotal+' enriched':null} noBorder/>
      </div>
      <div><SectionHead T={N} title="Directors" aside={<SrtB T={N} val={sorts.dir} onToggle={function(){ts('dir')}}/>}/><div className="max-h-96 overflow-y-auto"><CTbl T={N} data={dirD} sel={sDir} onSel={function(v){sSDir(v)}} sortMode={sorts.dir}/></div></div>
      <FilmList T={N} title={sDir} films={dirF} onClose={function(){sSDir(null)}}/>
      <div><SectionHead T={N} title="Cast" aside={<SrtB T={N} val={sorts.cast} onToggle={function(){ts('cast')}}/>}/><div className="max-h-96 overflow-y-auto"><CTbl T={N} data={castD} sel={sCast} onSel={function(v){sSCast(v)}} sortMode={sorts.cast}/></div></div>
      <FilmList T={N} title={sCast} films={castF} onClose={function(){sSCast(null)}}/>
      <div><SectionHead T={N} title="Genres" aside={<SrtB T={N} val={sorts.genre} onToggle={function(){ts('genre')}}/>}/><div className="max-h-96 overflow-y-auto"><CTbl T={N} data={genreD} sel={sGenre} onSel={function(v){sSGenre(v)}} sortMode={sorts.genre}/></div></div>
      <FilmList T={N} title={sGenre} films={genreF} onClose={function(){sSGenre(null)}}/>
      <div><SectionHead T={N} title="Countries" aside={<SrtB T={N} val={sorts.country} onToggle={function(){ts('country')}}/>}/><div className="max-h-96 overflow-y-auto"><CTbl T={N} data={countryD} sel={sCountry} onSel={function(v){sSCountry(v)}} sortMode={sorts.country}/></div></div>
      <FilmList T={N} title={sCountry} films={countryF} onClose={function(){sSCountry(null)}}/>
    </div>}

    {/* ===== RANKINGS ===== */}
    {tab==='rankings'&&<div className="space-y-8">
      {top50Evo.years.length>0&&<div>
        <SectionHead T={N} title="Top 50, all time" aside={<span className="text-xs" style={{color:N.mutedSoft}}>{top50Evo.years.join(" → ")}</span>}/>
        <div className="overflow-x-auto"><div style={{minWidth:380}}><table className="w-full text-xs"><thead><tr style={{color:N.muted,borderBottom:'0.5px solid '+N.border}}><th className="text-left py-2" style={{fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>Film</th>{top50Evo.years.map(function(y){return <th key={y} className="text-center py-2" style={{width:80,fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>{y}</th>})}</tr></thead><tbody>{top50Evo.films.map(function(fi,i){var yrs2=top50Evo.years;var latestR=fi.ranks[yrs2[yrs2.length-1]];var inLatest=latestR!==undefined;return <tr key={i} style={{borderBottom:'0.5px solid '+N.border,opacity:inLatest?1:0.35}}><td className="py-1.5" style={{color:N.inkSoft}}>{fi.name} <span style={{color:N.muted}}>({fi.year})</span></td>{yrs2.map(function(y,yi){var r=fi.ranks[y];var prev=yi>0?fi.ranks[yrs2[yi-1]]:null;var move=r&&prev?(prev-r):null;var isNew=r&&!prev&&yi>0;var isOut=!r&&prev;return <td key={y} className="py-1.5 text-center"><div className="flex items-center justify-center gap-0.5">{r?<span style={{fontWeight:500,color:N.ink}}>{r}</span>:isOut?<span className="text-xs" style={{color:N.mutedSoft}}>OUT</span>:<span style={{color:N.mutedSoft}}>—</span>}{r&&yi>0&&(isNew?<span className="ml-0.5" style={{fontSize:10,color:T.secondary||T.primary,fontWeight:500}}>NEW</span>:move!==null?<span className="ml-0.5" style={{fontSize:10,color:move>0?T.primary:move<0?T.primary:N.mutedSoft}}>{move>0?"▲"+move:move<0?"▼"+Math.abs(move):"="}</span>:null)}</div></td>})}</tr>})}</tbody></table></div></div>
      </div>}
      <div><SectionHead T={N} title="Rewatch candidates"/><div className="text-xs mb-3" style={{color:N.muted}}>Films rated 4★+ sorted by time since last watch</div><div className="max-h-screen overflow-y-auto"><table className="w-full text-xs"><thead><tr style={{color:N.muted,borderBottom:'0.5px solid '+N.border}}><th className="text-left py-1.5" style={{fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>Film</th><th className="text-right py-1.5" style={{fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>Rating</th><th className="text-right py-1.5" style={{fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>Last watch</th><th className="text-right py-1.5" style={{fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>Months</th></tr></thead><tbody>{rwCandidates.slice(0,100).map(function(fi,i){return <tr key={i} style={{borderBottom:'0.5px solid '+N.border}}><td className="py-1.5" style={{color:N.inkSoft}}>{fi.name} <span style={{color:N.muted}}>({fi.year})</span></td><td className="py-1.5 text-right" style={{color:rCT(fi.rating,T)}}>{fi.rating}★</td><td className="py-1.5 text-right" style={{color:N.muted}}>{fi.lastWatch}</td><td className="py-1.5 text-right" style={{color:fi.months>24?T.primary:fi.months>12?blend(T.primary,N.paper,0.35):T.primary,fontWeight:500}}>{fi.months}</td></tr>})}</tbody></table></div></div>
    </div>}

    {/* ===== DIARY ===== */}
    {tab==='diary'&&<div className="space-y-4">
      <input style={Object.assign({},inputStyle,{width:'100%'})} placeholder="Filter..." value={dSrch} onChange={function(e){sDSrch(e.target.value)}}/>
      <div style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:0,overflow:'hidden'}}><div className="max-h-screen overflow-y-auto"><table className="w-full text-xs"><thead style={{position:'sticky',top:0,background:N.surfaceAlt}}><tr>{[['date','Date'],['name','Film'],['year','Year'],['rating','\u2605']].map(function(h){var ac=dSrt.col===h[0];return <th key={h[0]} onClick={function(){sDSrt(function(p){return{col:h[0],asc:p.col===h[0]?!p.asc:h[0]==='name'}})}} className="text-left py-2 px-3 cursor-pointer" style={{fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:ac?T.primary:N.muted}}>{h[1]}{ac?(dSrt.asc?' \u2191':' \u2193'):''}</th>})}<th className="text-left py-2 px-3" style={{fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:N.muted}}>Where</th></tr></thead><tbody>{diaryData.map(function(f,i){return <tr key={i} style={{borderTop:'0.5px solid '+N.border}}><td className="py-1.5 px-3 whitespace-nowrap" style={{color:N.muted}}>{f.date}</td><td className="py-1.5 px-3 truncate max-w-xs" style={{color:N.inkSoft}}>{f.name}{f.rewatch&&<span className="ml-1" style={{color:blend(T.primary,N.paper,0.35)}}>{'\u21BB'}</span>}</td><td className="py-1.5 px-3 hidden md:table-cell" style={{color:N.muted}}>{f.year}</td><td className="py-1.5 px-3" style={{color:f.rating?rCT(f.rating,T):N.mutedSoft}}>{f.rating!==null?f.rating+'\u2605':'\u2014'}</td><td className="py-1.5 px-3 truncate max-w-32" style={{color:N.muted}}>{gP(f.tags,fullReg)}</td></tr>})}</tbody></table></div></div>
    </div>}

    {/* ===== COSTS ===== */}
    {tab==='costs'&&(isAdmin?<div className="space-y-6">
      <div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:0}}>
        <SectionHead T={N} title="Subscription editor" aside={<button onClick={function(){doUpSubs(function(p){return p.concat([{id:'s_'+Date.now(),name:'New',platforms:[],periods:[{from:'',to:'',price:0}]}])})}} style={btnPrimary}>+ Add</button>}/>
        <div className="space-y-2">{subscriptions.map(function(sub){return <div key={sub.id} className="p-3" style={{background:N.paper,border:'0.5px solid '+N.border,borderRadius:0}}><div className="flex justify-between items-center"><span style={{fontSize:13,fontWeight:500,color:N.ink}}>{sub.name}</span><div className="flex gap-1"><button onClick={function(){sCostEs(costEs===sub.id?null:sub.id)}} style={btnSecondary}>{costEs===sub.id?'Close':'Edit'}</button><button onClick={function(){doUpSubs(function(p){return p.filter(function(s){return s.id!==sub.id})});sCostEs(null)}} style={{background:N.surface,border:'0.5px solid '+T.primary,borderRadius:0,color:blend(T.primary,N.paper,-0.2),padding:'4px 10px',fontSize:11}}>{'\u00D7'}</button></div></div>
          {costEs===sub.id&&<div className="space-y-3 mt-3">
            <div className="flex gap-2 items-center"><label className="text-xs w-14" style={{color:N.muted}}>Name</label><input style={Object.assign({},inputStyle,{flex:1,fontSize:11,padding:'4px 6px'})} value={sub.name} onChange={function(e){var v=e.target.value;doUpSubs(function(p){return p.map(function(s){return s.id===sub.id?Object.assign({},s,{name:v}):s})})}}/></div>
            <div><label className="text-xs mb-1 block" style={{color:N.muted}}>Platforms (click to toggle)</label><div className="flex flex-wrap gap-1">{paidPlatTags.map(function(t){var isIn=sub.platforms.indexOf(t)!==-1;return <button key={t} onClick={function(){doUpSubs(function(p){return p.map(function(s){if(s.id!==sub.id)return s;var np=isIn?s.platforms.filter(function(x){return x!==t}):s.platforms.concat([t]);return Object.assign({},s,{platforms:np})})})}} style={isIn?{padding:'3px 8px',fontSize:11,fontWeight:500,color:N.paper,background:T.primary,border:'0.5px solid '+T.primary,borderRadius:0}:{padding:'3px 8px',fontSize:11,color:N.muted,background:'transparent',border:'0.5px solid '+N.border,borderRadius:0}}>{getDn(t,fullReg)}</button>})}<button key="_ts" onClick={function(){doUpSubs(function(p){return p.map(function(s){if(s.id!==sub.id)return s;var isIn=s.platforms.indexOf('_theater_sub')!==-1;var np=isIn?s.platforms.filter(function(x){return x!=='_theater_sub'}):s.platforms.concat(['_theater_sub']);return Object.assign({},s,{platforms:np})})})}} style={sub.platforms.indexOf('_theater_sub')!==-1?{padding:'3px 8px',fontSize:11,fontWeight:500,color:N.paper,background:T.primary,border:'0.5px solid '+T.primary,borderRadius:0}:{padding:'3px 8px',fontSize:11,color:N.muted,background:'transparent',border:'0.5px solid '+N.border,borderRadius:0}}>Theater pass</button></div></div>
            <div><div className="flex justify-between"><label className="text-xs" style={{color:N.muted}}>Periods</label><button onClick={function(){doUpSubs(function(p){return p.map(function(s){return s.id===sub.id?Object.assign({},s,{periods:s.periods.concat([{from:'',to:'',price:0}])}):s})})}} className="text-xs" style={{color:T.primary}}>+</button></div>{sub.periods.map(function(pr,pi){return <div key={pi} className="flex gap-1 items-center flex-wrap mt-1"><input type="month" style={Object.assign({},inputStyle,{fontSize:11,padding:'2px 4px',width:112})} value={pr.from} onChange={function(e){var v=e.target.value;doUpSubs(function(p){return p.map(function(s){if(s.id!==sub.id)return s;return Object.assign({},s,{periods:s.periods.map(function(x,j){return j===pi?Object.assign({},x,{from:v}):x})})})})}}/><span className="text-xs" style={{color:N.mutedSoft}}>{'\u2192'}</span><input type="month" style={Object.assign({},inputStyle,{fontSize:11,padding:'2px 4px',width:112})} placeholder="ongoing" value={pr.to} onChange={function(e){var v=e.target.value;doUpSubs(function(p){return p.map(function(s){if(s.id!==sub.id)return s;return Object.assign({},s,{periods:s.periods.map(function(x,j){return j===pi?Object.assign({},x,{to:v}):x})})})})}}/><span className="text-xs" style={{color:N.mutedSoft}}>{'\u20AC'}</span><input type="number" step="0.01" style={Object.assign({},inputStyle,{fontSize:11,padding:'2px 4px',width:56})} value={pr.price} onChange={function(e){var v=e.target.value;doUpSubs(function(p){return p.map(function(s){if(s.id!==sub.id)return s;return Object.assign({},s,{periods:s.periods.map(function(x,j){return j===pi?Object.assign({},x,{price:parseFloat(v)||0}):x})})})})}}/><span className="text-xs" style={{color:N.mutedSoft}}>/mo</span>{sub.periods.length>1&&<button onClick={function(){doUpSubs(function(p){return p.map(function(s){return s.id===sub.id?Object.assign({},s,{periods:s.periods.filter(function(_,j){return j!==pi})}):s})})}} className="text-xs" style={{color:T.primary}}>{'\u00D7'}</button>}</div>})}</div>
          </div>}
        </div>})}</div>
      </div>
      {costView}<DQPanel T={N} data={dq}/>
    </div>:costView)}

    {/* ===== TAGS (admin) ===== */}
    {tab==='tags'&&isAdmin&&<div className="space-y-4">
      <input style={Object.assign({},inputStyle,{width:'100%'})} placeholder="Filter tags..." value={tagSearch} onChange={function(e){sTagSearch(e.target.value)}}/>
      {CATS.map(function(cat){var tags=tagGroupedDash[cat];if(!tags||!tags.length)return null;return <div key={cat} className="p-4 mb-3" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:0}}><div style={{fontSize:13,fontWeight:500,color:N.inkSoft,marginBottom:8}}>{CI[cat].l} ({tags.length})</div><div className="space-y-0 max-h-64 overflow-y-auto">{tags.map(function(t){return renderTagRow(t,false)})}</div></div>})}
    </div>}

    <div className="mt-12 pt-4 text-center" style={{borderTop:'0.5px solid '+N.border}}><div style={{fontSize:10,letterSpacing:'0.2em',color:N.mutedSoft,textTransform:'uppercase',fontFamily:fontLabel}}>Babylonian's Letterboxd · {T.name}</div></div>
  </div></div>);
}
