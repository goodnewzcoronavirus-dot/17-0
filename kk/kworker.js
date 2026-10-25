// Kokoro TTS worker for Gridiron Retro: voices player and team names on the viewer's machine.
// Everything it needs is served next to the page (model and runtime split into chunks), so it works
// even where the page can't reach outside sites.
let tts=null;
const nativeFetch=self.fetch.bind(self);
async function assemble(urls){const parts=[];for(const u of urls){const r=await nativeFetch(u);if(!r.ok)throw new Error('chunk '+u.split('/').pop()+' '+r.status);parts.push(await r.arrayBuffer())}
  const n=parts.reduce((a,b)=>a+b.byteLength,0),out=new Uint8Array(n);let o=0;for(const p of parts){out.set(new Uint8Array(p),o);o+=p.byteLength}return out}
self.onmessage=async e=>{const m=e.data;
  if(m.type==='init'){try{
      const memo={};const once=(k,f)=>memo[k]||(memo[k]=f());
      self.fetch=async(u,o)=>{const s=String(u&&u.url||u);
        const hm=s.match(/Kokoro-82M-v1\.0-ONNX\/resolve\/main\/(.+?)(\?.*)?$/);
        if(hm){const f=hm[1];if(f==='onnx/model_quantized.onnx'){const b=await once('model',()=>assemble(m.chunks.model));return new Response(b,{status:200,headers:{'content-type':'application/octet-stream','content-length':String(b.byteLength)}})}
          if(m.files[f])return nativeFetch(m.files[f],o);}
        if(/ort-wasm-simd-threaded\.jsep\.wasm/.test(s)){const b=await once('wasm',()=>assemble(m.chunks.wasm));return new Response(b,{status:200,headers:{'content-type':'application/wasm','content-length':String(b.byteLength)}})}
        return nativeFetch(u,o)};
      const {KokoroTTS,env}=await import(m.kokoroUrl);env.wasmPaths=m.wasmBase;
      let last=-1;tts=await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX',{dtype:'q8',device:'wasm',progress_callback:p=>{if(p&&p.status==='progress'&&/model/.test(p.file||'')){const pct=Math.round(p.progress||0);if(pct!==last){last=pct;postMessage({type:'progress',pct})}}}});
      postMessage({type:'ready'})}catch(err){postMessage({type:'error',msg:String(err&&err.message||err)})}return}
  if(m.type==='say'){try{const a=await tts.generate(m.text,{voice:m.voice,speed:m.speed});const pcm=a.audio instanceof Float32Array?a.audio:new Float32Array(a.audio);postMessage({type:'audio',id:m.id,pcm,sr:a.sampling_rate},[pcm.buffer])}
    catch(err){postMessage({type:'fail',id:m.id,msg:String(err&&err.message||err)})}}};
