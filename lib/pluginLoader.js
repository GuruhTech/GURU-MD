import fs from 'fs/promises';
import path from 'path';

export const commands = new Map();
export const features = [];

async function loadDir(dir, isFeature = false) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await loadDir(full, isFeature);
    } else if (entry.name.endsWith('.js')) {
      try {
        const mod = await import(`file://${full}`);
        if (isFeature && typeof mod.default === 'function') {
          // features run once on connect
          features.push(entry.name);
        } else if (mod.default?.cmd) {
          const cmdList = Array.isArray(mod.default.cmd) ? mod.default.cmd : [mod.default.cmd];
          cmdList.forEach(c => {
            commands.set(c.toLowerCase(), {
              run: mod.default.run || mod.default.handler,
              desc: mod.default.desc || "No desc",
              cat: mod.default.cat || path.basename(path.dirname(full))
            });
          });
        }
      } catch (e) {
        console.log(`Plugin error ${entry.name}: ${e}`);
      }
    }
  }
}

export async function loadAllPlugins() {
  commands.clear();
  features.length = 0;

  await loadDir('./plugins/features', true);
  await loadDir('./plugins/commands');

  console.log(`[BOT GURU] Loaded ${commands.size} commands + ${features.length} features`);
}
