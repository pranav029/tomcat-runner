import { Webview } from "vscode";
import { EventHandler } from "../ui/event.handler";

export interface ViewMountListener {
    onViewMount(webview: Webview): void
    onViewDestroy(): void
}