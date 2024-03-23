import * as fs from "fs";
import { CancellationToken, Uri, WebviewView, WebviewViewProvider, WebviewViewResolveContext } from "vscode";
import { TomcatRunnerService } from "../tomcat/tomcat.runner.service";
import { TomcatConfig } from "../tomcat/tomcat.config";
import { EventHandler } from "./event.handler";

export class WebProvider implements WebviewViewProvider {
    private tomcatRunnerService: TomcatRunnerService
    constructor(private _vscodeUri: Uri) {
        this.tomcatRunnerService = new TomcatRunnerService()
    }
    resolveWebviewView(webviewView: WebviewView, context: WebviewViewResolveContext<unknown>, token: CancellationToken): void | Thenable<void> {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._vscodeUri
            ]
        }
        const workingDir = Uri.joinPath(this._vscodeUri, 'dist', 'ui', 'browser')
        const indexFile = fs.readFileSync(Uri.joinPath(workingDir, 'index.html').path.slice(1)).toString()
        const basePath = Uri.joinPath(workingDir, '/')
        const baseUri = webviewView.webview.asWebviewUri(basePath)
        webviewView.webview.html = indexFile.replace('<base href="/">', `<base href="${baseUri}">`)
        const viewMountListener = this.tomcatRunnerService
        viewMountListener.onViewMount(new EventHandler(webviewView.webview))
    }
}

