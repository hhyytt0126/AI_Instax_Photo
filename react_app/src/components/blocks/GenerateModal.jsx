import React, { use, useState } from 'react';
import '../css/generateModal.css';
import { convertToViewLink } from '../hooks/useDriveFiles';
import ProgressModal from './ProgressModal';

export default function GenerateModal({ imageUrl, onClose, onGenerate, generating }) {
  const [prompt, setPrompt] = useState("smile, anime-style, 8k, RAW photo, best quality, masterpiece, anime, clear,  best quality ,ultra high res");
  const [negativePrompt, setNegativePrompt] = useState("EasyNegative, deformed mutated disfigured, missing arms, 4 fingers, 6 fingers,extra_arms , mutated hands, bad anatomy, disconnected limbs, low quality, worst quality, out of focus, ugly,　error, blurry, bokeh, Shoulder bag, bag, multiple arms, nsfw.");
  const [steps, setSteps] = useState(20);
  const [cfgScale, setCfgScale] = useState(7);
  const [sampler, setSampler] = useState("DPM++ 2M Karras");
  const [checkPoint, setCheckPoint] = useState("flat2DAnimerge_v45Sharp [fe95063ba6]");
  const [showProgress, setShowProgress] = useState(false);
  const [enableHr, setEnableHr] = useState(true);
  const [useCanny, setUseCanny] = useState(true);
  const [useLineArt, setUseLineArt] = useState(false);
  const [useDepth, setUseDepth] = useState(false);
  const [useTile, setUseTile] = useState(true);
  const [useAdetailer, setUseAdetailer] = useState(true);

  const viewLink = convertToViewLink(imageUrl);

  const handleSubmit = async () => {
    setShowProgress(true);
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
        enabled: false,
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

    const alwaysonScripts = {
      ...(controlnetArgs.length > 0 && {
        controlnet: { args: controlnetArgs }
      }),
      ...(useAdetailer && {
        adetailer: {
          args: [
            {
              ad_model: "face_yolov8n.pt",
              ad_prompt: "smile, detail, face, anime-style, 8k, RAW photo, best quality, masterpiece, anime, clear, best quality ,ultra high res",
              ad_negative_prompt: "ugly, deformed",
              ad_confidence: 0.3,
              ad_mask_min_ratio: 0.0,
              ad_mask_max_ratio: 1.0,
              ad_mask_blur: 8,
              ad_denoising_strength: 0.4,
              ad_inpaint_only_masked: true,
              ad_use_inpaint_width_height: false,
              ad_restore_face: false
            }
          ]
        }
      })
    };

    const payload = {
      prompt,
      negative_prompt: negativePrompt,
      steps,
      cfg_scale: cfgScale,
      sampler_name: sampler,
      seed: -1,
      enable_hr: enableHr,
      hr_scale: 2.0,
      hr_upscaler: "4x-UltraSharp",
      denoising_strength: 0.7,
      override_settings: {
        sd_model_checkpoint: checkPoint
      },
      alwayson_scripts: alwaysonScripts
    };

    console.log("payload を送信しました:", payload);
    await onGenerate(payload);
    setShowProgress(false);
  };

  return (
    <>
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">画像生成設定</h2>
        </div>

        <div className="modal-body">
          <div className="form-and-image">
          <div className="form-container">
          <div className="form-group">
            <label className="form-label">チェックポイント</label>
            <select 
              className="form-select"
              value={checkPoint} 
              onChange={(e) => setCheckPoint(e.target.value)}
            >
              <option value="flat2DAnimerge_v45Sharp [fe95063ba6]">flat2DAnimerge_v45Sharp</option>
              <option value="AnythingXL_v50.safetensors [7f96a1a9ca]">AnythingXL_v50</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">プロンプト</label>
            <textarea 
              className="form-textarea"
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)}
              rows="3"
              placeholder="生成したい画像の詳細を入力..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">ネガティブプロンプト</label>
            <textarea 
              className="form-textarea"
              value={negativePrompt} 
              onChange={(e) => setNegativePrompt(e.target.value)}
              rows="2"
              placeholder="避けたい要素を入力..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">ステップ数</label>
              <input 
                type="number" 
                className="form-input"
                value={steps} 
                onChange={(e) => setSteps(Number(e.target.value))}
                min="1"
                max="150"
              />
            </div>

            <div className="form-group">
              <label className="form-label">CFG Scale</label>
              <input 
                type="number" 
                className="form-input"
                value={cfgScale} 
                onChange={(e) => setCfgScale(Number(e.target.value))}
                min="1"
                max="30"
                step="0.1"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">サンプラー</label>
            <select 
              className="form-select"
              value={sampler} 
              onChange={(e) => setSampler(e.target.value)}
            >
              <option value="DPM++ 2M Karras">DPM++ 2M Karras</option>
              <option value="DPM++ SDE Karras">DPM++ SDE Karras</option>
              <option value="Euler a">Euler a</option>
              <option value="Euler">Euler</option>
              <option value="DDIM">DDIM</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">ControlNet 設定</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  className="checkbox-input"
                  checked={enableHr} 
                  onChange={(e) => setEnableHr(e.target.checked)} 
                />
                <span className="checkbox-text">高解像度補助</span>
              </label>
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  className="checkbox-input"
                  checked={useCanny} 
                  onChange={(e) => setUseCanny(e.target.checked)} 
                />
                <span className="checkbox-text">Canny (エッジ検出)</span>
              </label>
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  className="checkbox-input"
                  checked={useDepth} 
                  onChange={(e) => setUseDepth(e.target.checked)} 
                />
                <span className="checkbox-text">Line Art</span>
              </label>
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  className="checkbox-input"
                  checked={useLineArt} 
                  onChange={(e) => setUseLineArt(e.target.checked)} 
                />
                <span className="checkbox-text">Depth (深度情報)</span>
              </label>
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  className="checkbox-input"
                  checked={useTile} 
                  onChange={(e) => setUseTile(e.target.checked)} 
                />
                <span className="checkbox-text">Tile (タイル処理)</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Adetailer 設定</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  className="checkbox-input"
                  checked={useAdetailer} 
                  onChange={(e) => setUseAdetailer(e.target.checked)} 
                />
                <span className="checkbox-text">Adetailer を有効にする（顔補正・ディテール強化）</span>
              </label>
            </div>
          </div>

        </div>
        </div>
          {imageUrl && (
            <iframe
              src={viewLink}
              className="preview-iframe"
              allow="fullscreen"
              title="画像プレビュー"
            />
          )}
        </div>

        <div className="modal-actions">
          <button 
            className={`generate-button ${generating ? 'generating' : ''}`}
            onClick={handleSubmit} 
            disabled={generating}
          >
            {generating ? (
              <>
                <span className="spinner"></span>
                生成中...
              </>
            ) : (
              "生成する"
            )}
          </button>
          <button className="cancel-button" onClick={onClose}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
      <ProgressModal
        imageUrl={imageUrl}
        visible={showProgress}
        onClose={() => setShowProgress(false)}
        sdApiUrl={process.env.SD_WEBUI_URL || 'http://localhost:7860'}
      />
    </>
  );
}
