import { v4 as uuid } from "uuid"
export class Instance {
    instanceId: string
    tomcatHome: string = ''
    instanceName: string = ''
    serverPort: string = ''
    adminPort: string = ''
    contextPath: string = '/'
    projectName: string = ''
    state:InstanceState = InstanceState.IDLE
    isSaved: boolean = false

    constructor() {
        this.instanceId = uuid()
    }
}

export enum InstanceState {
    PROCESSING,
    RUNNING,
    DEBUGGING,
    IDLE
}