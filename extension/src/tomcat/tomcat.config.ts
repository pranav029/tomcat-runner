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
    instanceId!: string;
    tomcatHome!: string;
    instanceName!: string;
    adminPort!: string;
    serverPort!: string;
    workingDir!: string;
    contextPath!: string;
    projectName!: string;
    processing: boolean = false;
    running: boolean = false;
    error: boolean = false
    errorMsg?: string
    public static from(tomcatConfig: TomcatConfig, processing?: boolean, running?: boolean, error?: boolean, errorMsg?: string): Instance {
        const instance: Instance = new Instance();
        instance.adminPort = tomcatConfig.adminPort
        instance.contextPath = tomcatConfig.contextPath
        instance.instanceName = tomcatConfig.instanceName
        instance.projectName = tomcatConfig.projectName
        instance.serverPort = tomcatConfig.serverPort
        instance.tomcatHome = tomcatConfig.tomcatHome
        instance.workingDir = tomcatConfig.workingDir
        if (processing)
            instance.processing = processing
        if (running)
            instance.running = running
        if (error)
            instance.error = error
        if (errorMsg)
            instance.errorMsg = errorMsg
        return instance
    }
}


