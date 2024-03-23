import { EventHandler } from "../ui/event.handler";

export interface ViewMountListener {
    onViewMount(eventHandler: EventHandler): void
}