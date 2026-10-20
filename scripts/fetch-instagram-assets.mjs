import fs from 'fs';
import path from 'path';

const redirectUrls = [
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEQEIPrpsrgvxfoA2Es7oCnb---zfwFhfU9qedVjrmDZ5bx8jGyVMbe-JR20jzL5suBxsbVr2kz0ov25NzW5zqhiyePvesSqGrcjOzpULDPHaSAi2iFNaScuwO0i9l2',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFwGTS3CgWu07gCoIrJRT1_ulj2Em8ZIXU0dWIJA_V_bBhmJtTFssGhAbMPykgOVYuxoKWiMrGDmJ5wlK9qDVmwdzyXE04ScCkMtOLxTi-_HLGGWbb38mb3iruuLiD5aI5m',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHejFswB0TEK56MFliBS1yMnmSz0CDgLws6CtwcQDsxD5DxV2-QHuez0Ch7kfNYWXX8T7wpTYK1mSuiky3XauBsU0J6BsfcTjJd6-d0vDEUQMgAmlgU3_RLBy2lvtsF',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF4vDodsDcZSt7iN8ySzGQVosI3a6ZmZ6wnk3Ueh-7TLCAAprDvvrj9pDGeoiDdRewoQEFvgdG3oTXFBlonlefXiYcUampHjWlP-HKd2uwHzHB7is2zW6m8w4mqbDy6',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE5WRwFZInuLvO9rdcP5-Vx528dsJjFyRR9KQ9muposgs-dfJ82mfdR6A_GzMNkn4c0g4jkCbL4qHHxbuXj38BBjSotCoDBzc1m0YYqxlEi1HMPdVhRrY2xM8cJJJer',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE5mPFIFS5MOkahIdL86TLcsJTdCiGBpX21yrxfJVW_r6HU4Ay0YRJE6sWriy0HPm313izZ3jZe8ecUmG3fDYH9Y1FKcFy0kuzYGIBwZoZlTj0DrdZP0rGCEpGNmskNsfU-',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF_-JLp5Vc4AYCT8OZnKojjaeNl5esiCdaI3oPkbUBKPZbjp55ME2KRSUZIoOBj0uGv3xxDYlCGN7fWAQftGmWFq13dMaBw88utI3WHX2or1Og-Pqf1MznoKzRRn8TVThnp',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE6pjTMknp5LppKM4XocamYWNjjmPLeH-ZqSSnCnE7GDBleWwDbGV0EivelTgZIbZBM854ckZo1M82acL44QOWrQDpY7tDdmgkYvLKRuVNDS2anH7utgsznQxshG7XkIxo=',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF4wLhln_5evstE3x7lkZYzDPkFK-ignliAzFxmguFDuGKKpVNlYelAd5UKKdVo8UFesKbk7reJoGlxW7RUKr7QYkZiM0nVpbE2PlZ5QgJMmZv9W_Ng41l2l5LhrL6aDAk=',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHI90OOUSc0s851Y5AZ7VOcZYYN6h3CVUvJWSsHERgJbH9Tb58N0gke0_bJdK7VMW2vVhwUn4m0gFI8RwHSqnZL4A4riOSZ_A4wLuWJz6njwZQ_roSX8InnGUSK11g=',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHpIeTCXtfunFUkca2mrT3yEVA8WbDBGt8Pxbh_vOE_jZMV_Wa6Hp-ezgXNlhWRjv4Sd6Slb9j4kyevkDku5CxBABfvfAZEEEcHIugNU8rqnQIkUcJHn-FDSsd36XEKiN8=',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF1gvKV8Zb9AjPQHIjfI6eJ5MalyRBQ63YLM7IINE_cFfsxLL2E6JHq0Bg_prjAjgoQCsWmWVlJb7_jDAQUbAas2BqpxfjmZlxA1I_CwcnjUN3hBNWNm2eWvCEqDZyLwTE=',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFnqath9zOpK9602PlutWUAegbvQMNZuynzbcDPhZE9GYLj6sx54GkAqL1QGNn05iuK2k4EdjOCZuuYIEVNNx5eBK_25bZTp5BDXSA4LWqoIsYSL0IHrr9ymsqUx1p3OlU=',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG1BGf4E5cfZIA7YB_NdYaA24gxKYGuxxOPrvApc3XgYtk8vZK_PWgBKaI2xzS6I2xgGvfUWXjvCMcdLgumePw7xFCKiG6rBmKUvwOofh5iy_TjKiOZHaHtur_oAZg=',
];

