import { OutputChannel } from "vscode";
import * as vscode from 'vscode';
import { TomcatRunnerUtils } from "./tomcat.runner.utils";
import { Instance, TomcatConfig } from "./tomcat.config";
import { EventHandler } from "../ui/event.handler";
import { ConfigManager } from "./config.manager";
import { ProcessManager } from "./process.manager";
import { ViewMountListener } from "./view.mount.listener";
import * as os from "os"




export class TomcatRunnerService {
    logger!: OutputChannel
    private workspaceDir?: vscode.WorkspaceFolder
    private configManager?: ConfigManager
    private processManager?: ProcessManager
    private eventHandler: EventHandler

    constructor() {
        console.log(process.env.JAVA_HOME)
        console.log(os.type())
        this.eventHandler = new EventHandler()
        this.initObservers()
        this.eventHandler?.loadingProject()
        this.workspaceDir = vscode.workspace.workspaceFolders?.at(0)
        this.verifyProject()
    }

    private verifyProject() {
        if (!this.workspaceDir) {
            this.eventHandler?.noProjectFound('Not a Maven Project')
            return
        }
        if (TomcatRunnerUtils.isMavenProject(this.workspaceDir?.uri)) {
            console.log('Maven project')
            if (this.workspaceDir?.uri.path)
                this.configManager = new ConfigManager(this.onConfigReady, this.workspaceDir?.uri.path.slice(1))
            this.processManager = new ProcessManager()
            this.readProjectConfig()
        } else {
            console.log('Not a maven project')
            this.eventHandler?.noProjectFound('Not a Maven Project HEHE')
        }
    }

    private readProjectConfig() {
        this.eventHandler?.projectLoaded([])
    }

    private runInstance(instance: Instance) {
        console.log(instance)
        if (!this.workspaceDir) return
        instance.projectName = this.workspaceDir.name
        instance.workingDir = this.workspaceDir.uri.path.slice(1)
        this.eventHandler?.updateInstance(Instance.from(instance, true))
        this.configManager?.setupConfig(instance)
    }

    private onConfigReady = (tomcatConfig: TomcatConfig) => {
        this.runTomcat(tomcatConfig)
    }

    private stopInstance = (tomcatConfig: TomcatConfig) => {
        const stopCommand = TomcatRunnerUtils.getStopCommand(tomcatConfig)
        this.eventHandler?.updateInstance(Instance.from(tomcatConfig, true))
        this.processManager?.kill(tomcatConfig.instanceName, stopCommand, () => {
            this.eventHandler?.updateInstance(Instance.from(tomcatConfig))
        })
    }


    private runTomcat(tomcatConfig: TomcatConfig) {
        const startCommand = TomcatRunnerUtils.getStartCommand(tomcatConfig)
        const stopCommand = TomcatRunnerUtils.getStopCommand(tomcatConfig)
        const process = this.processManager?.execute(tomcatConfig.instanceName, startCommand)
        this.processManager?.stopServer(stopCommand, () => {
            this.logger = vscode.window.createOutputChannel(tomcatConfig.instanceName)
            this.logger.show()
            this.eventHandler?.updateInstance(Instance.from(tomcatConfig, false, true))
            process?.on('spawn', () => {
                this.eventHandler?.updateInstance(Instance.from(tomcatConfig, false, true))
            })
            process?.stdout?.on('data', (data) => {
                this.logger.appendLine(data.toString())
            })
            process?.stderr?.on('data', (data) => {
                this.logger.appendLine(data.toString())
                if (TomcatRunnerUtils.isServerUp(data))
                    this.logger.appendLine(TomcatRunnerUtils.getServerLink(tomcatConfig))
            })
            process?.on('close', (data) => {
                this.eventHandler?.updateInstance(Instance.from(tomcatConfig))
            })
        })
    }

    private initObservers() {
        this.eventHandler?.observe(event => {
            switch (event.action) {
                case 'run':
                    console.log('Run event')
                    this.runInstance(event.instance)
                    return
                case 'stop':
                    console.log('Stop event')
                    this.stopInstance(event.instance)
                    return
                case 'save':
                    return
                case 'delete':
                    return
                case 'test':
                    console.log(event.instance)
                    return
            }
        })
    }

    protected getViewMountListener(): ViewMountListener {
        return this.eventHandler
    }
}


