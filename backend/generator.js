import sharp from 'sharp';
import { createRequire } from 'module';
const require = createRequire ? createRequire(import.meta.url) : global.require;

const url = process.env.SD_WEBUI_URL || "http://host.docker.internal:7860";

async function generateImage(imageUrl, payload) {
  try {
    // Load axios dynamically to support both dev (ESM) and Vercel production (CJS/node build)
    let axios;
    try {
      // Try to load the CJS node build first (works in Vercel production)
      axios = require('axios/dist/node/axios.cjs');
    } catch (e1) {
      try {
        // Fallback to normal require (works in many CJS environments)
        axios = require('axios');
      } catch (e2) {
        // As a final fallback, use dynamic ESM import (works in dev ESM)
        const mod = await import('axios');
        axios = mod.default || mod;
      }
    }
    // ① 画像取得
    const resp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    console.log('content-type:', resp.headers['content-type'], 'size:', resp.data.byteLength);
    console.log('input payload:', payload);
    // rotateに渡す値を確認（今回は引数なし）
    console.log('sharp.rotate() will be called with no arguments');
    const rotatedBuffer = await sharp(Buffer.from(resp.data)).rotate().toBuffer();
    let W, H;
    // 回転後のバッファからsharpインスタンスを作成
    const img = sharp(rotatedBuffer);
    // 回転後の画像のサイズを取得
    const meta = await img.metadata();
    if (!meta.format) throw new Error('Sharp が画像形式を認識できませんでした');
    const { width: oW, height: oH } = meta;
    console.log('original size:', oW, 'x', oH, 'format:', meta.format);
    // ③ 縦横判定してリサイズ
    const isPortrait = oH > oW;
    W = isPortrait ? 1024 : 1360;
    H = isPortrait ? 1360 : 1024;
    if (payload.enable_hr) {
      // 高解像度モードの場合は倍のサイズにする
      W /= 2;
      H /= 2;
    }
    const pngOptions = {};
    console.log('sharp.resize().png() will be called with:', pngOptions);
    const bufResized = await img.resize(W, H).png(pngOptions).toBuffer();
    const base64Image = bufResized.toString('base64');

    // ④ controlnet args の存在チェック＋置換
    let argsWithImage = [];
    if (
      payload.alwayson_scripts &&
      payload.alwayson_scripts.controlnet &&
      Array.isArray(payload.alwayson_scripts.controlnet.args)
    ) {
      argsWithImage = payload.alwayson_scripts.controlnet.args.map(arg => ({
        ...arg,
        input_image: `data:image/png;base64,${base64Image}`,
      }));
    }

    // ⑤ payloadWithImage 組み立て
    const payloadWithImage = {
      ...payload,
      // 解像度情報を追加
      width: W,
      height: H,
      alwayson_scripts: {
        // 他のスクリプト設定はそのまま引き継ぐ
        ...payload.alwayson_scripts,
        controlnet: {
          // controlnet 設定があればそのまま argsWithImage を、なければ空配列を設定
          ...payload.alwayson_scripts?.controlnet,
          args: argsWithImage,
        },
      },
    };

    console.log('payloadWithImage:', JSON.stringify(payloadWithImage, null, 2));

    // ⑥ SD-WebUI API に送信
    const res = await axios.post(
      `${url}/sdapi/v1/txt2img`,
      payloadWithImage,
      { timeout: 300000, headers: { 'Content-Type': 'application/json' } }
    );
    if (!res.data.images?.length) throw new Error('画像が生成されませんでした');

    const base64Out = res.data.images[0];
    const buffer = Buffer.from(base64Out, 'base64');

    // ⑦ PNG-info取得（オプション）
    const infoRes = await axios.post(
      `${url}/sdapi/v1/png-info`,
      { image: `data:image/png;base64,${base64Out}` }
    );
    console.log('生成画像のメタ情報:', infoRes.data.info);

    return buffer;

  } catch (err) {
    // 1. axiosのレスポンスエラー詳細をすべて出力
    if (err.response) {
      console.error('APIエラー詳細:', JSON.stringify(err.response.data, null, 2));
      console.error('APIエラーstatus:', err.response.status);
      console.error('APIエラーヘッダー:', err.response.headers);
    }
    // 2. axios以外のエラーも出力
    console.error('画像生成中にエラー:', err.message);
    // 3. エラーオブジェクト全体を出力
    console.error('エラーオブジェクト:', err);
    throw err;
  }
}

export { generateImage };
