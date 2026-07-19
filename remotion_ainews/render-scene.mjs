/**
 * render-scene.mjs — Standalone Remotion scene renderer.
 * 
 * Usage: node render-scene.mjs <sceneType> <dataFile> <outputPath> [bundlePath]
 *
 * sceneType: "title" | "paperTitle" | "paperDemo" | "outro"
 * dataFile:  JSON file with scene props
 * outputPath: path to output .mp4 file
 * bundlePath: (optional) reuse existing bundle from a previous call
 *
 * TMP/TEMP env var must be set by the caller (render_remotion in pipeline.py)
 * to control where Node's os.tmpdir() writes the webpack bundle.
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Scene configurations
const SCENE_CONFIG = {
  title: {
    compositionId: 'title',
    durationInFrames: 120,
    inputPropsMapper: (data) => ({
      title: data.title || 'HuggingFace一周论文速览',
      dateRange: data.dateRange || '',
      tags: data.tags || [],
      weekNumber: data.weekNumber ?? 0,
    }),
  },
  paperTitle: {
    compositionId: 'paperTitle',
    durationInFrames: 96,
    inputPropsMapper: (data) => {
      let authorsStr = '';
      if (Array.isArray(data.authors)) {
        const names = data.authors
          .map((a) => (typeof a === 'string' ? a : a.name || ''))
          .filter(Boolean);
        authorsStr = names.length > 3
          ? names.slice(0, 3).join(', ') + ' et al.'
          : names.join(', ');
      } else if (typeof data.authors === 'string') {
        authorsStr = data.authors;
      }
      return {
        title: data.title || '',
        authors: authorsStr,
        institution: data.institution || data.organization || '',
        arxiv: data.arxiv || '',
        tag: data.tag || 'Paper',
      };
    },
  },
  paperDemo: {
    compositionId: 'paperDemo',
    inputPropsMapper: (data) => ({
      title: data.title || '',
      narration: data.narration || '',
      paperIndex: data.paperIndex ?? 0,
      tag: data.tag || 'Paper',
      arxiv: data.arxiv || '',
      github: data.github || '',
      metrics: data.metrics || [],
      frameCount: data.frameCount || 0,
      videoPath: data.videoPath || '',
    }),
  },
  outro: {
    compositionId: 'outro',
    durationInFrames: 60,
    inputPropsMapper: (data) => ({
      text: data.text || '欢迎关注\n下期再见',
    }),
  },
};

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3 || args.length > 4) {
    console.error('Usage: node render-scene.mjs <sceneType> <dataFile> <outputPath> [bundlePath]');
    process.exit(1);
  }

  const [sceneType, dataFile, outputPath, existingBundle] = args;
  const config = SCENE_CONFIG[sceneType];
  if (!config) {
    console.error(`Unknown scene type: ${sceneType}`);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  const inputProps = config.inputPropsMapper(rawData);

  // Determine duration
  let durationInFrames = -1;
  if (rawData.demoDurationFrames) {
    durationInFrames = rawData.demoDurationFrames;
  } else if (config.durationInFrames) {
    durationInFrames = config.durationInFrames;
  }
  if (!durationInFrames || durationInFrames < 0) durationInFrames = 120;

  const entryPoint = path.resolve(__dirname, 'src', 'index.ts');

  // Bundle ONCE — reuse if bundlePath provided
  let bundleLocation;
  if (existingBundle && fs.existsSync(existingBundle)) {
    bundleLocation = existingBundle;
    console.error(`  Reusing bundle: ${bundleLocation}`);
  } else {
    console.error(`  Bundling...`);
    bundleLocation = await bundle({
      entryPoint,
      webpackOverride: (cfg) => {
        if (cfg.resolve) {
          cfg.resolve.extensions = [...(cfg.resolve.extensions || []), '.ts', '.tsx'];
        }
        return cfg;
      },
    });
    console.error(`  Bundle at: ${bundleLocation}`);
  }

  console.error(`  Selecting composition "${config.compositionId}"...`);
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: config.compositionId,
    inputProps,
  });

  composition.durationInFrames = durationInFrames;

  console.error(`  Rendering ${composition.durationInFrames} frames...`);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: path.resolve(outputPath),
    inputProps,
  });

  const size = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;
  console.error(`  [OK] ${outputPath} (${(size / 1024).toFixed(0)} KB)`);
}

main().catch((err) => {
  console.error('  [ERROR] Render failed:', err.message);
  process.exit(1);
});
