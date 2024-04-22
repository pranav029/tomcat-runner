export interface TomcatConfig {
    instanceId: string
    tomcatHome: string;
    instanceName: string;
    adminPort: string
    serverPort: string;
    workingDir: string;
    contextPath: string;
    projectName: string;
}


export class Instance implements TomcatConfig {
    instanceId: string = '';
    tomcatHome!: string;
    instanceName!: string;
    adminPort!: string;
    serverPort!: string;
    workingDir!: string;
    contextPath!: string;
    projectName!: string;
    state: InstanceState = InstanceState.IDLE
    error: boolean = false
    errorMsg?: string
    public static from(tomcatConfig: TomcatConfig, state?: InstanceState, error?: Error): Instance {
        const instance: Instance = new Instance();
        instance.adminPort = tomcatConfig.adminPort
        instance.contextPath = tomcatConfig.contextPath
        instance.instanceName = tomcatConfig.instanceName
        instance.projectName = tomcatConfig.projectName
        instance.serverPort = tomcatConfig.serverPort
        instance.tomcatHome = tomcatConfig.tomcatHome
        instance.workingDir = tomcatConfig.workingDir
        instance.instanceId = tomcatConfig.instanceId
        if (state != undefined)
            instance.state = state
        if (error) {
            instance.error = true
            instance.errorMsg = error.message
        }
        // console.log(instance)
        return instance
    }
}

export enum InstanceState {
    PROCESSING,
    RUNNING,
    DEBUGGING,
    IDLE
}

export class Error {
    private _message!: string;
    private constructor(_message: string) {
        this._message = _message
    }
    public get message(): string {
        return this._message
    }
    public static message = (message: string) => new Error(message)
}


