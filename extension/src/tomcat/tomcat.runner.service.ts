import { OutputChannel } from "vscode";
import * as vscode from 'vscode';
import { TomcatRunnerUtils } from "./tomcat.runner.utils";
import { Instance, TomcatConfig } from "./tomcat.config";
import { EventHandler } from "../ui/event.handler";
import { ConfigManager } from "./config.manager";
import { ProcessManager } from "./process.manager";
import { ViewMountListener } from "./view.mount.listener";
import * as os from "os"
import { Constants } from "./constants";
import { ProjectState } from "../ui/resource";





export class TomcatRunnerService {
    logger!: OutputChannel
    private workspaceDir?: vscode.WorkspaceFolder
    private configManager?: ConfigManager
    private processManager?: ProcessManager
    private eventHandler: EventHandler
    private projectState: ProjectState = {
        projectName: "",
        projectType: "",
        error: false,
        instances: [],
        loading: false
    }

    constructor() {
        console.log(process.env.JAVA_HOME)
        console.log(os.type())
        this.eventHandler = new EventHandler()
        this.initObservers()
        this.updateState({ loading: true })
        this.eventHandler?.updateUiState(this.projectState)
        this.workspaceDir = vscode.workspace.workspaceFolders?.at(0)
        this.verifyProject()
    }

    private verifyProject() {
        if (!this.workspaceDir) {
            this.updateState({
                error: true,
                errorMsg: Constants.SOMETHING_WENT_WRONG
            })
            this.eventHandler.updateUiState(this.projectState)
            return
        }
        if (TomcatRunnerUtils.isMavenProject(this.workspaceDir?.uri)) {
            console.log('Maven project')
            this.updateState({ projectType: 'Maven Project' })
            if (this.workspaceDir?.uri.path)
                this.configManager = new ConfigManager(
                    this.onConfigReady,
                    this.onProjectConfigReady,
                    this.onSave,
                    this.onDelete,
                    this.workspaceDir?.uri.path.slice(1)
                )
            this.processManager = new ProcessManager()
        } else {
            console.log(Constants.NOT_MAVEN_PROJECT)
            this.updateState({
                error: true,
                errorMsg: Constants.NOT_MAVEN_PROJECT
            })
            this.eventHandler.updateUiState(this.projectState)
        }
    }


    private runInstance(instance: Instance) {
        if (!this.workspaceDir) return
        instance.projectName = this.workspaceDir.name
        instance.workingDir = this.workspaceDir.uri.path.slice(1)
        this.updateState({
            instances: this.projectState.instances?.map(inst => {
                if (inst.instanceId === instance.instanceId)
                    return Instance.from(instance, true)
                return inst
            })
        })
        this.eventHandler?.updateInstance(Instance.from(instance, true))
        this.configManager?.setupConfig(instance)
    }

    private onConfigReady = (tomcatConfig: TomcatConfig) => {
        this.runTomcat(tomcatConfig)
    }

    private onProjectConfigReady = (error: boolean, message?: string) => {
        if (error && message != Constants.NO_CONFIG_FOUND) {
            this.updateState({
                error: true,
                errorMsg: message ? message : Constants.SOMETHING_WENT_WRONG
            })
            this.eventHandler.updateUiState(this.projectState)
            return
        }
        this.updateState({
            instances: this.configManager?.getInstances()
                .map(inst => Instance.from(inst)) || []
        })
        this.eventHandler.updateUiState(this.projectState)
    }

    private onSave = (success: boolean, tomcatConfig: TomcatConfig) => {
        if (success) {
            this.updateState({
                instances: this.projectState.instances?.map(inst => {
                    if (tomcatConfig.instanceId === inst.instanceId)
                        return Instance.from(tomcatConfig)
                    return inst
                })
            })
        }
        this.eventHandler.updateInstance(Instance.from(tomcatConfig))
    }

    private onDelete = (sucess: boolean, tomcatConfig: TomcatConfig) => {

    }

    private stopInstance = (tomcatConfig: TomcatConfig) => {
        const stopCommand = TomcatRunnerUtils.getStopCommand(tomcatConfig)
        this.eventHandler?.updateInstance(Instance.from(tomcatConfig, true))
        this.processManager?.kill(tomcatConfig.instanceName, stopCommand, () => {
            this.eventHandler?.updateInstance(Instance.from(tomcatConfig))
        })
    }


    private runTomcat(tomcatConfig: TomcatConfig) {
        const startCommand = TomcatRunnerUtils.getStartCommand(tomcatConfig, true)
        const stopCommand = TomcatRunnerUtils.getStopCommand(tomcatConfig)
        this.processManager?.stopServer(stopCommand, () => {
            const process = this.processManager?.execute(tomcatConfig.instanceName, startCommand)
            this.logger = vscode.window.createOutputChannel(tomcatConfig.instanceName)
            this.logger.show()
            this.eventHandler?.updateInstance(Instance.from(tomcatConfig, false, true))
            let debug = true
            process?.on('spawn', () => {
                this.eventHandler?.updateInstance(Instance.from(tomcatConfig, false, true))
            })
            process?.stdout?.on('data', (data) => {
                if (debug) {
                    vscode.debug.startDebugging(this.workspaceDir, {
                        type: 'java',
                        name: 'Debug (Attach)',
                        projectName: tomcatConfig.projectName,
                        request: 'attach',
                        hostName: 'localhost',
                        port: '8090'
                    })
                    debug = false
                }
                this.logger.appendLine(data.toString())
            })
            process?.stderr?.on('data', (data) => {
                this.logger.appendLine(data.toString())
                if (TomcatRunnerUtils.isServerUp(data))
                    this.logger.appendLine(TomcatRunnerUtils.getServerLink(tomcatConfig))
            })
            process?.on('close', (data) => {
                this.logger.appendLine(`Process exited with code ${data}`)
                this.eventHandler?.updateInstance(Instance.from(tomcatConfig))
            })
        })
    }

    private initObservers() {
        this.eventHandler?.observe(event => {
            console.log(event)
            switch (event.action) {
                case Constants.EVENT_RUN:
                    console.log('Run event')
                    this.runInstance(event.instance)
                    return
                case Constants.EVENT_STOP:
                    console.log('Stop event')
                    this.stopInstance(event.instance)
                    return
                case Constants.EVENT_SAVE:
                    event.instance.projectName = this.workspaceDir?.name
                    this.eventHandler?.updateInstance(Instance.from(event.instance, true))
                    this.configManager?.save(event.instance)
                    return
                case Constants.EVENT_DELETE:
                    this.configManager?.delete(event.instance)
                    return
                case 'ui-init':
                    this.eventHandler.updateUiState(this.projectState)
                    return
                case 'test':
                    console.log(event.instance)
                    return
            }
        })
    }

    protected getViewMountListener(): ViewMountListener {
        this.updateState({})
        return this.eventHandler
    }

    private updateState(newState: ProjectState) {
        if (newState.projectName)
            this.projectState.projectName = newState.projectName
        if (newState.projectType)
            this.projectState.projectType = newState.projectType
        if (newState.error)
            this.projectState.error = newState.error
        if (newState.errorMsg)
            this.projectState.errorMsg = newState.errorMsg
        if (newState.instances)
            this.projectState.instances = newState.instances
    }
}


