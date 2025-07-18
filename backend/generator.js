const axios = require('axios');
const sharp = require('sharp');

const url = process.env.SD_WEBUI_URL || "http://host.docker.internal:7860";

async function generateImage(imageUrl) {
  try {
    // ① 画像取得
    const resp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    console.log('content-type:', resp.headers['content-type'], 'size:', resp.data.byteLength);

    // ② Sharpでメタデータ取得
    const img = sharp(resp.data);
    const meta = await img.metadata();
    if (!meta.format) throw new Error('Sharp が画像形式を認識できませんでした');
    const { width: oW, height: oH } = meta;

    // ③ 縦横判定してリサイズ
    const isPortrait = oH > oW;
    const W = isPortrait ? 1024 : 1360;
    const H = isPortrait ? 1360 : 1024;

    const bufResized = await img.resize(W, H).png().toBuffer();
    const base64Image = bufResized.toString('base64');

    // ④ payload作成
const payload = {
  prompt: "8k, RAW photo, best quality, masterpiece, realistic, photo-realistic, clear, ultra high res",
  negative_prompt:
    "EasyNegative, deformed mutated disfigured, missing arms, 4 fingers, 6 fingers, extra_arms, mutated hands, bad anatomy, disconnected limbs, low quality, worst quality, out of focus, ugly, error, blurry, bokeh, Shoulder bag, bag, multiple arms, nsfw",

  steps: 20,
  sampler_name: "DPM++ 2M Karras", // サンプラー名
  cfg_scale: 7,
  seed: 1276346867,

  // サイズ指定
  width: W,
  height: H,

  // Hires. fix
  enable_hr: false,
  hr_scale: 2.0,
  hr_upscaler: "Latent",
  denoising_strength: 0.7,

  // モデル指定
  override_settings: {
    sd_model_checkpoint: "flat2DAnimerge_v45Sharp [fe95063ba6]"
  },

  // Always-on scripts (ControlNet & ADetailer)
  alwayson_scripts: {
    controlnet: {
      args: [
        {
          enabled: true,
          image: `data:image/png;base64,${base64Image}`, // ✅ プレフィックス追加
          module: "canny",
          model: "control_canny-fp16 [e3fe7712]",
          weight: 1.0,
          resize_mode: "Crop and Resize",
          processor_res: 1024,
          guidance_start: 0.0,
          guidance_end: 1.0,
          control_mode: "Balanced" // ✅ 値は大文字始まり
        },
        {
          enabled: true,
          image: `data:image/png;base64,${base64Image}`,
          module: "depth_midas",
          model: "control_depth-fp16 [400750f6]",
          weight: 1.0,
          resize_mode: "Crop and Resize",
          processor_res: 512,
          guidance_start: 0.0,
          guidance_end: 1.0,
          control_mode: "Balanced"
        },
        {
          enabled: true,
          image: `data:image/png;base64,${base64Image}`,
          module: "tile_resample",
          model: "control_v11f1e_sd15_tile [a371b31b]",
          weight: 0.7,
          resize_mode: "Crop and Resize",
          processor_res: 512,
          guidance_start: 0.0,
          guidance_end: 1.0,
          control_mode: "Balanced"
        },
      ]
    },
    // adetailer: {
    //   args: [
    //     {
    //       ad_model: "face_yolov8n.pt",
    //       ad_prompt: "smile",
    //       ad_confidence: 0.3,
    //       ad_dilate_erode: 4,
    //       ad_mask_blur: 4,
    //       ad_denoising_strength: 0.4,
    //       ad_inpaint_only_masked: true,
    //       ad_inpaint_padding: 32
    //     }
    //   ]
    // }
  }
};

    // ⑤ txt2img API呼び出し
    const res = await axios.post(`${url}/sdapi/v1/txt2img`, payload, { timeout: 300000 });
    if (!res.data.images?.length) throw new Error("画像が生成されませんでした");

    const base64Out = res.data.images[0];
    const buffer = Buffer.from(base64Out, 'base64');

    // ⑥ PNG-info取得（オプション）
    const infoRes = await axios.post(`${url}/sdapi/v1/png-info`, {
      image: `data:image/png;base64,${base64Out}`
    });
    console.log("生成画像のメタ情報:", infoRes.data.info);

    return buffer;

  } catch (err) {
    console.error("画像生成中にエラー:", err.message);
    throw err;
  }
}

module.exports = { generateImage };
