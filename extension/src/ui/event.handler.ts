import { Webview, WebviewView } from "vscode";
import { Instance, TomcatConfig } from "../tomcat/tomcat.config";
import { Subject, Observable, BehaviorSubject, Subscription, filter } from "rxjs"
import { subscribe } from "diagnostics_channel";
import { ViewMountListener } from "../tomcat/view.mount.listener";
import { ProjectState } from "./resource";

const PROJECT_LOADING = 'loading-project'
const UPDATE_INSTANCE = 'update-instance'
const INSTANCES = 'instances'
const PROJECT_LOADED = 'project-loaded'
const PROJECT_ERROR = 'project-error'
const NO_PROJECT_FOUND_MESSAGE = 'No project found in the workspace'
const UI_STATE_UPDATE = 'ui-state-update'


export class EventHandler implements ViewMountListener {
    private uiEvents: BehaviorSubject<any>;
    private backendEvents: BehaviorSubject<any>;
    private backendEventSubscription?: Subscription
    private webview?: Webview | null = null

    constructor() {
        this.uiEvents = new BehaviorSubject(null)
        this.backendEvents = new BehaviorSubject(null)
    }
    onViewDestroy(): void {
        console.log('View destroyed')
        this.webview = null
        this.backendEventSubscription?.unsubscribe()
    }

    onViewMount(webview: Webview): void {
        console.log('Webview mount event')
        this.webview = webview
        this.backendEventSubscription?.unsubscribe()
        this.observeBackendEvents()
        this.observeUiEvents()
    }

    observe(send: (event: any) => void) {
        this.uiEvents.asObservable().pipe(
            filter(event => event != null),
        ).subscribe(send)
    }

    loadingProject() {
        this.backendEvents.next({ type: PROJECT_LOADING })
    }

    projectLoaded(instances: Instance[]) {
        this.backendEvents.next({ type: PROJECT_LOADED, data: instances })
    }

    updateUiState(projectState: ProjectState) {
        this.backendEvents.next({ type: UI_STATE_UPDATE, data: projectState })
    }

    error(message: String) {
        this.backendEvents.next({ type: PROJECT_ERROR, data: message })
    }

    updateInstance(instance: Instance) {
        console.log('Updating..... \n', instance)
        this.backendEvents.next({ type: UPDATE_INSTANCE, data: instance })
    }

    private observeBackendEvents() {
        if (!this.webview) return
        this.backendEventSubscription = this.backendEvents.asObservable()
            .pipe(
                filter(event => event != null)
            )
            .subscribe((event: any) => {
                this.webview?.postMessage(event)
            })
    }

    private observeUiEvents() {
        this.webview?.onDidReceiveMessage(event => {
            this.uiEvents.next(event)
        })
    }
}