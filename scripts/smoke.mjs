/**
 * Headless walkthrough of the whole app, driven through the real UI.
 * Uses the system Edge/Chrome, so nothing has to be downloaded.
 *
 *   node scripts/smoke.mjs [baseUrl]     (default: http://localhost:5173)
 *
 * Pass A — ?sim=1: the full journey, boot to certificate. Simulated signals
 *          fire real smile/laugh/idle events, so the downstream pipeline
 *          (events -> notifications -> processes -> score) is genuinely tested.
 * Pass B — real getUserMedia with Chromium's fake camera. That device shows a
 *          test pattern, not a face, so this checks the app degrades gracefully
 *          when the camera works but no face is ever found.
 *
 * What this CANNOT test: MediaPipe's actual blendshape output, which needs a
 * real face in front of a real camera. Verify that by hand.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const SHOTS = 'scripts/shots';

const problems = [];
const log = (...a) => console.log(...a);
const fail = (m) => {
  problems.push(m);
  log(`  !! ${m}`);
};

const IGNORABLE = [/XNNPACK/i, /TensorFlow Lite/i, /Created TensorFlow/i];

function watch(page, tag) {
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (IGNORABLE.some((r) => r.test(t))) return;
    fail(`[${tag}] console.error: ${t.slice(0, 200)}`);
  });
  page.on('pageerror', (e) => fail(`[${tag}] pageerror: ${e.message}`));
}

async function launch() {
  for (const channel of ['msedge', 'chrome']) {
    try {
      const b = await chromium.launch({
        channel,
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--autoplay-policy=no-user-gesture-required',
        ],
      });
      log(`launched: ${channel}\n`);
      return b;
    } catch {
      /* next */
    }
  }
  throw new Error('Neither Edge nor Chrome could be launched.');
}

/* ------------------------------------------------------------- pass A */

