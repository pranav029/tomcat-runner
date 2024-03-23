export class TomcatConfig {
    tomcatHome!: string;
    instanceName!: string;
    adminPort!: string
    serverPort!: string;
    workingDir!: string;
    contextPath!: string;
    projectName!: string;
}


export class Instance extends TomcatConfig {
    private constructor() {
        super();
    }
    processing: boolean = false;
    running: boolean = false;
    public static from(tomcatConfig: TomcatConfig, processing?: boolean, running?: boolean): Instance {
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
        return instance
    }
}


