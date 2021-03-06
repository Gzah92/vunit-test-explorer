/* ------------------------------------------------------------------------------------------
 * MIT License
 * Copyright (c) 2019 Henrik Bohlin
 * Full license text can be found in /LICENSE or at https://opensource.org/licenses/MIT.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import { TestHub, testExplorerExtensionId } from 'vscode-test-adapter-api';
import { Log, TestAdapterRegistrar } from 'vscode-test-adapter-util';
import { VUnitAdapter } from './adapter';
import * as path from 'path';
import * as fs from 'fs';

export async function activate(context: vscode.ExtensionContext) {
    const workspaceFolder = (vscode.workspace.workspaceFolders || [])[0];
    const workDir = path.join(context.globalStoragePath, 'workdir');
    fs.mkdirSync(workDir, { recursive: true });
    const log = new Log('vunit', workspaceFolder, 'VUnit Explorer Log');
    context.subscriptions.push(log);

    // get the Test Explorer extension
    const testExplorerExtension = vscode.extensions.getExtension<TestHub>(
        testExplorerExtensionId
    );
    if (log.enabled)
        log.info(`Test Explorer ${testExplorerExtension ? '' : 'not '}found`);

    if (testExplorerExtension) {
        const testHub = testExplorerExtension.exports;

        context.subscriptions.push(
            new TestAdapterRegistrar(
                testHub,
                workspaceFolder =>
                    new VUnitAdapter(workspaceFolder, workDir, log),
                log
            )
        );
    }
}
