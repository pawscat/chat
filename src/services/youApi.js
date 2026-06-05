const axios = require('axios');
const { logError, logInfo } = require('./logService');

async function askYouApi(question) {
  const { getSettings } = require('../config/configManager');
  const settings = getSettings();
  
  const apiKey = settings.youApi.apiKey;
  const mode = settings.youApi.mode || 'research';
  const timeoutMs = settings.youApi.timeoutMs || 30000;
  
  if (!apiKey) {
    throw new Error('youApi.apiKey is not configured');
  }

  const startTime = performance.now();

  try {
    let answer = '';

    if (mode === 'research') {
      const response = await axios.post(
        settings.youApi.researchEndpoint,
        {
          input: question,
          research_effort: 'lite'
        },
        {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
          },
          timeout: timeoutMs
        }
      );

      if (response.data && response.data.output && response.data.output.content) {
        answer = response.data.output.content;
      } else {
        throw new Error('Invalid response format from You.com API (research mode)');
      }
    } else if (mode === 'search') {
      const response = await axios.get(settings.youApi.searchEndpoint, {
        params: {
          query: question,
          count: 5
        },
        headers: {
          'X-API-Key': apiKey
        },
        timeout: timeoutMs
      });

      if (response.data && response.data.hits) {
        let snippets = [];
        response.data.hits.forEach((hit, index) => {
          snippets.push(`*${index + 1}. ${hit.title}*\n${hit.url}\n${hit.snippets?.join(' ')}`);
        });
        if (snippets.length === 0) {
          answer = 'Maaf, saya tidak menemukan informasi terkait pertanyaanmu.';
        } else {
          answer = "Berikut adalah hasil pencarian terkait:\n\n" + snippets.join('\n\n');
        }
      } else {
        throw new Error('Invalid response format from You.com API (search mode)');
      }
    } else {
      throw new Error(`Invalid YOU_API_MODE: ${mode}`);
    }

    const responseTime = Math.round(performance.now() - startTime);
    return {
      success: true,
      answer: answer,
      responseTimeMs: responseTime
    };

  } catch (error) {
    const responseTime = Math.round(performance.now() - startTime);
    let errorMsg = 'Unknown Error';
    let userMsg = 'Maaf, terjadi kesalahan saat menghubungi AI. Silakan coba lagi nanti.';

    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          errorMsg = 'API key salah (401)';
          userMsg = 'Sistem sedang mengalami masalah konfigurasi. (Admin: Cek API Key)';
          break;
        case 403:
          errorMsg = 'Akses ditolak (403)';
          break;
        case 422:
          errorMsg = 'Payload salah (422)';
          break;
        case 429:
          errorMsg = 'Rate limit tercapai (429)';
          userMsg = 'Bot sedang menerima terlalu banyak permintaan. Silakan coba lagi nanti.';
          break;
        case 500:
          errorMsg = 'Server error (500)';
          break;
        default:
          errorMsg = `API Error ${status}: ${error.response.statusText}`;
      }
    } else if (error.request) {
      errorMsg = 'Internet error / Timeout';
      userMsg = 'Maaf, koneksi ke server AI terputus. Silakan coba lagi.';
    } else {
      errorMsg = error.message;
    }

    await logError('api', `You.com API Error: ${errorMsg}`, error);

    return {
      success: false,
      answer: userMsg,
      errorMessage: errorMsg,
      responseTimeMs: responseTime
    };
  }
}

module.exports = {
  askYouApi
};
