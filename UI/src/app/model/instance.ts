import { v4 as uuid } from "uuid"
export class Instance {
    instanceId: string
    tomcatHome: string = ''
    instanceName: string = ''
    serverPort: string = ''
    adminPort: string = ''
    contextPath: string = '/'
    projectName: string = ''
    processing: boolean = false
    running: boolean = false
    isSaved: boolean = false

    constructor() {
        this.instanceId = uuid()
    }
}