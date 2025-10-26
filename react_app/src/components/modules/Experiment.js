import React, { useCallback, useEffect, useRef, useState } from "react";
import { uploadImageToDrive } from "../utils/googleDriveUtils";
import '../css/experiment.css'; // Assuming you have some styles for this component
/**
 * React Inpaint Studio
 * - Upload a base image
 * - Paint a mask on a canvas (white = inpaint area)
 * - Erase mode, brush size, invert, clear, download mask
 * - Preview overlay, send to Stable Diffusion WebUI (Automatic1111) /sdapi/v1/img2img
 *
 * Notes
 * 1) For CORS: run your React dev server with a proxy to SD WebUI (default http://127.0.0.1:7860)
 *    Example (Vite):
 *    // vite.config.js
 *    import { defineConfig } from 'vite'
 *    import react from '@vitejs/plugin-react'
 *    export default defineConfig({
 *      plugins: [react()],
 *      server: { proxy: { "/sdapi": { target: "http://127.0.0.1:7860", changeOrigin: true } } }
 *    })
 *
 * 2) SD settings you may want to adjust on the UI side:
 *    - inpainting_fill: 0=fill, 1=original, 2=latent noise, 3=latent nothing
 *    - inpaint_full_res: boolean
 *    - inpaint_full_res_padding: pixels
 *    - inpainting_mask_invert: 0 keep black / paint white, 1 invert
 *    - mask_blur: pixels
 *    - denoising_strength: 0..1
 */
const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const FOLDER_ID = process.env.REACT_APP_FOLDER_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive';

// GIS state
let gisTokenClient = null;
let accessToken = null;