async function fullJourney(ctx) {
  const page = await ctx.newPage();
  watch(page, 'sim');
  const shot = async (n) => {
    await page.screenshot({ path: `${SHOTS}/${n}.png` });
    log(`  shot: ${n}.png`);
  };

  log('[1] boot');
  await page.goto(`${BASE}/?sim=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  await shot('01-boot');
  await page.click('.boot').catch(() => {});
  await page.waitForSelector('.intro__title', { timeout: 8000 });
  await page.waitForTimeout(900);
  await shot('02-intro');

  log('[2] scan');
  await page.click('.intro__cta');
  await page.waitForSelector('.scan__grid', { timeout: 10000 });
  await page.fill('.field__input', 'അജയ് TREVOR');
  await page.waitForTimeout(3500);
  await shot('03-scan');

  const cta = page.locator('.scan .btn--primary');
  for (let i = 0; i < 40 && (await cta.isDisabled()); i++) await page.waitForTimeout(400);
  if (await cta.isDisabled()) return fail('scan CTA never enabled');
  await cta.click();

  log('[3] dashboard');
  await page.waitForSelector('.bento', { timeout: 10000 });
  await page.waitForTimeout(4000);
  await shot('04-dashboard');

  // the tables live below the fold; capture them too
  await page.locator('.workspace').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await page.waitForTimeout(900);
  await shot('04b-dashboard-tables');
  await page.locator('.workspace').evaluate((el) => el.scrollTo(0, 0));
  await page.waitForTimeout(400);

  const rail = await page.locator('.perf__railitem').count();
  log(`  performance resources: ${rail}`);
  if (rail !== 6) fail(`expected 6 performance resources, found ${rail}`);

  // the CPU column must actually add up to the headline figure — that is the
  // whole point of the believability rework
  const sums = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.tm__row')].map((r) => {
      const n = r.querySelectorAll('.tm__num');
      return parseFloat(n[0]?.textContent ?? '0') || 0;
    });
    const total = parseFloat(
      document.querySelector('.tm__th--on .tm__total')?.textContent ??
        document.querySelector('.tm__total')?.textContent ??
        '0',
    );
    return { colSum: cells.reduce((a, b) => a + b, 0), total };
  });
  log(`  CPU column sum ${sums.colSum.toFixed(1)}%  vs header total ${sums.total}%`);
  if (Math.abs(sums.colSum - sums.total) > 3) {
    fail(`CPU column (${sums.colSum.toFixed(1)}%) does not match the total (${sums.total}%)`);
  }

  const procs = await page.locator('.tm__row').count();
  log(`  processes: ${procs}`);
  if (procs < 9) fail(`expected >=9 processes, found ${procs}`);

  // Brain temperature carries a decimal, so it moves visibly within seconds;
  // the pinnakk total is integer-rounded and legitimately sits still.
  const temp = () => page.locator('.perf__big').textContent();
  const t1 = await temp();
  const pk1 = await page.locator('.pk__total').textContent();
  await page.waitForTimeout(3000);
  const t2 = await temp();
  const pk2 = await page.locator('.pk__total').textContent();
  log(`  cpu readout: ${t1} -> ${t2}   pinnakk: ${pk1} -> ${pk2}`);
  if (t1 === t2 && pk1 === pk2) fail('metrics are frozen — the 10Hz tick may be dead');

  const notifs = await page.locator('.notif').count();
  log(`  notifications visible: ${notifs}`);

  // deterministic toast: the promo button always fires one
  log('[3b] toast placement');
  await page.locator('.promo__btn').click();
  await page.waitForSelector('.notif', { timeout: 5000 });
  await page.waitForTimeout(700); // let the entrance spring settle before measuring
  // measure the stack container, not a single toast: the stack is reversed so
  // the first DOM node is the oldest and sits at the bottom
  const toastBox = await page.locator('.notifs').boundingBox();
  const headerBox = await page.locator('.hdr').boundingBox();
  const headerBottom = headerBox ? headerBox.y + headerBox.height : 0;
  log(`  toast stack top ${toastBox?.y.toFixed(0)}px, header bottom ${headerBottom.toFixed(0)}px`);
  if (toastBox && toastBox.y < headerBottom) fail('toast stack overlaps the header bar');
  if (toastBox && toastBox.y > 300) {
    fail(`toast stack is not anchored near the top (y=${toastBox.y.toFixed(0)})`);
  }
  await shot('04c-toast');

  log('[4] end task — refusal');
  await page.locator('.tm__row', { hasText: 'നാണക്കേട്' }).first().click();
  await page.waitForSelector('.pd__name', { timeout: 5000 });
  await page.locator('.btn--danger').click();
  await page.waitForSelector('.pd__errcode', { timeout: 12000 });
  const refusedFor = (await page.locator('.pd__name').textContent())?.trim();
  log(`  dialog opened for: ${refusedFor}`);
  const code = (await page.locator('.pd__errcode').textContent())?.trim();
  log(`  -> ${code}`);
  if (!/403/.test(code ?? '')) fail('END TASK did not produce ERROR 403');
  await shot('05-error403');
  await page.keyboard.press('Escape').catch(() => {});
  await page.locator('.modal').click({ position: { x: 8, y: 8 } });
  await page.waitForTimeout(500);

  log('[5] end task — ActualWork.exe (the one that works)');
  await page.locator('.tm__row', { hasText: 'ActualWork' }).first().click();
  await page.waitForSelector('.pd__name', { timeout: 5000 });
  const opened = (await page.locator('.pd__name').textContent())?.trim();
  log(`  dialog opened for: ${opened}`);
  if (!/ActualWork/.test(opened ?? '')) {
    fail(`clicked ActualWork but dialog shows "${opened}" — row moved under the cursor`);
  }
  await page.locator('.btn--danger').click();
  await page.waitForSelector('.pd__killedcode', { timeout: 12000 });
  log('  -> PROCESS ENDED');
  await page.locator('.modal').click({ position: { x: 8, y: 8 } });
  await page.waitForTimeout(400);

  log('[6] reel lab');
  await page.locator('.navitem', { hasText: 'Reel Lab' }).click();
  await page.waitForSelector('.reel__stagewrap', { timeout: 8000 });
  await page.waitForTimeout(5500);
  await shot('06-reel-playing');
  await page.waitForSelector('.reel__verdict, .reel__err', { timeout: 50000 });
  await page.waitForTimeout(900);
  await shot('07-reel-report');
  const verdict = (await page.locator('.reel__verdict, .reel__err').first().textContent())?.trim();
  log(`  verdict: ${verdict?.slice(0, 64)}`);
  const tlCells = await page.locator('.tl__cell').count();
  log(`  timeline buckets: ${tlCells}`);
  if (tlCells < 5) fail('reaction timeline did not populate');

  log('[7] brain lab — captcha');
  await page.locator('.navitem', { hasText: 'Brain Lab' }).click();
  await page.waitForSelector('.lab__grid', { timeout: 8000 });
  await page.waitForTimeout(1200); // let the staggered card entrance settle
  const cards = await page.locator('.lab__card').count();
  log(`  game cards: ${cards}`);
  if (cards !== 4) fail(`expected 4 brain-lab cards, found ${cards}`);
  await shot('08-brainlab');
  await page.locator('.lab__card', { hasText: 'Human Captcha' }).click();
  await page.waitForSelector('.cap__grid', { timeout: 5000 });
  for (let i = 0; i < 5; i++) {
    await page.locator('.cap__opt').first().click();

    if (i === 0) {
      // immediately after the click exactly one option may be marked —
      // marking them all at once is the multi-select bug
      await page.waitForTimeout(120);
      const pickedNow = await page.locator('.cap__opt--picked').count();
      const alsoNow = await page.locator('.cap__opt--also').count();
      log(`  right after click: picked=${pickedNow} alsoCorrect=${alsoNow}`);
      if (pickedNow !== 1) fail(`expected exactly 1 picked option, found ${pickedNow}`);
      if (alsoNow !== 0) fail(`options revealed as correct before the beat (${alsoNow})`);
      await shot('09-captcha');
    }

    await page.waitForSelector('.cap__reveal', { timeout: 5000 });
    if (i === 0) {
      const alsoAfter = await page.locator('.cap__opt--also').count();
      const pickedAfter = await page.locator('.cap__opt--picked').count();
      log(`  after the reveal:  picked=${pickedAfter} alsoCorrect=${alsoAfter}`);
      if (pickedAfter !== 1) fail('the picked option lost its marker after the reveal');
      if (alsoAfter < 1) fail('the "all of the above" reveal never landed');
      await shot('09b-captcha-revealed');
    }
    await page.locator('.cap__reveal .btn').click();
    await page.waitForTimeout(350);
  }
  await page.waitForSelector('.game__verdict', { timeout: 6000 });
  await shot('10-captcha-done');
  await page.locator('.btn', { hasText: 'Back to Brain Lab' }).click();
  await page.waitForTimeout(500);

  log("[8] brain lab — don't laugh");
  await page.locator('.lab__card', { hasText: "Don't Laugh" }).click();
  await page.waitForSelector('.game__stage', { timeout: 6000 });
  await page.locator('.btn--primary', { hasText: 'Begin test' }).click();
  await page.waitForSelector('.game__verdict', { timeout: 40000 });
  const dl = (await page.locator('.game__verdict').textContent())?.trim();
  log(`  -> ${dl}`);
  await shot('11-dontlaugh');
  await page.locator('.btn', { hasText: 'Back to Brain Lab' }).click();
  await page.waitForTimeout(500);

  log('[8b] brain lab — stare contest');
  await page.locator('.lab__card', { hasText: 'Stare Contest' }).click();
  await page.waitForSelector('.game__stage', { timeout: 6000 });
  await page.locator('.btn--primary', { hasText: 'Start staring' }).click();
  await page.waitForSelector('.stare__clock', { timeout: 6000 });
  await page.waitForSelector('.game__verdict', { timeout: 60000 });
  const stare = (await page.locator('.game__verdict').textContent())?.trim();
  log(`  -> ${stare}`);
  await shot('11b-stare');
  await page.locator('.btn', { hasText: 'Back to Brain Lab' }).click();
  await page.waitForTimeout(500);

  log('[9] final report');
  const finalBtn = page.locator('.navitem', { hasText: 'Final Report' });
  if (await finalBtn.isDisabled()) return fail('Final Report never unlocked');
  await finalBtn.click();
  await page.waitForSelector('.final__score', { timeout: 25000 });
  await page.waitForTimeout(4200);
  await shot('12-final');
  const score = (await page.locator('.final__score').textContent())?.trim();
  const cls = (await page.locator('.final__classification').textContent())?.trim();
  log(`  score: ${score}   class: ${cls}`);
  if (!/\d/.test(score ?? '')) fail('final score did not render a number');

  log('[10] certificate');
  await page.locator('.btn--primary', { hasText: 'Issue certificate' }).click();
  await page.waitForSelector('.cert__canvas', { timeout: 12000 });
  await page.waitForFunction(
    () => {
      const c = document.querySelector('.cert__canvas');
      return c && getComputedStyle(c).opacity === '1';
    },
    { timeout: 30000 },
  );
  await page.waitForTimeout(1000);
  await shot('13-certificate-page');

  const dataUrl = await page.evaluate(() => {
    const c = document.querySelector('.cert__canvas');
    return c ? c.toDataURL('image/png') : null;
  });
  if (!dataUrl || dataUrl.length < 20000) {
    fail('certificate canvas produced no usable image');
  } else {
    await writeFile(
      `${SHOTS}/14-certificate-export.png`,
      Buffer.from(dataUrl.split(',')[1], 'base64'),
    );
    log(`  shot: 14-certificate-export.png (${Math.round(dataUrl.length / 1024)}kb data url)`);
  }

  // the download path must actually emit a file
  const dl2 = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  await page.locator('.btn--primary', { hasText: 'Download' }).click();
  const download = await dl2;
  if (!download) fail('Download certificate produced no download event');
  else log(`  download: ${download.suggestedFilename()}`);

  await page.close();
}

/* ------------------------------------------------------------- pass B */

async function noFaceResilience(ctx) {
  log('\n[11] real camera, no face in frame');
  const page = await ctx.newPage();
  watch(page, 'camera');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.click('.boot').catch(() => {});
  await page.waitForSelector('.intro__cta', { timeout: 8000 });
  await page.click('.intro__cta');
  await page.waitForSelector('.scan__grid', { timeout: 10000 });

  // model + camera both work here; the fake device just is not a face
  const live = await page.locator('.chip', { hasText: 'Live' }).count();
  log(`  reported as live camera: ${live > 0}`);

  const cta = page.locator('.scan .btn--primary');
  let waited = 0;
  while ((await cta.isDisabled()) && waited < 25000) {
    await page.waitForTimeout(500);
    waited += 500;
  }
  if (await cta.isDisabled()) {
    fail(`stuck on scan screen for ${waited}ms with a working camera but no face`);
  } else {
    log(`  recovered after ${waited}ms — continue is offered`);
  }
  await page.screenshot({ path: `${SHOTS}/15-noface-fallback.png` });
  log('  shot: 15-noface-fallback.png');
  await page.close();
}


/* ------------------------------------------------------------- pass C */

/**
 * Phone walkthrough. The key assertion is horizontal overflow: if the document
 * is wider than the viewport at 390px, something is not responsive.
 */
async function mobilePass(browser) {
  log('');
  log('[12] mobile — 390x844');
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    permissions: ['camera'],
  });
  const page = await ctx.newPage();
  watch(page, 'mobile');

  const overflow = async (where) => {
    const r = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      win: window.innerWidth,
      widest: (() => {
        let worst = null;
        let max = 0;
        for (const el of document.querySelectorAll('body *')) {
          const b = el.getBoundingClientRect();
          if (b.right > max) {
            max = b.right;
            worst = el.className || el.tagName;
          }
        }
        return { max: Math.round(max), worst: String(worst).slice(0, 60) };
      })(),
    }));
    // innerWidth is checked too: when content overflows, mobile emulation can
    // widen the layout viewport to fit, which would make doc === win and hide
    // the very failure we are looking for.
    if (r.win > 400) {
      fail(`[mobile] ${where}: layout viewport widened to ${r.win}px (content forced a zoom-out)`);
    } else if (r.doc > r.win + 1) {
      fail(`[mobile] ${where}: horizontal overflow ${r.doc}px > ${r.win}px (widest: ${r.widest.worst} @ ${r.widest.max}px)`);
    } else {
      log(`  ${where}: fits (${r.doc}/${r.win})`);
    }
  };

  const shot = async (n) => {
    await page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: false });
    log(`  shot: ${n}.png`);
  };

  await page.goto(`${BASE}/?sim=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await overflow('boot');
  await shot('m1-boot');

  await page.click('.boot').catch(() => {});
  await page.waitForSelector('.intro__title', { timeout: 8000 });
  await page.waitForTimeout(700);
  await overflow('intro');
  await shot('m2-intro');

  await page.click('.intro__cta');
  await page.waitForSelector('.scan__grid', { timeout: 10000 });
  await page.fill('.field__input', 'അജയ്');
  await page.waitForTimeout(2500);
  await overflow('scan');
  await shot('m3-scan');

  const cta = page.locator('.scan .btn--primary');
  for (let i = 0; i < 40 && (await cta.isDisabled()); i++) await page.waitForTimeout(400);
  await cta.click();

  await page.waitForSelector('.bento', { timeout: 10000 });
  await page.waitForTimeout(2500);
  await overflow('dashboard');
  await shot('m4-dashboard');

  await page.locator('.workspace').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await page.waitForTimeout(800);
  await overflow('dashboard (tables)');
  await shot('m5-tables');

  // toasts must not sit on top of the nav strip — there they swallow taps
  await page.locator('.promo__btn').click({ force: true }).catch(() => {});
  const mNotifs = await page.locator('.notifs').boundingBox();
  const mHdr = await page.locator('.hdr').boundingBox();
  if (mNotifs && mHdr) {
    const hdrBottom = mHdr.y + mHdr.height;
    log(`  toast stack top ${mNotifs.y.toFixed(0)}px, header bottom ${hdrBottom.toFixed(0)}px`);
    if (mNotifs.y < hdrBottom) fail('[mobile] toast stack overlaps the header/nav');
  }

  await page.locator('.navitem', { hasText: 'Brain Lab' }).click();
  await page.waitForSelector('.lab__grid', { timeout: 8000 });
  await page.waitForTimeout(900);
  await overflow('brain lab');
  await shot('m6-brainlab');

  await page.locator('.lab__card', { hasText: 'Human Captcha' }).click();
  await page.waitForSelector('.cap__grid', { timeout: 5000 });
  await page.locator('.cap__opt').first().click();
  await page.waitForSelector('.cap__reveal', { timeout: 5000 });
  await overflow('captcha');
  await shot('m7-captcha');

  await page.close();
  await ctx.close();
}

/* --------------------------------------------------------------- main */

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const browser = await launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['camera'],
  });

  try {
    await fullJourney(ctx);
    await noFaceResilience(ctx);
    await mobilePass(browser);
  } finally {
    await browser.close();
  }

  log('\n==================== RESULT ====================');
  if (!problems.length) {
    log('PASS — full walkthrough completed, no page errors.');
  } else {
    log(`${problems.length} problem(s):`);
    for (const p of problems) log(`  - ${p}`);
  }
  process.exit(problems.length ? 1 : 0);
}

main().catch((e) => {
  console.error('\nSMOKE RUN CRASHED:', e.message);
  if (problems.length) {
    console.error('problems logged before the crash:');
    for (const p of problems) console.error(`  - ${p}`);
  }
  process.exit(2);
});
