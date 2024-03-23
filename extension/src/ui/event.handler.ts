import { Webview, WebviewView } from "vscode";
import { Instance, TomcatConfig } from "../tomcat/tomcat.config";
import { Subject, Observable } from "rxjs"

const PROJECT_LOADING = 'project-loading'
const UPDATE_INSTANCE = 'update-instance'
const INSTANCES = 'instances'
const PROJECT_LOADED = 'project-loaded'
const NO_PROJECT_FOUND = 'no-project-found'
const NO_PROJECT_FOUND_MESSAGE = 'No project found in the workspace'

export class EventHandler {
    constructor(private webview: Webview) { }
    observe(send: (event: any) => void) {
        this.webview.onDidReceiveMessage(send)
    }

    loadingProject() {
        this.webview.postMessage({ type: PROJECT_LOADING })
    }

    projectLoaded(instances: Instance[]) {
        this.webview.postMessage({ type: PROJECT_LOADED, data: instances })
    }

    noProjectFound(message: String) {
        console.log('sending ' + message)
        this.webview.postMessage({ type: NO_PROJECT_FOUND, data: message })
    }

    updateInstance(instance: Instance) {
        this.webview.postMessage({ type: UPDATE_INSTANCE, data: instance })
    }
}