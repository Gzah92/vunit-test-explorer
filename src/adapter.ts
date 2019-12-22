/* ------------------------------------------------------------------------------------------
 * MIT License
 * Copyright (c) 2019 Henrik Bohlin
 * Full license text can be found in /LICENSE or at https://opensource.org/licenses/MIT.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import {
    TestAdapter,
    TestLoadStartedEvent,
    TestLoadFinishedEvent,
    TestRunStartedEvent,
    TestRunFinishedEvent,
    TestSuiteInfo,
    TestSuiteEvent,
    TestEvent,
} from 'vscode-test-adapter-api';
import { Log } from 'vscode-test-adapter-util';
import {
    loadVunitTests,
    runVunitTests,
    cancelRunVunitTests,
    runVunitTestsInGui,
} from './vunit';

export class VUnitAdapter implements TestAdapter {
    private disposables: { dispose(): void }[] = [];

    private readonly testsEmitter = new vscode.EventEmitter<
        TestLoadStartedEvent | TestLoadFinishedEvent
    >();
    private readonly testStatesEmitter = new vscode.EventEmitter<
        TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent
    >();
    private readonly autorunEmitter = new vscode.EventEmitter<void>();

    private loadedTests: TestSuiteInfo = {
        type: 'suite',
        id: 'root',
        label: 'VUnit',
        children: [],
    };

    get tests(): vscode.Event<TestLoadStartedEvent | TestLoadFinishedEvent> {
        return this.testsEmitter.event;
    }
    get testStates(): vscode.Event<
        TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent
    > {
        return this.testStatesEmitter.event;
    }
    get autorun(): vscode.Event<void> | undefined {
        return this.autorunEmitter.event;
    }

    constructor(
        public readonly workspace: vscode.WorkspaceFolder,
        private readonly workDir: string,
        private readonly log: Log
    ) {
        this.log.info('Initializing VUnit adapter');

        this.disposables.push(this.testsEmitter);
        this.disposables.push(this.testStatesEmitter);
        this.disposables.push(this.autorunEmitter);
    }

    async load(): Promise<void> {
        this.log.info('Loading VUnit tests');

        this.testsEmitter.fire(<TestLoadStartedEvent>{ type: 'started' });

        this.loadedTests = await loadVunitTests(this.workDir);

        this.testsEmitter.fire(<TestLoadFinishedEvent>{
            type: 'finished',
            suite: this.loadedTests,
        });
    }

    async run(tests: string[]): Promise<void> {
        this.log.info(`Running VUnit tests ${JSON.stringify(tests)}`);

        this.testStatesEmitter.fire(<TestRunStartedEvent>{
            type: 'started',
            tests,
        });

        // in a "real" TestAdapter this would start a test run in a child process
        await runVunitTests(tests, this.testStatesEmitter, this.loadedTests);

        this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: 'finished' });
    }

    // Run test in GUI
    async debug(tests: string[]): Promise<void> {
        runVunitTestsInGui(tests, this.loadedTests);
    }

    cancel(): void {
        cancelRunVunitTests();
    }

    dispose(): void {
        this.cancel();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }
}