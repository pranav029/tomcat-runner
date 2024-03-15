import { join } from "path";
import * as fs from "fs";
import { CancellationToken, Uri, WebviewView, WebviewViewProvider, WebviewViewResolveContext } from "vscode";
import { TomcatConfig, TomcatRunner } from "./app";

export class WebProvider implements WebviewViewProvider {
    constructor(private _vscodeUri: Uri, private getRunner: (tomcatConfig: TomcatConfig) => TomcatRunner) { }
    resolveWebviewView(webviewView: WebviewView, context: WebviewViewResolveContext<unknown>, token: CancellationToken): void | Thenable<void> {
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.action) {
                case 'run':
                    console.log('Run event')
                    this.getRunner(message.instance).run()
                    return
                case 'stop':
                    console.log('Stop event')
                    this.getRunner(message.instance).stop()
                    return
            }
        })
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._vscodeUri
            ]
        }

        const workingDir = this._vscodeUri.path.substring(1, this._vscodeUri.fsPath.length + 1)
        console.log(workingDir)
        const indexFile = fs.readFileSync(join(workingDir, 'dist', 'ui', 'browser', 'index.html')).toString()
        const basePath = Uri.joinPath(this._vscodeUri, 'dist', 'ui', 'browser', '/')
        const baseUri = webviewView.webview.asWebviewUri(basePath)
        console.log(indexFile.replace('<base href="/">', `<base href="${baseUri}">`))
        webviewView.webview.html = indexFile.replace('<base href="/">', `<base href="${baseUri}">`)
    }

    check(message: any) {
        console.log(message)
    }

}

