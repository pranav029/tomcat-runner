import * as fs from "fs";
import { CancellationToken, Uri, WebviewView, WebviewViewProvider, WebviewViewResolveContext } from "vscode";
import { TomcatRunnerService } from "../tomcat/tomcat.runner.service";

export class WebProvider extends TomcatRunnerService implements WebviewViewProvider {

    constructor(private _vscodeUri: Uri) {
        super()
    }

    resolveWebviewView(webviewView: WebviewView, context: WebviewViewResolveContext<unknown>, token: CancellationToken): void | Thenable<void> {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._vscodeUri
            ]
        }
        webviewView
        webviewView.onDidDispose(this.getViewMountListener().onViewDestroy)
        const workingDir = Uri.joinPath(this._vscodeUri, 'dist', 'ui', 'browser')
        const indexFile = fs.readFileSync(Uri.joinPath(workingDir, 'index.html').path.slice(1)).toString()
        const basePath = Uri.joinPath(workingDir, '/')
        const baseUri = webviewView.webview.asWebviewUri(basePath)
        webviewView.webview.html = indexFile.replace('<base href="/">', `<base href="${baseUri}">`)
        this.getViewMountListener().onViewMount(webviewView.webview)
    }
}