export default function Experiment({ sdApiBase = "http://127.0.0.1:7860/sdapi/v1" }) {
  const painting = useRef(false);
  const [imgFile, setImgFile] = useState(null);
  const [imgUrl, setImgUrl] = useState("");
  const [parentFolderId, setParentFolderId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [negPrompt, setNegPrompt] = useState("EasyNegative, deformed mutated disfigured, missing arms, 4 fingers, 6 fingers,extra_arms , mutated hands, bad anatomy, disconnected limbs, low quality, worst quality, out of focus, ugly,　error, blurry, bokeh, Shoulder bag, bag, multiple arms, nsfw.");
  const [steps, setSteps] = useState(30);
  const [cfgScale, setCfgScale] = useState(7);
  const [denoise, setDenoise] = useState(0.5);
  const [sampler, setSampler] = useState("Euler a");
  const [seed, setSeed] = useState(-1);
  const [isUploading, setIsUploading] = useState(false);
  const [brushSize, setBrushSize] = useState(120);
  const [eraseMode, setEraseMode] = useState(false);
  const [maskBlur, setMaskBlur] = useState(4);
  const [invertMaskParam, setInvertMaskParam] = useState(0); // 0 or 1 for A1111

  const [sending, setSending] = useState(false);
  const [resultImages, setResultImages] = useState([]);
  const [checkpoint, setCheckpoint] = useState("None");
  const [useCanny, setUseCanny] = useState(true);
  const [useDepth, setUseDepth] = useState(false);
  const [useLineArt, setUseLineArt] = useState(false);
  const [useTile, setUseTile] = useState(true);
  // 複数マスク保存・プロンプト管理
  const DEFAULT_NEG_PROMPT = "EasyNegative, deformed mutated disfigured, missing arms, 4 fingers, 6 fingers,extra_arms , mutated hands, bad anatomy, disconnected limbs, low quality, worst quality, out of focus, ugly,　error, blurry, bokeh, Shoulder bag, bag, multiple arms, nsfw.";
  const [maskList, setMaskList] = useState([]);
  // マスク保存関数
  function saveCurrentMask() {
    if (!imgUrl) {
      alert("画像を選択してください");
      return;
    }
    const maskUrl = maskDataUrl();
    setMaskList([
      ...maskList,
      {
        mask: maskUrl,
        prompt: "",
        negative_prompt: DEFAULT_NEG_PROMPT,
      }
    ]);
    clearMask();
  }

  // マスク削除
  function deleteMask(idx) {
    setMaskList(maskList.filter((_, i) => i !== idx));
  }

  // マスクごとのプロンプト更新
  function updateMaskPrompt(idx, value) {
    setMaskList(maskList.map((m, i) => i === idx ? { ...m, prompt: value } : m));
  }
  function updateMaskNegPrompt(idx, value) {
    setMaskList(maskList.map((m, i) => i === idx ? { ...m, negative_prompt: value } : m));
  }

  // マスクごとにInpaint送信
  async function handleSendForMask(maskObj, inputImgB64 = null) {
    // inputImgB64: 前回生成画像（base64）
    if (!imgUrl && !inputImgB64) return alert("画像を選択してください");
    try {
      setSending(true);
      let base64Init;
      if (inputImgB64) {
        base64Init = inputImgB64;
      } else {
        base64Init = dataUrlToBase64(await dataUrlFromImage());
      }
      const base64Mask = dataUrlToBase64(maskObj.mask);

      const controlnetArgs = [
        ...(useCanny ? [{
          enabled: true,
          module: "canny",
          model: "control_canny-fp16 [e3fe7712]",
          weight: 1.0,
          resize_mode: "Crop and Resize",
          processor_res: 512,
          guidance_start: 0.0,
          guidance_end: 1.0,
          control_mode: "Balanced"
        }] : []),
        ...(useDepth ? [{
          enabled: true,
          module: "depth_midas",
          model: "control_depth-fp16 [400750f6]",
          weight: 1.0,
          resize_mode: "Crop and Resize",
          processor_res: 512,
          guidance_start: 0.0,
          guidance_end: 1.0,
          control_mode: "Balanced"
        }] : []),
        ...(useLineArt ? [{
          enabled: true,
          module: "lineart_standard (from white bg & black line)",
          model: "control_lineart-fp16 [b1c3f8d2]",
          weight: 1.0,
          resize_mode: "Crop and Resize",
          processor_res: 512,
          guidance_start: 0.0,
          guidance_end: 1.0,
          control_mode: "Balanced"
        }] : []),
        ...(useTile ? [{
          enabled: true,
          module: "tile_colorfix+sharp",
          model: "control_v11f1e_sd15_tile [a371b31b]",
          weight: 0.7,
          resize_mode: "Crop and Resize",
          processor_res: 2048,
          guidance_start: 0.0,
          guidance_end: 1.0,
          control_mode: "Balanced"
        }] : [])
      ];

      const alwayson_scripts = {
        controlnet: { args: controlnetArgs }
      };

      const payload = {
        init_images: [base64Init],
        prompt: maskObj.prompt,
        negative_prompt: maskObj.negative_prompt,
        steps: Number(steps),
        cfg_scale: Number(cfgScale),
        sampler_name: sampler,
        seed: Number(seed),
        denoising_strength: Number(denoise),
        mask: base64Mask,
        mask_blur: Number(maskBlur),
        inpainting_mask_invert: Number(invertMaskParam),
        inpaint_full_res: true,
        inpaint_full_res_padding: 32,
        inpainting_fill: 1,
        resize_mode: 0,
        alwayson_scripts,
        override_settings: checkpoint !== "None" ? { sd_model_checkpoint: checkpoint } : undefined,
      };

      const resp = await fetch(`${sdApiBase}/img2img`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      setResultImages(data.images || []);
      return data.images && data.images[0] ? data.images[0] : null;
    } catch (err) {
      console.error(err);
      alert(err.message || "送信に失敗しました");
    } finally {
      setSending(false);
    }
  }
  const drawCanvasRef = useRef(null); // for mask drawing (same size as image)
  const previewCanvasRef = useRef(null); // for overlay preview
  const lastPos = useRef({ x: 0, y: 0 });
  function loadPicker() {
    console.log("loadPicker called (GIS)");
    if (!window.google || !window.google.picker || !window.google.accounts || !window.gapi) {
      alert("Google API がまだロードされていません。少し待ってから再試行してください。");
      return;
    }

    // Load gapi client for Drive API
    window.gapi.load("client", async () => {
      try {
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
        });
        // Setup GIS token client
        if (!gisTokenClient) {
          gisTokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
              accessToken = tokenResponse.access_token;
              createPicker();
            },
          });
        }
        // Request access token
        gisTokenClient.requestAccessToken();
      } catch (e) {
        console.error("gapi.client.init error (GIS):", e);
        alert("Google API初期化エラー: " + (e.details || e.error || JSON.stringify(e)));
      }
    });
  }

  function createPicker() {
    if (window.google && window.google.picker && accessToken) {
      const view = new window.google.picker.View(window.google.picker.ViewId.DOCS_IMAGES);
      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(API_KEY)
        .setCallback(pickerCallback)
        .build();
      picker.setVisible(true);
    } else {
      alert("Google Picker APIがロードされていません。アクセストークンがありません。");
    }
  }

  function pickerCallback(data) {

    if (data.action === window.google.picker.Action.PICKED) {
      const fileId = data.docs[0].id;
      console.log("pickerCallback", data.docs[0]);
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      setParentFolderId(data.docs[0].parentId);
      fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
        .then(res => res.blob())
        .then(blob => {
          const imgUrl = URL.createObjectURL(blob);
          setImgUrl(imgUrl);
        })
        .catch(err => {
          alert('画像の取得に失敗しました: ' + err.message);
        });
    }
  }
  // Load chosen image to <img> and initialize canvases
  useEffect(() => {
    if (!imgFile) return;
    const url = URL.createObjectURL(imgFile);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imgFile]);

  const updatePreview = useCallback(() => {
    if (!imgUrl || !previewCanvasRef.current || !drawCanvasRef.current) return;
    const pcanvas = previewCanvasRef.current;
    const ctx = pcanvas.getContext("2d");
    const baseImg = new Image();
    baseImg.crossOrigin = "anonymous";
    baseImg.onload = () => {
      ctx.clearRect(0, 0, pcanvas.width, pcanvas.height);
      ctx.drawImage(baseImg, 0, 0, pcanvas.width, pcanvas.height);

      const mask = drawCanvasRef.current;
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.drawImage(mask, 0, 0);
      ctx.restore();
    };
    baseImg.src = imgUrl;
  }, [imgUrl]);

  useEffect(() => {
    if (!imgUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      // set canvas sizes
      [drawCanvasRef.current, previewCanvasRef.current].forEach((c) => {
        if (!c) return;
        c.width = w;
        c.height = h;
      });
      // マスク編集canvasは透明で初期化（画像は描画しない）
      const maskCtx = drawCanvasRef.current.getContext("2d");
      maskCtx.clearRect(0, 0, w, h);
      updatePreview();
    };
    img.src = imgUrl;
  }, [imgUrl, updatePreview]);
  function getCanvasPos(e) {
    const canvas = drawCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX || (e.touches && e.touches[0].clientX)) - rect.left) * (canvas.width / rect.width);
    const y = ((e.clientY || (e.touches && e.touches[0].clientY)) - rect.top) * (canvas.height / rect.height);
    return { x, y };
  }

  function startPaint(e) {
    if (!drawCanvasRef.current) return;
    painting.current = true;
    lastPos.current = getCanvasPos(e);
    drawDot(lastPos.current);
  }

  function endPaint() {
    painting.current = false;
    updatePreview();
  }

  function drawMove(e) {
    if (!painting.current) return;
    const pos = getCanvasPos(e);
    // 色塗り間隔（ピクセル単位）
    const interval = brushSize / 2; // ブラシ径の半分間隔で点を打つ
    const dx = pos.x - lastPos.current.x;
    const dy = pos.y - lastPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > interval) {
      // 線分上に点を打つ
      const steps = Math.floor(dist / interval);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = lastPos.current.x + dx * t;
        const y = lastPos.current.y + dy * t;
        drawDot({ x, y });
      }
    }
    drawStroke(lastPos.current, pos);
    lastPos.current = pos;
  }

  function drawStroke(p0, p1) {
    const ctx = drawCanvasRef.current.getContext("2d");
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;

    if (eraseMode) {
      ctx.globalCompositeOperation = "destination-out"; // erase
    } else {
      ctx.globalCompositeOperation = "source-over"; // paint
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
    }

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    ctx.restore();
  }

  function drawDot(p) {
    const ctx = drawCanvasRef.current.getContext("2d");
    ctx.save();
    if (eraseMode) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(p.x, p.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function clearMask() {
    if (!imgUrl) {
      alert("画像を選択してください");
      return;
    }
    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // マスク編集canvasは透明で初期化（画像は描画しない）
    updatePreview();
  }

  function invertMaskPixels() {
    if (!imgUrl) {
      alert("画像を選択してください");
      return;
    }
    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]; // alphaチャネルを反転
      if (a > 0) {
        data[i + 3] = 0; // alphaチャネルを反転
      }

      else {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 122;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    updatePreview();
  }
  function dataUrlFromImage() {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL("image/png"));
      };
      img.src = imgUrl;
    });
  }

  function maskDataUrl() {
    const canvas = drawCanvasRef.current;
    // マスクのみの白黒2値画像を生成
    const ctx = canvas.getContext("2d");
    // 新しいマスク用canvasを作成
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    // マスク編集canvasからアルファ値のみ抽出
    const srcImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maskImgData = maskCtx.createImageData(canvas.width, canvas.height);

    for (let i = 0; i < srcImgData.data.length; i += 4) {
      if (srcImgData.data[i + 3] > 0) {
        // 塗られた部分は白
        maskImgData.data[i] = 255;
        maskImgData.data[i + 1] = 255;
        maskImgData.data[i + 2] = 255;
        maskImgData.data[i + 3] = 255;
      } else {
        // それ以外は黒
        maskImgData.data[i] = 0;
        maskImgData.data[i + 1] = 0;
        maskImgData.data[i + 2] = 0;
        maskImgData.data[i + 3] = 255;
      }
    }
    maskCtx.putImageData(maskImgData, 0, 0);
    const url = maskCanvas.toDataURL("image/png");
    return url;
  }

  function dataUrlToBase64(dataUrl) {
    return dataUrl.replace(/^data:image\/\w+;base64,/, "");
  }

  async function handleSend() {
    if (!imgUrl) return alert("画像を選択してください");
    console.log(sdApiBase);
    try {
      setSending(true);
      // Build base64s
      const base64Init = dataUrlToBase64(await dataUrlFromImage());
      const maskUrl = maskDataUrl();
      const base64Mask = dataUrlToBase64(maskUrl);

      // ControlNet settings (参考: GenerateModal)
      const controlnetArgs = [
        ...(useCanny ? [{
          enabled: true,
          module: "canny",
          model: "control_canny-fp16 [e3fe7712]",
          weight: 1.0,
          resize_mode: "Crop and Resize",
          processor_res: 512,
          guidance_start: 0.0,
          guidance_end: 1.0,
          control_mode: "Balanced"
        }] : []),
        ...(useDepth ? [{
          enabled: true,
          module: "depth_midas",
          model: "control_depth-fp16 [400750f6]",
          weight: 1.0,
          resize_mode: "Crop and Resize",
          processor_res: 512,
          guidance_start: 0.0,
          guidance_end: 1.0,
          control_mode: "Balanced"
        }] : []),
        ...(useLineArt ? [{
          enabled: true,
          module: "lineart_standard (from white bg & black line)",
          model: "control_lineart-fp16 [b1c3f8d2]",
          weight: 1.0,
          resize_mode: "Crop and Resize",
          processor_res: 512,
          guidance_start: 0.0,
          guidance_end: 1.0,
          control_mode: "Balanced"
        }] : []),
        ...(useTile ? [{
          enabled: true,
          module: "tile_colorfix+sharp",
          model: "control_v11f1e_sd15_tile [a371b31b]",
          weight: 0.7,
          resize_mode: "Crop and Resize",
          processor_res: 2048,
          guidance_start: 0.0,
          guidance_end: 1.0,
          control_mode: "Balanced"
        }] : [])
      ];

      const alwayson_scripts = {
        controlnet: { args: controlnetArgs }
      };

      const payload = {
        init_images: [base64Init],
        prompt,
        negative_prompt: negPrompt,
        steps: Number(steps),
        cfg_scale: Number(cfgScale),
        sampler_name: sampler,
        seed: Number(seed),
        denoising_strength: Number(denoise),
        mask: base64Mask,
        mask_blur: Number(maskBlur),
        inpainting_mask_invert: Number(invertMaskParam),
        inpaint_full_res: true,
        inpaint_full_res_padding: 32,
        inpainting_fill: 1,
        resize_mode: 0,
        alwayson_scripts,
        override_settings: checkpoint !== "None" ? { sd_model_checkpoint: checkpoint } : undefined,
        // width: imgRef.current?.naturalWidth,
        // height: imgRef.current?.naturalHeight,
      };

      const resp = await fetch(`${sdApiBase}/img2img`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      setResultImages(data.images || []);
    } catch (err) {
      console.error(err);
      alert(err.message || "送信に失敗しました");
    } finally {
      setSending(false);
    }
  }

  function downloadMask() {
    if (!imgUrl) {
      alert("画像を選択してください");
      return;
    }
    const url = maskDataUrl();
    const a = document.createElement("a");
    a.href = url; a.download = "mask.png"; a.click();
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-3">
        <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImgFile(e.target.files?.[0] || null)}
            className="block"
          />
          <button
            onClick={loadPicker}
            className="min-w-[120px] px-4 py-2 rounded-2xl shadow border text-sm whitespace-nowrap"
          >
            Google Driveから選択
          </button>
          <button
            onClick={clearMask}
            className="min-w-[100px] px-4 py-2 rounded-2xl shadow border text-sm whitespace-nowrap"
          >マスク全消去</button>
          <button
            onClick={invertMaskPixels}
            className="min-w-[110px] px-4 py-2 rounded-2xl shadow border text-sm whitespace-nowrap"
          >マスク領域反転</button>
          <button onClick={downloadMask} className="min-w-[80px] px-4 py-2 rounded-2xl shadow border text-sm whitespace-nowrap">マスクDL</button>
          <button onClick={saveCurrentMask} className="min-w-[100px] px-4 py-2 rounded-2xl shadow border text-sm bg-blue-100 whitespace-nowrap">マスク保存</button>
          {/* 保存したマスク一覧とプロンプト入力・個別送信 */}
        </div>
        {imgUrl && (
          <div className="border rounded-2xl overflow-hidden">
            <div className="p-2 text-sm font-medium">選択画像プレビュー</div>
          </div>
        )}
        {imgUrl ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-2xl overflow-hidden">
              <div className="p-2 text-sm font-medium text-center">マスク編集キャンバス</div>
              <div className="relative flex justify-center items-center" style={{ minHeight: '300px' }}>
                <canvas
                  ref={drawCanvasRef}
                  className="editor-canvas touch-none cursor-crosshair"
                  style={{ zIndex: 10, background: imgUrl ? `url(${imgUrl}) center/contain no-repeat` : undefined }}
                  onMouseDown={startPaint}
                  onMouseUp={endPaint}
                  onMouseLeave={endPaint}
                  onMouseMove={drawMove}
                  onTouchStart={(e) => { e.preventDefault(); startPaint(e); }}
                  onTouchEnd={(e) => { e.preventDefault(); endPaint(); }}
                  onTouchMove={(e) => { e.preventDefault(); drawMove(e); }}
                />
              </div>
            </div>
            <div className="border rounded-2xl overflow-hidden flex flex-col items-center justify-center" style={{ minHeight: '300px' }}>
              <div className="p-2 text-sm font-medium">プレビュー</div>
              <canvas ref={previewCanvasRef} className="editor-canvas" />
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">画像を選択するとキャンバスが表示されます。</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-3">
            <span className="w-24 text-sm">ブラシ径</span>
            <input type="range" min="1" max="128" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} />
            <span className="text-sm w-10 text-right">{brushSize}</span>
          </label>
          <label className="flex items-center gap-3">
            <span className="w-24 text-sm">消しゴム</span>
            <input type="checkbox" checked={eraseMode} onChange={(e) => setEraseMode(e.target.checked)} />
          </label>
          <label className="flex items-center gap-3">
            <span className="w-24 text-sm">mask_blur</span>
            <input type="range" min="0" max="64" value={maskBlur} onChange={(e) => setMaskBlur(Number(e.target.value))} />
            <span className="text-sm w-10 text-right">{maskBlur}</span>
          </label>
          <label className="flex items-center gap-3">
            <span className="w-24 text-sm">invert param</span>
            <input type="checkbox" checked={invertMaskParam === 1} onChange={(e) => setInvertMaskParam(e.target.checked ? 1 : 0)} />
          </label>
        </div>
      </div>

      <div className="lg:col-span-1 space-y-3">
        <div className="border rounded-2xl p-3 space-y-2">
          <div className="text-sm font-semibold">プロンプト</div>
          <textarea className="w-full border rounded-xl p-2 text-sm" rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="a wooden table without the bottle" />
          <div className="text-sm font-semibold">ネガティブ</div>
          <textarea className="w-full border rounded-xl p-2 text-sm" rows={3} value={negPrompt} onChange={(e) => setNegPrompt(e.target.value)} placeholder="low quality, blurry" />
          <div className="grid grid-cols-2 gap-3 mt-2">
            <label className="flex items-center gap-3">
              <span className="w-24 text-sm">Canny</span>
              <input type="checkbox" checked={useCanny} onChange={(e) => setUseCanny(e.target.checked)} />
            </label>
            <label className="flex items-center gap-3">
              <span className="w-24 text-sm">Depth</span>
              <input type="checkbox" checked={useDepth} onChange={(e) => setUseDepth(e.target.checked)} />
            </label>
            <label className="flex items-center gap-3">
              <span className="w-24 text-sm">LineArt</span>
              <input type="checkbox" checked={useLineArt} onChange={(e) => setUseLineArt(e.target.checked)} />
            </label>
            <label className="flex items-center gap-3">
              <span className="w-24 text-sm">Tile</span>
              <input type="checkbox" checked={useTile} onChange={(e) => setUseTile(e.target.checked)} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2  mt-2">
            <label className="flex items-center gap-2">
              <span className="w-16">steps</span>
              <input className="border rounded p-1 w-full" type="number" value={steps} min={1} max={150} onChange={(e) => setSteps(Number(e.target.value))} />
            </label>
            <label className="flex items-center gap-2">
              <span className="w-16">cfg</span>
              <input className="border rounded p-1 w-full" type="number" value={cfgScale} min={1} max={20} onChange={(e) => setCfgScale(Number(e.target.value))} />
            </label>
            <label className="flex items-center gap-2">
              <span className="w-16">denoise</span>
              <input className="border rounded p-1 w-full" type="number" step="0.01" min={0} max={1} value={denoise} onChange={(e) => setDenoise(Number(e.target.value))} />
            </label>
            <label className="flex items-center gap-2">
              <span className="w-16">seed</span>
              <input className="border rounded p-1 w-full" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
            </label>
          </div>
          <label className="block text-sm">
            <span>sampler</span>
            <select className="w-full border rounded-xl p-2" value={sampler} onChange={(e) => setSampler(e.target.value)}>
              <option>Euler a</option>
              <option>Euler</option>
              <option>DDIM</option>
              <option>DPM++ 2M Karras</option>
            </select>
          </label>
          <label className="block text-sm mt-2">
            <span>checkpoint</span>
            <select className="w-full border rounded-xl p-2" value={checkpoint} onChange={e => setCheckpoint(e.target.value)}>
              <option value="flat2DAnimerge_v45Sharp [fe95063ba6]">flat2DAnimerge_v45Sharp</option>
              <option value="AnythingXL_v50.safetensors [7f96a1a9ca]">AnythingXL_v50</option>
            </select>
          </label>
          <button
            onClick={handleSend}
            disabled={sending || !imgUrl}
            className="w-full px-3 py-2 rounded-2xl shadow border text-sm disabled:opacity-50"
          >{sending ? "送信中..." : "Stable Diffusionに送信"}</button>
        </div>

        <div className="border rounded-2xl p-3 space-y-2">

          {maskList.map((maskObj, idx) => (
            <div key={idx} className="flex flex-row items-center gap-4 border-b pb-4">
              <div className="relative w-24 h-24 rounded border overflow-hidden flex items-center justify-center">
                {/* 元画像を背景に表示（プレビュー風） */}
                <img
                  src={imgUrl}
                  alt="元画像"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ opacity: 1 }}
                />
                {/* マスク画像を重ねて表示 */}
                <img
                  src={maskObj.mask}
                  alt={`mask-${idx}`}
                  className="relative w-full h-full object-contain"
                  style={{ opacity: 0.4, mixBlendMode: "lighten" }}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs mb-1">プロンプト</label>
                <textarea
                  className="w-full border rounded-xl p-2 text-sm mb-2"
                  rows={4}
                  value={maskObj.prompt}
                  onChange={e => updateMaskPrompt(idx, e.target.value)}
                  placeholder="このマスク用プロンプト"
                />
                <label className="block text-xs mb-1">ネガティブ</label>
                <textarea
                  className="w-full border rounded-xl p-2 text-sm"
                  rows={3}
                  value={maskObj.negative_prompt}
                  onChange={e => updateMaskNegPrompt(idx, e.target.value)}
                  placeholder="このマスク用ネガティブ"
                />
              </div>
              <button
                onClick={() => deleteMask(idx)}
                className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs ml-2"
              >削除</button>
            </div>
          ))}
          {/* 全マスクで逐次生成ボタン（結果欄の一番下に1つだけ） */}
          {maskList.length > 0 && (
            <div className="flex justify-center mt-4">
              <button
                onClick={async () => {
                  setSending(true);
                  let inputImgB64 = null;
                  for (let i = 0; i < maskList.length; i++) {
                    const resultB64 = await handleSendForMask(maskList[i], inputImgB64);
                    inputImgB64 = resultB64; // 次のマスクの入力画像に
                  }
                  setSending(false);
                }}
                disabled={sending || maskList.length === 0}
                className="px-4 py-2 rounded-2xl shadow border text-sm bg-green-200 font-semibold"
              >{sending ? "全マスク逐次生成中..." : "全マスクで逐次生成"}</button>
            </div>
          )}
          <div className="text-sm font-semibold mb-2 text-center">結果</div>
          <div className="flex flex-col items-center justify-center w-full">
            <div className="grid grid-cols-1 gap-2 w-80 flex items-center justify-center">
              {resultImages[0] && (
                <img
                  src={`data:image/png;base64,${resultImages[0]}`}
                  alt="result-0"
                  className="rounded-xl"
                />
              )}
              {resultImages.length > 0 && (
                <button
                  onClick={async () => {
                    setIsUploading(true);
                    await uploadImageToDrive(parentFolderId || FOLDER_ID, `data:image/png;base64,${resultImages[0]}`, accessToken, `Inpaint_Image`);
                    setIsUploading(false);
                  }}
                  className="w-full px-3 py-2 rounded-2xl shadow border text-sm"
                >{isUploading ?
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div> :
                  "Google Driveにアップロード"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}