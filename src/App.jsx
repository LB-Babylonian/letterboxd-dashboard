import { useState, useMemo, useCallback, useEffect, useRef, Component } from "react";
import { BarChart, Bar, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from "recharts";
import { createClient } from "@supabase/supabase-js";
// Supabase config comes from .env (see .env.example). Note that Vite inlines
// VITE_* values into the production bundle — these are NOT secrets and must not
// be treated as such. That is fine here: the anon key is public by design, and
// the security boundary is RLS (see supabase/schema.sql), not key secrecy.
// Writes are restricted to authenticated users; anon gets read-only.
var SB_URL=import.meta.env.VITE_SUPABASE_URL;
var SB_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY;
// Missing config used to throw here, at module load — before React mounts, so the
// error boundary could not catch it and the page rendered blank white. A deploy host
// with no environment variables set produced a silent, unexplained blank page. Record
// it instead and let the component say so on screen.
var CONFIG_ERROR=(!SB_URL||!SB_KEY)?'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY':null;
var sb=CONFIG_ERROR?null:createClient(SB_URL,SB_KEY);
// No TMDB token here on purpose: enrichment runs locally via `npm run enrich`
// (scripts/enrich.mjs) so the read token never reaches the browser bundle.

// ============================================================
// NEUTRAL — editorial light palette used everywhere EXCEPT the hero block
// The hero keeps its full themed palette for dramatic effect; the rest of
// the dashboard stays calm, functional, and reads the same regardless of theme.
// Only T.primary (the theme's accent color) leaks into the dashboard for pills,
// ratings, hover, etc.
// ============================================================
var NEUTRAL={
  paper:'#14181C',surface:'#1C2228',surfaceAlt:'#242A31',
  border:'#2C333B',borderStrong:'#3D4550',
  ink:'#FFFFFF',inkSoft:'#99AABB',muted:'#667788',mutedSoft:'#4A5560',
  dark:true
};

// Negative / regression indicator (YoY declines, "worse than last year").
// Theme-independent on purpose: this used to be blend(T.primary,paper,0.55), which
// darkened the accent until it was unreadable (1.9-2.7:1 on surface, well under AA)
// and was invisible outright for themes whose primary is near-black (lighthouse,
// lalaland). A muted terracotta reads as "down" against the green "up" and holds
// 5.16:1 on surface / 5.74:1 on paper for every theme.
var NEG='#C8806B';

// ============================================================
// THEMES — 36 cinematic palettes (each used ONLY in the hero block)
// Each theme: {id, name, paper, ink, muted, mutedSoft, border, borderStrong, surface, surfaceAlt, primary, secondary?, dark?}
// `dark` is true when the theme has a dark background (affects text contrast in bars).
// Primary is the SIGNATURE accent — drives ratings gradient, year gradient, +/- gradient.
// Secondary is optional and used for accents (e.g. labels).
// ============================================================
var THEMES=[
    {id:'neutral',name:'Default',dark:true,paper:'#14181C',surface:'#1C2228',surfaceAlt:'#242A31',border:'#2C333B',borderStrong:'#3D4550',ink:'#FFFFFF',inkSoft:'#99AABB',muted:'#667788',mutedSoft:'#4A5560',primary:'#3DC25A',secondary:'#F18027',chartTextColor:'#14181C',gradient:['#14181C','#181D22','#1C2228'],accentTh:'#3DC25A',accentRt:'#F18027',accentPct:'#52AAD5',dots:['#3DC25A','#F18027','#52AAD5'],metricColor:'#FFFFFF',descriptorColor:'#667788',subColor:'#99AABB'},
  {id:'matrix',name:'Matrix',dark:true,paper:'#000000',surface:'#050B05',surfaceAlt:'#0B170B',border:'#0B270B',borderStrong:'#0F3A0F',ink:'#00FF55',inkSoft:'#00CC44',muted:'#008833',mutedSoft:'#005522',primary:'#00FF55',secondary:'#FF1A1A',gradient:['#000000','#020602','#000000'],accentTh:'#00FF55',accentRt:'#00FF55',accentPct:'#FF1A1A',dots:['#00FF55','#FF1A1A','#FFFFFF'],glow:'#00FF55',chartTextColor:'#000000'},
  {id:'br2049',name:'Blade Runner 2049',dark:true,paper:'#180F2A',surface:'#221842',surfaceAlt:'#2A1F55',border:'#3A2A6A',borderStrong:'#4A3590',ink:'#F0C79A',inkSoft:'#E0945C',muted:'#A878A0',mutedSoft:'#7050A0',primary:'#3F2A6A',secondary:'#FF8030',gradient:['#10082A','#1A1140','#240F3A'],accentTh:'#E0258A',accentRt:'#E0258A',accentPct:'#FF8030',dots:['#E0258A','#FF8030','#5570B8'],glow:'#E0258A',metricColor:'#E0258A',chartTextColor:'#F5F0E6'},
  {id:'amelie',name:'Amélie',dark:false,paper:'#2A4F2A',surface:'#345A34',surfaceAlt:'#3E6A3E',border:'#3E5F3E',borderStrong:'#5A7A5A',ink:'#E8AC2F',inkSoft:'#D89A1A',muted:'#B0985A',mutedSoft:'#85734A',primary:'#2A4F2A',secondary:'#E8AC2F',gradient:['#2A4F2A','#345A34','#3E6A3E'],accentTh:'#E8AC2F',accentRt:'#E8AC2F',accentPct:'#C42820',dots:['#E8AC2F','#C42820','#2A4F2A'],metricColor:'#C42820',chartTextColor:'#F5E0B8'},
  {id:'lalaland',name:'La La Land',dark:true,paper:'#0E1B39',surface:'#1B274B',surfaceAlt:'#232F56',border:'#2F406C',borderStrong:'#42538B',ink:'#F5F0E6',inkSoft:'#E8E0CE',muted:'#8D9BC4',mutedSoft:'#61719C',primary:'#1A2D5A',secondary:'#F5F0E6',gradient:['#0A1A3F','#162553','#1E2D5E'],accentTh:'#F5F0E6',accentRt:'#F5F0E6',accentPct:'#1A2D5A',dots:['#F5F0E6','#FFD85A','#1A2D5A'],glow:'#F5F0E6',metricColor:'#FFFFFF',titleColor:'#1A2D5A',chartTextColor:'#FFFFFF'},
  {id:'budapest',name:'Grand Budapest',dark:false,paper:'#F5BFC8',surface:'#F5BFC8',surfaceAlt:'#F5BFC8',border:'#D8859A',borderStrong:'#8B4A6B',ink:'#5B2A4A',inkSoft:'#7B3D5C',muted:'#9C796D',mutedSoft:'#B59A8A',primary:'#8B4A6B',secondary:'#E8C97A',gradient:['#F5BFC8','#F5BFC8','#F5BFC8'],accentTh:'#8B4A6B',accentRt:'#8B4A6B',accentPct:'#E8C97A',dots:['#8B4A6B','#E8C97A','#5B2A4A'],subColor:'#8B4A6B'},
  {id:'mood',name:'In the Mood for Love',dark:true,paper:'#8B0815',surface:'#9B1220',surfaceAlt:'#A8202C',border:'#5A0810',borderStrong:'#3A0508',ink:'#1A0A0A',inkSoft:'#3A1A1A',muted:'#D8A0A0',mutedSoft:'#A85A5A',primary:'#C8302A',secondary:'#1A0A0A',gradient:['#8B0815','#9B1220','#A8202C'],accentTh:'#1A0A0A',accentRt:'#1A0A0A',accentPct:'#2A5A38',dots:['#1A0A0A','#2A5A38','#E8D5A8'],glow:'#C8302A',metricColor:'#1A0A0A',subColor:'#1A0A0A'},
  {id:'interstellar',name:'Interstellar',dark:true,paper:'#050811',surface:'#0A1119',surfaceAlt:'#0F1A2D',border:'#152134',borderStrong:'#1F3548',ink:'#F0F4F8',inkSoft:'#D0D8E0',muted:'#7090BD',mutedSoft:'#4060A0',primary:'#2D4FA5',secondary:'#FFFFFF',gradient:['#050811','#0A1119','#0F1A2D'],accentTh:'#2D4FA5',accentRt:'#FFFFFF',accentPct:'#FFFFFF',dots:['#FFFFFF','#2D4FA5','#FF8C28'],glow:'#FFFFFF',titleColor:'#2D4FA5',metricColor:'#FFFFFF',chartTextColor:'#FFFFFF'},
  {id:'killbill',name:'Kill Bill',dark:false,paper:'#FFD400',surface:'#FFD400',surfaceAlt:'#FFD400',border:'#1A0A05',borderStrong:'#1A0A05',ink:'#1A0A05',inkSoft:'#3A1A0A',muted:'#7A4810',mutedSoft:'#8B5510',primary:'#E10510',secondary:'#1A0A05',gradient:['#FFD400','#FFD400','#FFD400'],accentTh:'#E10510',accentRt:'#E10510',accentPct:'#1A0A05',dots:['#E10510','#1A0A05','#FFD400'],metricColor:'#1A0A05',subColor:'#E10510'},
  {id:'akira',name:'Akira',dark:true,paper:'#0A0808',surface:'#150A0A',surfaceAlt:'#1F0A0A',border:'#2A0808',borderStrong:'#3F1010',ink:'#F0F0F0',inkSoft:'#C8C8C8',muted:'#00B5B5',mutedSoft:'#007575',primary:'#FF0033',secondary:'#00E5E5',gradient:['#0A0808','#150A0A','#1F0A0A'],accentTh:'#FF0033',accentRt:'#FF0033',accentPct:'#00E5E5',dots:['#FF0033','#00E5E5','#FFD800'],glow:'#FF0033',titleColor:'#FF0033'},
  {id:'incredibles',name:'The Incredibles',dark:true,paper:'#D81B1B',surface:'#C81515',surfaceAlt:'#B01010',border:'#1A1A1A',borderStrong:'#1A1A1A',ink:'#F5B43A',inkSoft:'#E8A82A',muted:'#FFE085',mutedSoft:'#D88B5A',primary:'#D81B1B',secondary:'#F5B43A',gradient:['#D81B1B','#C81515','#B01010'],accentTh:'#F5B43A',accentRt:'#F5B43A',accentPct:'#1A1A1A',dots:['#F5B43A','#1A1A1A','#FFFFFF'],metricColor:'#F5B43A',descriptorColor:'#1A1A1A',subColor:'#1A1A1A'},
  {id:'space2001',name:'2001: A Space Odyssey',dark:false,paper:'#F0EFEC',surface:'#F0EFEC',surfaceAlt:'#F0EFEC',border:'#C0BFB8',borderStrong:'#8B8A85',ink:'#1A1A1A',inkSoft:'#3A3A3A',muted:'#5A5A5A',mutedSoft:'#7A7A7A',primary:'#D80808',secondary:'#FF6510',gradient:['#F0EFEC','#F0EFEC','#F0EFEC'],accentTh:'#D80808',accentRt:'#FF6510',accentPct:'#1A4A85',dots:['#D80808','#FF6510','#FFD428']},
  {id:'lighthouse',name:'The Lighthouse',dark:false,paper:'#D9D6CE',surface:'#CCC9C1',surfaceAlt:'#B8B5AD',border:'#1A1410',borderStrong:'#1A1410',ink:'#1A1410',inkSoft:'#3A3530',muted:'#5A554F',mutedSoft:'#7A7570',primary:'#1A1410',secondary:'#1A1410',gradient:['#D9D6CE','#CCC9C1','#B8B5AD'],accentTh:'#1A1410',accentRt:'#1A1410',accentPct:'#1A1410',dots:['#1A1410','#5A554F','#E8A82A'],chartTextColor:'#FFFFFF'},
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

// Face for every numeral in the hero — the headline figure and the six supporting ones.
// Deliberately NOT the theme's display font: several themes set that to blackletter,
// script or handwriting, which is unreadable as a number and inconsistent between
// themes. The theme still speaks through the gradient, ornament, dots, colours and the
// label typeface; the figures stay constant so they are always readable. One name here
// restyles all of them.
var FIGURE_FONT='sans';

var THEME_COPY={
  neutral:{masthead:'\u2014 Issue No. {total} \u00b7 {year} \u2014',title:'A year at the movies',heroLabel:'Films watched',heroSuffix:'{n} since last year',fonts:{hero:'serif',label:'sans',title:'serif'}},
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
var ANIM_CSS='@keyframes matrixfall{0%{transform:translateY(-30%)}100%{transform:translateY(140%)}}@keyframes brrain{0%{transform:translateY(-30%)}100%{transform:translateY(120%)}}@keyframes halpulse{0%,100%{opacity:0.85;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}@keyframes trinitybreathe{0%,100%{opacity:0.6}50%{opacity:1}}'
  // Legend chips: a resting border so they look pressable, and a hover lift. The
  // active state is set inline (inline wins over these rules, which is intended).
  +'.yr-chip{display:flex;align-items:center;gap:6px;padding:3px 8px;background:transparent;border:0.5px solid '+NEUTRAL.border+';border-radius:4px;cursor:pointer;transition:background .12s,border-color .12s,opacity .12s}'
  +'.yr-chip:hover{background:'+NEUTRAL.surfaceAlt+';border-color:'+NEUTRAL.borderStrong+'}'
  +'.lb-link{text-decoration:none;transition:opacity .15s}'
  +'.lb-link:hover{opacity:0.78}';


// hexToRgb / rgbToHex helpers for color manipulation
function hexToRgb(h){var x=h.replace('#','');return{r:parseInt(x.slice(0,2),16),g:parseInt(x.slice(2,4),16),b:parseInt(x.slice(4,6),16)}}
function rgbToHex(r,g,b){var to=function(v){var s=Math.max(0,Math.min(255,Math.round(v))).toString(16);return s.length<2?'0'+s:s};return'#'+to(r)+to(g)+to(b)}
// Blend a color toward another (paper) by factor [0..1]; 0 = original, 1 = paper
function blend(hex,paper,f){var a=hexToRgb(hex),b=hexToRgb(paper);return rgbToHex(a.r+(b.r-a.r)*f,a.g+(b.g-a.g)*f,a.b+(b.b-a.b)*f)}
// Saturate (move further from paper) — used for "+" indicators
function vivid(hex,paper,f){var a=hexToRgb(hex),b=hexToRgb(paper);var dr=a.r-b.r,dg=a.g-b.g,db=a.b-b.b;return rgbToHex(a.r+dr*f,a.g+dg*f,a.b+db*f)}

// ============================================================
// DATA COLOUR SYSTEM — one validated palette for every chart
// ============================================================
// Chart colour is deliberately NOT themed. The themes drive the hero block and
// the UI chrome (pills, borders, hover); data marks use the fixed palette below,
// so a chart means the same thing whichever theme is loaded.
//
// This replaced five independent ad-hoc schemes. Every ramp here was checked with
// the dataviz validator against this dashboard's chart surface (#1C2228) for
// lightness band, chroma floor, colour-blind separation (protan/deutan/tritan)
// and contrast. Re-run it if you change a value — do not eyeball it.
//
// Three jobs, three encodings:
//   VIZ_MARK       table rows / distribution cells -> ONE solid colour
//   VIZ_HEAT       the calendar, where colour is the only encoding -> one hue ramp
//   VIZ_YEARS      which diary year (identity)  -> fixed distinct hues, never cycled
//   VIZ_SERIES     which category (max 3)       -> fixed order, never cycled
//   polarity                                    -> VIZ_GOOD / NEUTRAL.muted / NEG

// Data marks are a SINGLE solid colour, not a graded scale. In a ranked table the
// bar's length already encodes the count and the rating is printed beside it, so
// shading by rating restated a number the reader can already see. Letterboxd's own
// orange (#FF8000, hue 53) at 90% intensity. textOn() puts dark ink on it (6.67:1).
var VIZ_MARK='#F18027';

// The calendar is the one place colour is the ONLY encoding — there is no length to
// read — so it keeps a graded ramp, on the same orange hue. Validated as an ordinal
// ramp: monotone lightness, >=0.06 step gaps, light end clear of the surface.
var VIZ_HEAT=['#8A4000','#AE5300','#D46500','#EE7D22','#FF9A56'];

// One line per diary year on the cumulative chart, so colour here answers "which year
// is this" — identity, not magnitude. A single-hue ramp cannot do that job: six years
// spread across any blue ramp left adjacent lines 1.23:1 apart, i.e. indistinguishable.
// Distinct hues in a FIXED order instead, oldest to newest, never cycled. The order is
// itself the colour-blindness safety mechanism, not decoration — reshuffling this list
// fails CVD separation (verified against the validator). Green is deliberately absent:
// it is the UI accent. Validated on the adjacent pairlist, worst pair delta-E 8.4.
// Eight slots covers 2021-2028; a 9th year folds to grey rather than inventing a hue.
var VIZ_YEARS=['#3987E5','#D95926','#199E70','#C98500','#D55181','#9085E9','#008300','#E66767'];

// Categorical identity (monthly spend: subscriptions / tickets / rentals).
// Fixed order, never cycled: a 4th series folds into "Other" rather than
// inventing a hue. These three pass every check on the ALL-PAIRS list (worst
// colour-blind separation 8.6, normal-vision 15.0), so they are safe in any
// arrangement, not only side by side.
var VIZ_SERIES=['#3DC25A','#C4832E','#4E90C4'];

// Positive pole for polarity encodings. Terracotta NEG is the negative pole and
// NEUTRAL.muted the no-change midpoint.
var VIZ_GOOD='#3DC25A';

// Top 50 movement. Up and down previously resolved to the same colour, so a rise and a
// fall were indistinguishable at a glance — the arrow glyph was doing all the work.
var MOVE_UP='#3DC25A';    // green  — climbed
var MOVE_DOWN='#F18027';  // orange — slipped
var MOVE_NEW='#4E90C4';   // blue   — new entry

// Readable text for a value sitting on a data mark. The ramps span dark to light,
// so no single fixed ink serves both ends.
function textOn(hex){var c=hexToRgb(hex);var L=(0.2126*c.r+0.7152*c.g+0.0722*c.b)/255;return L>0.45?'#14181C':'#FFFFFF'}

// Mark colour for a table row / distribution cell. Unrated stays recessive grey.
function rCT(r){return(!r||r===0)?NEUTRAL.mutedSoft:VIZ_MARK}

// Interpolate continuously along a ramp, t in [0,1].
function lerpRamp(ramp,t){
  var x=Math.max(0,Math.min(1,t))*(ramp.length-1),i=Math.floor(x);
  if(i>=ramp.length-1)return ramp[ramp.length-1];
  return blend(ramp[i],ramp[i+1],x-i);
}

// Year -> its own hue, by position among the years actually present (never modulo,
// never recycled). Past the slot list, grey: a generated hue would assert a
// relationship the palette cannot vouch for.
function yC(year,allYears){
  var y=parseInt(year);if(isNaN(y))return NEUTRAL.muted;
  var ys=Array.from(new Set((allYears||[]).map(Number).filter(function(n){return!isNaN(n)}))).sort(function(a,b){return a-b});
  var i=ys.indexOf(y);
  if(i===-1||i>=VIZ_YEARS.length)return NEUTRAL.muted;
  return VIZ_YEARS[i];
}

// Polarity: a real zero point, so two poles plus a neutral midpoint. T is kept in
// the signature for call-site compatibility but chart polarity is not themed.
function signColor(v,T,opts){opts=opts||{};var pos=opts.positiveIsGood!==false;var good=v>0?pos:!pos;if(Math.abs(v)<0.005)return NEUTRAL.muted;return good?VIZ_GOOD:NEG}

// Stacked series, fixed order.
function seriesColors(){return VIZ_SERIES.slice()}

// Calendar heat: step along VIZ_HEAT itself. This previously blended from the surface
// toward the ramp's top, which desaturated as it darkened — mid-range cells landed at
// 30-42% saturation against the bars' 88%, so the calendar read dull beside every other
// chart. Stepping the real ramp holds 86-100% throughout, and the quietest 1-film cell
// still sits 2.15:1 clear of an empty day.
function hmColor(count,max){if(!count)return NEUTRAL.surface;return lerpRamp(VIZ_HEAT,max>0?count/max:0)}

// Read-only category styling — keeps using fixed colors for tag admin (rarely used, not worth theming)
var CI_BASE={
  platform_paid:{l:'Paid platform'},platform_free:{l:'Free platform'},platform_rental:{l:'Rental'},
  sub_venue:{l:'Sub venue'},indie_venue:{l:'Indie venue'},friend:{l:'Friend'},
  taste:{l:'Taste'},meta:{l:'Meta'},price:{l:'Price'},hidden:{l:'Hidden'}
};

function getNowYM(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
function pCSVL(l){var f=[],c='',q=false;for(var i=0;i<l.length;i++){var ch=l[i];if(ch==='"'){if(q&&i+1<l.length&&l[i+1]==='"'){c+='"';i++}else q=!q}else if(ch===','&&!q){f.push(c);c=''}else c+=ch}f.push(c);return f}
function fixEnc(s){if(!s)return'';var r=s;try{var P=[['√©','é'],['√®','è'],['√¨','è'],['√ê','ê'],['√†','à'],['√¢','â'],['√Æ','î'],['√ô','ô'],['√ª','û'],['√´','ë'],['√Ø','ï'],['√á','á'],['√ß','ç'],['√±','ñ'],['√ü','ü'],['√Å','Å'],['¬∞','°'],['‚Äì','–'],['‚Äî','—'],['‚Äú','"'],['‚Äù','"'],['‚Äô',"'"],['‚Äò',"'"],['‚Ä¶','…']];for(var i=0;i<P.length;i++){if(r.indexOf(P[i][0])!==-1)r=r.split(P[i][0]).join(P[i][1])}}catch(e){}return r}
function csvToPipe(raw){try{var cl=fixEnc(raw).replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');var lines=cl.split('\n').filter(function(l){return l.trim()});if(lines.length<2)return{pipe:'',w:[],e:['No data rows'],count:0};var hdr=pCSVL(lines[0]).map(function(h){return h.trim().replace(/^\uFEFF/,'')});var hi={};hdr.forEach(function(h,i){hi[h]=i;var lc=h.toLowerCase();if(hi[lc]===undefined)hi[lc]=i});var gi=function(c){if(hi[c]!==undefined)return hi[c];var lc=c.toLowerCase();if(hi[lc]!==undefined)return hi[lc];for(var k in hi){if(k.toLowerCase()===lc)return hi[k]}return undefined};var nI=gi('Name'),yI=gi('Year'),wI=gi('Watched Date'),rI=gi('Rating'),rwI=gi('Rewatch'),tI=gi('Tags');if(nI===undefined||yI===undefined||wI===undefined)return{pipe:'',w:[],e:['Missing columns'],count:0};var ent=[];for(var i=1;i<lines.length;i++){var f=pCSVL(lines[i]);var gf=function(idx){return idx!==undefined&&idx<f.length?(f[idx]||'').trim():''};var nm=gf(nI),yr=gf(yI),wd=gf(wI),rt=gf(rI),rw=gf(rwI),tr=gf(tI);if(!nm||!wd)continue;var tg=tr.split(',').map(function(t){return t.trim().toLowerCase()}).filter(Boolean);ent.push({wd:wd,nm:nm,yr:yr,rt:rt,rw:rw==='Yes'?'R':'',tg:tg.join(',')})}ent.sort(function(a,b){return a.wd<b.wd?-1:a.wd>b.wd?1:0});return{pipe:ent.map(function(e){return e.wd+'|'+e.nm+'|'+e.yr+'|'+e.rt+'|'+e.rw+'|'+e.tg}).join('\n'),w:[],e:[],count:ent.length}}catch(err){return{pipe:'',w:[],e:['Error: '+String(err)],count:0}}}
function parsePipe(raw){if(!raw||!raw.trim())return[];return raw.trim().split('\n').filter(function(l){return l.trim()}).map(function(l){var p=l.split('|');var tags=p[5]?p[5].split(',').map(function(t){return t.trim()}).filter(Boolean):[];var r=p[3]?p[3].trim():'';return{date:p[0],name:p[1],year:parseInt(p[2]),rating:r&&!isNaN(parseFloat(r))?parseFloat(r):null,rewatch:p[4]==='R',tags:tags}}).filter(function(e){return e.tags.indexOf('series')===-1&&e.tags.indexOf('short')===-1})}
// `hidden` is a real classification, not an absence of one. A tag with no category at all
// trips the unclassified banner and the forced "Classify tags" screen, and a tag deleted from
// the registry comes straight back on the next Letterboxd import because the tag still exists
// there. This parks a tag out of every panel while leaving it visible -- and reversible -- in
// the admin list.
var CATS=['platform_paid','platform_free','platform_rental','sub_venue','indie_venue','friend','taste','meta','price','hidden'];
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
  price:{l:'Price'},
  hidden:{l:'Hidden'}
};
// The taste map plots one dot per category: how much you watch it against how much you
// like it. Every set needs a floor, otherwise the chart fills with things seen once whose
// "average rating" is a single opinion. Directors and cast need a higher floor than genres
// because the long tail there is enormous (426 of 585 directors appear exactly once).
// `floor` spells the threshold out in the set's own terms — "anything seen twice or more"
// is wrong for people, and a bare number in the caption told the reader nothing.
var QUAD_SETS=[
  // ownList: this set has no panel further down the tab, so the map shows the films itself.
  {id:'genre',l:'Genres',min:2,floor:'anything seen twice or more',ownList:true},
  {id:'dir',l:'Directors',min:3,floor:'directors with 3 films or more',ownList:true},
  {id:'cast',l:'Cast',min:3,floor:'actors in 3 films or more',ownList:true},
  {id:'friend',l:'Friends',min:3,floor:'companions on 3 films or more',ownList:true},
  {id:'plat',l:'Platforms',min:3,floor:'platforms with 3 films or more',ownList:true},
  {id:'venue',l:'Theaters',min:3,floor:'venues with 3 films or more',ownList:true},
  {id:'country',l:'Countries',min:2,floor:'countries with 2 films or more',ownList:true},
  {id:'decade',l:'Decades',min:1,floor:null}
];
var MS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var MF=['January','February','March','April','May','June','July','August','September','October','November','December'];
var DSUBS=[{id:'rat',name:'Rat+',platforms:['canal','netflix','hbo','paramount'],periods:[{from:'2021-10',to:'',price:40}]},{id:'disney',name:'Disney+',platforms:['disney'],periods:[{from:'2023-01',to:'',price:9}]},{id:'mubi',name:'Mubi',platforms:['mubi'],periods:[{from:'2021-11',to:'',price:11}]},{id:'prime',name:'Prime Video',platforms:['prime'],periods:[{from:'2022-01',to:'',price:7}]},{id:'theater',name:'Pathé/UGC Pass',platforms:['_theater_sub'],periods:[{from:'2023-07',to:'',price:22}]}];
// Title key for matching the same film across files and diary rows. Lives at module scope
// because it is pure and several memos need it before the point it used to be declared —
// as a `var` inside the component it was still undefined when the first of them ran.
function normName(s){return(s||'').replace(/[‘’`´]/g,"'").trim().toLowerCase()}
function getDn(t,reg){var e=reg[t];return(e&&e.dn)?e.dn:t}
function getCat(t,reg){var e=reg[t];return e?e.cat:null}
function isPlatform(cat){return cat==='platform_paid'||cat==='platform_free'||cat==='platform_rental'}
function gP(tags,reg){for(var i=0;i<tags.length;i++){var c=getCat(tags[i],reg);if(isPlatform(c))return getDn(tags[i],reg);if(c==='sub_venue'||c==='indie_venue')return'Theater'}return'Other'}
function gV(tags,reg){for(var i=0;i<tags.length;i++){var c=getCat(tags[i],reg);if(c==='sub_venue'||c==='indie_venue')return tags[i]}return null}
function gC(tags,reg){var r=[];for(var i=0;i<tags.length;i++){if(getCat(tags[i],reg)==='friend')r.push(getDn(tags[i],reg))}return r}
function gTP(tags,reg){for(var i=tags.length-1;i>=0;i--){if(getCat(tags[i],reg)==='price')return parseInt(tags[i])/100}return null}
function isSubCovAt(filmDate,subs){var ym=filmDate.slice(0,7);var now=getNowYM();return subs.some(function(s){if(s.platforms.indexOf('_theater_sub')===-1)return false;return s.periods.some(function(p){if(!p.from)return false;var to=p.to||now;return ym>=p.from&&ym<=to})})}
function fY(v,t){if(v==null||isNaN(v))return null;if(t==='abs'){var r=Math.round(v);if(!r)return null;return(r>0?'+':'')+r}if(t==='r'){if(Math.abs(v)<0.005)return null;return(v>0?'+':'')+v.toFixed(2)}if(t==='pp'){var r2=Math.round(v);if(!r2)return null;return(r2>0?'+':'')+r2+'pp'}return null}
function mBt(f,t){var fp=f.split('-').map(Number),tp=t.split('-').map(Number);return Math.max(0,(tp[0]-fp[0])*12+(tp[1]-fp[1])+1)}
function subCostForMonth(ym,subs){var t=0;subs.forEach(function(s){s.periods.forEach(function(p){if(!p.from||!p.price)return;var to=p.to||getNowYM();if(ym>=p.from&&ym<=to)t+=p.price})});return t}
// Minutes as hours and minutes. 115 -> "1h 55m", 60 -> "1h", 45 -> "45m".
function hm(mins){if(!mins||mins<1)return'';var h=Math.floor(mins/60),m=Math.round(mins%60);return h?(m?h+'h '+m+'m':h+'h'):m+'m'}
function agg(arr,kf){var m={};arr.forEach(function(e){var k=kf(e);if(!m[k])m[k]={c:0,s:0,r:0};m[k].c++;if(e.rating!==null){m[k].s+=e.rating;m[k].r++}});return Object.keys(m).map(function(n){var v=m[n];return{name:n,Films:v.c,Avg:v.r?parseFloat((v.s/v.r).toFixed(2)):0}})}
// Like agg, but an entry can belong to several buckets at once — a film has three genres and
// two directors. One aggregator for all six sets on the taste map, so every set on that chart
// is counted the same way from the same film list.
function aggMulti(films,keysOf){
  var m={};
  films.forEach(function(e){keysOf(e).forEach(function(k){if(!k)return;if(!m[k])m[k]={c:0,s:0,r:0};m[k].c++;if(e.rating!==null){m[k].s+=e.rating;m[k].r++}})});
  return Object.keys(m).map(function(n){var v=m[n];return{name:n,Films:v.c,Avg:v.r?parseFloat((v.s/v.r).toFixed(2)):0}}).sort(function(a,b){return b.Films-a.Films});
}
function getWeekMon(ds){var d=new Date(ds+'T12:00:00');var day=d.getDay();d.setDate(d.getDate()-(day===0?6:day-1));return d.toISOString().slice(0,10)}
// Day and week streaks. The week figure the hero shows is the LONGEST run, not the current
// one: today they are the same 217 weeks, but a label that says "current" becomes wrong the
// first week a film is missed, and the interesting fact about a four-year run is its length.
//
// Steps by calendar weeks rather than comparing timestamps. Two Mondays a week apart are not
// 7x24h across a DST change — they are 167 or 169 hours — so an arithmetic comparison silently
// breaks every run at the March and October transitions.
function calcStreaks(films){
  var dates=Array.from(new Set(films.map(function(e){return e.date}))).sort();
  if(!dates.length)return{day:0,week:0,wr:'',longest:0,lwr:''};
  var ds=new Set(dates),last=dates[dates.length-1];
  var dayS=0,cd=new Date(last+'T12:00:00');
  while(ds.has(cd.toISOString().slice(0,10))){dayS++;cd.setDate(cd.getDate()-1)}
  var shift=function(iso,n){var d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
  var weekList=Array.from(new Set(dates.map(function(d){return getWeekMon(d)}))).sort();
  var weeks=new Set(weekList);
  // current run, counting back from the most recent week
  var weekS=0,cm=getWeekMon(last);
  while(weeks.has(cm)){weekS++;cm=shift(cm,-7)}
  // longest run: start only at weeks with no predecessor, then walk forward
  var best=0,bs=null,be=null;
  weekList.forEach(function(w){
    if(weeks.has(shift(w,-7)))return;
    var n=1,c=w;
    while(weeks.has(shift(c,7))){n++;c=shift(c,7)}
    if(n>best){best=n;bs=w;be=c}
  });
  var fmt=function(a,b){if(!a)return'';var x=a.split('-').map(Number),y=shift(b,6).split('-').map(Number);
    return MS[x[1]-1]+' '+x[2]+', '+x[0]+' \u2013 '+MS[y[1]-1]+' '+y[2]+', '+y[0]};
  return{day:dayS,week:weekS,wr:fmt(shift(getWeekMon(last),-(weekS-1)),getWeekMon(last)),longest:best,lwr:fmt(bs,be)};
}
function calcWrapped(all,reg){return Array.from(new Set(all.map(function(e){return e.date.slice(0,4)}))).sort().map(function(yr){var f=all.filter(function(e){return e.date.indexOf(yr)===0}),rated=f.filter(function(e){return e.rating!==null}),avg=rated.length?rated.reduce(function(s,e){return s+e.rating},0)/rated.length:0;var cc={};f.forEach(function(e){gC(e.tags,reg).forEach(function(n){cc[n]=(cc[n]||0)+1})});var topC=null,topCC=0;Object.keys(cc).forEach(function(n){if(cc[n]>topCC){topCC=cc[n];topC=n}});var mc={};f.forEach(function(e){mc[e.date.slice(5,7)]=(mc[e.date.slice(5,7)]||0)+1});var topMo=null,topMC=0;Object.keys(mc).forEach(function(m){if(mc[m]>topMC){topMC=mc[m];topMo=m}});var thN=f.filter(function(e){return gP(e.tags,reg)==='Theater'||gV(e.tags,reg)!==null}).length;return{yr:yr,total:f.length,avg:avg,topC:topC,topCC:topCC,topMo:topMo?MF[parseInt(topMo)-1]:null,topMC:topMC,thPct:f.length?Math.round(thN/f.length*100):0}})}
// Only the things that make a COST wrong. The unrated-films list and the sub-venue-premium
// list were inventories rather than problems: a film can simply be unrated, and a price on a
// pass-covered visit is usually a real extra payment, not a mistake.
function calcDQ(all,reg,subs){var nV=[],nS=[],nP=[],nRP=[];all.forEach(function(e){var hTP=e.tags.some(function(t){return isPlatform(getCat(t,reg))&&getDn(t,reg)==='Theater'});var vn=gV(e.tags,reg);if(hTP&&!vn)nV.push(e);if(!hTP&&vn)nS.push(e);if(vn){var isSub=getCat(vn,reg)==='sub_venue';var cov=isSub&&isSubCovAt(e.date,subs);if(isSub&&!cov&&gTP(e.tags,reg)===null)nP.push(e);if(getCat(vn,reg)==='indie_venue'&&gTP(e.tags,reg)===null)nP.push(e)}var isR=e.tags.some(function(t){return getCat(t,reg)==='platform_rental'});if(isR&&gTP(e.tags,reg)===null)nRP.push(e)});return{nV:nV,nS:nS,nP:nP,nRP:nRP}}

// ============================================================
// SHARED VISUAL COMPONENTS — all accept theme T as prop
// ============================================================
var CTooltip=function(p){var T=p.T;if(!p.active||!p.payload||!p.payload.length)return null;return <div style={{background:NEUTRAL.paper,border:'0.5px solid '+NEUTRAL.borderStrong,borderRadius:4,padding:'8px 12px',fontSize:11}}><div style={{color:NEUTRAL.ink,fontWeight:500,marginBottom:4}}>{p.label}</div>{p.payload.filter(function(x){return x.value!=null}).map(function(x,i){return <div key={i} style={{color:x.color||NEUTRAL.ink}}>{x.name}: {typeof x.value==='number'?(Number.isInteger(x.value)?x.value:x.value.toFixed(2)):x.value}</div>})}</div>};
var CostTip=function(p){var T=p.T;if(!p.active||!p.payload||!p.payload.length)return null;return <div style={{background:NEUTRAL.paper,border:'0.5px solid '+NEUTRAL.borderStrong,borderRadius:4,padding:'8px 12px',fontSize:11}}><div style={{color:NEUTRAL.ink,fontWeight:500,marginBottom:4}}>{p.label}</div>{p.payload.filter(function(x){return x.value!=null&&x.value>0}).map(function(x,i){return <div key={i} style={{color:x.color||NEUTRAL.ink}}>{x.name}: {"\u20AC"}{x.value.toFixed(2)}</div>})}</div>};

// SectionHead — used everywhere instead of plain h3
function SectionHead(p){var T=p.T;return <div className="flex items-baseline justify-between mb-3 pb-2" style={{borderBottom:'0.5px solid '+NEUTRAL.border}}><div className="text-base" style={{color:NEUTRAL.ink,fontWeight:500,letterSpacing:'-0.01em'}}>{p.title}{p.count!=null&&<span className="ml-2 text-xs font-normal" style={{color:NEUTRAL.muted}}>{p.count}</span>}</div>{p.aside}</div>}

// Stat — Editorial label / large number / optional sub.
function Stat(p){var T=p.T;var yoyColor=p.yoy?(p.yoy.charAt(0)==='+'?T.primary:p.yoy.charAt(0)==='-'?NEG:NEUTRAL.muted):NEUTRAL.muted;return <div className="px-4 py-3" style={{borderRight:p.noBorder?'none':'0.5px solid '+NEUTRAL.border}}><div className="mb-1.5" style={{fontSize:9,letterSpacing:'0.15em',color:NEUTRAL.muted,textTransform:'uppercase'}}>{p.label}</div><div style={{fontSize:p.large?28:20,fontWeight:500,lineHeight:1,color:p.color||NEUTRAL.ink}}>{p.value}</div>{(p.sub||p.yoy)&&<div className="mt-1.5 flex items-baseline gap-2">{p.sub&&<span style={{fontSize:11,color:NEUTRAL.muted}}>{p.sub}</span>}{p.yoy&&<span style={{fontSize:11,color:yoyColor,fontWeight:500}}>{p.yoy}</span>}</div>}</div>}



// Every selection on the site opens its films through this: a calendar cell, a rating bar, a
// dot on the map, a decade, a tag. It used to expand INLINE beneath the panel, which pushed
// everything under it down the page and, for a chart low on a long tab, opened below the fold —
// you clicked and nothing appeared to happen. As a modal the list arrives where the eye already
// is, and dismissing it leaves the layout exactly as it was.
//
// Rewriting the component was enough; all five call sites pass the same props and needed no
// change.
function FilmList(p){
  var open=!!(p.films&&p.films.length);
  // onClose is an inline function at every call site, so a new one arrives each render. Held in
  // a ref, the listener effect can depend on `open` alone rather than rebinding continuously.
  var closeRef=useRef(p.onClose);closeRef.current=p.onClose;
  useEffect(function(){
    if(!open)return;
    var h=function(e){if(e.key==='Escape')closeRef.current()};
    window.addEventListener('keydown',h);
    return function(){window.removeEventListener('keydown',h)};
  },[open]);
  if(!open)return null;
  return <div onClick={p.onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.62)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60,padding:'40px 20px'}}>
    <div onClick={function(e){e.stopPropagation()}} style={{background:NEUTRAL.surface,border:'1px solid '+NEUTRAL.borderStrong,borderRadius:6,width:'100%',maxWidth:560,maxHeight:'80vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 64px rgba(0,0,0,0.5)'}}>
      <div className="flex justify-between items-baseline px-4 py-3" style={{borderBottom:'0.5px solid '+NEUTRAL.border,flex:'0 0 auto'}}>
        <div className="text-sm" style={{color:NEUTRAL.ink,fontWeight:500}}>{p.title} <span style={{color:NEUTRAL.muted,fontWeight:400}}>({p.films.length})</span></div>
        <button onClick={p.onClose} className="text-xs px-2 py-0.5" style={{color:NEUTRAL.muted,background:NEUTRAL.surfaceAlt,border:'none',borderRadius:4,cursor:'pointer'}} title="Close — or press Escape">{'\u2715'}</button>
      </div>
      <div className="px-4 py-1" style={{overflowY:'auto'}}>
        {p.films.map(function(f,i2){return <div key={i2} className="text-xs py-1.5 flex justify-between" style={{borderBottom:'0.5px solid '+NEUTRAL.border}}><span className="truncate mr-2" style={{color:NEUTRAL.inkSoft}}>{f.name} <span style={{color:NEUTRAL.muted}}>({f.year})</span>{f.rating!==null&&<span className="ml-1" style={{color:NEUTRAL.ink}}>{f.rating}{'\u2605'}</span>}</span><span className="whitespace-nowrap" style={{color:NEUTRAL.muted}}>{f.date}</span></div>})}
      </div>
    </div>
  </div>;
}

// Profile picture. Drop the file at public/avatar.jpg and it appears; leave it out and
// this renders nothing at all. Served from public/ rather than hotlinked from
// Letterboxd's CDN so it cannot break when they reorganise their storage.
var AVATAR_SRC='/Avatar.jpg';
function Avatar(p){
  var[ok,sOk]=useState(true);
  if(!ok||!p.src)return null;
  return <img src={p.src} alt="" width={p.size} height={p.size} onError={function(){sOk(false)}}
    style={{width:p.size,height:p.size,borderRadius:'50%',objectFit:'cover',flex:'0 0 auto',
            border:'1.5px solid '+(p.ring||NEUTRAL.borderStrong),background:NEUTRAL.surfaceAlt}}/>;
}

// Poster — 772 of 777 metadata rows carry a TMDB thumbnail (w92) that nothing rendered
// until now. Small and lazy-loaded on purpose: this is for recognising a title at a
// glance, not decoration. Falls back to an empty slot so rows never jump height.
function Poster(p){
  var w=p.w||24,h=Math.round(w*1.5);
  var src=p.meta&&p.meta.poster;
  // fill: take the width of the parent and hold 2:3, for grids where a fixed pixel width would
  // leave the cell wider than the image -- anything positioned against the cell's edges then
  // lands in the gutter instead of on the poster.
  var base=p.fill
    ? {width:'100%',aspectRatio:'2 / 3',display:'block',borderRadius:6,background:NEUTRAL.surfaceAlt}
    : {width:w,height:h,borderRadius:3,flex:'0 0 auto',background:NEUTRAL.surfaceAlt};
  if(!src)return <div style={base}/>;
  return <img src={src} alt="" loading="lazy" {...(p.fill?{}:{width:w,height:h})} style={Object.assign({},base,{objectFit:'cover'})}/>;
}

// DQPanel — Data Quality (all colors derived from theme primary via blend)
function DQPanel(p){var T=p.T;var d=p.data;if(!d)return null;var c1=T.primary,c2=NEUTRAL.inkSoft;return <div className="p-4" style={{background:NEUTRAL.surface,border:'0.5px solid '+NEUTRAL.border,borderRadius:4}}><SectionHead T={T} title="Data quality"/><div className="space-y-3">{d.nP.length>0&&<div><div className="text-xs mb-1" style={{color:c1}}>Non-sub venue, no price: {d.nP.length}</div><div className="ml-4 max-h-32 overflow-y-auto">{d.nP.map(function(e,i){return <div key={i} className="text-xs" style={{color:NEUTRAL.muted}}>{e.name} ({e.date})</div>})}</div></div>}{d.nRP.length>0&&<div><div className="text-xs mb-1" style={{color:c1}}>Rental, no price: {d.nRP.length}</div><div className="ml-4 max-h-32 overflow-y-auto">{d.nRP.map(function(e,i){return <div key={i} className="text-xs" style={{color:NEUTRAL.muted}}>{e.name} ({e.date})</div>})}</div></div>}{d.nV.length>0&&<div><div className="text-xs mb-1" style={{color:c2}}>Theater tag, no venue: {d.nV.length}</div><div className="ml-4 max-h-32 overflow-y-auto">{d.nV.map(function(e,i){return <div key={i} className="text-xs" style={{color:NEUTRAL.muted}}>{e.name} ({e.date})</div>})}</div></div>}{d.nS.length>0&&<div><div className="text-xs mb-1" style={{color:c2}}>Venue tag, no theater: {d.nS.length}</div><div className="ml-4 max-h-32 overflow-y-auto">{d.nS.map(function(e,i){return <div key={i} className="text-xs" style={{color:NEUTRAL.muted}}>{e.name} ({e.date})</div>})}</div></div>}{d.nV.length===0&&d.nS.length===0&&d.nP.length===0&&d.nRP.length===0&&<div className="text-xs" style={{color:T.primary}}>No pricing issues</div>}</div></div>}

function parseRatings(raw){try{var cl=fixEnc(raw).replace(/^\uFEFF/,"").replace(/\r\n/g,"\n").replace(/\r/g,"\n");var lines=cl.split("\n").filter(function(l){return l.trim()});if(lines.length<2)return[];var hdr=pCSVL(lines[0]).map(function(h){return h.trim()});var hi={};hdr.forEach(function(h,i){hi[h]=i});var res=[];for(var i=1;i<lines.length;i++){var flds=pCSVL(lines[i]);var dt=(flds[hi["Date"]]||"").trim();var nm=(flds[hi["Name"]]||"").trim();var yr=parseInt((flds[hi["Year"]]||"").trim());var rt=parseFloat((flds[hi["Rating"]]||"").trim());if(nm&&yr&&!isNaN(rt))res.push({date:dt,name:nm,year:yr,rating:rt})}return res}catch(e){return[]}}
function parseTop50(raw){try{var cl=fixEnc(raw).replace(/^\uFEFF/,"").replace(/\r\n/g,"\n").replace(/\r/g,"\n");var lines=cl.split("\n").filter(function(l){return l.trim()});var si=-1;for(var i=0;i<lines.length;i++){if(lines[i].indexOf("Position")!==-1){si=i;break}}if(si===-1)return[];var hdr=pCSVL(lines[si]).map(function(h){return h.trim()});var hi={};hdr.forEach(function(h,i){hi[h]=i});var res=[];for(var i=si+1;i<lines.length;i++){var flds=pCSVL(lines[i]);var pos=parseInt((flds[hi["Position"]]||"").trim());var nm=(flds[hi["Name"]]||"").trim();var yr=parseInt((flds[hi["Year"]]||"").trim());if(nm&&yr&&!isNaN(pos))res.push({pos:pos,name:nm,year:yr})}return res}catch(e){return[]}}
function parseWatchlist(raw){try{var cl=fixEnc(raw).replace(/^\uFEFF/,"").replace(/\r\n/g,"\n").replace(/\r/g,"\n");var lines=cl.split("\n").filter(function(l){return l.trim()});if(lines.length<2)return[];var hdr=pCSVL(lines[0]).map(function(h){return h.trim()});var hi={};hdr.forEach(function(h,i){hi[h]=i});var res=[];for(var i=1;i<lines.length;i++){var flds=pCSVL(lines[i]);var dt=(flds[hi["Date"]]||"").trim();var nm=(flds[hi["Name"]]||"").trim();var yr=parseInt((flds[hi["Year"]]||"").trim());var uri=(flds[hi["Letterboxd URI"]]||"").trim();if(nm&&yr)res.push({date:dt,name:nm,year:yr,uri:uri})}return res}catch(e){return[]}}
function parseReviews(raw){try{var cl=fixEnc(raw).replace(/^\uFEFF/,"").replace(/\r\n/g,"\n").replace(/\r/g,"\n");var lines=cl.split("\n");if(lines.length<2)return[];var hdr=pCSVL(lines[0]).map(function(h){return h.trim()});var hi={};hdr.forEach(function(h,i){hi[h]=i});var res=[];var buf=[];for(var i=1;i<lines.length;i++){buf.push(lines[i]);var joined=buf.join("\n");var flds=pCSVL(joined);if(flds.length>=hdr.length){var nm=(flds[hi["Name"]]||"").trim();var yr=parseInt((flds[hi["Year"]]||"").trim());var rv=(flds[hi["Review"]]||"").trim();var tg=(flds[hi["Tags"]]||"").trim().toLowerCase();var rt=(flds[hi["Rating"]]||"").trim();if(nm&&tg.indexOf("yesmine")!==-1){var cleaned=rv.replace(/\u2019/g,"'").replace(/\u2018/g,"'");var yMatch=cleaned.match(/Y.s\s*rating\s*[:\=]\s*([\d.]+|sleep|memory)\/5/i);if(yMatch){var yVal=yMatch[1];var yNum=parseFloat(yVal);res.push({name:nm,year:yr,yRating:isNaN(yNum)?yVal:yNum,myRating:rt?parseFloat(rt):null})}}buf=[]}}return res}catch(e){return[]}}

// A render error anywhere in a tab used to blank the entire page — React unmounts
// the whole tree and you get a white screen with the reason only in the console.
// This catches it, keeps the rest of the app usable, and puts the message on screen.
class TabErrorBoundary extends Component{
  constructor(props){super(props);this.state={err:null}}
  static getDerivedStateFromError(err){return{err:err}}
  componentDidCatch(err,info){console.error('Dashboard render error:',err,info)}
  render(){
    if(!this.state.err)return this.props.children;
    var e=this.state.err;
    return <div className="p-4" style={{background:NEUTRAL.surface,border:'0.5px solid '+NEG,borderRadius:4}}>
      <div style={{fontSize:13,fontWeight:500,color:NEUTRAL.ink,marginBottom:4}}>This section failed to render.</div>
      <div style={{fontSize:11,color:NEUTRAL.muted,marginBottom:10}}>The rest of the dashboard still works — switch tabs to carry on. Details below.</div>
      <pre style={{fontSize:11,color:NEG,whiteSpace:'pre-wrap',margin:0}}>{String(e&&e.message||e)}</pre>
      <pre style={{fontSize:10,color:NEUTRAL.mutedSoft,whiteSpace:'pre-wrap',marginTop:8,maxHeight:220,overflow:'auto'}}>{String(e&&e.stack||'').slice(0,1500)}</pre>
      <button onClick={function(){this.setState({err:null})}.bind(this)} className="text-xs mt-3 px-2 py-1"
        style={{color:NEUTRAL.inkSoft,background:'transparent',border:'0.5px solid '+NEUTRAL.borderStrong,borderRadius:4,cursor:'pointer'}}>Try again</button>
    </div>;
  }
}

export default function Dashboard(){
  var[loading,sLoading]=useState(true);var[pd,sPd]=useState('');var[subscriptions,sSubscriptions]=useState(DSUBS);var[reg,sReg]=useState({});
  var[sI,sSI]=useState(false);var[csv,sCsv]=useState('');var[iR,sIR]=useState(null);
  var[tab,sTab]=useState('overview');var[yr,sYr]=useState('All');var[iRW,sIRW]=useState(true);
  var[sR,sSR]=useState(null);var[sP,sSP]=useState(null);var[sVe,sSVe]=useState(null);var[sCo,sSCo]=useState(null);var[sDe,sSDe]=useState(null);var[sTg,sSTg]=useState(null);var[sDir,sSDir]=useState(null);var[ySort,sYSort]=useState("dateNew");var[sGenre,sSGenre]=useState(null);var[sCountry,sSCountry]=useState(null);var[sCast,sSCast]=useState(null);
  var[selHM,sSelHM]=useState(null);var[isoYrs,sIsoYrs]=useState([]);
  var[quadSet,sQuadSet]=useState('genre');var[revOpen,sRevOpen]=useState(false);
  var[tagSearch,sTagSearch]=useState('');var[tagSel,sTagSel]=useState({});var[bulkCat,sBulkCat]=useState('');
  var[costEs,sCostEs]=useState(null);var[showNoPrice,sShowNoPrice]=useState(false);var[topAsList,sTopAsList]=useState(false);var[costYr,sCostYr]=useState('All');var[dateFrom,sDateFrom]=useState('');var[dateTo,sDateTo]=useState('');
  var[isAdmin,sIsAdmin]=useState(false);var[showPwModal,sShowPwModal]=useState(false);var[pwEmail,sPwEmail]=useState('');var[pwInput,sPwInput]=useState('');var[pwErr,sPwErr]=useState('');var[pwBusy,sPwBusy]=useState(false);
  var[saving,sSaving]=useState(false);var[showSubs,sShowSubs]=useState(false);var[drill,sDrill]=useState(null);var[rankMode,sRankMode]=useState('sub');
  var[filmMeta,sFilmMeta]=useState({});var[yRatings,sYRatings]=useState({});var[allRatings,sAllRatings]=useState([]);var[top50s,sTop50s]=useState([]);
  // Theme system: randomly pick at mount, persist in localStorage, avoid immediate repeat
  var[themeId,sThemeId]=useState(function(){try{var saved=localStorage.getItem('dashboard_theme_explicit');if(saved&&THEMES.find(function(t){return t.id===saved}))return saved;return 'neutral'}catch(e){return 'neutral'}});
  var[showPicker,sShowPicker]=useState(false);
  var T=fullTheme(themeId);
  // Resolved colors with fallback: metricColor for big numbers, descriptorColor for "In theaters" labels, subColor for percentages
  var heroMetricC=T.metricColor||T.primary;
  var heroDescriptorC=T.descriptorColor||T.muted;
  var heroSubC=T.subColor||T.secondary||T.primary;
  // N = neutral editorial palette + T.primary as accent + chartTextColor (so shared components can use it for text on theme-colored bars)
  var N=Object.assign({},NEUTRAL,{primary:T.primary,secondary:T.primary,glow:T.glow,id:T.id,name:T.name,fonts:{},copy:{},chartTextColor:T.chartTextColor});
  var pickTheme=useCallback(function(id){try{localStorage.setItem('dashboard_theme_explicit',id)}catch(e){}sThemeId(id);sShowPicker(false)},[themeId]);
  var cls=function(){sSR(null);sSP(null);sSVe(null);sSCo(null);sSDe(null);sSTg(null);sSelHM(null);sSDir(null);sSGenre(null);sSCountry(null);sSCast(null)};
  useEffect(function(){if(CONFIG_ERROR){sLoading(false);return}Promise.all([sb.from('pipe_data').select('data').eq('id',1).single(),sb.from('tag_registry').select('data').eq('id',1).single(),sb.from('subscriptions').select('data').eq('id',1).single(),sb.from('film_metadata').select('*'),sb.from('review_data').select('data').eq('id',1).single(),sb.from('ratings_data').select('data').eq('id',1).single(),sb.from('top50_data').select('*')]).then(function(r){if(r[0].data&&r[0].data.data)sPd(r[0].data.data);if(r[1].data&&r[1].data.data)sReg(r[1].data.data);if(r[2].data&&r[2].data.data&&Array.isArray(r[2].data.data))sSubscriptions(r[2].data.data);if(r[3].data){var fm={};r[3].data.forEach(function(m){fm[m.title+'|||'+m.year]=m});sFilmMeta(fm)}if(r[4].data&&r[4].data.data){var revd=r[4].data.data;if(Array.isArray(revd)){var yr={};revd.forEach(function(x){yr[x.name+'|||'+x.year]=x.yRating});sYRatings(yr)}}if(r[5].data&&r[5].data.data){try{var rd=typeof r[5].data.data==='string'?JSON.parse(r[5].data.data):r[5].data.data;if(Array.isArray(rd))sAllRatings(rd)}catch(e){}}if(r[6].data){sTop50s(r[6].data.map(function(x){return{year:x.list_year,films:x.data}}).sort(function(a,b){return a.year-b.year}))}sLoading(false)}).catch(function(){sLoading(false)})},[]);

  // isAdmin now means "holds a real Supabase session". It used to be a client-side
  // hash compared against a publicly-readable admin_password table, which any
  // visitor could flip in devtools -- and which never stopped anyone writing to
  // the tables directly with the anon key from the bundle. RLS (supabase/schema.sql)
  // is what actually rejects unauthenticated writes now; this only drives the UI.
  useEffect(function(){if(CONFIG_ERROR)return;var sub=null;sb.auth.getSession().then(function(r){sIsAdmin(!!(r&&r.data&&r.data.session))});var l=sb.auth.onAuthStateChange(function(_evt,session){sIsAdmin(!!session)});if(l&&l.data&&l.data.subscription)sub=l.data.subscription;return function(){if(sub)sub.unsubscribe()}},[]);
  var savePipe=useCallback(function(d){sSaving(true);sb.from('pipe_data').update({data:d,updated_at:new Date().toISOString()}).eq('id',1).then(function(){sSaving(false)}).catch(function(){sSaving(false)})},[]);
  var saveReg=useCallback(function(d){sb.from('tag_registry').update({data:d,updated_at:new Date().toISOString()}).eq('id',1).then(function(){})},[]);
  var saveSubs=useCallback(function(d){sb.from('subscriptions').update({data:d,updated_at:new Date().toISOString()}).eq('id',1).then(function(){})},[]);
  var saveWl=useCallback(function(d){sb.from('watchlist_data').update({data:JSON.stringify(d),updated_at:new Date().toISOString()}).eq('id',1).then(function(){})},[]);
  var saveRevs=useCallback(function(d){sb.from('review_data').update({data:d,updated_at:new Date().toISOString()}).eq('id',1).then(function(){})},[]);
  var saveRatings=useCallback(function(d){sb.from('ratings_data').update({data:d,updated_at:new Date().toISOString()}).eq('id',1).then(function(){})},[]);
  var saveTop50=useCallback(function(year,d){sb.from('top50_data').upsert({list_year:year,data:d,updated_at:new Date().toISOString()},{onConflict:'list_year'}).then(function(){})},[]);
  var doImport=useCallback(function(){if(!csv.trim())return;var r=csvToPipe(csv);sIR(r);if(r.pipe&&r.count>0){sPd(r.pipe);savePipe(r.pipe);if(!r.e.length){sSI(false);sYr('All')}}},[csv,savePipe]);
  var doClear=useCallback(function(){if(confirm('Clear all data?')){sPd('');sReg({});sSubscriptions(DSUBS);savePipe('');saveReg({});saveSubs(DSUBS);sSI(false)}},[savePipe,saveReg,saveSubs]);
  var handleLogin=useCallback(function(){if(pwBusy)return;var em=pwEmail.trim();if(!em||!pwInput){sPwErr('Email and password required');return}sPwBusy(true);sPwErr('');sb.auth.signInWithPassword({email:em,password:pwInput}).then(function(r){sPwBusy(false);if(r.error){sPwErr(r.error.message);return}sShowPwModal(false);sPwInput('');sPwEmail('');sPwErr('')}).catch(function(e){sPwBusy(false);sPwErr(String(e&&e.message||e))})},[pwEmail,pwInput,pwBusy]);
  var doSignOut=useCallback(function(){sb.auth.signOut().then(function(){sIsAdmin(false)})},[]);
  var doSetTag=function(t,cat){sReg(function(p){var n=Object.assign({},p);n[t]=Object.assign({},n[t]||{},{cat:cat||null});saveReg(n);return n})};
  var doSetDn=function(t,dn){sReg(function(p){var n=Object.assign({},p);n[t]=Object.assign({},n[t]||{},{dn:dn||''});saveReg(n);return n})};
  var doBulkTag=function(){if(!bulkCat)return;sReg(function(p){var n=Object.assign({},p);Object.keys(tagSel).forEach(function(t){if(tagSel[t])n[t]=Object.assign({},n[t]||{},{cat:bulkCat})});saveReg(n);return n});sTagSel({});sBulkCat('')};
  var doUpSubs=function(fn){sSubscriptions(function(p){var n=fn(p);saveSubs(n);return n})};
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

  // ============================================================
  // WHICH RATING, AND COUNTED HOW — the rule for every figure on the site
  // ============================================================
  // Two independent choices, and mixing them silently is how this file grew four different
  // "average rating" figures that disagreed with each other on screen.
  //
  // WHERE THE NUMBER COMES FROM. Always ratings.csv, the score the film holds today, falling
  // back to the diary row where the export has no entry. One exception, and it is the subject
  // rather than an oversight: panels that measure the diary AGAINST ratings.csv (Second
  // thoughts) or against someone else's verdict from the same night (the Yesmine tab) must read
  // diary ratings, because that gap is the thing being shown. Today's number on both sides
  // would erase it.
  //
  // WHAT ONE ROW MEANS. Films for anything about taste -- a rewatch is not a second opinion.
  // Watches for anything about money or time -- a second ticket costs a second time, and the
  // hours were really spent. So:
  //
  //   efOnce    one row per film, current rating, honours the year filter
  //             -> distribution, taste map (all 8 sets), decade ribbon, tag lift, film lists
  //   allOnce   the same, over the whole diary, ignoring the filter
  //             -> the all-time panels under Second thoughts
  //   ef / all  one row per watch
  //             -> hero counts, hours, streaks, the Costs tab, and the rolling average
  //
  // A consequence worth knowing before comparing two panels: the site's headline average is
  // 3.20 (per film, current). The rolling-average panel reads 3.34 because it is per WATCH at
  // diary ratings -- rewatches counted separately, at the number typed on the night. Both are
  // right for their question; that panel now says so on its face.
  // ============================================================
  // FILM-LEVEL VIEW — one row per film, at the rating it holds today
  // ============================================================
  // Your CURRENT score for each film, from ratings.csv. The diary records what you typed on
  // the night; this records what the film is worth to you now.
  var currentRatings=useMemo(function(){var m={};allRatings.forEach(function(r){var v=parseFloat(r.rating);if(isNaN(v))return;m[normName(r.name)+'|||'+r.year]={rating:v,date:r.date,name:r.name,year:r.year}});return m},[allRatings]);

  // Collapse any watch list to one row per film, carrying today's rating. A function rather
  // than a single memo because the year-over-year figure has to do the same thing to LAST
  // year's watches, and comparing a film average against a watch average would be a fiction.
  //
  // Two corrections in one pass. Which watch represents the film: the most recent, because a
  // first impression is not what you think of it now. And which number it carries: the one in
  // ratings.csv. Falls back to the diary rating where the export has no row, so nothing loses
  // a rating it already had.
  var onceWithCurrent=useCallback(function(list){
    var key=function(e){return normName(e.name)+'|||'+e.year},pick={};
    // Diary order, so a later entry wins -- except that a rated watch is never given up for a
    // later unrated one. That still matters for films ratings.csv does not cover, and it keeps
    // the date shown in the film lists on the watch the opinion belongs to.
    list.forEach(function(e){var k=key(e),cur=pick[k];if(!cur||e.rating!==null||cur.rating===null)pick[k]=e});
    return list.filter(function(e){return pick[key(e)]===e}).map(function(e){
      var c=currentRatings[key(e)];
      // A copy, never a mutation. These objects are shared with `all`, which the Second
      // thoughts memos read to compare the diary's number against this one; writing through
      // would quietly erase the very thing that section measures.
      return c?Object.assign({},e,{rating:c.rating}):e;
    });
  },[currentRatings]);

  // Must stay above its first consumer: as a `var` it is hoisted undefined, so a memo above
  // this line calling agg(efOnce, ...) threw on mount and blanked the page.
  var efOnce=useMemo(function(){return onceWithCurrent(ef)},[ef,onceWithCurrent]);
  // Average rating over WATCH rows, each at its film's current score. The Costs tab's unit has
  // to stay the watch -- a second ticket is a second payment -- but the rating it reports should
  // come from the same place as every other rating on the site.
  // Watch rows re-stamped with each film's current rating, so a drill-down list shows the same
  // numbers the panel above it averaged.
  var withCur=useCallback(function(rows){
    return (rows||[]).map(function(e){var c=currentRatings[normName(e.name)+'|||'+e.year];
      return c?Object.assign({},e,{rating:c.rating}):e});
  },[currentRatings]);
  var avgCur=useCallback(function(rows){
    var sum=0,n=0;
    rows.forEach(function(e){var c=currentRatings[normName(e.name)+'|||'+e.year];var v=c?c.rating:e.rating;
      if(v!==null&&v!==undefined){sum+=v;n++}});
    return n?sum/n:0;
  },[currentRatings]);
  // The same collapse over the WHOLE diary, ignoring the year filter. The Second thoughts
  // panels are all-time by design and need a like-for-like baseline to compare against.
  var allOnce=useMemo(function(){return onceWithCurrent(all)},[all,onceWithCurrent]);

  // The rating figures every panel on the Taste tab quotes. Films, not watches: 47 five-star
  // diary rows are 33 films that ever got a 5 and 26 that still hold one, because Rango alone
  // was logged at five stars five times and nine former favourites have since been marked down.
  var statsOnce=useMemo(function(){
    var r=efOnce.filter(function(e){return e.rating!==null});
    return{films:efOnce.length,rated:r.length,
      avg:r.length?r.reduce(function(s,e){return s+e.rating},0)/r.length:0,
      five:efOnce.filter(function(e){return e.rating===5}).length};
  },[efOnce]);
  var stats=useMemo(function(){var f=ef;return{total:f.length,th:f.filter(isT).length,rw:f.filter(function(e){return e.rewatch}).length,fo:f.filter(function(e){return e.tags.indexOf('foreign')!==-1}).length,fr:f.filter(function(e){return gC(e.tags,fullReg).length>0}).length}},[ef,fullReg,isT]);
  var yoy=useMemo(function(){if(yr==='All')return null;var py=String(parseInt(yr)-1),pv=all.filter(function(e){return e.date.indexOf(py)===0});if(!pv.length)return null;if(!iRW)pv=pv.filter(function(e){return!e.rewatch});var pN=pv.length,cN=ef.length;if(!pN||!cN)return null;var pp=function(cf,pf){return(cf/cN*100)-(pf/pN*100)};var pR=pv.filter(function(e){return e.rating!==null}),cR=ef.filter(function(e){return e.rating!==null});return{films:cN-pN,avg:(pR.length&&cR.length)?(cR.reduce(function(s,e){return s+e.rating},0)/cR.length)-(pR.reduce(function(s,e){return s+e.rating},0)/pR.length):null,th:pp(ef.filter(isT).length,pv.filter(isT).length),rw:iRW?pp(ef.filter(function(e){return e.rewatch}).length,pv.filter(function(e){return e.rewatch}).length):null,fo:pp(ef.filter(function(e){return e.tags.indexOf('foreign')!==-1}).length,pv.filter(function(e){return e.tags.indexOf('foreign')!==-1}).length),fr:pp(ef.filter(function(e){return gC(e.tags,fullReg).length>0}).length,pv.filter(function(e){return gC(e.tags,fullReg).length>0}).length)}},[yr,ef,all,iRW,fullReg,isT]);
  var binge=useMemo(function(){var dt=Array.from(new Set(ef.map(function(e){return e.date}))).sort();if(dt.length<2)return{streak:1,range:dt[0]||'N/A'};var ms=1,cs=1,mi=0,ci=0;for(var i=1;i<dt.length;i++){var d=Math.round((new Date(dt[i])-new Date(dt[i-1]))/864e5);if(d===1){cs++;if(cs>ms){ms=cs;mi=ci}}else{cs=1;ci=i}}var sd=dt.slice(mi,mi+ms),s0=sd[0].split('-').map(Number),sL=sd[sd.length-1].split('-').map(Number);var r;if(ms===1)r=MF[s0[1]-1]+' '+s0[2]+', '+s0[0];else if(s0[0]===sL[0]&&s0[1]===sL[1])r=MF[s0[1]-1]+' '+s0[2]+'\u2013'+sL[2]+', '+s0[0];else r=MS[s0[1]-1]+' '+s0[2]+' \u2013 '+MS[sL[1]-1]+' '+sL[2]+', '+s0[0];return{streak:ms,range:r}},[ef]);
  var busiest=useMemo(function(){var c={};ef.forEach(function(e){c[e.date]=(c[e.date]||0)+1});var en=Object.entries(c).sort(function(a,b){return b[1]-a[1]});if(!en.length)return{count:0,fmt:'N/A',films:[]};var d=en[0][0],n=en[0][1],p=d.split('-').map(Number);return{count:n,fmt:MF[p[1]-1]+' '+p[2]+', '+p[0],films:ef.filter(function(e){return e.date===d}).map(function(e){return e.name})}},[ef]);
  var hmData=useMemo(function(){var yy=Array.from(new Set(ea.map(function(e){return e.date.slice(0,4)}))).sort(),g={};yy.forEach(function(y){g[y]=Array(12).fill(0)});ea.forEach(function(e){var y=e.date.slice(0,4),m=parseInt(e.date.slice(5,7))-1;if(g[y])g[y][m]++});return{years:yy,grid:g,max:Math.max.apply(null,Object.values(g).map(function(a){return Math.max.apply(null,a)}).concat([1]))}},[ea]);
  var hmFilms=useMemo(function(){if(!selHM)return[];return ea.filter(function(e){return e.date.slice(0,4)===selHM.yr&&parseInt(e.date.slice(5,7))===selHM.mo+1})},[ea,selHM]);
  var cumData=useMemo(function(){var yy=Array.from(new Set(ea.map(function(e){return parseInt(e.date.slice(0,4))}))).sort(function(a,b){return a-b}),last={},first={};ea.forEach(function(e){var y=parseInt(e.date.slice(0,4)),m=parseInt(e.date.slice(5,7));last[y]=Math.max(last[y]||0,m);first[y]=Math.min(first[y]||13,m)});var rows=[];for(var m=1;m<=12;m++){var row={month:MS[m-1]};yy.forEach(function(y){row[y]=m<(first[y]||1)||m>(last[y]||12)?null:ea.filter(function(e){return parseInt(e.date.slice(0,4))===y&&parseInt(e.date.slice(5,7))<=m}).length});rows.push(row)}return{data:rows,years:yy}},[ea]);
  // One bar per FILM at its current rating, not one per rating you ever typed. Counting rows
  // put a rewatched favourite in the 5-star bar five times, which is both a wrong count and a
  // distribution biased towards the films you rewatch -- exactly the ones you already like.
  var rDist=useMemo(function(){var c={};for(var r=0.5;r<=5;r+=0.5)c[r]=0;efOnce.forEach(function(e){if(e.rating!==null)c[e.rating]=(c[e.rating]||0)+1});return Object.entries(c).sort(function(a,b){return parseFloat(a[0])-parseFloat(b[0])}).map(function(x){return{rating:x[0],count:x[1]}})},[efOnce]);
  var selFilms=useMemo(function(){return sR===null?[]:efOnce.filter(function(e){return e.rating===sR})},[efOnce,sR]);
  // "How much of the 1990s have you seen" is a films question, so the ribbon and the decade
  // tile count films, not watches.
  var decD=useMemo(function(){return agg(efOnce,function(e){return Math.floor(e.year/10)*10+'s'}).sort(function(a,b){return a.name<b.name?-1:1})},[efOnce]);
  var decF=useMemo(function(){return sDe?efOnce.filter(function(e){return Math.floor(e.year/10)*10===parseInt(sDe)}):[]},[efOnce,sDe]);
  var tasteTags=useMemo(function(){return Object.keys(fullReg).filter(function(t){return fullReg[t].cat==='taste'})},[fullReg]);
  // Films, at today's rating, like every other count on this tab.
  var tagD=useMemo(function(){return tasteTags.map(function(t){var m=efOnce.filter(function(e){return e.tags.indexOf(t)!==-1}),r=m.filter(function(e){return e.rating!==null});return{name:getDn(t,fullReg),tag:t,Films:m.length,Avg:r.length?parseFloat((r.reduce(function(s,e){return s+e.rating},0)/r.length).toFixed(2)):0}}).sort(function(a,b){return b.Films-a.Films})},[efOnce,tasteTags,fullReg]);
  var tagF=useMemo(function(){if(!sTg)return[];var entry=tagD.find(function(d){return d.name===sTg});return entry?efOnce.filter(function(e){return e.tags.indexOf(entry.tag)!==-1}):[]},[efOnce,sTg,tagD]);
  // A tag is a property a film either has or lacks, not a slice of the collection, so the
  // interesting number is not how many carry it but how far they sit from everything else.
  // Lift against your own average does that in one figure; a ranked count cannot.
  var tagLift=useMemo(function(){
    var base=statsOnce.avg;
    var rows=tagD.filter(function(d){return d.Films>0&&d.Avg>0}).map(function(d){return Object.assign({},d,{lift:d.Avg-base})});
    rows.sort(function(a,b){return b.lift-a.lift});
    // Scale to the widest bar, with a floor so a set of tiny lifts does not get magnified into
    // looking decisive. THIN marks the tags resting on too few films to trust.
    var max=Math.max.apply(null,rows.map(function(r){return Math.abs(r.lift)}).concat([0.2]));
    var tagged=efOnce.filter(function(e){return tasteTags.some(function(t){return e.tags.indexOf(t)!==-1})}).length;
    return{rows:rows,max:max,base:base,untagged:efOnce.length-tagged};
  },[tagD,statsOnce,efOnce,tasteTags]);
  var gMeta=function(e){var k=e.name+"|||"+e.year;if(filmMeta[k])return filmMeta[k];var nk=e.name.replace(/[\u2018\u2019\u0060\u00B4]/g,"'")+"|||"+e.year;if(filmMeta[nk])return filmMeta[nk];for(var key in filmMeta){if(key.split("|||")[1]===String(e.year)&&key.split("|||")[0].replace(/[\u2018\u2019\u0060\u00B4]/g,"'")===nk.split("|||")[0])return filmMeta[key]}return null};
  // "Favourite" needs a floor: 426 of 585 directors appear exactly once, so a
  // rating-sorted list without a threshold is topped by single-film flukes.
  // Runtime is the exception: hours are hours. You really did sit through Rango five times,
  // so this counts every watch (ef) while everything else counts every film (efOnce).
  var dirStats=useMemo(function(){var totalR=0,totalH=0,rtCount=0;ef.forEach(function(e){var m=gMeta(e);if(m&&m.runtime){totalR+=m.runtime;rtCount++}});totalH=Math.round(totalR/60);var uDir=new Set();efOnce.forEach(function(e){var m=gMeta(e);if(m&&m.directors)m.directors.split(", ").forEach(function(d){if(d)uDir.add(d)})});return{totalH:totalH,totalR:totalR,uDir:uDir.size,avgRun:rtCount?Math.round(totalR/rtCount):0,rtCount:rtCount,rtTotal:ef.length,rtMissingPct:ef.length?Math.round((ef.length-rtCount)/ef.length*100):0}},[ef,efOnce,filmMeta]);
  var yRatingsNorm=useMemo(function(){var n={};Object.keys(yRatings).sort().forEach(function(k){var p=k.split('|||');var nk=normName(p[0])+'|||'+p[1];if(!(nk in n))n[nk]=yRatings[k]});return n},[yRatings]);
  var gYR=function(name,year){var nk=normName(name)+'|||'+year;return nk in yRatingsNorm?yRatingsNorm[nk]:undefined};
  // One row per FILM, not per shared watch: Yesmine's rating is a single verdict per film, so
  // pairing it with two viewings would count the same opinion twice. Keeps the first shared
  // watch, which is the one her review was written about.
  //
  // And her side keeps its DIARY rating rather than today's value from ratings.csv -- the
  // opposite of the shelf panel, for the same reason. There, one side had only a current
  // rating, so both had to be current. Here both numbers are verdicts from the night, and
  // swapping one for a 2026 revision would manufacture disagreement that never happened.
  var yFilms=useMemo(function(){
    var seen={},out=[];
    ef.filter(function(e){return gC(e.tags,fullReg).some(function(n){return n.toLowerCase().indexOf('yesmine')!==-1})})
      .forEach(function(e){
        var k=normName(e.name)+'|||'+e.year;if(seen[k])return;seen[k]=true;
        var yr=gYR(e.name,e.year);
        out.push({name:e.name,year:e.year,date:e.date,rating:e.rating,yRating:yr!==undefined?yr:null,
          diff:e.rating!==null&&typeof yr==='number'?Math.abs(e.rating-yr):null,
          signed:e.rating!==null&&typeof yr==='number'?yr-e.rating:null});
      });
    return out;
  },[ef,yRatingsNorm,fullReg]);
  var yStats=useMemo(function(){
    if(!yFilms.length)return{count:0,rated:0,myAvg:0,yAvg:0,agree:0,disagree:[]};
    var myS=0,myC=0,yS=0,yC=0;
    yFilms.forEach(function(f){if(f.rating!==null){myS+=f.rating;myC++}if(typeof f.yRating==='number'){yS+=f.yRating;yC++}});
    var sorted=yFilms.filter(function(f){return f.diff!==null}).sort(function(a,b){return b.diff-a.diff});
    return{count:yFilms.length,rated:yC,myAvg:myC?myS/myC:0,yAvg:yC?yS/yC:0,
      agree:yFilms.filter(function(f){return f.diff!==null&&f.diff<=0.5}).length,disagree:sorted.slice(0,10)};
  },[yFilms]);
  // Everything that needs both numbers present. r is Pearson: 1 would mean the two of them
  // rank films identically, 0 that one says nothing about the other. Bias is the mean signed
  // gap, which r deliberately ignores -- two people can agree perfectly on order while one
  // marks a half-star lower throughout.
  var yAnalysis=useMemo(function(){
    var pairs=yFilms.filter(function(f){return f.signed!==null});
    var slept=yFilms.filter(function(f){return typeof f.yRating==='string'}).length;
    var unrated=yFilms.filter(function(f){return f.yRating===null}).length;
    if(pairs.length<3)return{pairs:[],n:0,r:null,bias:0,within:0,yHigher:0,bHigher:0,same:0,dist:[],cells:[],genres:[],slept:slept,unrated:unrated};
    var b=pairs.map(function(f){return f.rating}),y=pairs.map(function(f){return f.yRating});
    var mean=function(a){return a.reduce(function(s,v){return s+v},0)/a.length};
    var mb=mean(b),my=mean(y);
    var cov=0,vb=0,vy=0;
    pairs.forEach(function(_,i){cov+=(b[i]-mb)*(y[i]-my);vb+=Math.pow(b[i]-mb,2);vy+=Math.pow(y[i]-my,2)});
    var r=(vb&&vy)?cov/Math.sqrt(vb*vy):null;
    // Identical (x,y) pairs stack on one pixel, so collapse and size the dot by how many.
    var cells={};pairs.forEach(function(f){var k=f.rating+'|'+f.yRating;if(!cells[k])cells[k]={x:f.rating,y:f.yRating,n:0,films:[],names:[]};cells[k].n++;cells[k].names.push(f.name);cells[k].films.push(f)});
    var buckets={};pairs.forEach(function(f){if(!buckets[f.signed])buckets[f.signed]=[];buckets[f.signed].push(f)});
    var dist=Object.keys(buckets).map(Number).sort(function(a,c){return a-c}).map(function(d){return{d:d,label:(d>0?'+':'')+d.toFixed(1),count:buckets[d].length,films:buckets[d]}});
    // Where the two of them part company. A floor of 5 shared films, because one thriller
    // neither liked is not a pattern.
    var g={};pairs.forEach(function(f){var m=gMeta(f);if(!m||!m.genres)return;m.genres.split(', ').forEach(function(x){if(x){if(!g[x])g[x]=[];g[x].push(f)}})});
    var genres=Object.keys(g).filter(function(k){return g[k].length>=5}).map(function(k){return{name:k,n:g[k].length,gap:mean(g[k].map(function(f){return f.signed})),films:g[k]}}).sort(function(a,c){return c.gap-a.gap});
    return{pairs:pairs,n:pairs.length,r:r,bias:mean(pairs.map(function(f){return f.signed})),
      // Averaged over the paired films only, both of them. Taking his across all 127 shared
      // films while hers came from the 114 she scored numerically put two averages side by
      // side that were measuring different sets -- and made the difference between them
      // disagree with the bias tile two columns over. Now 3.41 minus 3.21 is the -0.20.
      bAvg:mb,yAvg:my,
      within:pairs.filter(function(f){return Math.abs(f.signed)<=0.5}).length,
      yHigher:pairs.filter(function(f){return f.signed>0}).length,
      bHigher:pairs.filter(function(f){return f.signed<0}).length,
      same:pairs.filter(function(f){return f.signed===0}).length,
      dist:dist,cells:Object.keys(cells).map(function(k){return cells[k]}),genres:genres,slept:slept,unrated:unrated};
  },[yFilms,filmMeta]);

  // ============================================================
  // SECOND THOUGHTS — the diary's ratings against ratings.csv
  // ============================================================
  // ratings.csv holds your CURRENT score for a film; the diary holds what you gave it on
  // the night. Three different things live in the gap, and none of them respects the year
  // filter — a change of mind belongs to the whole history, not to one year:
  //   drift     two or more rated watches of the same film — a rewatch moved the number
  //   re-scored the current rating differs from the last one you logged
  //   preDiary  rated but never logged at all: the films you saw before the diary existed
  // allRatings was loaded into state and read by nothing until now.
  var diaryByFilm=useMemo(function(){var m={};all.forEach(function(e){if(e.rating===null)return;var k=normName(e.name)+'|||'+e.year;if(!m[k])m[k]={name:e.name,year:e.year,watches:[]};m[k].watches.push({date:e.date,rating:e.rating})});Object.keys(m).forEach(function(k){m[k].watches.sort(function(a,b){return a.date<b.date?-1:1})});return m},[all]);
  var revisions=useMemo(function(){
    var rows=[],drift=[];
    Object.keys(diaryByFilm).forEach(function(k){
      var f=diaryByFilm[k],w=f.watches,first=w[0].rating,lastLogged=w[w.length-1].rating;
      // No row in ratings.csv means nothing was re-scored, so the last logged rating stands.
      var cur=currentRatings[k]?currentRatings[k].rating:lastLogged;
      if(w.length>1)drift.push({name:f.name,year:f.year,first:first,last:lastLogged,delta:lastLogged-first,watches:w.length,date:w[w.length-1].date});
      if(Math.abs(cur-first)>=0.01)rows.push({name:f.name,year:f.year,from:first,to:cur,delta:cur-first,
        how:(w.length>1&&Math.abs(lastLogged-first)>=0.01)?'rewatched':'re-scored'});
    });
    rows.sort(function(a,b){return Math.abs(b.delta)-Math.abs(a.delta)});
    var up=rows.filter(function(r){return r.delta>0}).sort(function(a,b){return b.delta-a.delta});
    var down=rows.filter(function(r){return r.delta<0}).sort(function(a,b){return a.delta-b.delta});
    // Identical (first,last) pairs land on the same pixel, so collapse them and size the
    // dot by how many films sit there — otherwise the scatter reads as ten dots, not 80.
    var pairs={};drift.forEach(function(d){var pk=d.first+'|'+d.last;if(!pairs[pk])pairs[pk]={x:d.first,y:d.last,n:0,films:[],names:[]};pairs[pk].n++;pairs[pk].names.push(d.name);
      pairs[pk].films.push({name:d.name,year:d.year,rating:d.last,date:d.date})});
    // Keyed off every diary film, not just the rated ones. diaryByFilm holds only films with a
    // rating, so four films that were logged and left unrated were counted as never logged --
    // which is a different claim, and it moved the average.
    var logged={};all.forEach(function(e){logged[normName(e.name)+'|||'+e.year]=true});
    var preDiary=Object.keys(currentRatings).filter(function(k){return!logged[k]}).map(function(k){return currentRatings[k]});
    return{rows:rows,up:up,down:down,drift:drift,pairs:Object.keys(pairs).map(function(k){return pairs[k]}),preDiary:preDiary,
      net:rows.length?rows.reduce(function(s,r){return s+r.delta},0)/rows.length:0,
      riser:up[0]||null,faller:down[0]||null};
  },[diaryByFilm,currentRatings,all]);
  // Shares rather than counts: the pre-diary shelf is a fraction of the diary's size, so
  // raw bars would put one distribution flat against the axis.
  var preDist=useMemo(function(){
    var buckets=[];for(var r=0.5;r<=5;r+=0.5)buckets.push(r);
    var dC={},pC={};buckets.forEach(function(r){dC[r]=0;pC[r]=0});
    // The diary side used each film's FIRST logged rating while the unlogged side used the
    // current one, so the two bars were measuring different things and the gap was overstated
    // by 0.05. Both are current ratings now, one row per film, all time.
    // Each bucket keeps its films so a bar can be opened.
    var dF={},pF={};buckets.forEach(function(r){dF[r]=[];pF[r]=[]});
    var dN=0;allOnce.forEach(function(e){if(e.rating!==null&&dC[e.rating]!==undefined){dC[e.rating]++;dN++;dF[e.rating].push(e)}});
    var pN=0;revisions.preDiary.forEach(function(f){if(pC[f.rating]!==undefined){pC[f.rating]++;pN++;pF[f.rating].push(f)}});
    var dS=0,pS=0;buckets.forEach(function(r){dS+=r*dC[r];pS+=r*pC[r]});
    return{data:buckets.map(function(r){return{rating:String(r),logged:dN?dC[r]/dN*100:0,pre:pN?pC[r]/pN*100:0,loggedFilms:dF[r],preFilms:pF[r],loggedN:dC[r],preN:pC[r]}}),
      diaryN:dN,preN:pN,diaryAvg:dN?dS/dN:0,preAvg:pN?pS/pN:0};
  },[allOnce,revisions]);
  // Rolling mean over the last 50 rated watches, in diary order. A per-year average hides
  // the shape; 50 is wide enough that one generous week does not move the line.
  var inflation=useMemo(function(){
    var rated=all.filter(function(e){return e.rating!==null}).slice().sort(function(a,b){return a.date<b.date?-1:1});
    var W=50;if(rated.length<W+10)return{data:[],rated:[],extrema:[],mean:0,w:W};
    // One point per rating rather than per month, each carrying its index so the window behind
    // it can be listed on click, and the exact date so the tooltip is not limited to a month.
    var out=[],sum=0;
    for(var i=0;i<rated.length;i++){sum+=rated[i].rating;if(i>=W)sum-=rated[i-W].rating;
      if(i>=W-1)out.push({i:i,d:rated[i].date.slice(0,7),date:rated[i].date,name:rated[i].name,year:rated[i].year,rating:rated[i].rating,avg:sum/W})}
    // Local peaks and troughs, marked so they can be seen and hovered. The line carries a point
    // per rating — roughly two per pixel — so without markers the turning points are unhittable
    // with a cursor and effectively invisible.
    //
    // A point qualifies when it is the highest (or lowest) in a window of +/-W either side, and
    // it is the FIRST such point in that window: a rolling mean sits on plateaus, and without
    // the tie-break every point of a flat peak would be marked. Comparing only to immediate
    // neighbours would mark hundreds of one-step wiggles instead.
    var R=W,extIdx=[];
    out.forEach(function(pt,i){
      var lo=Math.max(0,i-R),hi=Math.min(out.length-1,i+R),isMax=true,isMin=true,tie=false;
      for(var j=lo;j<=hi;j++){
        if(j===i)continue;
        if(out[j].avg>pt.avg)isMax=false;
        if(out[j].avg<pt.avg)isMin=false;
        if(out[j].avg===pt.avg&&j<i)tie=true;
      }
      if(!tie&&isMax!==isMin){pt.ext=isMax?'max':'min';extIdx.push(i)}
    });
    // Nothing is drawn for these. They exist so the cursor can REACH them: at roughly two
    // points per pixel, hitting the exact top of a peak by hand is not possible, so every
    // point within SNAP of a turning point resolves to it — the tooltip reports the peak and
    // the click opens the peak's window. Away from one, the hovered point answers for itself.
    var SNAP=8;
    extIdx.forEach(function(ei){
      var lo=Math.max(0,ei-SNAP),hi=Math.min(out.length-1,ei+SNAP);
      for(var j=lo;j<=hi;j++){var cur=out[j].snap;
        if(cur==null||Math.abs(j-ei)<Math.abs(j-cur))out[j].snap=ei}
    });
    var extrema=extIdx.map(function(i){return out[i]});
    return{data:out,rated:rated,extrema:extrema,mean:rated.reduce(function(s,e){return s+e.rating},0)/rated.length,w:W};
  },[all]);

  // ============================================================
  // TASTE MAP / RIBBON / POSTER WALL — the profile numbers, re-shaped
  // ============================================================
  var quadCfg=QUAD_SETS.filter(function(q){return q.id===quadSet})[0]||QUAD_SETS[0];
  // Built from efOnce for every set: on one chart with one axis labelled "films seen", a set
  // that counted watches would be plotting a different quantity from the set beside it.
  var quadData=useMemo(function(){return{
    genre:aggMulti(efOnce,function(e){var m=gMeta(e);return m&&m.genres?m.genres.split(', '):[]}),
    dir:aggMulti(efOnce,function(e){var m=gMeta(e);return m&&m.directors?m.directors.split(', '):[]}),
    cast:aggMulti(efOnce,function(e){var m=gMeta(e);return m&&m.cast_members?m.cast_members.split(', '):[]}),
    friend:aggMulti(efOnce,function(e){return gC(e.tags,fullReg)}),
    // gP folds every cinema watch into one "Theater" bucket, which is the right grain here:
    // the platform question is how a film reached you, and the venue set answers which room.
    plat:aggMulti(efOnce,function(e){return[gP(e.tags,fullReg)]}),
    venue:aggMulti(efOnce,function(e){var v=gV(e.tags,fullReg);return v?[getDn(v,fullReg)]:[]}),
    country:aggMulti(efOnce,function(e){var m=gMeta(e);return m&&m.countries?m.countries.split(', '):[]}),
    decade:aggMulti(efOnce,function(e){return[Math.floor(e.year/10)*10+'s']})
  }},[efOnce,filmMeta,fullReg]);
  var quadSrc=quadData[quadSet]||quadData.genre;
  // Whatever is selected in the set currently on the map, and the films behind it. Runs off
  // efOnce so the list length matches the count the dot was plotted at.
  var quadSelName=quadSet==='dir'?sDir:quadSet==='cast'?sCast:quadSet==='friend'?sCo:quadSet==='country'?sCountry:quadSet==='decade'?sDe:quadSet==='plat'?sP:quadSet==='venue'?sVe:sGenre;
  var quadFilms=useMemo(function(){
    if(!quadSelName)return[];
    return efOnce.filter(function(e){
      if(quadSet==='friend')return gC(e.tags,fullReg).indexOf(quadSelName)!==-1;
      if(quadSet==='plat')return gP(e.tags,fullReg)===quadSelName;
      if(quadSet==='venue'){var v=gV(e.tags,fullReg);return !!v&&getDn(v,fullReg)===quadSelName}
      if(quadSet==='decade')return Math.floor(e.year/10)*10===parseInt(quadSelName);
      var m=gMeta(e);if(!m)return false;
      var f=quadSet==='dir'?m.directors:quadSet==='cast'?m.cast_members:quadSet==='country'?m.countries:m.genres;
      return !!f&&f.split(', ').indexOf(quadSelName)!==-1;
    });
  },[efOnce,quadSet,quadSelName,fullReg,filmMeta]);
  var quad=useMemo(function(){
    var pts=quadSrc.filter(function(d){return d.Films>=quadCfg.min&&d.Avg>0});
    if(!pts.length)return{pts:[],plain:[],labeled:[],mx:0,my:0,yDom:[0,5]};
    // Medians, not means: a couple of huge genres would drag a mean right and leave three
    // of the four quadrants empty.
    var med=function(a){var s=a.slice().sort(function(x,y){return x-y});return s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2};
    var mx=med(pts.map(function(d){return d.Films})),my=med(pts.map(function(d){return d.Avg}));
    var avgs=pts.map(function(d){return d.Avg});
    var lo=Math.max(0,Math.floor(Math.min.apply(null,avgs)*4)/4-0.15),hi=Math.min(5,Math.ceil(Math.max.apply(null,avgs)*4)/4+0.15);
    // Label the extremes, not the top six by count: the biggest categories cluster in the
    // same crowded band, so six count-ranked labels collided with each other and with their
    // own dots. The three most-watched plus the best- and worst-rated sit far apart by
    // construction, which is what keeps the labels legible.
    var top={};
    var byA=pts.slice().sort(function(a,b){return b.Avg-a.Avg});
    pts.slice().sort(function(a,b){return b.Films-a.Films}).slice(0,3).forEach(function(d){top[d.name]=1});
    top[byA[0].name]=1;top[byA[byA.length-1].name]=1;
    return{pts:pts,plain:pts.filter(function(d){return!top[d.name]}),labeled:pts.filter(function(d){return top[d.name]}),mx:mx,my:my,yDom:[lo,hi]};
  },[quadSrc,quadCfg]);
  // The quadrants name a position on the two axes and nothing else. This is also why the
  // wording no longer varies by set: "a dead end" was a fair verdict on a genre and a rude one
  // about someone's mother, and a literal label cannot be rude about anybody. A visitor who
  // does not know whose diary this is can still read it.
  // corners run top-left, top-right, bottom-left, bottom-right.
  var QUAD_WORDS={
    hh:'Many films, rated above the median',hl:'Many films, rated below the median',
    lh:'Few films, rated above the median',ll:'Few films, rated below the median',
    corners:['Few films \u00B7 rated higher','Many films \u00B7 rated higher','Few films \u00B7 rated lower','Many films \u00B7 rated lower']
  };
  var qw=QUAD_WORDS;
  var quadPick=function(name){cls();if(quadSet==='genre')sSGenre(name);else if(quadSet==='dir')sSDir(name);else if(quadSet==='cast')sSCast(name);else if(quadSet==='friend')sSCo(name);else if(quadSet==='plat')sSP(name);else if(quadSet==='venue')sSVe(name);else if(quadSet==='country')sSCountry(name);else if(quadSet==='decade')sSDe(name)};
  // Every decade from the earliest watched to the latest, present or not: the empty slots
  // are the point of the ribbon. Width carries the count, so the gaps are visible as gaps.
  var decRibbon=useMemo(function(){
    var by={};decD.forEach(function(d){by[parseInt(d.name)]=d});
    var present=Object.keys(by).map(Number);if(!present.length)return[];
    var lo=Math.min.apply(null,present),hi=Math.max.apply(null,present),out=[];
    for(var d=lo;d<=hi;d+=10){var e=by[d];out.push({dec:d,label:d+'s',Films:e?e.Films:0,Avg:e?e.Avg:0})}
    // Share of the collection. The width already encodes it, but a width cannot be read to a
    // number, and "a third of everything is from the 2020s" is the sentence this chart is for.
    var tot=out.reduce(function(a,x){return a+x.Films},0);
    out.forEach(function(x){x.pct=tot?x.Films/tot*100:0});
    return out;
  },[decD]);
  // The list is a snapshot per year, so a film is either on the current one or it fell off.
  // Those are two different things to look at and they now get two tables: the list as it
  // stands, and everything that was on it once. Ordering the departed by when they left, then
  // by the rank they left from, reads as a history rather than an alphabet.
  var top50Evo=useMemo(function(){
    if(!top50s.length)return{years:[],last:null,current:[],gone:[]};
    var yrs=top50s.map(function(t){return t.year}).sort();
    var last=yrs[yrs.length-1];
    var fm={};
    top50s.forEach(function(t){(t.films||[]).forEach(function(fi){var k=fi.name+'|||'+fi.year;if(!fm[k])fm[k]={name:fi.name,year:fi.year,ranks:{}};fm[k].ranks[t.year]=fi.pos})});
    var films=Object.keys(fm).map(function(k){return fm[k]});
    var current=films.filter(function(f){return f.ranks[last]!==undefined}).sort(function(a,b){return a.ranks[last]-b.ranks[last]});
    var gone=films.filter(function(f){return f.ranks[last]===undefined}).map(function(f){
      var present=yrs.filter(function(y){return f.ranks[y]!==undefined});
      var ly=present[present.length-1];
      return Object.assign({},f,{lastYear:ly,lastRank:f.ranks[ly]});
    }).sort(function(a,b){return(b.lastYear-a.lastYear)||(a.lastRank-b.lastRank)});
    return{years:yrs,last:last,current:current,gone:gone};
  },[top50s]);
  var tagAllSorted=useMemo(function(){return Object.keys(fullReg).sort(function(a,b){return(allTagCounts[b]||0)-(allTagCounts[a]||0)})},[fullReg,allTagCounts]);
  var tagFiltered=useMemo(function(){return tagAllSorted.filter(function(t){return!tagSearch||t.indexOf(tagSearch.toLowerCase())!==-1})},[tagAllSorted,tagSearch]);
  var tagSelCount=useMemo(function(){return Object.keys(tagSel).filter(function(k){return tagSel[k]}).length},[tagSel]);
  var tagGrouped=useMemo(function(){var g={_un:[]};CATS.forEach(function(c){g[c]=[]});tagFiltered.forEach(function(t){var c=fullReg[t]&&fullReg[t].cat;if(c&&g[c])g[c].push(t);else g._un.push(t)});return g},[tagFiltered,fullReg]);
  var costYrs=useMemo(function(){return['All'].concat(Array.from(new Set(all.map(function(e){return e.date.slice(0,4)}))).sort())},[all]);
  var costData=useMemo(function(){var now=getNowYM();return Array.from(new Set(all.map(function(e){return e.date.slice(0,4)}))).sort().map(function(y){
    var films=all.filter(function(e){return e.date.indexOf(y)===0});var st=0,sbk=[];subscriptions.forEach(function(sub){sub.periods.forEach(function(pr){if(!pr.from||!pr.price)return;var pTo=pr.to||now,yS=y+'-01',yE=y+'-12',eF=pr.from>yS?pr.from:yS,eT=pTo<yE?pTo:yE;if(eF>eT)return;var mo=mBt(eF,eT),co=mo*pr.price;st+=co;sbk.push({name:sub.name,mo:mo,price:pr.price,cost:co})})});
    var tt=0,tc=0,rt=0,rc=0;films.forEach(function(e){var vn=gV(e.tags,fullReg);if(vn&&getCat(vn,fullReg)==='sub_venue'&&!isSubCovAt(e.date,subscriptions)){var p=gTP(e.tags,fullReg);if(p!==null){tt+=p;tc++}}if(vn&&getCat(vn,fullReg)==='indie_venue'){var p2=gTP(e.tags,fullReg);if(p2!==null){tt+=p2;tc++}}if(vn&&getCat(vn,fullReg)==='sub_venue'&&isSubCovAt(e.date,subscriptions)){var p3=gTP(e.tags,fullReg);if(p3!==null){tt+=p3;tc++}}if(e.tags.some(function(t){return getCat(t,fullReg)==='platform_rental'})){var p4=gTP(e.tags,fullReg);if(p4!==null){rt+=p4;rc++}}});
    var tot=st+tt+rt;return{yr:y,films:films.length,st:st,sbk:sbk,tt:tt,tc:tc,rt:rt,rc:rc,tot:tot,pf:films.length?tot/films.length:0}})},[all,subscriptions,fullReg]);
  // Theatre visits with no price tag, for whichever year the Costs tab is showing. dq is
  // all-time, so it has to be narrowed here or the pill would contradict the cards beside it.
  var noPriceCost=useMemo(function(){return costYr==='All'?dq.nP:dq.nP.filter(function(e){return e.date.indexOf(costYr)===0})},[dq,costYr]);
  var costDataFilt=useMemo(function(){return costYr==='All'?costData:costData.filter(function(d){return d.yr===costYr})},[costData,costYr]);
  // The per-platform rows are gone with the breakdown table they fed. "Which platforms pay
  // off" answers the same question on two axes, and it is built from platRankSub/platRankPlat,
  // so nothing here ever fed it.
  var allTimeTotals=useMemo(function(){var st=0,tt=0,tc=0,rt=0,rc=0,fn=0;costData.forEach(function(d){st+=d.st;tt+=d.tt;tc+=d.tc;rt+=d.rt;rc+=d.rc;fn+=d.films});var tot=st+tt+rt;return{st:st,tt:tt,tc:tc,rt:rt,rc:rc,tot:tot,films:fn,pf:fn?tot/fn:0}},[costData]);
  var monthlySpend=useMemo(function(){if(!all.length)return[];var now=getNowYM();var months=[];var first=all[0].date.slice(0,7),last=all[all.length-1].date.slice(0,7);var cur=first;while(cur<=last){months.push(cur);var p=cur.split('-').map(Number);p[1]++;if(p[1]>12){p[0]++;p[1]=1}cur=p[0]+'-'+String(p[1]).padStart(2,'0')}return months.map(function(ym){var sc=subCostForMonth(ym,subscriptions);var mF=all.filter(function(e){return e.date.slice(0,7)===ym});var tk=0,rl=0;mF.forEach(function(e){var vn=gV(e.tags,fullReg);if(vn){var pr=gTP(e.tags,fullReg);if(pr!==null)tk+=pr}if(e.tags.some(function(t){return getCat(t,fullReg)==='platform_rental'})){var p2=gTP(e.tags,fullReg);if(p2!==null)rl+=p2}});return{m:MS[parseInt(ym.slice(5))-1]+' '+ym.slice(2,4),ym:ym,subs:sc,tickets:tk,rentals:rl,total:sc+tk+rl}})},[all,subscriptions,fullReg]);
  var monthlyFilt=useMemo(function(){if(costYr==='All')return monthlySpend;return monthlySpend.filter(function(m){return m.ym.indexOf(costYr)===0})},[monthlySpend,costYr]);
  var cpfData=useMemo(function(){var src=monthlyFilt;if(src.length<2)return[];var cs=costYr==='All'?3:1;var res=[];for(var i=0;i<src.length;i+=cs){var ch=src.slice(i,i+cs);var cost=ch.reduce(function(s,m){return s+m.total},0);var fl=ch[0].m,ll=ch[ch.length-1].m;var fc=0;ch.forEach(function(m){fc+=all.filter(function(e){return e.date.slice(0,7)===m.ym}).length});res.push({q:fl,period:cs===1?fl:fl+' \u2013 '+ll,cost:cost,films:fc,cpf:fc?cost/fc:0})}return res},[monthlyFilt,all,costYr]);
  var platRankSub=useMemo(function(){var now=getNowYM();var src=costYr==='All'?all:all.filter(function(e){return e.date.indexOf(costYr)===0});var rows=[];subscriptions.forEach(function(sub){var tc=0;sub.periods.forEach(function(pr){if(!pr.from||!pr.price)return;var to=pr.to||now;if(costYr!=='All'){var yS=costYr+'-01',yE=costYr+'-12',eF=pr.from>yS?pr.from:yS,eT=to<yE?to:yE;if(eF>eT)return;tc+=mBt(eF,eT)*pr.price}else{tc+=mBt(pr.from,to)*pr.price}});var covF=src.filter(function(e){var ym=e.date.slice(0,7);var inP=sub.periods.some(function(pr){if(!pr.from)return false;return ym>=pr.from&&ym<=(pr.to||now)});if(!inP)return false;if(sub.platforms.indexOf('_theater_sub')!==-1){var vn=gV(e.tags,fullReg);return vn&&getCat(vn,fullReg)==='sub_venue'}return e.tags.some(function(t){return sub.platforms.indexOf(t)!==-1})});if(covF.length>0&&tc>0)rows.push({name:sub.name,cost:tc,films:covF.length,cpf:tc/covF.length,rows:covF,avg:avgCur(covF)})});var rc=0,rn=0,rF=[];src.forEach(function(e){if(e.tags.some(function(t){return getCat(t,fullReg)==='platform_rental'})){rn++;rF.push(e);var p=gTP(e.tags,fullReg);if(p!==null)rc+=p}});if(rn>0&&rc>0)rows.push({name:'Rental',cost:rc,films:rn,cpf:rc/rn,rows:rF,avg:avgCur(rF)});var tkF=[],tkC=0;src.forEach(function(e){var vn=gV(e.tags,fullReg);if(!vn)return;var cat=getCat(vn,fullReg);if(cat==='indie_venue'||(cat==='sub_venue'&&!isSubCovAt(e.date,subscriptions))){tkF.push(e);var p=gTP(e.tags,fullReg);if(p!==null)tkC+=p}});if(tkF.length&&tkC>0)rows.push({name:'Theaters (per ticket)',cost:tkC,films:tkF.length,cpf:tkC/tkF.length,rows:tkF,avg:avgCur(tkF)});return rows.map(function(r,i){return Object.assign({},r,{color:T.primary})}).sort(function(a,b){return a.cpf-b.cpf})},[all,subscriptions,fullReg,costYr,T.primary,avgCur]);
  var platRankPlat=useMemo(function(){var now=getNowYM();var src=costYr==="All"?all:all.filter(function(e){return e.date.indexOf(costYr)===0});var pm={};paidPlatTags.forEach(function(pt){var dn=getDn(pt,fullReg);if(!pm[dn])pm[dn]={films:[],cost:0};src.filter(function(e){if(e.tags.indexOf(pt)===-1)return false;return subscriptions.some(function(sub){if(sub.platforms.indexOf(pt)===-1)return false;return sub.periods.some(function(pr){if(!pr.from)return false;return e.date.slice(0,7)>=pr.from&&e.date.slice(0,7)<=(pr.to||now)})})}).forEach(function(e){if(pm[dn].films.indexOf(e)===-1)pm[dn].films.push(e)})});subscriptions.forEach(function(sub){sub.platforms.forEach(function(pt){if(pt==="_theater_sub")return;var dn=getDn(pt,fullReg);if(!pm[dn])return;var sc=0;sub.periods.forEach(function(pr){if(!pr.from||!pr.price)return;var to=pr.to||now;if(costYr!=="All"){var yS=costYr+"-01",yE=costYr+"-12",eF=pr.from>yS?pr.from:yS,eT=to<yE?to:yE;if(eF>eT)return;sc+=mBt(eF,eT)*pr.price}else{sc+=mBt(pr.from,to)*pr.price}});var ac=src.filter(function(e){return e.tags.some(function(t){return sub.platforms.indexOf(t)!==-1})&&sub.periods.some(function(pr){if(!pr.from)return false;return e.date.slice(0,7)>=pr.from&&e.date.slice(0,7)<=(pr.to||now)})}).length;if(ac>0){var pc=pm[dn].films.filter(function(e){return sub.periods.some(function(pr){if(!pr.from)return false;return e.date.slice(0,7)>=pr.from&&e.date.slice(0,7)<=(pr.to||now)})}).length;pm[dn].cost+=(pc/ac)*sc}})});var subThF=src.filter(function(e){var vn=gV(e.tags,fullReg);return vn&&getCat(vn,fullReg)==="sub_venue"&&isSubCovAt(e.date,subscriptions)});var subThC=0;subscriptions.forEach(function(sub){if(sub.platforms.indexOf("_theater_sub")===-1)return;sub.periods.forEach(function(pr){if(!pr.from||!pr.price)return;var to=pr.to||now;if(costYr!=="All"){var yS=costYr+"-01",yE=costYr+"-12",eF=pr.from>yS?pr.from:yS,eT=to<yE?to:yE;if(eF>eT)return;subThC+=mBt(eF,eT)*pr.price}else{subThC+=mBt(pr.from,to)*pr.price}})});if(subThF.length>0&&subThC>0)pm["Sub Theaters"]={films:subThF,cost:subThC};var tkF=[],tkC=0;src.forEach(function(e){var vn=gV(e.tags,fullReg);if(!vn)return;var cat=getCat(vn,fullReg);if(cat==="indie_venue"||(cat==="sub_venue"&&!isSubCovAt(e.date,subscriptions))){tkF.push(e);var p=gTP(e.tags,fullReg);if(p!==null)tkC+=p}});if(tkF.length&&tkC>0)pm["Theaters (per ticket)"]={films:tkF,cost:tkC};var rF=[],rC2=0;src.forEach(function(e){if(e.tags.some(function(t){return getCat(t,fullReg)==="platform_rental"})){rF.push(e);var p=gTP(e.tags,fullReg);if(p!==null)rC2+=p}});if(rF.length&&rC2>0)pm["Rental"]={films:rF,cost:rC2};return Object.keys(pm).filter(function(n){return pm[n].cost>0&&pm[n].films.length>0}).map(function(n,i){var d=pm[n];return{name:n,cost:d.cost,films:d.films.length,cpf:d.cost/d.films.length,rows:d.films,avg:avgCur(d.films),color:T.primary}}).sort(function(a,b){return a.cpf-b.cpf})},[all,subscriptions,fullReg,costYr,paidPlatTags,T.primary,avgCur]);
  var platRanking=rankMode==='sub'?platRankSub:platRankPlat;

  // ============================================================
  // SHARED INLINE STYLES
  // ============================================================
  var inputStyle={background:N.surface,border:'0.5px solid '+N.border,borderRadius:4,color:N.ink,padding:'6px 10px',fontSize:13,outline:'none'};
  var btnSecondary={background:'transparent',border:'0.5px solid '+N.borderStrong,borderRadius:4,color:N.inkSoft,padding:'4px 10px',fontSize:11,cursor:'pointer'};
  var btnPrimary={background:T.primary,border:'0.5px solid '+T.primary,borderRadius:4,color:T.chartTextColor||NEUTRAL.paper,padding:'6px 14px',fontSize:12,fontWeight:500,cursor:'pointer'};

  var renderTagRow=function(t,showCheck){var e=fullReg[t]||{};return <div key={t} className="flex items-center gap-2 py-1" style={{borderBottom:'0.5px solid '+N.border}}>{showCheck&&<input type="checkbox" checked={!!tagSel[t]} onChange={function(){sTagSel(function(p){var n=Object.assign({},p);n[t]=!n[t];return n})}} style={{accentColor:T.primary}}/>}<div className="flex-1 text-xs truncate min-w-0" title={t} style={{color:N.inkSoft}}>{t}</div><div className="text-xs w-8 text-right shrink-0" style={{color:N.mutedSoft}}>{allTagCounts[t]||0}</div>{isAdmin?<select className="text-xs w-28 shrink-0" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4,color:N.inkSoft,padding:'2px 4px'}} value={e.cat||''} onChange={function(ev){doSetTag(t,ev.target.value)}}><option value="">—</option>{CATS.map(function(c){return <option key={c} value={c}>{CI[c].l}</option>})}</select>:<div className="text-xs w-28 shrink-0 text-right" style={{color:e.cat?N.inkSoft:N.mutedSoft}}>{e.cat?CI[e.cat].l:'—'}</div>}{isAdmin?<input className="text-xs w-28 shrink-0" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4,color:N.inkSoft,padding:'2px 4px'}} placeholder="Display name" value={e.dn||''} onChange={function(ev){doSetDn(t,ev.target.value)}}/>:<div className="text-xs w-28 shrink-0 text-right truncate" style={{color:N.muted}}>{e.dn||''}</div>}</div>};

  // Labels are not the ids. 'taste' cannot be renamed to 'ratings' in code without colliding
  // with the tag CATEGORY of the same name (getCat(t,reg)==='taste'), which is unrelated and
  // would take the tag registry with it. The id is internal; only the label is read.
  var TABS_ALL=[{id:'overview',l:'Overview'},{id:'taste',l:'Ratings'},{id:'rankings',l:'Top 50'},{id:'yesmine',l:'Yesmine'},{id:'costs',l:'Costs'},{id:'tags',l:'Tags'}];
  // Tags is the only fully private tab — it is a raw editing surface with nothing to
  // read. Everything else is public, including Costs: that tab already splits itself,
  // showing the spend cards and graphs to everyone while keeping the subscription
  // editor and the data-quality panel behind isAdmin.
  // Listed as a denylist deliberately: a tab added later is public unless named here.
  var PRIVATE_TABS=['tags'];
  var TABS=isAdmin?TABS_ALL:TABS_ALL.filter(function(t){return PRIVATE_TABS.indexOf(t.id)===-1});

  // One modal for every drill-down. Each panel just hands it a title and a list of films.
  var drillModal=<FilmList T={N} title={drill?drill.title:null} films={drill?drill.films:[]} onClose={function(){sDrill(null)}}/>;
  // Resolves a hovered point to the nearby turning point, if there is one. A peak is a single
  // point on a line carrying two per pixel; without this it can be seen but not landed on.
  var snapExt=function(d){return(d&&d.snap!=null&&inflation.data[d.snap])?inflation.data[d.snap]:d};
  // The 50 ratings behind a point on the rolling average, newest first.
  var openDrillWindow=function(raw){
    var d=snapExt(raw);
    if(!d||d.i==null)return;
    openDrill('The '+inflation.w+' ratings up to '+d.date,inflation.rated.slice(Math.max(0,d.i-inflation.w+1),d.i+1).slice().reverse());
  };
  var openDrill=function(title,films){if(films&&films.length)sDrill({title:title,films:films})};

  var themePickerModal=showPicker?<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60,padding:'40px 20px',overflowY:'auto'}} onClick={function(){sShowPicker(false)}}><div style={{background:N.surface,border:'1px solid '+N.borderStrong,borderRadius:4,padding:24,maxWidth:720,width:'100%',maxHeight:'90vh',overflowY:'auto'}} onClick={function(e){e.stopPropagation()}}><div className="flex justify-between items-baseline mb-4 pb-3" style={{borderBottom:'0.5px solid '+N.border}}><div><div style={{fontSize:9,letterSpacing:'0.22em',color:N.muted,textTransform:'uppercase'}}>Choose a theme</div><div style={{fontSize:18,fontWeight:500,color:N.ink,marginTop:4}}>{THEMES.length} cinematic palettes</div></div><button onClick={function(){sShowPicker(false)}} style={btnSecondary}>{'\u2715'}</button></div><div className="grid grid-cols-2 md:grid-cols-3 gap-2">{THEMES.map(function(theme){var isActive=theme.id===themeId;return <button key={theme.id} onClick={function(){pickTheme(theme.id)}} style={{background:theme.paper,border:isActive?'2px solid '+T.primary:'0.5px solid '+theme.border,borderRadius:4,padding:'10px 12px',cursor:'pointer',textAlign:'left',transition:'transform 0.1s'}}><div style={{fontSize:9,letterSpacing:'0.15em',color:theme.muted,textTransform:'uppercase',marginBottom:4}}>Theme</div><div style={{fontSize:14,fontWeight:500,color:theme.ink,marginBottom:6}}>{theme.name}</div><div style={{display:'flex',gap:4,alignItems:'center'}}><div style={{fontSize:24,fontWeight:600,color:theme.metricColor||theme.primary,lineHeight:1,fontFamily:'ui-monospace,monospace'}}>142</div><div style={{display:'flex',flexDirection:'column',gap:2,marginLeft:'auto'}}><div style={{width:18,height:6,background:theme.metricColor||theme.primary,borderRadius:4}}/><div style={{width:18,height:6,background:theme.secondary||blend(theme.primary,theme.paper,0.35),borderRadius:4}}/><div style={{width:18,height:6,background:theme.ink,borderRadius:4}}/></div></div></button>})}</div><div className="mt-4 pt-3 text-xs" style={{borderTop:'0.5px solid '+N.border,color:N.muted}}>The theme is locked once you pick one. Default loads first; click any other to switch.</div></div></div>:null;
  var pwModal=showPwModal?<div style={{position:'fixed',inset:0,background:'rgba(26,26,26,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}} onClick={function(){sShowPwModal(false);sPwInput('');sPwErr('')}}><div style={{background:N.surface,border:'1px solid '+N.borderStrong,borderRadius:4,padding:24,width:320}} onClick={function(e){e.stopPropagation()}}><div style={{fontSize:14,fontWeight:500,color:N.ink}}>Admin sign in</div><div className="mb-4 mt-1" style={{fontSize:11,color:N.muted,lineHeight:1.4}}>Supabase account. The server rejects writes without a session, so this is a real gate rather than a UI toggle.</div><input type="email" autoComplete="username" placeholder="Email" style={Object.assign({},inputStyle,{width:'100%',marginBottom:8})} value={pwEmail} onChange={function(e){sPwEmail(e.target.value);sPwErr('')}} onKeyDown={function(e){if(e.key==='Enter')handleLogin()}}/><input type="password" autoComplete="current-password" placeholder="Password" style={Object.assign({},inputStyle,{width:'100%',marginBottom:8})} value={pwInput} onChange={function(e){sPwInput(e.target.value);sPwErr('')}} onKeyDown={function(e){if(e.key==='Enter')handleLogin()}}/>{pwErr&&<div className="text-xs mb-2" style={{color:NEG}}>{pwErr}</div>}<div className="flex gap-2"><button onClick={handleLogin} disabled={pwBusy} style={Object.assign({},btnPrimary,{flex:1,opacity:pwBusy?0.5:1,cursor:pwBusy?'default':'pointer'})}>{pwBusy?'Signing in\u2026':'Sign in'}</button><button onClick={function(){sShowPwModal(false);sPwInput('');sPwErr('')}} style={Object.assign({},btnSecondary,{flex:1})}>Cancel</button></div></div></div>:null;

  // Cost view
  var renderCostCards=function(d,label){return <div className="space-y-3 mb-6"><div className="flex items-baseline gap-3 pb-2" style={{borderBottom:'0.5px solid '+N.border}}><div style={{fontSize:14,fontWeight:500,color:N.ink}}>{label}</div><div style={{fontSize:11,color:N.muted}}>{d.films} films</div></div><div className="grid grid-cols-3 md:grid-cols-5">
    <Stat T={N} label="Subscriptions" value={'\u20AC'+d.st.toFixed(0)} color={N.ink}/>
    <Stat T={N} label={'Tickets ('+d.tc+')'} value={'\u20AC'+d.tt.toFixed(2)} color={N.ink}/>
    <Stat T={N} label={'Rentals ('+d.rc+')'} value={'\u20AC'+d.rt.toFixed(2)} color={N.ink}/>
    <Stat T={N} label="Total" value={'\u20AC'+d.tot.toFixed(2)} color={N.ink}/>
    <Stat T={N} label="Per film" value={'\u20AC'+d.pf.toFixed(2)} color={N.ink} noBorder/>
  </div></div>};

  // Folded by default: this is an editing surface, not a reading one, and the numbers are
  // why the tab exists. Passed into costView so it lands BELOW the year filters instead of
  // above the whole view, where a form was the first thing on the page and the figures
  // started halfway down.
  var subsEditorCard=<div>
      <div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4}}>
        <SectionHead T={N} title={<button onClick={function(){sShowSubs(function(v){return!v})}} style={{background:'transparent',border:'none',padding:0,cursor:'pointer',color:N.ink,font:'inherit'}}>{showSubs?'\u25BE':'\u25B8'} Subscription editor</button>} aside={showSubs?<button onClick={function(){doUpSubs(function(p){return p.concat([{id:'s_'+Date.now(),name:'New',platforms:[],periods:[{from:'',to:'',price:0}]}])})}} style={btnPrimary}>+ Add</button>:null}/>
        {showSubs&&<div className="space-y-2">{subscriptions.map(function(sub){return <div key={sub.id} className="p-3" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4}}><div className="flex justify-between items-center"><span style={{fontSize:13,fontWeight:500,color:N.ink}}>{sub.name}</span><div className="flex gap-1"><button onClick={function(){sCostEs(costEs===sub.id?null:sub.id)}} style={btnSecondary}>{costEs===sub.id?'Close':'Edit'}</button><button onClick={function(){doUpSubs(function(p){return p.filter(function(s){return s.id!==sub.id})});sCostEs(null)}} style={{background:N.surfaceAlt,border:'0.5px solid '+T.primary,borderRadius:4,color:T.primary,padding:'4px 10px',fontSize:11}}>{'\u00D7'}</button></div></div>
          {costEs===sub.id&&<div className="space-y-3 mt-3">
            <div className="flex gap-2 items-center"><label className="text-xs w-14" style={{color:N.muted}}>Name</label><input style={Object.assign({},inputStyle,{flex:1,fontSize:11,padding:'4px 6px'})} value={sub.name} onChange={function(e){var v=e.target.value;doUpSubs(function(p){return p.map(function(s){return s.id===sub.id?Object.assign({},s,{name:v}):s})})}}/></div>
            <div><label className="text-xs mb-1 block" style={{color:N.muted}}>Platforms (click to toggle)</label><div className="flex flex-wrap gap-1">{paidPlatTags.map(function(t){var isIn=sub.platforms.indexOf(t)!==-1;return <button key={t} onClick={function(){doUpSubs(function(p){return p.map(function(s){if(s.id!==sub.id)return s;var np=isIn?s.platforms.filter(function(x){return x!==t}):s.platforms.concat([t]);return Object.assign({},s,{platforms:np})})})}} style={isIn?{padding:'3px 8px',fontSize:11,fontWeight:500,color:T.chartTextColor||NEUTRAL.ink,background:T.primary,border:'0.5px solid '+T.primary,borderRadius:4}:{padding:'3px 8px',fontSize:11,color:N.muted,background:'transparent',border:'0.5px solid '+N.border,borderRadius:4}}>{getDn(t,fullReg)}</button>})}<button key="_ts" onClick={function(){doUpSubs(function(p){return p.map(function(s){if(s.id!==sub.id)return s;var isIn=s.platforms.indexOf('_theater_sub')!==-1;var np=isIn?s.platforms.filter(function(x){return x!=='_theater_sub'}):s.platforms.concat(['_theater_sub']);return Object.assign({},s,{platforms:np})})})}} style={sub.platforms.indexOf('_theater_sub')!==-1?{padding:'3px 8px',fontSize:11,fontWeight:500,color:T.chartTextColor||NEUTRAL.ink,background:T.primary,border:'0.5px solid '+T.primary,borderRadius:4}:{padding:'3px 8px',fontSize:11,color:N.muted,background:'transparent',border:'0.5px solid '+N.border,borderRadius:4}}>Theater pass</button></div></div>
            <div><div className="flex justify-between"><label className="text-xs" style={{color:N.muted}}>Periods</label><button onClick={function(){doUpSubs(function(p){return p.map(function(s){return s.id===sub.id?Object.assign({},s,{periods:s.periods.concat([{from:'',to:'',price:0}])}):s})})}} className="text-xs" style={{color:T.primary}}>+</button></div>{sub.periods.map(function(pr,pi){return <div key={pi} className="flex gap-1 items-center flex-wrap mt-1"><input type="month" style={Object.assign({},inputStyle,{fontSize:11,padding:'2px 4px',width:112})} value={pr.from} onChange={function(e){var v=e.target.value;doUpSubs(function(p){return p.map(function(s){if(s.id!==sub.id)return s;return Object.assign({},s,{periods:s.periods.map(function(x,j){return j===pi?Object.assign({},x,{from:v}):x})})})})}}/><span className="text-xs" style={{color:N.mutedSoft}}>{'\u2192'}</span><input type="month" style={Object.assign({},inputStyle,{fontSize:11,padding:'2px 4px',width:112})} placeholder="ongoing" value={pr.to} onChange={function(e){var v=e.target.value;doUpSubs(function(p){return p.map(function(s){if(s.id!==sub.id)return s;return Object.assign({},s,{periods:s.periods.map(function(x,j){return j===pi?Object.assign({},x,{to:v}):x})})})})}}/><span className="text-xs" style={{color:N.mutedSoft}}>{'\u20AC'}</span><input type="number" step="0.01" style={Object.assign({},inputStyle,{fontSize:11,padding:'2px 4px',width:56})} value={pr.price} onChange={function(e){var v=e.target.value;doUpSubs(function(p){return p.map(function(s){if(s.id!==sub.id)return s;return Object.assign({},s,{periods:s.periods.map(function(x,j){return j===pi?Object.assign({},x,{price:parseFloat(v)||0}):x})})})})}}/><span className="text-xs" style={{color:N.mutedSoft}}>/mo</span>{sub.periods.length>1&&<button onClick={function(){doUpSubs(function(p){return p.map(function(s){return s.id===sub.id?Object.assign({},s,{periods:s.periods.filter(function(_,j){return j!==pi})}):s})})}} className="text-xs" style={{color:T.primary}}>{'\u00D7'}</button>}</div>})}</div>
          </div>}
        </div>})}</div>}
      </div>
  </div>;

  var costView=function(editor){return <div className="space-y-6">
    {/* Every other year selector on the site uses the theme accent for the active year; this
        one was white, which read as a different kind of control. */}
    <div className="flex gap-2 items-center flex-wrap">
      <div className="flex gap-1 flex-wrap">{costYrs.map(function(y){return <button key={y} onClick={function(){sCostYr(y)}} style={costYr===y?{background:T.primary,border:'0.5px solid '+T.primary,borderRadius:4,color:T.chartTextColor||NEUTRAL.ink,padding:'4px 10px',fontSize:11,fontWeight:500}:{background:'transparent',border:'0.5px solid '+N.border,borderRadius:4,color:N.muted,padding:'4px 10px',fontSize:11}}>{y}</button>})}</div>
      {/* Every figure below is a floor while this is non-zero: a theatre visit with no price tag
          contributes nothing to the totals, so the spend is understated by whatever those tickets
          cost. Stated on the tab rather than only in the admin panel. */}
      {noPriceCost.length>0&&<button onClick={function(){sShowNoPrice(function(v){return!v})}} className="ml-auto"
        style={{background:'transparent',border:'none',color:N.muted,padding:0,fontSize:11,cursor:'pointer',textDecoration:'underline',textUnderlineOffset:3}}
        title="These visits carry no price tag, so they add nothing to the totals below">
        {noPriceCost.length} {noPriceCost.length===1?'theatre visit':'theatre visits'} without a price
      </button>}
    </div>
    {showNoPrice&&noPriceCost.length>0&&<div className="p-3" style={{background:N.surface,border:'0.5px solid '+NEG,borderRadius:4}}>
      <div className="text-xs mb-2" style={{color:N.inkSoft}}>Not counted in any figure on this tab. Tag a price on these and the totals rise.</div>
      <div className="max-h-40 overflow-y-auto">{noPriceCost.map(function(e,i2){return <div key={i2} className="text-xs py-0.5 flex justify-between" style={{color:N.muted}}><span className="truncate mr-2">{e.name} <span style={{color:N.mutedSoft}}>({e.year})</span></span><span className="whitespace-nowrap" style={{color:N.mutedSoft}}>{e.date}</span></div>})}</div>
    </div>}
    {editor}
    {costYr==='All'?renderCostCards(allTimeTotals,'All Time'):costDataFilt.map(function(d){return <div key={d.yr}>{renderCostCards(d,d.yr)}</div>})}
    {/* PRICE AGAINST QUALITY — the ranked bar could only sort on cost, so the rating printed at
        the end of each row was a second column the eye had to carry. Both are axes now: cheap
        and good is the bottom right, and the crosshair is the median of each. */}
    {platRanking.length>0&&(function(){
      var pts=platRanking.filter(function(d){return d.cpf>0&&d.avg>0});
      var med=function(a){var s=a.slice().sort(function(x,y){return x-y});return s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2};
      var mx=pts.length?med(pts.map(function(d){return d.cpf})):0;
      var my=pts.length?med(pts.map(function(d){return d.avg})):0;
      var xs=pts.map(function(d){return d.cpf}),ys=pts.map(function(d){return d.avg});
      var xhi=pts.length?Math.max.apply(null,xs)*1.12:1;
      var ylo=pts.length?Math.max(0,Math.floor(Math.min.apply(null,ys)*4)/4-0.2):0;
      var yhi=pts.length?Math.min(5,Math.ceil(Math.max.apply(null,ys)*4)/4+0.2):5;
      return <div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4}}>
        <SectionHead T={N} title="Price against quality" count={pts.length} aside={<button onClick={function(){sRankMode(function(v){return v==='sub'?'plat':'sub'})}} style={btnSecondary}>{rankMode==='sub'?'Per subscription':'Per platform'}</button>}/>
        <div className="text-xs mb-3" style={{color:N.muted}}>What each film cost across, how it was rated up. Bottom right is cheap and good; top left is dear and mediocre. The crosshair is the median of each. Dot size is the number of films.</div>
        {pts.length<3?<div className="text-xs py-6 text-center" style={{color:N.mutedSoft}}>Not enough priced platforms to plot yet.</div>:<div>
          <div className="flex justify-between" style={{paddingLeft:48,paddingRight:26,fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:N.mutedSoft}}><span>Cheap · rated higher</span><span>Dear · rated higher</span></div>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{top:18,right:24,bottom:24,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={N.border}/>
              <XAxis type="number" dataKey="cpf" domain={[0,xhi]} tick={{fill:N.muted,fontSize:10}} tickFormatter={function(v){return '€'+v.toFixed(0)}} label={{value:'cost per film',position:'insideBottom',offset:-14,fill:N.mutedSoft,fontSize:10}}/>
              <YAxis type="number" dataKey="avg" domain={[ylo,yhi]} width={46} tick={{fill:N.muted,fontSize:10}} tickFormatter={function(v){return v.toFixed(1)}} label={{value:'average rating',angle:-90,position:'insideLeft',offset:16,fill:N.mutedSoft,fontSize:10}}/>
              <ZAxis dataKey="films" range={[60,420]}/>
              <Tooltip content={function(pp){if(!pp.active||!pp.payload||!pp.payload.length)return null;
                var raw=pp.payload[0].payload,d=snapExt(raw);
                var cheap=d.cpf<=mx,good=d.avg>=my;
                return <div style={{background:N.paper,border:'0.5px solid '+N.borderStrong,borderRadius:4,padding:'8px 12px',fontSize:11}}>
                  <div style={{color:N.ink,fontWeight:500}}>{d.name}</div>
                  <div style={{color:N.inkSoft,marginTop:2}}>{'€'}{d.cpf.toFixed(2)} a film {'·'} {d.avg.toFixed(2)}{'★'} {'·'} {d.films} films</div>
                  <div style={{color:N.muted,marginTop:2}}>{cheap&&good?'Cheap and good':cheap?'Cheap, and it shows':good?'Dear, but worth it':'Dear and mediocre'}</div>
                </div>}}/>
              <ReferenceLine x={mx} stroke={N.borderStrong} strokeDasharray="4 4"/>
              <ReferenceLine y={my} stroke={N.borderStrong} strokeDasharray="4 4"/>
              <Scatter data={pts} fill={VIZ_MARK} fillOpacity={0.78} cursor="pointer"
                onClick={function(d){var c=(d&&d.payload)||d;if(c&&c.rows)openDrill(c.name+' \u00b7 \u20ac'+c.cpf.toFixed(2)+' a film',withCur(c.rows))}}>
                <LabelList dataKey="name" position="top" offset={9} style={{fill:NEUTRAL.inkSoft,fontSize:10}}/>
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex justify-between" style={{paddingLeft:48,paddingRight:26,fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:N.mutedSoft}}><span>Cheap · rated lower</span><span>Dear · rated lower</span></div>
        </div>}
      </div>;
    })()}
    {cpfData.length>1&&<div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4}}><SectionHead T={N} title="The price of a film, over time"/><ResponsiveContainer width="100%" height={220}><LineChart data={cpfData}><CartesianGrid strokeDasharray="3 3" stroke={N.border}/><XAxis dataKey="q" tick={{fill:N.muted,fontSize:9}} angle={-45} textAnchor="end" height={50}/><YAxis tick={{fill:N.muted,fontSize:10}}/><Tooltip content={function(p){if(!p.active||!p.payload||!p.payload.length)return null;var d=p.payload[0].payload;return <div style={{background:N.paper,border:'0.5px solid '+N.borderStrong,borderRadius:4,padding:'8px 12px',fontSize:11}}><div style={{color:N.ink,fontWeight:500}}>{d.period}</div><div style={{color:T.primary}}>{'\u20AC'}{d.cpf.toFixed(2)}/film</div><div style={{color:N.muted}}>{d.films} films {'\u00B7'} {'\u20AC'}{d.cost.toFixed(0)} spent</div></div>}}/><Line type="monotone" dataKey="cpf" stroke={T.primary} strokeWidth={2} dot={{fill:T.primary,r:2}}/></LineChart></ResponsiveContainer></div>}
    {monthlyFilt.length>3&&(function(){var sc=seriesColors();return <div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4}}><SectionHead T={N} title="Monthly spend"/><ResponsiveContainer width="100%" height={250}><BarChart data={monthlyFilt}><CartesianGrid strokeDasharray="3 3" stroke={N.border}/><XAxis dataKey="m" tick={{fill:N.muted,fontSize:9}} angle={-45} textAnchor="end" height={50}/><YAxis tick={{fill:N.muted,fontSize:10}}/><Tooltip content={function(p){return <CostTip {...p} T={N}/>}}/><Bar dataKey="subs" name="Subscriptions" stackId="a" fill={sc[0]} stroke={NEUTRAL.surface} strokeWidth={2}/><Bar dataKey="tickets" name="Tickets" stackId="a" fill={sc[1]} stroke={NEUTRAL.surface} strokeWidth={2}/><Bar dataKey="rentals" name="Rentals" stackId="a" fill={sc[2]} stroke={NEUTRAL.surface} strokeWidth={2}/></BarChart></ResponsiveContainer><div className="flex gap-4 mt-2 justify-center"><div className="flex items-center gap-1.5"><div style={{width:10,height:10,background:sc[0],borderRadius:4}}/><span className="text-xs" style={{color:N.muted}}>Subscriptions</span></div><div className="flex items-center gap-1.5"><div style={{width:10,height:10,background:sc[1],borderRadius:4}}/><span className="text-xs" style={{color:N.muted}}>Tickets</span></div><div className="flex items-center gap-1.5"><div style={{width:10,height:10,background:sc[2],borderRadius:4}}/><span className="text-xs" style={{color:N.muted}}>Rentals</span></div></div></div>})()}
  </div>};

  if(CONFIG_ERROR)return(<div style={{background:NEUTRAL.paper,color:NEUTRAL.ink,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:fontOf('sans')}}>
    <div style={{maxWidth:520,background:NEUTRAL.surface,border:'0.5px solid '+NEG,borderRadius:4,padding:24}}>
      <div style={{fontSize:15,fontWeight:500,marginBottom:8}}>This dashboard is not configured</div>
      <div style={{fontSize:13,color:NEUTRAL.inkSoft,lineHeight:1.6,marginBottom:14}}>{CONFIG_ERROR}. The app reads its Supabase connection from environment variables at build time, and this build had none.</div>
      <div style={{fontSize:12,color:NEUTRAL.muted,lineHeight:1.7}}>
        <div style={{marginBottom:6}}><strong style={{color:NEUTRAL.inkSoft}}>Running locally:</strong> copy <code>.env.example</code> to <code>.env</code> and fill it in.</div>
        <div><strong style={{color:NEUTRAL.inkSoft}}>Deployed:</strong> set both variables in the host's environment settings, then redeploy. Vite bakes them in at build time, so an existing build will not pick them up.</div>
      </div>
    </div>
  </div>);
  if(loading)return <div style={{background:N.paper,color:N.ink,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div className="text-center"><div style={{fontSize:11,letterSpacing:'0.2em',color:N.muted,textTransform:'uppercase',marginBottom:8}}>Loading</div></div></div>;

  if(sI||(isAdmin&&!all.length))return(<div style={{background:N.paper,color:N.ink,minHeight:'100vh'}} className="p-4 md:p-10">{pwModal}{themePickerModal}<div className="max-w-4xl mx-auto"><div className="flex justify-between items-baseline mb-6 pb-3" style={{borderBottom:'0.5px solid '+N.border}}><div><div style={{fontSize:10,letterSpacing:'0.2em',color:N.muted,textTransform:'uppercase'}}>Import</div><div style={{fontSize:24,fontWeight:500,marginTop:4,color:N.ink}}>Letterboxd export</div></div>{all.length>0&&<button onClick={function(){sSI(false)}} style={btnSecondary}>{'\u2190'} Back</button>}</div><div className="p-10 text-center mb-3" style={{border:'1px dashed '+N.borderStrong,borderRadius:4,background:N.surface}}><input type="file" webkitdirectory="" directory="" multiple className="hidden" id="folderPick" onChange={function(e){var files=e.target.files;if(!files||!files.length)return;var found={};for(var i=0;i<files.length;i++){var rp=files[i].webkitRelativePath||"";var parts=rp.split("/");if(parts.length!==2)continue;var fn=parts[1].toLowerCase();if(fn==="diary.csv")found.diary=files[i];if(fn==="reviews.csv")found.reviews=files[i];if(fn==="watchlist.csv")found.watchlist=files[i];if(fn==="ratings.csv")found.ratings=files[i];if(parts.length===3&&parts[1]==="lists"&&fn.indexOf("top-50-all-time")!==-1){if(!found.top50)found.top50=[];found.top50.push(files[i])}}var status=[];if(found.diary)status.push("diary.csv");if(found.reviews)status.push("reviews.csv");if(found.watchlist)status.push("watchlist.csv");if(found.ratings)status.push("ratings.csv");if(found.top50)status.push(found.top50.length+" top 50 lists");sIR({pipe:"",w:[],e:[],count:0,status:status});if(found.diary){var r1=new FileReader();r1.onload=function(ev){sCsv(ev.target.result)};r1.readAsText(found.diary)}if(found.reviews){var r2=new FileReader();r2.onload=function(ev){var revs=parseReviews(ev.target.result);var yr2={};revs.forEach(function(x){yr2[x.name+"|||"+x.year]=x.yRating});sYRatings(yr2);saveRevs(revs)};r2.readAsText(found.reviews)}if(found.ratings){var r4=new FileReader();r4.onload=function(ev){var rats=parseRatings(ev.target.result);sAllRatings(rats);saveRatings(JSON.stringify(rats))};r4.readAsText(found.ratings)}if(found.top50){found.top50.forEach(function(file){var r5=new FileReader();r5.onload=function(ev){var fn3=file.name.toLowerCase();var ym=fn3.match(/(\d{4})/);var listYr=ym?parseInt(ym[1]):new Date().getFullYear();if(fn3.indexOf("version")===-1&&fn3.indexOf("top-50-all-time")!==-1)listYr=new Date().getFullYear();var films=parseTop50(ev.target.result);if(films.length>0){saveTop50(listYr,films);sTop50s(function(p){var n=p.filter(function(x){return x.year!==listYr});n.push({year:listYr,films:films});return n.sort(function(a,b){return a.year-b.year})})}};r5.readAsText(file)})}if(found.watchlist){var r3=new FileReader();r3.onload=function(ev){var wl=parseWatchlist(ev.target.result);saveWl(wl)};r3.readAsText(found.watchlist)}}}/><label htmlFor="folderPick" className="cursor-pointer"><div style={{fontSize:13,color:N.inkSoft,marginBottom:4}}>Select your Letterboxd export folder</div><div style={{fontSize:11,color:N.muted}}>Automatically finds diary.csv, reviews.csv, watchlist.csv</div></label></div>{iR&&iR.status&&iR.status.length>0&&<div className="flex gap-2 mb-3">{iR.status.map(function(s,i){return <div key={i} className="text-xs px-2 py-1" style={{background:N.surface,border:'0.5px solid '+T.primary,borderRadius:4,color:T.primary}}>{s}</div>})}</div>}{csv&&<div className="text-xs mb-2" style={{color:T.primary}}>{csv.split("\n").length} diary lines loaded</div>}<div className="flex gap-2 mb-3"><button onClick={doImport} disabled={!csv.trim()} style={Object.assign({},btnPrimary,{opacity:csv.trim()?1:0.4})}>Parse & save diary</button></div><div className="text-xs mb-3" style={{color:N.muted}}>Or upload files individually:</div><div className="grid grid-cols-3 gap-2 mb-3"><div className="p-3 text-center" style={{border:'0.5px solid '+N.border,borderRadius:4,background:N.surface}}><input type="file" accept=".csv" className="hidden" id="csvFile" onChange={function(e){var file=e.target.files&&e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){sCsv(ev.target.result);sIR(null)};reader.readAsText(file)}}/><label htmlFor="csvFile" className="cursor-pointer text-xs" style={{color:N.inkSoft}}>diary.csv</label></div><div className="p-3 text-center" style={{border:'0.5px solid '+N.border,borderRadius:4,background:N.surface}}><input type="file" accept=".csv" className="hidden" id="wlFile" onChange={function(e){var file=e.target.files&&e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){var wl=parseWatchlist(ev.target.result);saveWl(wl)};reader.readAsText(file)}}/><label htmlFor="wlFile" className="cursor-pointer text-xs" style={{color:N.inkSoft}}>watchlist.csv</label></div><div className="p-3 text-center" style={{border:'0.5px solid '+N.border,borderRadius:4,background:N.surface}}><input type="file" accept=".csv" className="hidden" id="revFile" onChange={function(e){var file=e.target.files&&e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){var revs=parseReviews(ev.target.result);var yr2={};revs.forEach(function(x){yr2[x.name+"|||"+x.year]=x.yRating});sYRatings(yr2);saveRevs(revs)};reader.readAsText(file)}}/><label htmlFor="revFile" className="cursor-pointer text-xs" style={{color:N.inkSoft}}>reviews.csv</label></div></div>{iR&&iR.count>0&&<div className="mt-4 space-y-3"><div className="p-3 text-sm" style={{background:N.surface,border:'0.5px solid '+T.primary,borderRadius:4,color:T.primary}}>{iR.count} diary entries</div>{!iR.e.length&&<button onClick={function(){sSI(false)}} style={btnPrimary}>{'\u2192'} Continue</button>}</div>}{iR&&iR.e&&iR.e.length>0&&<div className="p-4 mt-3" style={{background:N.surface,border:'0.5px solid '+T.primary,borderRadius:4}}>{iR.e.map(function(e,i){return <div key={i} className="text-xs" style={{color:T.primary}}>{e}</div>})}</div>}</div></div>);

  if(unclass>0&&isAdmin)return(<div style={{background:N.paper,color:N.ink,minHeight:'100vh'}} className="p-4 md:p-10">{pwModal}{themePickerModal}<div className="max-w-5xl mx-auto"><div className="mb-6 pb-3" style={{borderBottom:'0.5px solid '+N.border}}><div style={{fontSize:10,letterSpacing:'0.2em',color:N.muted,textTransform:'uppercase'}}>Tag registry</div><div style={{fontSize:24,fontWeight:500,marginTop:4,color:N.ink}}>Classify tags</div><div className="mt-2 text-sm" style={{color:N.inkSoft}}>{unclass} unsorted.</div></div><div className="flex flex-wrap gap-2 mb-4 items-center"><input style={Object.assign({},inputStyle,{flex:1,minWidth:192})} placeholder="Filter..." value={tagSearch} onChange={function(e){sTagSearch(e.target.value)}}/>{tagSelCount>0&&<div className="flex items-center gap-2 px-3 py-1.5" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4}}><span className="text-xs" style={{color:N.inkSoft}}>{tagSelCount} sel</span><select className="text-xs" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4,color:N.inkSoft,padding:'2px 4px'}} value={bulkCat} onChange={function(e){sBulkCat(e.target.value)}}><option value="">Assign...</option>{CATS.map(function(c){return <option key={c} value={c}>{CI[c].l}</option>})}</select><button onClick={doBulkTag} disabled={!bulkCat} style={Object.assign({},btnPrimary,{padding:'2px 8px',fontSize:11,opacity:bulkCat?1:0.4})}>Apply</button><button onClick={function(){sTagSel({})}} className="text-xs" style={{color:N.muted}}>Clear</button></div>}<button onClick={function(){var n={};tagFiltered.forEach(function(t){n[t]=true});sTagSel(n)}} style={btnSecondary}>Select visible</button></div>{tagGrouped._un.length>0&&<div className="p-4 mb-4" style={{background:N.surface,border:'0.5px solid '+N.borderStrong,borderRadius:4}}><div className="mb-2" style={{fontSize:13,fontWeight:500,color:N.ink}}>Unsorted ({tagGrouped._un.length})</div><div className="space-y-0">{tagGrouped._un.map(function(t){return renderTagRow(t,true)})}</div></div>}{CATS.map(function(cat){var tags=tagGrouped[cat];if(!tags||!tags.length)return null;return <div key={cat} className="p-4 mb-3" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4}}><div style={{fontSize:13,fontWeight:500,color:N.inkSoft,marginBottom:8}}>{CI[cat].l} ({tags.length})</div><div className="space-y-0 max-h-64 overflow-y-auto">{tags.map(function(t){return renderTagRow(t,true)})}</div></div>})}</div></div>);

  if(!all.length&&!isAdmin)return(<div style={{background:N.paper,color:N.ink,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>{pwModal}{themePickerModal}<div className="text-center"><div style={{fontSize:11,letterSpacing:'0.2em',color:N.muted,textTransform:'uppercase',marginBottom:12}}>Awaiting data</div><button onClick={function(){sShowPwModal(true)}} style={btnSecondary}>Admin</button></div></div>);

  var tagGroupedDash={};CATS.forEach(function(c){tagGroupedDash[c]=[]});tagAllSorted.filter(function(t){return!tagSearch||t.indexOf(tagSearch.toLowerCase())!==-1}).forEach(function(t){var c=fullReg[t]&&fullReg[t].cat;if(c&&tagGroupedDash[c])tagGroupedDash[c].push(t)});

  // ============================================================
  // HEADER + YEAR SELECTOR (used by all tabs)
  // ============================================================
  var heroYearLabel=yr==='All'?'All time':yr;
  var copyCtx={year:yr==='All'?String(new Date().getFullYear()):yr,total:stats.total,n:yoy&&yoy.films!=null?fY(yoy.films,'abs')||'':''};
  var fontLabel=fontOf((T.fonts&&T.fonts.label)||'sans');
  var copyHeroLabel=applyCopy((T.copy&&T.copy.heroLabel)||'Films watched',copyCtx);
  var copyHeroSuffix=applyCopy((T.copy&&T.copy.heroSuffix)||'{n} vs '+(yr==='All'?'':String(parseInt(yr)-1)),copyCtx);

  return(<div style={{background:N.paper,color:N.ink,minHeight:'100vh',fontFeatureSettings:'"ss01","cv01"',fontFamily:fontOf('sans')}} className="px-4 md:px-10 py-6 md:py-10"><style>{ANIM_CSS}</style>{pwModal}{themePickerModal}{drillModal}<div className="max-w-6xl mx-auto">

    {/* NAV — tabs and controls share one row. They were two stacked rows with their own
        borders and margins, costing ~50px before any content for what is a single band of
        chrome. Tabs sit on the border so their active underline meets it; the controls are
        pushed right with ml-auto and wrap underneath only on narrow screens. */}
    <div className="flex items-end gap-2 mb-5 flex-wrap" style={{borderBottom:'0.5px solid '+N.border}}>
      <div className="flex gap-0 flex-wrap">{TABS.map(function(t){var active=tab===t.id;
        // A badge on the tab, the way an app signals something waiting. Only Costs carries one,
        // and only while theatre visits are missing a price -- those contribute nothing to any
        // total, so the whole tab reads low until they are tagged. Raised to the cap height so
        // it sits beside the word rather than on it.
        var badge=t.id==='costs'&&dq.nP.length>0;
        return <button key={t.id} onClick={function(){sTab(t.id);cls()}} title={badge?dq.nP.length+' theatre visits have no price yet, so the totals there are a floor':undefined} style={{padding:'8px 14px',fontSize:12,fontWeight:active?500:400,color:active?T.primary:N.muted,background:'transparent',border:'none',borderBottom:active?'1.5px solid '+T.primary:'1.5px solid transparent',marginBottom:-1,cursor:'pointer',letterSpacing:'0.02em'}}>{t.l}{badge&&<span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:T.primary,marginLeft:5,verticalAlign:'top',marginTop:1}}/>}</button>})}</div>
      <div className="flex items-center gap-2 ml-auto" style={{paddingBottom:6}}>
        {isAdmin&&<span className="text-xs" style={{color:T.primary,letterSpacing:'0.1em',textTransform:'uppercase'}}>Admin</span>}
        <button onClick={function(){sShowPicker(true)}} style={btnSecondary}>{'\u25BE '}{T.name}</button>
        {isAdmin?<button onClick={doSignOut} style={btnSecondary}>Sign out</button>:<button onClick={function(){sShowPwModal(true)}} style={btnSecondary}>Admin</button>}
        {isAdmin&&<button onClick={function(){sSI(true)}} style={btnSecondary}>Import</button>}
        {isAdmin&&<button onClick={doClear} style={btnSecondary}>Clear</button>}
      </div>
    </div>

    {unclass>0&&!isAdmin&&<div className="p-3 mb-4 text-xs" style={{background:N.surface,border:'0.5px solid '+T.primary,borderRadius:4,color:T.secondary}}>{unclass} tags unclassified.</div>}

    {/* FILTER BAR */}
    {/* Only the tabs whose figures actually move with the filter. Rankings reads the yearly
        Top 50 snapshots rather than the diary, so a year selector there was a control that
        looked live and did nothing. 'ratings' and the rest were ids that stopped existing. */}
    {['overview','yesmine','taste'].indexOf(tab)!==-1&&<div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="flex gap-1 flex-wrap">{yrs.map(function(y){var active=yr===y;return <button key={y} onClick={function(){sYr(y);cls()}} style={active?{padding:'4px 10px',fontSize:11,fontWeight:500,color:T.chartTextColor||NEUTRAL.ink,background:T.primary,border:'0.5px solid '+T.primary,borderRadius:4}:{padding:'4px 10px',fontSize:11,color:N.muted,background:'transparent',border:'0.5px solid '+N.border,borderRadius:4}}>{y}</button>})}</div>
      <button onClick={function(){sIRW(function(v){return!v});cls()}} style={iRW?{padding:'4px 10px',fontSize:11,color:N.muted,background:'transparent',border:'0.5px solid '+N.border,borderRadius:4}:{padding:'4px 10px',fontSize:11,fontWeight:500,color:N.paper,background:T.primary,border:'0.5px solid '+T.primary,borderRadius:4}}>{iRW?'Excl. rewatches':'Incl. rewatches'}</button>
      <div className="flex items-center gap-1"><input type="date" style={Object.assign({},inputStyle,{fontSize:11,padding:'4px 6px'})} value={dateFrom} onChange={function(e){sDateFrom(e.target.value)}}/><span className="text-xs" style={{color:N.mutedSoft}}>{"\u2192"}</span><input type="date" style={Object.assign({},inputStyle,{fontSize:11,padding:'4px 6px'})} value={dateTo} onChange={function(e){sDateTo(e.target.value)}}/>{(dateFrom||dateTo)&&<button onClick={function(){sDateFrom('');sDateTo('')}} className="text-xs" style={{color:N.muted}}>{"\u2715"}</button>}</div>
    </div>}

    <TabErrorBoundary key={tab}>
    {/* ===== OVERVIEW ===== */}
    {tab==='overview'&&<div className="space-y-10">

      {/* HERO */}
      <div className="relative" style={{background:T.gradient?'linear-gradient(135deg, '+T.gradient[0]+' 0%, '+T.gradient[1]+' 50%, '+T.gradient[2]+' 100%)':'transparent',borderRadius:4,padding:'20px 22px',border:T.gradient?'0.5px solid '+T.border:'none',overflow:'hidden'}}>
        {T.bgImage&&<div style={{position:'absolute',inset:0,backgroundImage:'url('+T.bgImage+')',backgroundSize:T.bgImageSize||'cover',backgroundPosition:T.bgImagePosition||'center',backgroundRepeat:T.bgImageRepeat||'no-repeat',opacity:T.bgImageOpacity||0.18,mixBlendMode:T.bgImageBlend||'normal',pointerEvents:'none',zIndex:0}}/>}
        {T.heroImage&&<div style={{position:'absolute',top:'10%',left:'10%',width:'60%',height:'80%',backgroundImage:'url('+T.heroImage+')',backgroundSize:'contain',backgroundPosition:T.heroImagePosition||'left center',backgroundRepeat:'no-repeat',opacity:T.heroImageOpacity||0.35,mixBlendMode:T.heroImageBlend||'normal',pointerEvents:'none',zIndex:0}}/>}
        <ThemeOrnament T={T}/>
        {T.dots&&T.dots.length>=3&&<div style={{position:'absolute',top:14,right:18,display:'flex',gap:6,alignItems:'center',zIndex:2}}>
          <div style={{width:10,height:10,background:T.dots[0],borderRadius:'50%',boxShadow:T.glow?'0 0 8px '+T.dots[0]+'aa':'none'}}/>
          <div style={{width:7,height:7,background:T.dots[1],borderRadius:'50%'}}/>
          <div style={{width:5,height:5,background:T.dots[2],borderRadius:'50%'}}/>
        </div>}
        <div className="grid md:grid-cols-5 gap-x-8 gap-y-5 items-center" style={{position:'relative',zIndex:1}}>
          <div className="md:col-span-2 flex items-center gap-4">
            {/* Nudged right at md and up, to sit nearer the headline figure. Not on small
                screens, where the row has no slack to give. */}
            <a className="lb-link flex flex-col items-center gap-1.5 md:ml-12" href="https://letterboxd.com/Rhobz37/"
               target="_blank" rel="noopener noreferrer" title="Babylonian on Letterboxd" style={{flex:'0 0 auto'}}>
              <Avatar src={AVATAR_SRC} size={72} ring={T.primary}/>
              <span style={{fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:heroDescriptorC,fontFamily:fontLabel,whiteSpace:'nowrap'}}>Babylonian</span>
            </a>
            {/* Centred in the space left of the supporting figures, and larger: the headline
                number is the one thing on the page that should be visible across a room. */}
            <div className="flex-1 text-center">
            <div style={{fontSize:10,letterSpacing:'0.22em',color:heroDescriptorC,textTransform:'uppercase',marginBottom:4,fontFamily:fontLabel}}>{copyHeroLabel}{yr==='All'?' \u00b7 all time':' \u00b7 '+yr}</div>
            <div style={{fontSize:'clamp(54px, 7vw, 88px)',lineHeight:1,fontWeight:600,color:heroMetricC,letterSpacing:'-0.035em',fontFamily:fontOf(FIGURE_FONT),fontVariantNumeric:'tabular-nums',textShadow:T.glow?'0 0 24px '+T.glow+'66, 0 0 48px '+T.glow+'33':'none'}}>{stats.total}</div>
            {yoy&&yoy.films!=null&&<div style={{fontSize:12,color:heroSubC,fontFamily:fontLabel,marginTop:5}}>{copyHeroSuffix}</div>}
            </div>
          </div>
          {/* The supporting figures live INSIDE the frame rather than beside it. Every one
              answers the same question as the headline — how much, how often, how densely — so
              the card holds one idea instead of framing a number and some neighbours. This is
              what stops a full-width card reading as empty; padding never could. */}
          <div className="md:col-span-3 grid grid-cols-3 gap-x-5 gap-y-4">
            {/* Hours carries the average beneath it. Both count every watch, so the total is
                the average times the number of watches -- a per-film average under a per-watch
                total would not add up. Films with no runtime in film_metadata sit out of both;
                the hover note says how many, so a gap in the metadata cannot pass for a
                shorter film. Right now that is 4 of 843. */}
            {[['Hours',dirStats.totalH>0?dirStats.totalH.toLocaleString()+'h':'\u2014',
                dirStats.avgRun?hm(dirStats.avgRun)+' average':'',
                dirStats.rtCount?dirStats.rtCount+' of '+dirStats.rtTotal+' watches have a runtime'+(dirStats.rtTotal>dirStats.rtCount?'; the other '+(dirStats.rtTotal-dirStats.rtCount)+' are left out':''):''],
              ['Rewatches',stats.rw||'\u2014',stats.total?Math.round((stats.rw/stats.total)*100)+'% of watches':''],
              ['Foreign',stats.fo||'\u2014',stats.total?Math.round((stats.fo/stats.total)*100)+'% of films':''],
              ['Longest binge',binge.streak+' days',binge.range],
              ['Longest streak',streaks.longest+' weeks',streaks.lwr],
              ['Most in a day',busiest.count+' films',busiest.fmt]
            ].map(function(row,i){return <div key={i} title={row[3]||undefined}>
              <div style={{fontSize:9.5,letterSpacing:'0.14em',color:heroDescriptorC,textTransform:'uppercase',marginBottom:4,fontWeight:500}}>{row[0]}</div>
              <div style={{fontSize:22,fontWeight:600,color:heroMetricC,letterSpacing:'-0.01em',lineHeight:1.1,fontFamily:fontOf(FIGURE_FONT),fontVariantNumeric:'tabular-nums'}}>{row[1]}</div>
              {row[2]?<div style={{fontSize:10.5,color:heroSubC,marginTop:3,fontFamily:fontOf('sans'),overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row[2]}</div>:null}
            </div>})}
          </div>
        </div>
      </div>

      {/* HEATMAP */}
      <div>
        <SectionHead T={N} title="The viewing calendar" aside={<span className="text-xs" style={{color:N.mutedSoft,fontStyle:'italic'}}>click a cell to see the films</span>}/>
        <div className="overflow-x-auto"><div style={{minWidth:380}}>
          <div className="flex items-center mb-1"><div style={{width:36}}/>{MS.map(function(m,i){return <div key={i} className="flex-1 text-center" style={{fontSize:10,color:N.muted,letterSpacing:'0.05em'}}>{m}</div>})}</div>
          {hmData.years.map(function(y){var isCurrentYr=yr===y;return <div key={y} className="flex items-center gap-1 mb-1" style={isCurrentYr?{outline:'1px solid '+T.primary,borderRadius:4,padding:'1px'}:{}}><div style={{width:36,fontSize:10,color:N.muted,textAlign:'right',paddingRight:8}}>{y}</div>{hmData.grid[y].map(function(c,m){var iS=selHM&&selHM.yr===y&&selHM.mo===m;var bgColor=hmColor(c,hmData.max);return <div key={m} onClick={function(){sSelHM(c>0?(iS?null:{yr:y,mo:m}):null)}} className={'flex-1 flex items-center justify-center '+(c>0?'cursor-pointer':'')} style={{height:26,background:bgColor,color:c>0?textOn(bgColor):'transparent',borderRadius:4,outline:iS?'1.5px solid '+N.ink:'none'}}><span style={{fontSize:10,fontWeight:500}}>{c>0?c:''}</span></div>})}</div>})}
        </div></div>
        {selHM&&<FilmList T={N} title={MF[selHM.mo]+' '+selHM.yr} films={hmFilms} onClose={function(){sSelHM(null)}}/>}

      </div>

      {/* CUMULATIVE */}
      <div>
        <SectionHead T={N} title="The pace of a year, month by month"/>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={cumData.data}>
            <CartesianGrid strokeDasharray="3 3" stroke={N.border}/>
            <XAxis dataKey="month" tick={{fill:N.muted,fontSize:10}}/>
            <YAxis tick={{fill:N.muted,fontSize:10}}/>
            <Tooltip content={function(p){return <CTooltip {...p} T={N}/>}}/>
            {cumData.years.filter(function(y){return isoYrs.length===0||isoYrs.indexOf(String(y))!==-1}).map(function(y){var pick=isoYrs.indexOf(String(y))!==-1;return <Line key={y} type="monotone" dataKey={String(y)} stroke={yC(y,cumData.years)} strokeWidth={pick||(yr!=='All'&&yr===String(y))?2.25:1.25} dot={false} connectNulls={false} opacity={(!pick&&yr!=='All'&&yr!==String(y))?0.25:1}/>})}
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-2 flex-wrap mt-2 items-center">{cumData.years.map(function(y){var ys=String(y);var pick=isoYrs.indexOf(ys)!==-1;var dim=isoYrs.length>0&&!pick;return <button key={y} className="yr-chip" onClick={function(){sIsoYrs(function(prev){return prev.indexOf(ys)!==-1?prev.filter(function(x){return x!==ys}):prev.concat([ys])})}} title={pick?'Remove '+ys+' from the comparison':'Show '+ys+' \u2014 click more years to compare them'} style={{opacity:dim?0.45:1,background:pick?N.surfaceAlt:undefined,borderColor:pick?yC(y,cumData.years):undefined}}><div style={{width:14,height:2,background:yC(y,cumData.years),borderRadius:4}}/><span className="text-xs" style={{color:pick?N.ink:N.muted}}>{y}</span></button>})}{isoYrs.length>0?<button onClick={function(){sIsoYrs([])}} className="text-xs px-2 py-0.5" style={{color:N.muted,background:'transparent',border:'0.5px solid '+N.border,borderRadius:4,cursor:'pointer'}}>{'\u2715'} All years</button>:<span className="text-xs" style={{color:N.mutedSoft,fontStyle:'italic'}}>click a year to isolate {'\u00B7'} pick several to compare</span>}</div>
      </div>


    </div>}

    {/* ===== YESMINE ===== */}
    {tab==='yesmine'&&<div className="space-y-6">
      {/* This used to sit below the companions panels behind a divider, which is why it had a
          borderTop. It is the whole tab now, so it opens rather than interrupts. The friend
          breakdown that stood above it lives on the taste map's Friends set. */}
      <div>
        <div style={{fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:N.muted}}>Babylonian and Yesmine</div>
        <div className="text-xs mt-1" style={{color:N.mutedSoft}}>Films watched together, and the two sets of ratings</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6" style={{borderTop:'0.5px solid '+N.border,borderBottom:'0.5px solid '+N.border}}>
        <Stat T={N} label="Films together" value={yStats.count} sub={yAnalysis.n+' with both ratings'}/>
        <Stat T={N} label="Babylonian's average" value={yAnalysis.n?yAnalysis.bAvg.toFixed(2)+'★':'—'} sub="on the paired films"/>
        <Stat T={N} label="Yesmine's average" value={yAnalysis.n?yAnalysis.yAvg.toFixed(2)+'★':'—'} sub="on the paired films"/>
        {/* r says whether the two rank films the same way; bias says whether one sits lower
            throughout. Both are needed — perfect agreement on order with a constant offset
            gives an r near 1 and a bias that is not zero. */}
        <Stat T={N} label="Correlation" value={yAnalysis.r!=null?yAnalysis.r.toFixed(2):'—'} sub={yAnalysis.r!=null?(yAnalysis.r>0.7?'strong agreement':yAnalysis.r>0.4?'moderate agreement':'weak agreement'):''}/>
        <Stat T={N} label="Bias" value={yAnalysis.n?(yAnalysis.bias>0?'+':'')+yAnalysis.bias.toFixed(2):'—'} sub={yAnalysis.n?(yAnalysis.bias<0?'Yesmine rates lower':'Yesmine rates higher'):''} color={Math.abs(yAnalysis.bias)>=0.1?NEG:N.ink}/>
        <Stat T={N} label="Within ½★" value={yAnalysis.n?Math.round(yAnalysis.within/yAnalysis.n*100)+'%':'—'} sub={yAnalysis.within+' of '+yAnalysis.n+' films'} noBorder/>
      </div>
      {(yAnalysis.slept>0||yAnalysis.unrated>0)&&<div className="text-xs" style={{color:N.mutedSoft}}>
        {yAnalysis.slept>0?yAnalysis.slept+' films carry "sleep" or "memory" instead of a number and sit out of every figure here. ':''}
        {yAnalysis.unrated>0?yAnalysis.unrated+' have no rating from Yesmine yet.':''}
      </div>}

      {yAnalysis.n>=3&&<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* THE AGREEMENT PLOT — one dot per film. The diagonal is unanimity; distance from it is
            the size of the argument and the side says who liked it more. */}
        <div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4}}>
          <SectionHead T={N} title="Two verdicts, one film" count={yAnalysis.n}/>
          <div className="text-xs mb-2" style={{color:N.muted}}>Babylonian across, Yesmine up. On the dashed line the two agreed exactly; above it Yesmine liked it more, below it Babylonian did. Bigger dots hold more films.</div>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{top:10,right:18,bottom:22,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={N.border}/>
              <XAxis type="number" dataKey="x" domain={[0,5.5]} ticks={[1,2,3,4,5]} tick={{fill:N.muted,fontSize:10}} label={{value:'Babylonian',position:'insideBottom',offset:-12,fill:N.mutedSoft,fontSize:10}}/>
              <YAxis type="number" dataKey="y" domain={[0,5.5]} ticks={[1,2,3,4,5]} width={38} tick={{fill:N.muted,fontSize:10}} label={{value:'Yesmine',angle:-90,position:'insideLeft',offset:14,fill:N.mutedSoft,fontSize:10}}/>
              <ZAxis dataKey="n" range={[55,420]}/>
              <Tooltip content={function(pp){if(!pp.active||!pp.payload||!pp.payload.length)return null;var d=pp.payload[0].payload;return <div style={{background:N.paper,border:'0.5px solid '+N.borderStrong,borderRadius:4,padding:'8px 12px',fontSize:11,maxWidth:240}}><div style={{color:N.ink,fontWeight:500}}>Babylonian {d.x}★ · Yesmine {d.y}★</div><div style={{color:N.muted,marginTop:2}}>{d.n} {d.n===1?'film':'films'}</div><div style={{color:N.inkSoft,marginTop:4}}>{d.films.slice(0,4).join(', ')}{d.films.length>4?' +'+(d.films.length-4)+' more':''}</div></div>}}/>
              <ReferenceLine segment={[{x:0.5,y:0.5},{x:5,y:5}]} stroke={N.borderStrong} strokeDasharray="4 4"/>
              <Scatter data={yAnalysis.cells} fill={VIZ_MARK} fillOpacity={0.72} cursor="pointer"
                onClick={function(d){var c=(d&&d.payload)||d;if(c&&c.films)openDrill('Babylonian '+c.x+'\u2605 \u00b7 Yesmine '+c.y+'\u2605',c.films)}}/>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* THE SHAPE OF THE DISAGREEMENT — a mean gap of −0.20 could be everyone half a star
            apart or a handful of blazing rows. This says which. */}
        <div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4}}>
          <SectionHead T={N} title="Size of the disagreement" aside={<span className="text-xs" style={{color:N.muted}}>{yAnalysis.same} exact ties</span>}/>
          <div className="text-xs mb-2" style={{color:N.muted}}>Yesmine's rating minus Babylonian's. Bars left of zero are films Babylonian rated higher ({yAnalysis.bHigher}), right are Yesmine ({yAnalysis.yHigher}).</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yAnalysis.dist}>
              <CartesianGrid strokeDasharray="3 3" stroke={N.border}/>
              {/* No axis title: it landed on top of the legend, and the caption above already
                  says the bars are Yesmine's rating minus Babylonian's. */}
              <XAxis dataKey="label" tick={{fill:N.muted,fontSize:10}} height={28}/>
              <YAxis tick={{fill:N.muted,fontSize:10}} width={34}/>
              <Tooltip content={function(pp){if(!pp.active||!pp.payload||!pp.payload.length)return null;var d=pp.payload[0].payload;return <div style={{background:N.paper,border:'0.5px solid '+N.borderStrong,borderRadius:4,padding:'8px 12px',fontSize:11}}><div style={{color:N.ink,fontWeight:500}}>{d.count} {d.count===1?'film':'films'}</div><div style={{color:N.muted}}>{d.d===0?'rated identically':Math.abs(d.d)+'★ apart, '+(d.d>0?'Yesmine higher':'Babylonian higher')}</div></div>}}/>
              <Bar dataKey="count" radius={[3,3,0,0]} cursor="pointer"
                onClick={function(d){openDrill(d.d===0?'Rated identically':Math.abs(d.d)+'\u2605 apart \u00b7 '+(d.d>0?'Yesmine higher':'Babylonian higher'),d.films)}}>
                {yAnalysis.dist.map(function(d,i){return <Cell key={i} fill={d.d===0?NEUTRAL.mutedSoft:d.d>0?VIZ_SERIES[2]:VIZ_MARK}/>})}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-1 justify-center flex-wrap">
            <div className="flex items-center gap-1.5"><div style={{width:10,height:10,background:VIZ_MARK,borderRadius:4}}/><span className="text-xs" style={{color:N.muted}}>Babylonian higher</span></div>
            <div className="flex items-center gap-1.5"><div style={{width:10,height:10,background:NEUTRAL.mutedSoft,borderRadius:4}}/><span className="text-xs" style={{color:N.muted}}>tied</span></div>
            <div className="flex items-center gap-1.5"><div style={{width:10,height:10,background:VIZ_SERIES[2],borderRadius:4}}/><span className="text-xs" style={{color:N.muted}}>Yesmine higher</span></div>
          </div>
        </div>
      </div>}

      {/* WHERE THE TWO PART COMPANY — the bias broken out by genre, in the same diverging-bar
          form as the tag panel, because it answers the same shape of question. */}
      {yAnalysis.genres.length>0&&(function(){
        var gmax=Math.max.apply(null,yAnalysis.genres.map(function(g){return Math.abs(g.gap)}).concat([0.2]));
        return <div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4}}>
          <SectionHead T={N} title="Where the two part company" count={yAnalysis.genres.length} aside={<span className="text-xs" style={{color:N.muted}}>overall {(yAnalysis.bias>0?'+':'')+yAnalysis.bias.toFixed(2)}</span>}/>
          <div className="text-xs mb-3" style={{color:N.muted}}>Average gap by genre, Yesmine minus Babylonian, for genres with five or more shared films. Right of the line Yesmine is the more generous of the two.</div>
          <div className="space-y-1">
            {yAnalysis.genres.map(function(g){
              var pos=g.gap>=0,c=pos?VIZ_SERIES[2]:VIZ_MARK,w=Math.abs(g.gap)/gmax*50;
              return <div key={g.name} className="flex items-center gap-2 cursor-pointer" title={g.n+' shared films — click to list them'}
                onClick={function(){openDrill(g.name+' \u00b7 '+(g.gap>=0?'+':'')+g.gap.toFixed(2)+' Yesmine',g.films)}}>
                <div className="w-24 md:w-32 text-xs text-right truncate" style={{color:N.inkSoft}}>{g.name}</div>
                <div className="w-8 text-xs text-right" style={{color:N.mutedSoft}}>{g.n}</div>
                <div className="flex-1 relative" style={{height:22,background:N.surfaceAlt,borderRadius:4}}>
                  <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,background:N.borderStrong}}/>
                  <div style={{position:'absolute',top:5,height:12,borderRadius:2,background:c,left:(pos?50:50-w)+'%',width:Math.max(w,0.4)+'%'}}/>
                </div>
                <div className="w-12 text-xs text-right font-mono" style={{color:c,fontWeight:500}}>{(pos?'+':'')+g.gap.toFixed(2)}</div>
              </div>})}
          </div>
        </div>;
      })()}
      <div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4}}>
        <SectionHead T={N} title="Ratings side by side" aside={<div className="flex gap-1 flex-wrap"><button onClick={function(){sYSort(ySort==="dateNew"?"dateOld":"dateNew")}} style={(ySort==="dateNew"||ySort==="dateOld")?{padding:'3px 8px',fontSize:10,fontWeight:500,color:T.chartTextColor||NEUTRAL.ink,background:T.primary,border:'0.5px solid '+T.primary,borderRadius:4}:btnSecondary}>{ySort==="dateOld"?"Newest first":"Oldest first"}</button><button onClick={function(){sYSort(ySort==="agree"?"disagree":"agree")}} style={(ySort==="agree"||ySort==="disagree")?{padding:'3px 8px',fontSize:10,fontWeight:500,color:T.chartTextColor||NEUTRAL.ink,background:T.primary,border:'0.5px solid '+T.primary,borderRadius:4}:btnSecondary}>{ySort==="agree"?"Most divided":"Most aligned"}</button><button onClick={function(){sYSort(ySort==="myHigh"?"myLow":"myHigh")}} style={(ySort==="myHigh"||ySort==="myLow")?{padding:'3px 8px',fontSize:10,fontWeight:500,color:T.chartTextColor||NEUTRAL.ink,background:T.primary,border:'0.5px solid '+T.primary,borderRadius:4}:btnSecondary}>{ySort==="myHigh"?"Lowest rated":"Highest rated"}</button></div>}/>
        <div className="max-h-96 overflow-y-auto"><table className="w-full text-xs"><thead><tr style={{color:N.muted,borderBottom:'0.5px solid '+N.border}}><th className="text-left py-1.5" style={{fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>Film</th><th className="text-right py-1.5" style={{fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>Babylonian</th><th className="text-right py-1.5" style={{fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>Yesmine</th><th className="text-right py-1.5" style={{fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>Diff</th></tr></thead><tbody>{yFilms.slice().sort(function(a,b){if(ySort==="dateNew"||ySort==="date")return a.date>b.date?-1:1;if(ySort==="dateOld")return a.date<b.date?-1:1;if(ySort==="agree")return(a.diff===null?99:a.diff)-(b.diff===null?99:b.diff);if(ySort==="disagree")return(b.diff===null?-1:b.diff)-(a.diff===null?-1:a.diff);if(ySort==="myHigh")return(b.rating||0)-(a.rating||0);if(ySort==="myLow")return(a.rating||99)-(b.rating||99);return 0}).map(function(f,i){return <tr key={i} style={{borderBottom:'0.5px solid '+N.border}}><td className="py-1.5" style={{color:N.inkSoft}}>{f.name} <span style={{color:N.muted}}>({f.year})</span></td><td className="py-1.5 text-right" style={{color:f.rating!==null?N.ink:N.mutedSoft}}>{f.rating!==null?f.rating+'★':'—'}</td><td className="py-1.5 text-right" style={{color:typeof f.yRating==="number"?N.ink:N.mutedSoft}}>{typeof f.yRating==="number"?f.yRating+'★':(f.yRating||'—')}</td><td className="py-1.5 text-right" style={{color:f.diff!==null?N.ink:N.mutedSoft,fontWeight:f.diff!==null&&(f.diff<=0.5||f.diff>=2)?500:400}}>{f.diff!==null?f.diff.toFixed(1):'—'}</td></tr>})}</tbody></table></div>
      </div>
    </div>}

    {/* ===== TASTE ===== */}
    {tab==='taste'&&<div className="space-y-6">
      {/* The four summary tiles that used to open this tab are gone. Every one of them was
          restated within a screen: the average again in the distribution caption and again as
          the tag baseline, the five-star count as the 5-star bar, the top genre as the map's
          rightmost labelled dot, the top decade as the ribbon's widest segment. The tab opens
          on the distribution instead. */}
      {/* RATING DISTRIBUTION — moved from Overview */}
      <div>
        <SectionHead T={N} title="How the ratings fall" aside={<span className="text-xs" style={{color:N.muted}}>{statsOnce.films} films {'\u00B7'} average <span style={{color:T.primary,fontWeight:500}}>{statsOnce.avg.toFixed(2)}{'\u2605'}</span></span>}/>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={rDist}>
            <CartesianGrid strokeDasharray="3 3" stroke={N.border}/>
            <XAxis dataKey="rating" tick={{fill:N.muted,fontSize:11}}/>
            <YAxis tick={{fill:N.muted,fontSize:10}}/>
            <Tooltip content={function(p){return <CTooltip {...p} T={N}/>}}/>
            <Bar dataKey="count" name="Films" radius={[3,3,0,0]} cursor="pointer" onClick={function(d){sSR(function(p){return p===parseFloat(d.rating)?null:parseFloat(d.rating)})}}>
              {rDist.map(function(d,i){var r=parseFloat(d.rating),a=sR===r;return <Cell key={i} fill={rCT(r)} fillOpacity={sR!==null&&!a?0.2:0.95} stroke={a?N.ink:'none'} strokeWidth={a?1.5:0}/>})}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {sR!==null&&<FilmList T={N} title={sR+'\u2605'} films={selFilms} onClose={function(){sSR(null)}}/>}
      </div>

      {/* DECADES AS A RIBBON — a bar chart of decades sorts the empty ones out of existence.
          A continuous strip cannot: every decade from your earliest to your latest gets a
          slot, width carries the count, and the dashed gaps are the finding. */}
      <div>
        <SectionHead T={N} title="A century of film, decade by decade" aside={<span className="text-xs" style={{color:N.mutedSoft,fontStyle:'italic'}}>click a decade for the films</span>}/>
        <div className="flex gap-1 items-stretch" style={{height:54}}>
          {decRibbon.map(function(d){var on=sDe===d.label,empty=d.Films===0;
            return <div key={d.dec} onClick={function(){if(!empty){sSDe(on?null:d.label);sSTg(null)}}}
              title={empty?d.label+' — nothing watched':d.label+' — '+d.Films+' films, '+d.pct.toFixed(1)+'% of the collection'+(d.Avg?', '+d.Avg.toFixed(2)+'★':'')}
              style={{flexGrow:d.Films,flexBasis:empty?0:0,minWidth:empty?20:36,cursor:empty?'default':'pointer',
                background:empty?'transparent':VIZ_MARK,opacity:empty?1:(sDe&&!on?0.3:1),
                border:empty?'0.5px dashed '+N.borderStrong:'none',borderRadius:4,
                outline:on?'1.5px solid '+N.ink:'none',
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
              {!empty&&<span style={{fontSize:12,fontWeight:600,lineHeight:1,color:textOn(VIZ_MARK)}}>{d.Films}</span>}
              {!empty&&d.Avg>0&&<span style={{fontSize:9,marginTop:2,opacity:0.8,color:textOn(VIZ_MARK)}}>{d.Avg.toFixed(1)}{'★'}</span>}
            </div>})}
        </div>
        {/* The share sits in the label row rather than inside the segment: at 36px, the narrow
            decades have no room for a third line, but "2%" always fits. Anything under one per
            cent reads as "<1%" instead of a row of 0.1s that would all look identical. */}
        <div className="flex gap-1 mt-1">{decRibbon.map(function(d){var empty=d.Films===0;return <div key={d.dec} className="text-center" style={{flexGrow:d.Films,flexBasis:0,minWidth:empty?20:36,fontSize:9,color:empty?N.mutedSoft:N.muted,whiteSpace:'nowrap',overflow:'hidden'}}>
          <div>{empty?'’'+String(d.dec).slice(2):d.label}</div>
          {!empty&&<div style={{color:N.inkSoft,fontWeight:500,marginTop:1}}>{d.pct<1?'<1%':Math.round(d.pct)+'%'}</div>}
        </div>})}</div>
      </div>
      <FilmList T={N} title={sDe} films={decF} onClose={function(){sSDe(null)}}/>

      {/* The poster wall stood here. The map's Directors set holds the same 71 people with the
          same two numbers, so the wall was a second reading of one dataset -- and clicking a
          dot now opens the films directly, which is what the wall's rows were for. */}

      {/* THE TASTE MAP — the count-vs-rating pair of bar charts, collapsed into one plot.
          Reading two ranked lists against each other is work the reader should not have to
          do: here volume is one axis, verdict is the other, and the median crosshair turns
          the four corners into four different statements. */}
      <div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4}}>
        <SectionHead T={N} title="The taste map" count={quad.pts.length} aside={<div className="flex gap-1 flex-wrap">{QUAD_SETS.map(function(q){var a=quadSet===q.id;return <button key={q.id} onClick={function(){sQuadSet(q.id);cls()}} style={a?{padding:'3px 8px',fontSize:10,fontWeight:500,color:T.chartTextColor||NEUTRAL.ink,background:T.primary,border:'0.5px solid '+T.primary,borderRadius:4}:btnSecondary}>{q.l}</button>})}</div>}/>
        <div className="text-xs mb-3" style={{color:N.muted}}>Films seen against average rating{quadCfg.floor?', for '+quadCfg.floor:''}. Each film counts once, however often it was rewatched. The dashed crosshair marks the median on both axes. Click a dot for its films.</div>
        {quad.pts.length<3?<div className="text-xs py-8 text-center" style={{color:N.mutedSoft}}>Not enough rated films in this set yet.</div>:<div>
          {/* The quadrant captions sit OUTSIDE the plot, above and below it. Inside, they
              collided with any dot label near a corner — Alya, at three films and two stars,
              landed exactly on "few, and not the best" and ate half of it. Above-left still
              reads as up-and-to-the-left, so the mapping survives the move. */}
          <div className="flex justify-between" style={{paddingLeft:48,paddingRight:26,fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:N.mutedSoft}}><span>{qw.corners[0]}</span><span>{qw.corners[1]}</span></div>
          <ResponsiveContainer width="100%" height={330}>
            <ScatterChart margin={{top:18,right:24,bottom:24,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={N.border}/>
              <XAxis type="number" dataKey="Films" tick={{fill:N.muted,fontSize:10}} label={{value:'films seen',position:'insideBottom',offset:-14,fill:N.mutedSoft,fontSize:10}}/>
              <YAxis type="number" dataKey="Avg" domain={quad.yDom} width={46} tick={{fill:N.muted,fontSize:10}} tickFormatter={function(v){return v.toFixed(1)}} label={{value:'average rating',angle:-90,position:'insideLeft',offset:16,fill:N.mutedSoft,fontSize:10}}/>
              <ZAxis range={[70,70]}/>
              <Tooltip content={function(p){if(!p.active||!p.payload||!p.payload.length)return null;var d=p.payload[0].payload;var hv=d.Films>=quad.mx,hr=d.Avg>=quad.my;var verdict=hv&&hr?qw.hh:hv?qw.hl:hr?qw.lh:qw.ll;return <div style={{background:N.paper,border:'0.5px solid '+N.borderStrong,borderRadius:4,padding:'8px 12px',fontSize:11}}><div style={{color:N.ink,fontWeight:500}}>{d.name}</div><div style={{color:N.inkSoft,marginTop:2}}>{d.Films} films {'·'} {d.Avg.toFixed(2)}{'★'}</div><div style={{color:N.muted,marginTop:2}}>{verdict}</div></div>}}/>
              <ReferenceLine x={quad.mx} stroke={N.borderStrong} strokeDasharray="4 4"/>
              <ReferenceLine y={quad.my} stroke={N.borderStrong} strokeDasharray="4 4"/>
              <Scatter data={quad.plain} fill={VIZ_MARK} fillOpacity={0.7} cursor="pointer" onClick={function(d){quadPick(d&&d.payload?d.payload.name:d&&d.name)}}/>
              <Scatter data={quad.labeled} fill={VIZ_MARK} cursor="pointer" onClick={function(d){quadPick(d&&d.payload?d.payload.name:d&&d.name)}}>
                <LabelList dataKey="name" position="top" offset={9} style={{fill:NEUTRAL.inkSoft,fontSize:10}}/>
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex justify-between" style={{paddingLeft:48,paddingRight:26,fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:N.mutedSoft}}><span>{qw.corners[2]}</span><span>{qw.corners[3]}</span></div>
        </div>}
      </div>
      {/* Four of the six sets no longer have a panel further down the tab, so the map carries
          its own list. Directors and decades are excluded: the poster wall and the ribbon are
          right there and already show the selection, and two identical lists is worse than one
          in the wrong place. */}
      {quadCfg.ownList&&<FilmList T={N} title={quadSelName?quadSelName+(quadSet==='friend'?' — watched together':''):null} films={quadFilms} onClose={function(){cls()}}/>}

      {/* Genres, Cast and Countries had ranked tables here. The taste map says everything they
          said and puts it on two axes instead of one, so they were the same numbers twice.
          Tags keeps its table: it is the one set that is not a partition of the collection. */}
      <div className="lg:w-2/3 mx-auto space-y-6">
      <div>
        <SectionHead T={N} title="What a tag is worth" count={tagLift.rows.length} aside={<span className="text-xs" style={{color:N.muted}}>baseline <span style={{color:T.primary,fontWeight:500}}>{tagLift.base.toFixed(2)}{'\u2605'}</span></span>}/>
        <div className="text-xs mb-3" style={{color:N.muted}}>How far the films carrying a tag sit from the overall average. Right of the line is above it, left is below. {tagLift.untagged} of {efOnce.length} films carry no tag at all, so this describes a minority of the collection. Click a tag for its films.</div>
        <div className="space-y-1">
          {tagLift.rows.map(function(r){
            var pos=r.lift>=0,c=pos?VIZ_GOOD:NEG,w=Math.abs(r.lift)/tagLift.max*50,thin=r.Films<15,on=sTg===r.name;
            return <div key={r.tag} onClick={function(){sSTg(on?null:r.name);sSDe(null)}} className="flex items-center gap-2 cursor-pointer py-0.5 px-1"
              title={thin?r.Films+' films only \u2014 treat this one lightly':r.Films+' films'}
              style={{borderRadius:4,background:on?N.surfaceAlt:'transparent',boxShadow:on?'inset 0 0 0 1px '+T.primary:'none'}}>
              <div className="w-24 md:w-32 text-xs text-right truncate" style={{color:N.inkSoft}}>{r.name}</div>
              <div className="w-8 text-xs text-right" style={{color:N.mutedSoft}}>{r.Films}</div>
              <div className="flex-1 relative" style={{height:24,background:N.surfaceAlt,borderRadius:4}}>
                <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,background:N.borderStrong}}/>
                <div style={{position:'absolute',top:5,height:14,borderRadius:2,background:c,opacity:thin?0.55:1,
                  left:(pos?50:50-w)+'%',width:Math.max(w,0.4)+'%'}}/>
              </div>
              <div className="w-12 text-xs text-right font-mono" style={{color:N.ink}}>{r.Avg.toFixed(2)}{'\u2605'}</div>
              <div className="w-12 text-xs text-right font-mono" style={{color:c,fontWeight:500}}>{(pos?'+':'')+r.lift.toFixed(2)}</div>
            </div>})}
        </div>
        <div className="flex mt-1"><div className="w-24 md:w-32"/><div className="w-8"/><div className="flex-1 flex justify-between" style={{fontSize:9,color:N.mutedSoft}}><span>{'\u2212'}{tagLift.max.toFixed(2)}</span><span>{tagLift.base.toFixed(2)}{'\u2605'}</span><span>+{tagLift.max.toFixed(2)}</span></div><div className="w-12"/><div className="w-12"/></div>
      </div>
      <FilmList T={N} title={sTg} films={tagF} onClose={function(){sSTg(null)}}/>
      </div>

      {/* ===== SECOND THOUGHTS =====
          A different subject from everything above — not what you like, but where your own
          record disagrees with itself — so it gets a visible break rather than sitting in
          the same run of panels. Deliberately ignores the year filter: a change of mind
          belongs to the whole history. */}
      <div className="pt-5" style={{borderTop:'1px solid '+N.borderStrong}}>
        <div style={{fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:N.muted}}>Second thoughts {'·'} all time</div>
        <div className="text-xs mt-1" style={{color:N.mutedSoft}}>The rating logged on the night, against the rating the film holds today</div>
      </div>

      {!allRatings.length?<div className="p-4 text-xs" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4,color:N.muted}}>No ratings export loaded. Import your Letterboxd folder again — <span style={{color:N.inkSoft}}>ratings.csv</span> is what holds your current score for each film, and everything in this section is the gap between it and the diary.</div>:<div className="space-y-6">

        <div className="grid grid-cols-2 md:grid-cols-4" style={{borderTop:'0.5px solid '+N.border,borderBottom:'0.5px solid '+N.border}}>
          <Stat T={N} label="Films re-scored" value={revisions.rows.length} sub={revisions.up.length+' up, '+revisions.down.length+' down'}/>
          <Stat T={N} label="Net drift" value={(revisions.net>0?'+':'')+revisions.net.toFixed(2)} sub="average change" color={revisions.net>0?VIZ_GOOD:revisions.net<0?NEG:N.ink}/>
          {/* The figure is the value and the title is the caption, not the other way round:
              a three-line film name in the 20px slot threw the whole row out of alignment. */}
          <Stat T={N} label="Biggest riser" value={revisions.riser?'+'+revisions.riser.delta.toFixed(1)+'★':'—'} sub={revisions.riser?revisions.riser.name+' ('+revisions.riser.from+'→'+revisions.riser.to+')':''} color={VIZ_GOOD}/>
          <Stat T={N} label="Biggest faller" value={revisions.faller?revisions.faller.delta.toFixed(1)+'★':'—'} sub={revisions.faller?revisions.faller.name+' ('+revisions.faller.from+'→'+revisions.faller.to+')':''} color={NEG} noBorder/>
        </div>

        {/* SLOPE CHART — two dots and a line beat two bars: the reader sees direction and
            distance in one mark, and the rows sort by how much the mind moved. */}
        {revisions.rows.length>0&&<div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4}}>
          <SectionHead T={N} title="Changes of heart" count={revisions.rows.length}/>
          <div className="text-xs mb-3" style={{color:N.muted}}>Each line runs from the first rating logged to the rating held now. <span style={{color:MOVE_UP}}>Green climbed</span>, <span style={{color:MOVE_DOWN}}>orange fell</span>. The hollow dot is the original.</div>
          <div className="space-y-1">
            {revisions.rows.slice(0,revOpen?revisions.rows.length:12).map(function(r,i){
              var up=r.delta>0,c=up?MOVE_UP:MOVE_DOWN,pc=function(v){return((v-0.5)/4.5)*100};
              var a=Math.min(pc(r.from),pc(r.to)),b=Math.max(pc(r.from),pc(r.to));
              return <div key={i} className="flex items-center gap-2">
                <div className="w-24 md:w-44 text-xs truncate text-right" title={r.name+' ('+r.year+') — '+r.how} style={{color:N.inkSoft}}>{r.name}</div>
                <div className="flex-1 relative" style={{height:22,background:N.surfaceAlt,borderRadius:4}}>
                  <div style={{position:'absolute',top:10,left:a+'%',width:(b-a)+'%',height:2,background:c}}/>
                  <div title={'was '+r.from+'★'} style={{position:'absolute',top:6,left:'calc('+pc(r.from)+'% - 5px)',width:10,height:10,borderRadius:'50%',background:N.surfaceAlt,border:'1.5px solid '+N.borderStrong}}/>
                  <div title={'now '+r.to+'★'} style={{position:'absolute',top:6,left:'calc('+pc(r.to)+'% - 5px)',width:10,height:10,borderRadius:'50%',background:c}}/>
                </div>
                <div className="w-12 text-xs text-right font-mono" style={{color:c,fontWeight:500}}>{(up?'+':'')+r.delta.toFixed(1)}</div>
                <div className="w-16 text-xs text-right" style={{color:N.mutedSoft}}>{r.how}</div>
              </div>})}
          </div>
          {/* Ticks are placed at their true position on the 0.5-5 track. Spacing them evenly
              with justify-between put 1★ at 20% of the width when it belongs at 11%, which
              mislabelled every dot on the scale. */}
          <div className="flex mt-1"><div className="w-24 md:w-44"/><div className="flex-1 relative" style={{height:12}}>{[0.5,1,2,3,4,5].map(function(v){var l=((v-0.5)/4.5)*100;return <span key={v} style={{position:'absolute',left:l+'%',transform:'translateX('+(v===0.5?'0':v===5?'-100%':'-50%')+')',fontSize:9,color:N.mutedSoft,whiteSpace:'nowrap'}}>{v}{'★'}</span>})}</div><div className="w-12"/><div className="w-16"/></div>
          {revisions.rows.length>12&&<button onClick={function(){sRevOpen(function(v){return!v})}} className="w-full text-xs py-1.5 mt-3" style={{color:N.muted,background:'transparent',border:'0.5px solid '+N.border,borderRadius:4,cursor:'pointer'}}>{revOpen?'Show fewer':'Show all '+revisions.rows.length}</button>}
        </div>}

        {revisions.pairs.length>2&&<div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4}}>
          <SectionHead T={N} title="Does a second viewing help?" count={revisions.drift.length}/>
          <div className="text-xs mb-2" style={{color:N.muted}}>First rating across, most recent up, for every film rated more than once. Above the diagonal the rating rose on a rewatch; below it, it fell. Bigger dots hold more films.</div>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{top:10,right:20,bottom:20,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={N.border}/>
              <XAxis type="number" dataKey="x" domain={[0,5.5]} ticks={[1,2,3,4,5]} tick={{fill:N.muted,fontSize:10}} label={{value:'first rating',position:'insideBottom',offset:-12,fill:N.mutedSoft,fontSize:10}}/>
              <YAxis type="number" dataKey="y" domain={[0,5.5]} ticks={[1,2,3,4,5]} width={38} tick={{fill:N.muted,fontSize:10}} label={{value:'latest',angle:-90,position:'insideLeft',offset:14,fill:N.mutedSoft,fontSize:10}}/>
              <ZAxis dataKey="n" range={[55,420]}/>
              <Tooltip content={function(p){if(!p.active||!p.payload||!p.payload.length)return null;var d=p.payload[0].payload;return <div style={{background:N.paper,border:'0.5px solid '+N.borderStrong,borderRadius:4,padding:'8px 12px',fontSize:11,maxWidth:240}}><div style={{color:N.ink,fontWeight:500}}>{d.x}{'★'} {'→'} {d.y}{'★'}</div><div style={{color:N.muted,marginTop:2}}>{d.n} {d.n===1?'film':'films'}</div><div style={{color:N.inkSoft,marginTop:4}}>{d.films.slice(0,4).join(', ')}{d.films.length>4?' +'+(d.films.length-4)+' more':''}</div></div>}}/>
              <ReferenceLine segment={[{x:0.5,y:0.5},{x:5,y:5}]} stroke={N.borderStrong} strokeDasharray="4 4"/>
              <Scatter data={revisions.pairs} fill={VIZ_MARK} fillOpacity={0.72} cursor="pointer"
                onClick={function(d){var c=(d&&d.payload)||d;if(c&&c.films)openDrill(c.x+'\u2605 then '+c.y+'\u2605',c.films)}}/>
            </ScatterChart>
          </ResponsiveContainer>
        </div>}

        {preDist.preN>0&&(function(){var sc=seriesColors();return <div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4}}>
          <SectionHead T={N} title="The shelf before the diary" count={preDist.preN} aside={<span className="text-xs" style={{color:N.muted}}>{preDist.preAvg.toFixed(2)}{'★'} unlogged {'·'} {preDist.diaryAvg.toFixed(2)}{'★'} logged</span>}/>
          <div className="text-xs mb-2" style={{color:N.muted}}>{preDist.preN} films carry a rating but no diary entry at all — watched before the diary began. Plotted as a share of each set rather than a count, since the two are nowhere near the same size.</div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={preDist.data}>
              <CartesianGrid strokeDasharray="3 3" stroke={N.border}/>
              <XAxis dataKey="rating" tick={{fill:N.muted,fontSize:11}}/>
              <YAxis tick={{fill:N.muted,fontSize:10}} tickFormatter={function(v){return Math.round(v)+'%'}}/>
              <Tooltip content={function(p){if(!p.active||!p.payload||!p.payload.length)return null;return <div style={{background:N.paper,border:'0.5px solid '+N.borderStrong,borderRadius:4,padding:'8px 12px',fontSize:11}}><div style={{color:N.ink,fontWeight:500,marginBottom:4}}>{p.label}{'★'}</div>{p.payload.map(function(x,i){return <div key={i} style={{color:x.color}}>{x.name}: {x.value.toFixed(1)}%</div>})}</div>}}/>
              <Bar dataKey="logged" name="Logged in the diary" fill={sc[1]} radius={[3,3,0,0]} cursor="pointer"
                onClick={function(d){openDrill(d.rating+'\u2605 \u00b7 logged in the diary',d.loggedFilms)}}/>
              <Bar dataKey="pre" name="Rated, never logged" fill={sc[2]} radius={[3,3,0,0]} cursor="pointer"
                onClick={function(d){openDrill(d.rating+'\u2605 \u00b7 rated, never logged',d.preFilms)}}/>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center"><div className="flex items-center gap-1.5"><div style={{width:10,height:10,background:sc[1],borderRadius:4}}/><span className="text-xs" style={{color:N.muted}}>Logged in the diary</span></div><div className="flex items-center gap-1.5"><div style={{width:10,height:10,background:sc[2],borderRadius:4}}/><span className="text-xs" style={{color:N.muted}}>Rated, never logged</span></div></div>
        </div>})()}

        {inflation.data.length>10&&<div className="p-4" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4}}>
          <SectionHead T={N} title="Growing more generous?" aside={<span className="text-xs" style={{color:N.muted}}>mean of every rating given, {inflation.mean.toFixed(2)}{'★'}</span>}/>
          <div className="text-xs mb-2" style={{color:N.muted}}>A rolling average of the last {inflation.w} ratings given, in the order they were logged. A yearly average flattens this; {inflation.w} is wide enough that one generous week does not move the line. This is the one panel counted per watch at the rating typed on the night, because the question is how the scoring itself moved -- which is why its mean sits above the {statsOnce.avg.toFixed(2)}{'★'} quoted elsewhere, where each film counts once at today's score. Hovering near a turning point snaps to it, so the tooltip reads the exact peak or trough rather than a neighbour a pixel away.</div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={inflation.data} onClick={function(st){
              // Two ways in, because a Line reports the series rather than a point. The chart state
              // exposes the hovered index even where activePayload is absent, and the active dot —
              // the one the tooltip is already tracking — carries its own payload. Whichever
              // arrives first wins; openDrill ignores an empty list.
              var d=(st&&st.activePayload&&st.activePayload[0]&&st.activePayload[0].payload)
                ||(st&&st.activeTooltipIndex!=null?inflation.data[st.activeTooltipIndex]:null);
              if(d)openDrillWindow(d);
            }} style={{cursor:'pointer'}}>
              <CartesianGrid strokeDasharray="3 3" stroke={N.border}/>
              <XAxis dataKey="d" tick={{fill:N.muted,fontSize:9}} interval={Math.max(0,Math.floor(inflation.data.length/8))} angle={-45} textAnchor="end" height={46}/>
              <YAxis domain={[function(v){return Math.floor(v*10)/10-0.05},function(v){return Math.ceil(v*10)/10+0.05}]} width={40} tick={{fill:N.muted,fontSize:10}} tickFormatter={function(v){return v.toFixed(1)}}/>
              <Tooltip content={function(pp){if(!pp.active||!pp.payload||!pp.payload.length)return null;var d=pp.payload[0].payload;
                return <div style={{background:N.paper,border:'0.5px solid '+N.borderStrong,borderRadius:4,padding:'8px 12px',fontSize:11,maxWidth:260}}>
                  <div style={{color:d.ext?(d.ext==='max'?VIZ_GOOD:NEG):N.ink,fontWeight:500}}>{d.avg.toFixed(2)}{'\u2605'} rolling average{d.ext?(d.ext==='max'?' \u00b7 local peak':' \u00b7 local low'):''}</div>
                  <div style={{color:N.muted,marginTop:2}}>after {d.name} ({d.year}) {'\u00b7'} {d.date}</div>
                  <div style={{color:N.mutedSoft,marginTop:2}}>that film scored {d.rating}{'\u2605'} {'\u00b7'} click for the {inflation.w} behind this point</div>
                </div>}}/>
              <ReferenceLine y={inflation.mean} stroke={N.borderStrong} strokeDasharray="4 4"/>
              <Line type="monotone" dataKey="avg" name="Rolling average" stroke={VIZ_MARK} strokeWidth={2}
                dot={false}
                activeDot={{r:4,fill:VIZ_MARK,cursor:'pointer',onClick:function(a,b){var d=(a&&a.payload)||(b&&b.payload);if(d)openDrillWindow(d)}}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>}
      </div>}
    </div>}

    {/* ===== RANKINGS ===== */}
    {tab==='rankings'&&<div className="space-y-8">
      {top50Evo.years.length>0&&(function(){
        // Chronological for the arithmetic, reversed for the display: the current rank is what a
        // reader looks for first, so it sits in the first column. Movement still compares a year
        // against the one BEFORE it in time, not against the column to its left, which after the
        // reversal is the year after.
        var yrs2=top50Evo.years;
        var cols=yrs2.slice().reverse();
        var prevYearOf=function(y){var ci=yrs2.indexOf(y);return ci>0?yrs2[ci-1]:null};
        var moveOf=function(fi){var py=prevYearOf(top50Evo.last);var r=fi.ranks[top50Evo.last],prev=py!==null?fi.ranks[py]:null;
          return{r:r,prev:prev,move:r&&prev?(prev-r):null,isNew:!!(r&&!prev&&py!==null)}};
        var rows=function(list){return list.map(function(fi,i){
          var inLatest=fi.ranks[top50Evo.last]!==undefined;
          return <tr key={i} style={{borderBottom:'0.5px solid '+N.border}}>
            <td className="py-1.5" style={{color:N.inkSoft}}><span className="flex items-center gap-2"><Poster meta={gMeta(fi)} w={22}/>{fi.name} <span style={{color:N.muted}}>({fi.year})</span></span></td>
            {cols.map(function(y){
              var ci=yrs2.indexOf(y),py=ci>0?yrs2[ci-1]:null;
              var r=fi.ranks[y],prev=py!==null?fi.ranks[py]:null;
              var move=r&&prev?(prev-r):null,isNew=r&&!prev&&py!==null,isOut=!r&&prev;
              return <td key={y} className="py-1.5 text-center"><div className="flex items-center justify-center gap-0.5">
                {r?<span style={{fontWeight:500,color:N.ink}}>{r}</span>:isOut?<span className="text-xs" style={{color:MOVE_DOWN}}>OUT</span>:<span style={{color:N.mutedSoft}}>{'—'}</span>}
                {r&&py!==null&&(isNew?<span className="ml-0.5" style={{fontSize:10,color:MOVE_NEW,fontWeight:500}}>NEW</span>
                  :move!==null?<span className="ml-0.5" style={{fontSize:10,color:move>0?MOVE_UP:move<0?MOVE_DOWN:N.mutedSoft}}>{move>0?'▲'+move:move<0?'▼'+Math.abs(move):'='}</span>:null)}
              </div></td>})}
            {!inLatest&&<td className="py-1.5 text-right whitespace-nowrap" style={{color:N.mutedSoft,fontSize:10}}>left at {'#'+fi.lastRank}</td>}
          </tr>})};
        var head=function(extra){return <thead><tr style={{color:N.muted,borderBottom:'0.5px solid '+N.border}}>
          <th className="text-left py-2" style={{fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>Film</th>
          {cols.map(function(y){return <th key={y} className="text-center py-2" style={{width:80,fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>{y}</th>})}
          {extra&&<th className="text-right py-2" style={{fontWeight:400,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>Last rank</th>}
        </tr></thead>};

        // What changed this year, as four counts. Fifty rows of arrows is a lot to add up by eye.
        var moves=top50Evo.current.map(moveOf);
        // No "dropped out": the list is a fixed fifty, so departures always equal new entries
        // and printing both said the same number twice.
        var summary=[
          {l:'climbed',n:moves.filter(function(m){return m.move>0}).length,c:MOVE_UP},
          {l:'slipped',n:moves.filter(function(m){return m.move<0}).length,c:MOVE_DOWN},
          {l:'new entries',n:moves.filter(function(m){return m.isNew}).length,c:MOVE_NEW},
          {l:'unmoved',n:moves.filter(function(m){return m.move===0}).length,c:N.mutedSoft}
        ];

        // The four films the year actually turned on. The summary counts how much moved; these
        // name what moved furthest, which is the part worth reading.
        var py=prevYearOf(top50Evo.last);
        var moved=top50Evo.current.map(function(fi){return{fi:fi,m:moveOf(fi)}}).filter(function(x){return x.m.move!==null});
        var climber=moved.filter(function(x){return x.m.move>0}).sort(function(a,b){return b.m.move-a.m.move})[0];
        var faller=moved.filter(function(x){return x.m.move<0}).sort(function(a,b){return a.m.move-b.m.move})[0];
        var entrant=top50Evo.current.filter(function(fi){return moveOf(fi).isNew})
          .sort(function(a,b){return a.ranks[top50Evo.last]-b.ranks[top50Evo.last]})[0];
        // Highest departure is measured from the rank it held last year, not the rank it once
        // reached: what matters is how far up the list it was when it fell off.
        var departed=py===null?null:top50Evo.gone.filter(function(f){return f.ranks[py]!==undefined})
          .sort(function(a,b){return a.ranks[py]-b.ranks[py]})[0];
        var titleOf=function(f){return f.name+' ('+f.year+')'};
        var highlights=[
          climber&&{l:'Biggest climber',v:'\u25B2'+climber.m.move,c:MOVE_UP,sub:titleOf(climber.fi),note:climber.m.prev+' \u2192 '+climber.m.r},
          entrant&&{l:'Highest new entry',v:'#'+entrant.ranks[top50Evo.last],c:MOVE_NEW,sub:titleOf(entrant),note:'straight in'},
          faller&&{l:'Biggest fall',v:'\u25BC'+Math.abs(faller.m.move),c:MOVE_DOWN,sub:titleOf(faller.fi),note:faller.m.prev+' \u2192 '+faller.m.r},
          departed&&{l:'Highest departure',v:'#'+departed.ranks[py],c:NEUTRAL.mutedSoft,sub:titleOf(departed),note:'off the list'}
        ].filter(Boolean);

        return <div className="space-y-8">
          <div>
            <SectionHead T={N} title={'The current list'} count={top50Evo.current.length} aside={<div className="flex gap-1"><button onClick={function(){sTopAsList(function(v){return!v})}} style={btnSecondary}>{topAsList?'As posters':'As table'}</button></div>}/>
            {/* The year-on-year churn in one line, so the wall below can be read for pleasure
                rather than arithmetic. */}
            <div className="flex flex-wrap gap-x-5 gap-y-1 mb-4 text-xs" style={{color:N.muted}}>
              <span>In {top50Evo.last}:</span>
              {summary.map(function(x){return <span key={x.l}><span style={{color:x.c,fontWeight:500}}>{x.n}</span> {x.l}</span>})}
            </div>
            {highlights.length>0&&<div className="grid grid-cols-2 md:grid-cols-4 mb-5" style={{borderTop:'0.5px solid '+N.border,borderBottom:'0.5px solid '+N.border}}>
              {highlights.map(function(h,hi){return <div key={h.l} className="px-4 py-3" style={{borderRight:hi===highlights.length-1?'none':'0.5px solid '+N.border}}>
                <div className="mb-1.5" style={{fontSize:9,letterSpacing:'0.15em',color:N.muted,textTransform:'uppercase'}}>{h.l}</div>
                <div style={{fontSize:20,fontWeight:500,lineHeight:1,color:h.c,fontVariantNumeric:'tabular-nums'}}>{h.v}</div>
                <div className="mt-1.5" style={{fontSize:11,color:N.inkSoft,lineHeight:1.35}}>{h.sub}</div>
                <div style={{fontSize:10,color:N.mutedSoft,marginTop:2}}>{h.note}</div>
              </div>})}
            </div>}
            {/* Ten across, because 50 divides by it: five full rows rather than four and an
                orphan. The crowding was mostly the gutter, so that doubles while the poster
                itself only comes down a little. */}
            {topAsList
              ? <div className="overflow-x-auto"><div style={{minWidth:380}}><table className="w-full text-xs">{head(false)}<tbody>{rows(top50Evo.current)}</tbody></table></div></div>
              : <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-x-6 gap-y-7">
                  {top50Evo.current.map(function(fi){
                    var m=moveOf(fi);
                    // The guard has to be a boolean. `m.isNew||m.move` yields the NUMBER 0 for a
                    // film that held its rank, and React renders a literal 0.
                    var moved=m.isNew||m.move!==null;
                    var mc=m.isNew?MOVE_NEW:m.move>0?MOVE_UP:m.move<0?MOVE_DOWN:NEUTRAL.mutedSoft;
                    return <div key={fi.name+fi.year} title={fi.name+' ('+fi.year+')'+(m.prev?' — was #'+m.prev+' in '+prevYearOf(top50Evo.last):'')}>
                      {/* The poster fills the cell, so anything pinned to an edge sits on the
                          image rather than in the gutter between two of them. */}
                      <div style={{position:'relative',lineHeight:0}}>
                        <Poster meta={gMeta(fi)} fill/>
                        {/* Movement as a filled pill on the artwork, ringed in the page colour so
                            it reads against a busy poster. */}
                        {moved&&<div style={{position:'absolute',top:5,right:5,minWidth:18,height:18,borderRadius:999,
                          background:mc,color:textOn(mc),fontSize:9,fontWeight:700,padding:'0 5px',
                          display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1,
                          boxShadow:'0 0 0 1.5px '+NEUTRAL.paper}}>
                          {m.isNew?'NEW':m.move>0?'▲'+m.move:m.move<0?'▼'+Math.abs(m.move):'='}</div>}
                      </div>
                      {/* Rank under the poster rather than over it: nothing is hidden, and the
                          number sits closer to its own film than to any neighbour. */}
                      <div style={{fontSize:11,fontWeight:600,color:N.inkSoft,textAlign:'center',marginTop:6,
                        lineHeight:1.2,fontVariantNumeric:'tabular-nums'}}>{m.r}</div>
                    </div>})}
                </div>}
          </div>
          {top50Evo.gone.length>0&&<div>
            <SectionHead T={N} title="Gone, not forgotten" count={top50Evo.gone.length}/>
            <div className="text-xs mb-2" style={{color:N.muted}}>On the list once, not on the current one. Most recently dropped first.</div>
            <div className="overflow-x-auto"><div style={{minWidth:380}}><table className="w-full text-xs">{head(true)}<tbody>{rows(top50Evo.gone)}</tbody></table></div></div>
          </div>}
        </div>;
      })()}
    </div>}

    {tab==='costs'&&(isAdmin?<div className="space-y-6">
      {costView(subsEditorCard)}<DQPanel T={N} data={dq}/>
    </div>:costView(null))}

    {/* ===== TAGS (admin) ===== */}
    {tab==='tags'&&isAdmin&&<div className="space-y-4">
      <input style={Object.assign({},inputStyle,{width:'100%'})} placeholder="Filter tags..." value={tagSearch} onChange={function(e){sTagSearch(e.target.value)}}/>
      {CATS.map(function(cat){var tags=tagGroupedDash[cat];if(!tags||!tags.length)return null;return <div key={cat} className="p-4 mb-3" style={{background:N.surface,border:'0.5px solid '+N.border,borderRadius:4}}><div style={{fontSize:13,fontWeight:500,color:N.inkSoft,marginBottom:8}}>{CI[cat].l} ({tags.length})</div><div className="space-y-0 max-h-64 overflow-y-auto">{tags.map(function(t){return renderTagRow(t,false)})}</div></div>})}
    </div>}
    </TabErrorBoundary>

    <div className="mt-12 pt-4 text-center" style={{borderTop:'0.5px solid '+N.border}}><div style={{fontSize:10,letterSpacing:'0.2em',color:N.mutedSoft,textTransform:'uppercase',fontFamily:fontLabel}}>Babylonian's Letterboxd · {T.name}</div></div>
  </div></div>);
}
