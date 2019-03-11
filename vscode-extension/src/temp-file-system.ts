import * as fs from 'fs-extra';
import { join } from 'path';

import Sockets from './utils/socket';
import Utils from './utils/utils';
import Watcher from './utils/watcher';

export default class TempFileSystem {
    /**
     * Constructor
     */
    constructor () {
        // Register events
        Sockets.OnDisconnect = (async () => {
            await this._removeDirectory('behaviors');
            await this._removeDirectory('materials');
            await this._removeDirectory('post-processes');
        });

        Sockets.OnGotProject = (async p => {
            // Clear and create directory
            await this._clearDirectory('typings');
            await this._createDirectory('typings');

            // Write files
            await fs.writeFile(join(Utils.TempFolder, 'tsconfig.json'), Buffer.from(p.tsconfig));
            await fs.writeFile(join(Utils.TempFolder, 'typings/babylon.module.d.ts'), Buffer.from(p.babylonjs));
            await fs.writeFile(join(Utils.TempFolder, 'typings/babylonjs.materials.module.d.ts'), Buffer.from(p.babylonjs_materials));
            await fs.writeFile(join(Utils.TempFolder, 'typings/tools.d.ts'), Buffer.from(p.tools));
            await fs.writeFile(join(Utils.TempFolder, 'typings/mobile.d.ts'), Buffer.from(p.mobile));
            await fs.writeFile(join(Utils.TempFolder, 'typings/path-finder.d.ts'), Buffer.from(p.pathFinder));
        });

        Sockets.OnGotBehaviorCodes = (async scripts => {
            // Clear
            Array.isArray(scripts) && await this._clearDirectory('behaviors');

            // Transform to array
            scripts = Array.isArray(scripts) ? scripts : [scripts];

            // Write scripts
            scripts.forEach(async s => {
                // Write
                const filename = join(Utils.TempFolder, 'behaviors', s.name + '.ts');
                await fs.writeFile(filename, Buffer.from(s.code));

                // Watch
                Watcher.WatchFile(filename, async () => {
                    Sockets.UpdateBehaviorCode({
                        id: s.id,
                        name: s.name,
                        code: await fs.readFile(filename, { encoding: 'utf-8' })
                    });
                });
            });
        });

        Sockets.OnGotMaterialCodes = (async scripts => {
            // Clear
            Array.isArray(scripts) && await this._clearDirectory('materials');
            // Transform to array
            scripts = Array.isArray(scripts) ? scripts : [scripts];

            // Write scripts
            scripts.forEach(async s => {
                // Create directory
                const root = join(Utils.TempFolder, 'materials');
                const matRoot = join(root, s.name);
                await this._createDirectory('materials/' + s.name);

                // Code
                const code = join(matRoot, s.name + '.ts');
                await Watcher.WriteAndWatchFile(code, Buffer.from(s.code), async () => {
                    Sockets.UpdateMaterialCode({
                        id: s.id,
                        name: s.name,
                        code: await fs.readFile(code, { encoding: 'utf-8' })
                    });
                });

                // Pixel
                const pixel = join(matRoot, s.name + '.fragment.fx');
                await Watcher.WriteAndWatchFile(pixel, Buffer.from(s.pixel), async () => {
                    Sockets.UpdateMaterialCode({
                        id: s.id,
                        name: s.name,
                        pixel: await fs.readFile(pixel, { encoding: 'utf-8' })
                    });
                });

                // Vertex
                const vertex = join(matRoot, s.name + '.vertex.fx');
                await Watcher.WriteAndWatchFile(vertex, Buffer.from(s.vertex), async () => {
                    Sockets.UpdateMaterialCode({
                        id: s.id,
                        name: s.name,
                        vertex: await fs.readFile(vertex, { encoding: 'utf-8' })
                    });
                });

                // Config
                const config = join(matRoot, s.name + '.config.json');
                await Watcher.WriteAndWatchFile(config, Buffer.from(s.config), async () => {
                    Sockets.UpdateMaterialCode({
                        id: s.id,
                        name: s.name,
                        config: await fs.readFile(config, { encoding: 'utf-8' })
                    });
                });
            });
        });

        Sockets.OnGotPostProcessCodes = (async scripts => {
            // Clear
            Array.isArray(scripts) && await this._clearDirectory('post-processes');
            // Transform to array
            scripts = Array.isArray(scripts) ? scripts : [scripts];

            // Write scripts
            scripts.forEach(async s => {
                // Create directory
                const root = join(Utils.TempFolder, 'post-processes');
                const ppRoot = join(root, s.name);
                await this._createDirectory('post-processes/' + s.name);

                // Code
                const code = join(ppRoot, s.name + '.ts');
                await Watcher.WriteAndWatchFile(code, Buffer.from(s.code), async () => {
                    Sockets.UpdatePostProcessCode({
                        id: s.id,
                        name: s.name,
                        code: await fs.readFile(code, { encoding: 'utf-8' })
                    });
                });

                // Pixel
                const pixel = join(ppRoot, s.name + '.fragment.fx');
                await Watcher.WriteAndWatchFile(pixel, Buffer.from(s.pixel), async () => {
                    Sockets.UpdatePostProcessCode({
                        id: s.id,
                        name: s.name,
                        pixel: await fs.readFile(pixel, { encoding: 'utf-8' })
                    });
                });

                // Config
                const config = join(ppRoot, s.name + '.config.json');
                await Watcher.WriteAndWatchFile(config, Buffer.from(s.config), async () => {
                    Sockets.UpdatePostProcessCode({
                        id: s.id,
                        name: s.name,
                        config: await fs.readFile(config, { encoding: 'utf-8' })
                    });
                });
            });
        });
    }

    /**
     * Inits the temp folder
     */
    public async init (): Promise<void> {
        // Structure
        await this._createDirectory('');
        await this._createDirectory('behaviors');
        await this._createDirectory('materials');
        await this._createDirectory('post-processes');
    }

    // Creates a directory
    private async _createDirectory (dirname: string): Promise<void> {
        const path = join(Utils.TempFolder, dirname);
        if (!fs.existsSync(path))
            await fs.mkdir(join(Utils.TempFolder, dirname));
    }

    // Clears the temp directory
    private async _clearDirectory (dirname: string): Promise<void> {
        const path = join(Utils.TempFolder, dirname);
        const exists = fs.existsSync(path);
        if (!exists)
            return;

        const files = await fs.readdir(path);
        for (const f of files) {
            const filename = join(Utils.TempFolder, dirname, f);
            const statf = await fs.stat(filename);
            if (statf.isDirectory()) {
                this._clearDirectory(join(dirname, f));
                await fs.remove(filename);
            } else {
                await fs.unlink(filename);
            }
        }
    }

    // Removes the given directory
    private async _removeDirectory (dirname: string): Promise<void> {
        await this._clearDirectory(dirname);
        await fs.remove(join(Utils.TempFolder, dirname));
    }
}