const OUT_DIR = path.join(process.cwd(), 'public', 'images', 'trazo');
fs.mkdirSync(OUT_DIR, { recursive: true });

function unescapeHtml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

async function run() {
  const shortcodes = new Set();
  for (const u of redirectUrls) {
    try {
      const r = await fetch(u, { redirect: 'manual' });
      const loc = r.headers.get('location') || '';
      console.log('Resolved:', loc);
      const m = loc.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
      if (m) shortcodes.add(m[1]);
    } catch (err) {
      console.error('Error resolving', u, err.message);
    }
  }

  console.log('Unique shortcodes:', [...shortcodes]);
  const results = [];
  let avatarSaved = false;

  for (const code of shortcodes) {
    const embedUrl = `https://www.instagram.com/p/${code}/embed/captioned/`;
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'es-AR,es;q=0.9',
      },
    });
    const html = await res.text();

    // Extract all img tags
    const imgTags = [...html.matchAll(/<img[^>]+>/g)].map((m) => m[0]);
    let mainImgUrl = null;
    let avatarUrl = null;

    for (const tag of imgTags) {
      const srcMatch = tag.match(/src="([^"]+)"/);
      if (!srcMatch) continue;
      const src = unescapeHtml(srcMatch[1]);
      if (tag.includes('EmbeddedMediaImage') || tag.includes('EmbeddedMedia')) {
        mainImgUrl = src;
      } else if (src.includes('scontent') || src.includes('cdninstagram')) {
        if (!avatarUrl && tag.includes('Avatar')) {
          avatarUrl = src;
        } else if (!mainImgUrl) {
          mainImgUrl = src;
        }
      }
    }

    // Also check srcset for highest resolution main image
    const srcsetMatch = html.match(/class="EmbeddedMediaImage"[^>]*srcset="([^"]+)"/);
    if (srcsetMatch) {
      const candidates = unescapeHtml(srcsetMatch[1])
        .split(',')
        .map((s) => s.trim().split(' ')[0])
        .filter(Boolean);
      if (candidates.length > 0) {
        mainImgUrl = candidates[candidates.length - 1];
      }
    }

    const captionMatch = html.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/);
    const caption = captionMatch
      ? unescapeHtml(captionMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      : '';

    console.log(`\n--- Post ${code} ---`);
    console.log('Caption:', caption);
    console.log('MainImg:', mainImgUrl ? 'FOUND' : 'NONE');

    if (avatarUrl && !avatarSaved) {
      try {
        const avRes = await fetch(avatarUrl);
        if (avRes.ok) {
          const buf = Buffer.from(await avRes.arrayBuffer());
          fs.writeFileSync(path.join(OUT_DIR, 'logo-trazo-ig.jpg'), buf);
          avatarSaved = true;
          console.log('Saved logo-trazo-ig.jpg (' + buf.length + ' bytes)');
        }
      } catch (e) {
        console.error('Avatar download error:', e.message);
      }
    }

    if (mainImgUrl) {
      try {
        const imgRes = await fetch(mainImgUrl);
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer());
          const filename = `ig-${code}.jpg`;
          fs.writeFileSync(path.join(OUT_DIR, filename), buf);
          console.log(`Saved ${filename} (${buf.length} bytes)`);
          results.push({
            code,
            filename: `/images/trazo/${filename}`,
            bytes: buf.length,
            caption,
          });
        }
      } catch (e) {
        console.error('Image download error:', e.message);
      }
    }
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify(results, null, 2),
    'utf8'
  );
  console.log('\nSaved manifest with', results.length, 'real images!');
}

run().catch(console.error);
