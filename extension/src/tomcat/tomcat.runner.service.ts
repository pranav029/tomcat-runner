import { OutputChannel } from "vscode";
import * as vscode from 'vscode';
import { TomcatRunnerUtils } from "./tomcat.runner.utils";
import { Instance, InstanceState, TomcatConfig } from "./tomcat.config";
import { EventHandler } from "../ui/event.handler";
import { ConfigManager } from "./config.manager";
import { ProcessManager } from "./process.manager";
import { ViewMountListener } from "./view.mount.listener";
import * as os from "os"
import { Constants } from "./constants";
import { ProjectState } from "../ui/resource";
import { timeout } from "rxjs";





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


    private runInstance(config: { [key: string]: any }) {
        const instance: Instance = config.tomcatConfig
        if (!this.workspaceDir) return
        instance.projectName = this.workspaceDir.name
        instance.workingDir = this.workspaceDir.uri.path.slice(1)
        this.updateState({
            instances: this.projectState.instances?.map(inst => {
                if (inst.instanceId === instance.instanceId)
                    return Instance.from(instance, InstanceState.PROCESSING)
                return inst
            })
        })
        this.eventHandler?.updateInstance(Instance.from(instance, InstanceState.PROCESSING))
        this.configManager?.setupConfig(config)
    }

    private onConfigReady = (success: boolean, config: { [key: string]: any }) => {
        if (!success) {
            this.eventHandler.updateInstance(Instance.from(config.tomcatConfig))
            return
        }
        this.runTomcat(config.tomcatConfig, config.debug)
    }

    private onProjectConfigReady = (error: boolean, message?: string) => {
        if (error && message != Constants.NO_CONFIG_FOUND) {
            this.updateState({
                error: true,
                errorMsg: message ? message : Constants.SOMETHING_WENT_WRONG
            })
        }
        else this.updateState({
            instances: this.configManager?.getInstances()
                .map(inst => Instance.from(inst)) || []
        })
        this.eventHandler.updateUiState(this.projectState)
        console.log(this.projectState)
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
            const exists = this.projectState.instances?.find(inst => inst.instanceId == tomcatConfig.instanceId)
            if (!exists)
                this.updateState({
                    instances: this.projectState.instances?.concat(Instance.from(tomcatConfig)) || []
                })
            this.eventHandler.updateUiState(this.projectState)
            vscode.window.showInformationMessage('Save success')
            return
        }
        vscode.window.showErrorMessage('Save failure')
        this.eventHandler.updateInstance(Instance.from(tomcatConfig))
    }

    private onDelete = (sucess: boolean, tomcatConfig: TomcatConfig) => {

    }

    private stopInstance = (tomcatConfig: TomcatConfig) => {
        const stopCommand = TomcatRunnerUtils.getStopCommand(tomcatConfig)
        this.eventHandler?.updateInstance(Instance.from(tomcatConfig, InstanceState.PROCESSING))
        this.processManager?.kill(tomcatConfig.instanceName, stopCommand, () => {
            this.eventHandler?.updateInstance(Instance.from(tomcatConfig))
        })
    }


    private runTomcat(tomcatConfig: TomcatConfig, debug: boolean) {
        const startCommand = TomcatRunnerUtils.getStartCommand(tomcatConfig, debug)
        const stopCommand = TomcatRunnerUtils.getStopCommand(tomcatConfig)
        let startDebug = debug
        this.processManager?.stopServer(stopCommand, () => {
            const process = this.processManager?.execute(tomcatConfig.instanceName, startCommand)
            const logger = vscode.window.createOutputChannel(tomcatConfig.instanceName)
            logger.show()
            this.updateState({
                instances: this.projectState.instances?.map(inst => {
                    if (inst.instanceId === tomcatConfig.instanceId)
                        return Instance.from(tomcatConfig, debug ? InstanceState.DEBUGGING : InstanceState.RUNNING)
                    return inst
                })
            })
            this.eventHandler?.updateInstance(Instance.from(tomcatConfig, debug ? InstanceState.DEBUGGING : InstanceState.RUNNING))
            process?.on('spawn', () => {
                // this.eventHandler?.updateInstance(Instance.from(tomcatConfig, InstanceState.RUNNING))
            })
            process?.stdout?.on('data', (data) => {
                if (startDebug) {
                    vscode.debug.stopDebugging()
                    vscode.debug.startDebugging(this.workspaceDir, {
                        type: 'java',
                        name: 'Debug (Attach)',
                        projectName: tomcatConfig.projectName,
                        request: 'attach',
                        hostName: 'localhost',
                        port: '8090'
                    })
                    startDebug = false
                }
                logger.appendLine(data.toString())
            })
            process?.stderr?.on('data', (data) => {
                logger.appendLine(data.toString())
                if (TomcatRunnerUtils.isServerUp(data))
                    logger.appendLine(TomcatRunnerUtils.getServerLink(tomcatConfig))
            })
            process?.on('close', (data) => {
                logger.appendLine(`Process exited with code ${data}`)
                this.updateState({
                    instances: this.projectState.instances?.map(inst => {
                        if (inst.instanceId === tomcatConfig.instanceId)
                            return Instance.from(tomcatConfig)
                        return inst
                    })
                })
                this.eventHandler?.updateInstance(Instance.from(tomcatConfig))
            })
        })
    }

    private initObservers() {
        this.eventHandler?.observe(event => {
            switch (event.action) {
                case Constants.EVENT_RUN:
                    console.log('Run event')
                    this.runInstance({
                        debug: false,
                        tomcatConfig: event.instance
                    })
                    return
                case Constants.EVENT_STOP:
                    console.log('Stop event')
                    this.stopInstance(event.instance)
                    return
                case Constants.EVENT_SAVE:
                    event.instance.projectName = this.workspaceDir?.name
                    this.eventHandler?.updateInstance(Instance.from(event.instance, InstanceState.PROCESSING))
                    setTimeout(() => {
                        this.configManager?.save(event.instance)
                    }, 5000)
                    return
                case Constants.EVENT_DELETE:
                    this.configManager?.delete(event.instance)
                    return
                case Constants.UI_INIT:
                    this.eventHandler.loadingProject()
                    this.eventHandler.updateUiState(this.projectState)
                    return
                case Constants.DEBUG:
                    console.log('Debug event')
                    this.runInstance({
                        debug: true,
                        tomcatConfig: event.instance
                    })
                    return
                case 'test':
                    console.log(event)
                    return
            }
        })
    }

    protected getViewMountListener(): ViewMountListener {
        this.updateState({})
        return this.eventHandler
    }

    private updateState(newState: ProjectState) {
        if (newState.loading) this.eventHandler.loadingProject()
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


